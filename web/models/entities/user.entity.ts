import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name?: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  password?: string;
  user_name: string;
  gender?: 'male' | 'female' | 'other';
  bio?: string;
  website?: string;
  repo?: string;
  role?: 'admin' | 'organizer' | 'judge' | 'developer' | 'user';
  isVerified: boolean;
  verifyCode?: string;
  verifyCodeExpiry?: Date;
  posts: mongoose.Types.ObjectId[];
  savedPosts: mongoose.Types.ObjectId[];
  saved?: any;
  radarStatus?: 'open_for_hackathons' | 'seeking_cofounder' | 'open_for_collab' | 'open_for_work' | 'none';
  techStack?: string[];
  debugKarma?: number;
  bugsSolvedCount?: number;
  accountStatus?: 'active' | 'suspended' | 'deactivated' | 'deleted';
  isDeleted?: boolean;
  deletedAt?: Date;
  retentionExpiresAt?: Date;
  legalHold?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema: Schema<IUser> = new Schema(
  {
    name: { type: String },
    email: { type: String, unique: true, required: true },
    emailVerified: { type: Date },
    image: { type: String },
    password: { type: String },
    user_name: { type: String, unique: true, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    bio: { type: String },
    website: { type: String },
    repo: { type: String },
    radarStatus: {
      type: String,
      enum: ['open_for_hackathons', 'seeking_cofounder', 'open_for_collab', 'open_for_work', 'none'],
      default: 'none',
    },
    techStack: [{ type: String }],
    debugKarma: { type: Number, default: 0 },
    bugsSolvedCount: { type: Number, default: 0 },
    role: {
      type: String,
      enum: ['admin', 'organizer', 'judge', 'developer', 'user'],
      default: 'developer',
    },
    isVerified: { type: Boolean, default: false },
    verifyCode: { type: String },
    verifyCodeExpiry: { type: Date },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'deactivated', 'deleted'],
      default: 'active',
      index: true,
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    retentionExpiresAt: { type: Date, index: true },
    legalHold: { type: Boolean, default: false, index: true },
    posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
    savedPosts: [{ type: Schema.Types.ObjectId, ref: 'SavedPost' }],
    saved: [{ type: Schema.Types.ObjectId, ref: 'SavedPost' }],
  },
  { timestamps: true }
);

UserSchema.index({ user_name: 'text', bio: 'text', repo: 'text' });
UserSchema.index({ isDeleted: 1, accountStatus: 1 });
UserSchema.index({ retentionExpiresAt: 1 });

export const VerificationTokenSchema = new Schema(
  {
    identifier: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    expires: { type: Date, required: true },
  },
  { timestamps: true }
);

export const AccountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    refresh_token: { type: String },
    access_token: { type: String },
    expires_at: { type: Number },
    token_type: { type: String },
    scope: { type: String },
    id_token: { type: String },
    session_state: { type: String },
  },
  { timestamps: true }
);

AccountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });

export const FollowsSchema = new Schema(
  {
    followerId: { type: String, required: true, ref: 'User' },
    followingId: { type: String, required: true, ref: 'User' },
  },
  { timestamps: true }
);

FollowsSchema.index({ followerId: 1, followingId: 1 }, { unique: true });
FollowsSchema.index({ followingId: 1 });
FollowsSchema.index({ followerId: 1 });
