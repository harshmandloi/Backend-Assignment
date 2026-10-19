import mongoose, { Document, Schema, Types } from 'mongoose';

export type SessionStatus = 'AVAILABLE' | 'BOOKED' | 'COMPLETED';

export interface ISession extends Document {
  teacherId: Types.ObjectId;
  userId: Types.ObjectId | null;
  startTime: Date;
  endTime: Date;
  status: SessionStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<ISession>(
  {
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'teacherId is required'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    startTime: {
      type: Date,
      required: [true, 'startTime is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'endTime is required'],
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'BOOKED', 'COMPLETED'],
      default: 'AVAILABLE',
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

sessionSchema.index({ status: 1, startTime: 1 });
sessionSchema.index({ userId: 1, status: 1 });

export const Session = mongoose.model<ISession>('Session', sessionSchema);
