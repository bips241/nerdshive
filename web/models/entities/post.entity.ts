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
    version?: string;
    demoUrl?: string;
    repoUrl?: string;
    techStack: string[];
    feedbackWanted: string[];
    alphaTesters?: mongoose.Types.ObjectId[];
    changelog?: Array<{ version: string; note: string; date: Date }>;
  };
  codeSos?: {
    title: string;
    snippet: string;
    language: string;
    errorLog?: string;
    environment?: string;
    triedSteps?: string;
    isResolved: boolean;
    resolvedCommentId?: mongoose.Types.ObjectId;
    resolvedBy?: mongoose.Types.ObjectId;
    solutionSummary?: string;
    bountyKarma?: number;
  };
  architectureRfc?: {
    title: string;
    challenge: string;
    diagramMarkdown?: string;
    tradeOffs?: Array<{ option: string; pros: string; cons: string }>;
    targetAudience?: string;
    status?: 'under_review' | 'adopted' | 'superseded';
    adoptedOption?: string;
    decisionSummary?: string;
    votesAdoptA?: mongoose.Types.ObjectId[];
    votesAdoptB?: mongoose.Types.ObjectId[];
    votesRevise?: mongoose.Types.ObjectId[];
  };
  hackathonCrew?: {
    hackathonId?: mongoose.Types.ObjectId;
    hackathonName: string;
    squadServerId?: mongoose.Types.ObjectId;
    targetTrack?: string;
    urgencyDate?: Date;
    rolesHave: string[];
    rolesNeed: string[];
    commitmentLevel: 'hardcore' | 'moderate' | 'casual';
    squadStatus?: 'recruiting' | 'full' | 'building';
    maxSquadSize?: number;
    members?: Array<{ user: mongoose.Types.ObjectId; role: string; joinedAt: Date }>;
    applicants?: Array<{ user: mongoose.Types.ObjectId; role: string; pitch: string; appliedAt: Date }>;
  };
  techShowdown?: {
    topic: string;
    optionA: { name: string; description?: string; votes: number };
    optionB: { name: string; description?: string; votes: number };
    benchmark?: string;
    voters?: Array<{ user: mongoose.Types.ObjectId; option: string; rationale?: string; votedAt: Date }>;
  };
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  retentionExpiresAt?: Date;
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
      version: { type: String, default: 'v0.1.0' },
      demoUrl: { type: String },
      repoUrl: { type: String },
      techStack: [{ type: String }],
      feedbackWanted: [{ type: String }],
      alphaTesters: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      changelog: [
        {
          version: { type: String },
          note: { type: String },
          date: { type: Date, default: Date.now },
        },
      ],
    },
    codeSos: {
      title: { type: String },
      snippet: { type: String },
      language: { type: String, default: 'typescript' },
      errorLog: { type: String },
      environment: { type: String },
      triedSteps: { type: String },
      isResolved: { type: Boolean, default: false },
      resolvedCommentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
      resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      solutionSummary: { type: String },
      bountyKarma: { type: Number, default: 50 },
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
      status: {
        type: String,
        enum: ['under_review', 'adopted', 'superseded'],
        default: 'under_review',
      },
      adoptedOption: { type: String },
      decisionSummary: { type: String },
      votesAdoptA: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      votesAdoptB: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      votesRevise: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    },
    hackathonCrew: {
      hackathonId: { type: Schema.Types.ObjectId, ref: 'HackathonEvent' },
      hackathonName: { type: String },
      squadServerId: { type: Schema.Types.ObjectId, ref: 'Server' },
      targetTrack: { type: String },
      urgencyDate: { type: Date },
      rolesHave: [{ type: String }],
      rolesNeed: [{ type: String }],
      commitmentLevel: {
        type: String,
        enum: ['hardcore', 'moderate', 'casual'],
        default: 'moderate',
      },
      squadStatus: {
        type: String,
        enum: ['recruiting', 'full', 'building'],
        default: 'recruiting',
      },
      maxSquadSize: { type: Number, default: 4 },
      members: [
        {
          user: { type: Schema.Types.ObjectId, ref: 'User' },
          role: { type: String },
          joinedAt: { type: Date, default: Date.now },
        },
      ],
      applicants: [
        {
          user: { type: Schema.Types.ObjectId, ref: 'User' },
          role: { type: String },
          pitch: { type: String },
          appliedAt: { type: Date, default: Date.now },
        },
      ],
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
      voters: [
        {
          user: { type: Schema.Types.ObjectId, ref: 'User' },
          option: { type: String, enum: ['optionA', 'optionB'] },
          rationale: { type: String },
          votedAt: { type: Date, default: Date.now },
        },
      ],
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    retentionExpiresAt: { type: Date, index: true },
  },
  { timestamps: true }
);

PostSchema.index({ userId: 1 });
PostSchema.index({ createdAt: -1 });
PostSchema.index({ postType: 1, createdAt: -1 });
PostSchema.index({ isDeleted: 1, createdAt: -1 });
PostSchema.index({ retentionExpiresAt: 1 });

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
