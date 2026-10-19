import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, email, phone } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('A user with this email already exists', 409);
  }

  const user = await User.create({
    fullName,
    email,
    phone,
  });

  res.status(201).json({
    status: 'success',
    data: {
      user,
    },
  });
});

export const getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find().sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

export const getUserSessions = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!id || !Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid user ID format', 400);
  }

  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const pipeline = [
    {
      $match: {
        userId: new Types.ObjectId(id),
      },
    },
    {
      $lookup: {
        from: 'teachers',
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacher',
      },
    },
    {
      $unwind: {
        path: '$teacher',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: { startTime: 1 as const },
    },
    {
      $facet: {
        upcomingSessions: [
          {
            $match: {
              status: 'BOOKED',
            },
          },
        ],
        completedSessions: [
          {
            $match: {
              status: 'COMPLETED',
            },
          },
        ],
      },
    },
  ];

  const [result] = await Session.aggregate(pipeline);

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
      upcomingSessions: result?.upcomingSessions || [],
      completedSessions: result?.completedSessions || [],
    },
  });
});
