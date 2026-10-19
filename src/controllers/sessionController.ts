import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Session } from '../models/Session';
import { Teacher } from '../models/Teacher';
import { User } from '../models/User';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

export const createSession = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId, startTime, endTime } = req.body;

  if (!Types.ObjectId.isValid(teacherId)) {
    throw new AppError('Invalid teacher ID format', 400);
  }

  const teacher = await Teacher.findById(teacherId);
  if (!teacher) {
    throw new AppError('Teacher not found', 404);
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError('Invalid startTime or endTime format', 400);
  }

  if (end <= start) {
    throw new AppError('endTime must be greater than startTime', 400);
  }

  const session = await Session.create({
    teacherId: teacher._id,
    startTime: start,
    endTime: end,
    status: 'AVAILABLE',
  });

  res.status(201).json({
    status: 'success',
    data: {
      session,
    },
  });
});

export const getAvailableSessions = asyncHandler(async (req: Request, res: Response) => {
  const { dateTimestamp } = req.query;

  if (!dateTimestamp) {
    throw new AppError('dateTimestamp query parameter is required', 400);
  }

  let targetDate: Date;
  const numTimestamp = Number(dateTimestamp);

  if (!isNaN(numTimestamp)) {
    targetDate = new Date(numTimestamp > 1e11 ? numTimestamp : numTimestamp * 1000);
  } else {
    targetDate = new Date(String(dateTimestamp));
  }

  if (isNaN(targetDate.getTime())) {
    throw new AppError('Invalid dateTimestamp provided', 400);
  }

  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const pipeline = [
    {
      $match: {
        status: 'AVAILABLE',
        startTime: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
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
  ];

  const sessions = await Session.aggregate(pipeline);

  res.status(200).json({
    status: 'success',
    results: sessions.length,
    queryDate: targetDate.toISOString().split('T')[0],
    data: {
      sessions,
    },
  });
});

export const bookSession = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { userId } = req.body;

  if (!id || !Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid session ID format', 400);
  }

  if (!userId || !Types.ObjectId.isValid(userId)) {
    throw new AppError('Valid userId is required in the request body', 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const session = await Session.findById(id);
  if (!session) {
    throw new AppError('Session not found', 404);
  }

  if (session.status !== 'AVAILABLE') {
    throw new AppError(
      `Session cannot be booked. Only AVAILABLE sessions can be booked. Current status: ${session.status}`,
      400
    );
  }

  session.status = 'BOOKED';
  session.userId = user._id as Types.ObjectId;
  await session.save();

  res.status(200).json({
    status: 'success',
    message: 'Session booked successfully',
    data: {
      session,
    },
  });
});

export const markSessionComplete = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  if (!id || !Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid session ID format', 400);
  }

  const session = await Session.findById(id);
  if (!session) {
    throw new AppError('Session not found', 404);
  }

  if (session.status !== 'BOOKED') {
    throw new AppError(
      `Only BOOKED sessions can be marked as completed. Current status: ${session.status}`,
      400
    );
  }

  session.status = 'COMPLETED';
  session.completedAt = new Date();
  await session.save();

  res.status(200).json({
    status: 'success',
    message: 'Session marked as completed successfully',
    data: {
      session,
    },
  });
});

export const getAllSessions = asyncHandler(async (_req: Request, res: Response) => {
  const sessions = await Session.find()
    .populate('teacherId', 'fullName email specialization')
    .populate('userId', 'fullName email phone')
    .sort({ startTime: -1 });

  res.status(200).json({
    status: 'success',
    results: sessions.length,
    data: {
      sessions,
    },
  });
});
