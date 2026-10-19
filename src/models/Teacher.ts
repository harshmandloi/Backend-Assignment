import mongoose, { Document, Schema } from 'mongoose';

export interface ITeacher extends Document {
  fullName: string;
  email: string;
  specialization: string;
  experience: number;
  createdAt: Date;
  updatedAt: Date;
}

const teacherSchema = new Schema<ITeacher>(
  {
    fullName: {
      type: String,
      required: [true, 'fullName is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      lowercase: true,
      trim: true,
    },
    specialization: {
      type: String,
      required: [true, 'specialization is required'],
      trim: true,
    },
    experience: {
      type: Number,
      required: [true, 'experience is required'],
      min: [0, 'experience must be a non-negative number'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Teacher = mongoose.model<ITeacher>('Teacher', teacherSchema);
