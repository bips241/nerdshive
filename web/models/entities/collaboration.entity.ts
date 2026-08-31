import mongoose, { Schema, Document } from 'mongoose';

export interface IProjectRequest extends Document {
  _id: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId;
  requesterId: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

export const ProjectRequestSchema: Schema<IProjectRequest> = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

ProjectRequestSchema.index({ projectId: 1, requesterId: 1 });
ProjectRequestSchema.index({ requesterId: 1 });
