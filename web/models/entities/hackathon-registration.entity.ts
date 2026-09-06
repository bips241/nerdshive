import mongoose, { Schema, Document } from 'mongoose';

export interface IHackathonMember {
  user: mongoose.Types.ObjectId;
  role?: string;
  skills?: string[];
  joinedAt: Date;
}

export interface IRoundSubmission {
  roundNumber: number;
  projectTitle: string;
  tagline?: string;
  description?: string;
  repoUrl?: string;
  demoUrl?: string;
  videoUrl?: string;
  pitchDeckUrl?: string;
  customFields?: Record<string, string>;
  submittedAt: Date;
}

export interface IHackathonRegistration extends Document {
  hackathonId: mongoose.Types.ObjectId;
  teamName: string;
  code: string; // 6-digit shareable team join code
  leaderId: mongoose.Types.ObjectId;
  members: IHackathonMember[];
  trackId?: string;
  trackName?: string;
  isSolo: boolean;
  status: 'forming' | 'applied' | 'accepted' | 'waitlisted' | 'rejected';
  currentRound: number;
  isAdvancedToNextRound?: boolean;
  lookingForSkills?: string[]; // e.g. ['React', 'Figma', 'Open to Beginners']
  lookingForDescription?: string;
  isRecruiting?: boolean;
  submissions: IRoundSubmission[];
  isDeleted?: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HackathonMemberSchema = new Schema<IHackathonMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, default: 'Developer' },
    skills: [{ type: String }],
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const RoundSubmissionSchema = new Schema<IRoundSubmission>(
  {
    roundNumber: { type: Number, required: true },
    projectTitle: { type: String, required: true },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    repoUrl: { type: String, default: '' },
    demoUrl: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    pitchDeckUrl: { type: String, default: '' },
    customFields: { type: Schema.Types.Mixed, default: {} },
    submittedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

export const HackathonRegistrationSchema: Schema<IHackathonRegistration> = new Schema(
  {
    hackathonId: {
      type: Schema.Types.ObjectId,
      ref: 'HackathonEvent',
      required: true,
      index: true,
    },
    teamName: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true, index: true },
    leaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    members: [HackathonMemberSchema],
    trackId: { type: String, default: '' },
    trackName: { type: String, default: '' },
    isSolo: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['forming', 'applied', 'accepted', 'waitlisted', 'rejected'],
      default: 'forming',
      index: true,
    },
    currentRound: { type: Number, default: 1 },
    isAdvancedToNextRound: { type: Boolean, default: false },
    lookingForSkills: [{ type: String }],
    lookingForDescription: { type: String, default: '' },
    isRecruiting: { type: Boolean, default: false, index: true },
    submissions: [RoundSubmissionSchema],
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

HackathonRegistrationSchema.index({ hackathonId: 1, 'members.user': 1 });
HackathonRegistrationSchema.index({ hackathonId: 1, code: 1 }, { unique: true });
HackathonRegistrationSchema.index({ hackathonId: 1, status: 1 });
HackathonRegistrationSchema.index({ hackathonId: 1, isDeleted: 1 });
