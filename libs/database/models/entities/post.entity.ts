import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  caption?: string;
  fileUrl?: string;
  postType: 'media' | 'poll' | 'goal' | 'project';
  likes: mongoose.Types.ObjectId[];
  comments: mongoose.Types.ObjectId[];
  savedBy: mongoose.Types.ObjectId[];
  poll?: {
    question: string;
    options: Array<{ option: string; votes: number }>;
  };
  project?: {
    title: string;
    description: string;
    techStack: string[];
    repoUrl?: string;
    members: mongoose.Types.ObjectId[];
    requests: mongoose.Types.ObjectId[];
  };
  goal?: {
    goalText: string;
    goalTargetDate?: Date;
    interestedUsers: mongoose.Types.ObjectId[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export const PostSchema: Schema<IPost> = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    caption: { type: String },
    fileUrl: { type: String },
    postType: {
      type: String,
      enum: ['media', 'poll', 'goal', 'project'],
      required: true,
    },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    savedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    poll: {
      question: { type: String },
      options: [
        {
          option: { type: String, required: true },
          votes: { type: Number, default: 0 },
        },
      ],
    },
    project: {
      title: { type: String },
      description: { type: String },
      techStack: [{ type: String }],
      repoUrl: { type: String },
      members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      requests: [{ type: Schema.Types.ObjectId, ref: 'ProjectRequest' }],
    },
    goal: {
      goalText: { type: String },
      goalTargetDate: { type: Date },
      interestedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },
  },
  { timestamps: true }
);

PostSchema.index({ userId: 1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ postType: 1, createdAt: -1 });

export const SavedPostSchema = new Schema(
  {
    postId: { type: String, required: true, ref: 'Post' },
    userId: { type: String, required: true, ref: 'User' },
  },
  { timestamps: true }
);
SavedPostSchema.index({ postId: 1, userId: 1 }, { unique: true });
SavedPostSchema.index({ userId: 1 });

export const LikeSchema = new Schema(
  {
    postId: { type: String, required: true, ref: 'Post' },
    userId: { type: String, required: true, ref: 'User' },
  },
  { timestamps: true }
);
LikeSchema.index({ postId: 1, userId: 1 }, { unique: true });
LikeSchema.index({ userId: 1 });

export const CommentSchema = new Schema(
  {
    body: { type: String, required: true },
    postId: { type: String, required: true, ref: 'Post' },
    userId: { type: String, required: true, ref: 'User' },
  },
  { timestamps: true }
);
CommentSchema.index({ postId: 1 });
CommentSchema.index({ userId: 1 });

export const PollVoteSchema = new Schema(
  {
    pollId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    selectedOptionIndex: { type: Number, required: true },
  },
  { timestamps: true }
);
PollVoteSchema.index({ pollId: 1, userId: 1 }, { unique: true });
