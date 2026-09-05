import mongoose, { Schema, Document } from 'mongoose';

export interface IHackathonTrack {
  name: string;
  prizePool?: string;
  description?: string;
  tags?: string[];
}

export interface IHackathonEvent extends Document {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  organizerId: mongoose.Types.ObjectId;
  organizerName: string;
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
  status: 'upcoming' | 'live' | 'judging' | 'ended';
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
    organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizerName: { type: String, required: true, trim: true },
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
    status: {
      type: String,
      enum: ['upcoming', 'live', 'judging', 'ended'],
      default: 'live',
      index: true,
    },
  },
  { timestamps: true }
);

HackathonEventSchema.index({ slug: 1 }, { unique: true });
HackathonEventSchema.index({ isVerified: 1, status: 1 });
