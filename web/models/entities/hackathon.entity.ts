import mongoose, { Schema, Document } from 'mongoose';

export interface IHackathonTrack {
  name: string;
  prizePool?: string;
  description?: string;
  tags?: string[];
}

export interface IRubricItem {
  criterion: string;
  maxScore: number;
  weight?: number;
  description?: string;
}

export interface IHackathonRound {
  roundNumber: number;
  name: string;
  description?: string;
  submissionType: 'ideation' | 'prototype' | 'video_pitch' | 'custom';
  requiredFields?: string[]; // e.g. ['repoUrl', 'demoUrl', 'videoUrl', 'pitchDeckUrl']
  startDate?: Date;
  deadline?: Date;
  rubric: IRubricItem[];
  isElimination: boolean;
  advancingCount?: number;
  status: 'upcoming' | 'active' | 'judging' | 'completed';
}

export interface ISponsorTier {
  tierName: string;
  sponsors: Array<{
    name: string;
    logoUrl: string;
    websiteUrl?: string;
  }>;
}

export interface IFaqItem {
  question: string;
  answer: string;
}

export interface IScheduleItem {
  time: string;
  title: string;
  description?: string;
  speaker?: string;
}

export interface IHackathonPageDesign {
  heroTheme?: 'cyberpunk' | 'dark_minimal' | 'modern_purple' | 'emerald_tech';
  customAccentColor?: string;
  bannerUrl?: string;
  logoUrl?: string;
  customCss?: string;
  sponsorTiers?: ISponsorTier[];
  faqs?: IFaqItem[];
  schedule?: IScheduleItem[];
}

export interface IHackathonEvent extends Document {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  organizationId?: mongoose.Types.ObjectId;
  organizerId: mongoose.Types.ObjectId;
  organizerName: string;
  organizationType: 'college' | 'community' | 'enterprise' | 'individual';
  isVerified: boolean;
  websiteUrl: string;
  devpostUrl?: string;
  bannerUrl?: string;
  logoUrl?: string;
  location: string;
  startDate: Date;
  submissionDeadline: Date;
  prizePool: string;
  tracks: IHackathonTrack[];
  rules?: string[];
  applicationMode: 'open' | 'curated';
  registrationType: 'both' | 'team_only' | 'solo_only';
  teamSize: { min: number; max: number };
  rounds: IHackathonRound[];
  currentRoundNumber: number;
  judges?: mongoose.Types.ObjectId[];
  pageDesign?: IHackathonPageDesign;
  isBlindJudging: boolean;
  status: 'upcoming' | 'live' | 'judging' | 'ended' | 'deleted';
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  retentionExpiresAt?: Date;
  tombstoneMetadata?: {
    reason?: string;
    previousStatus?: string;
    restoredAt?: Date;
    ipAddress?: string;
  };
  legalHold?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const HackathonTrackSchema = new Schema<IHackathonTrack>(
  {
    name: { type: String, required: true, trim: true },
    prizePool: { type: String, default: '' },
    description: { type: String, default: '' },
    tags: [{ type: String }],
  },
  { _id: true }
);

const RubricItemSchema = new Schema<IRubricItem>(
  {
    criterion: { type: String, required: true },
    maxScore: { type: Number, required: true, default: 10 },
    weight: { type: Number, default: 1 },
    description: { type: String, default: '' },
  },
  { _id: false }
);

const HackathonRoundSchema = new Schema<IHackathonRound>(
  {
    roundNumber: { type: Number, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    submissionType: {
      type: String,
      enum: ['ideation', 'prototype', 'video_pitch', 'custom'],
      default: 'prototype',
    },
    requiredFields: [{ type: String }],
    startDate: { type: Date },
    deadline: { type: Date },
    rubric: [RubricItemSchema],
    isElimination: { type: Boolean, default: false },
    advancingCount: { type: Number },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'judging', 'completed'],
      default: 'upcoming',
    },
  },
  { _id: true }
);

const SponsorTierSchema = new Schema<ISponsorTier>(
  {
    tierName: { type: String, required: true },
    sponsors: [
      {
        name: { type: String, required: true },
        logoUrl: { type: String, required: true },
        websiteUrl: { type: String, default: '' },
      },
    ],
  },
  { _id: false }
);

const FaqItemSchema = new Schema<IFaqItem>(
  {
    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false }
);

const ScheduleItemSchema = new Schema<IScheduleItem>(
  {
    time: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    speaker: { type: String, default: '' },
  },
  { _id: false }
);

export const HackathonEventSchema: Schema<IHackathonEvent> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    tagline: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'User' },
    organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizerName: { type: String, required: true, trim: true },
    organizationType: {
      type: String,
      enum: ['college', 'community', 'enterprise', 'individual'],
      default: 'community',
    },
    isVerified: { type: Boolean, default: false, index: true },
    websiteUrl: { type: String, required: true, trim: true },
    devpostUrl: { type: String, default: '', trim: true },
    bannerUrl: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    location: { type: String, required: true, default: 'Virtual / Global' },
    startDate: { type: Date, required: true },
    submissionDeadline: { type: Date, required: true, index: true },
    prizePool: { type: String, default: '$0' },
    tracks: [HackathonTrackSchema],
    rules: [{ type: String }],
    applicationMode: {
      type: String,
      enum: ['open', 'curated'],
      default: 'open',
    },
    registrationType: {
      type: String,
      enum: ['both', 'team_only', 'solo_only'],
      default: 'both',
    },
    teamSize: {
      min: { type: Number, default: 1 },
      max: { type: Number, default: 4 },
    },
    rounds: [HackathonRoundSchema],
    currentRoundNumber: { type: Number, default: 1 },
    judges: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    pageDesign: {
      heroTheme: {
        type: String,
        enum: ['cyberpunk', 'dark_minimal', 'modern_purple', 'emerald_tech'],
        default: 'dark_minimal',
      },
      customAccentColor: { type: String, default: '' },
      bannerUrl: { type: String, default: '' },
      logoUrl: { type: String, default: '' },
      customCss: { type: String, default: '' },
      sponsorTiers: [SponsorTierSchema],
      faqs: [FaqItemSchema],
      schedule: [ScheduleItemSchema],
    },
    isBlindJudging: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['upcoming', 'live', 'judging', 'ended', 'deleted'],
      default: 'live',
      index: true,
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    retentionExpiresAt: { type: Date, index: true },
    tombstoneMetadata: {
      reason: { type: String },
      previousStatus: { type: String },
      restoredAt: { type: Date },
      ipAddress: { type: String },
    },
    legalHold: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

HackathonEventSchema.index({ slug: 1 }, { unique: true });
HackathonEventSchema.index({ isVerified: 1, status: 1 });
HackathonEventSchema.index({ organizerId: 1 });
HackathonEventSchema.index({ isDeleted: 1, status: 1, isVerified: 1 });
HackathonEventSchema.index({ retentionExpiresAt: 1 });
