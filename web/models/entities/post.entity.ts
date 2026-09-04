import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  caption?: string;
  fileUrl?: string;
  postType:
    | 'media'
    | 'poll'
    | 'goal'
    | 'project'
    | 'ship_log'
    | 'code_sos'
    | 'architecture_rfc'
    | 'hackathon_crew'
    | 'tech_showdown';
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
  shipLog?: {
    title: string;
    pitch: string;
    demoUrl?: string;
    repoUrl?: string;
    techStack: string[];
    feedbackWanted: string[];
  };
  codeSos?: {
    title: string;
    snippet: string;
    language: string;
    errorLog?: string;
    environment?: string;
    triedSteps?: string;
    isResolved: boolean;
  };
  architectureRfc?: {
    title: string;
    challenge: string;
    diagramMarkdown?: string;
    tradeOffs?: Array<{ option: string; pros: string; cons: string }>;
    targetAudience?: string;
  };
  hackathonCrew?: {
    hackathonName: string;
    urgencyDate?: Date;
    rolesHave: string[];
    rolesNeed: string[];
    commitmentLevel: 'hardcore' | 'moderate' | 'casual';
  };
  techShowdown?: {
    topic: string;
    optionA: { name: string; description?: string; votes: number };
    optionB: { name: string; description?: string; votes: number };
    benchmark?: string;
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
      enum: [
        'media',
        'poll',
        'goal',
        'project',
        'ship_log',
        'code_sos',
        'architecture_rfc',
        'hackathon_crew',
        'tech_showdown',
      ],
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
    shipLog: {
      title: { type: String },
      pitch: { type: String },
      demoUrl: { type: String },
      repoUrl: { type: String },
      techStack: [{ type: String }],
      feedbackWanted: [{ type: String }],
    },
    codeSos: {
      title: { type: String },
      snippet: { type: String },
      language: { type: String, default: 'typescript' },
      errorLog: { type: String },
      environment: { type: String },
      triedSteps: { type: String },
      isResolved: { type: Boolean, default: false },
    },
    architectureRfc: {
      title: { type: String },
      challenge: { type: String },
      diagramMarkdown: { type: String },
      tradeOffs: [
        {
          option: { type: String },
          pros: { type: String },
          cons: { type: String },
        },
      ],
      targetAudience: { type: String },
    },
    hackathonCrew: {
      hackathonName: { type: String },
      urgencyDate: { type: Date },
      rolesHave: [{ type: String }],
      rolesNeed: [{ type: String }],
      commitmentLevel: {
        type: String,
        enum: ['hardcore', 'moderate', 'casual'],
        default: 'moderate',
      },
    },
    techShowdown: {
      topic: { type: String },
      optionA: {
        name: { type: String },
        description: { type: String },
        votes: { type: Number, default: 0 },
      },
      optionB: {
        name: { type: String },
        description: { type: String },
        votes: { type: Number, default: 0 },
      },
      benchmark: { type: String },
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
