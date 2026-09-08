import mongoose, { Schema, Document } from 'mongoose';

export interface ISquadMeetingSchedule {
  scheduledAt?: Date;
  durationMinutes?: number;
  status: 'none' | 'proposed' | 'confirmed' | 'rescheduled' | 'declined' | 'completed';
  proposedBy?: mongoose.Types.ObjectId;
  meetingRoomId?: string;
  notes?: string;
}

export interface ISquadRequest extends Document {
  _id: mongoose.Types.ObjectId;
  type: 'leader_offer' | 'candidate_application';
  hackathonId: mongoose.Types.ObjectId;
  hackathonSlug: string;
  hackathonName: string;
  registrationId: mongoose.Types.ObjectId;
  teamName: string;
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  roleOfferedOrSought: string;
  personalNote?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';
  deadlineHours: number;
  expiresAt: Date;
  meetingSchedule?: ISquadMeetingSchedule;
  decisionNote?: string;
  decisionAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  retentionExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SquadMeetingScheduleSchema = new Schema<ISquadMeetingSchedule>(
  {
    scheduledAt: { type: Date },
    durationMinutes: { type: Number, default: 15 },
    status: {
      type: String,
      enum: ['none', 'proposed', 'confirmed', 'rescheduled', 'declined', 'completed'],
      default: 'none',
    },
    proposedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    meetingRoomId: { type: String },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

export const SquadRequestSchema: Schema<ISquadRequest> = new Schema(
  {
    type: {
      type: String,
      enum: ['leader_offer', 'candidate_application'],
      required: true,
      index: true,
    },
    hackathonId: {
      type: Schema.Types.ObjectId,
      ref: 'HackathonEvent',
      required: true,
      index: true,
    },
    hackathonSlug: { type: String, required: true, index: true },
    hackathonName: { type: String, required: true },
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: 'HackathonRegistration',
      required: true,
      index: true,
    },
    teamName: { type: String, required: true },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    roleOfferedOrSought: { type: String, required: true, trim: true },
    personalNote: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'expired', 'withdrawn'],
      default: 'pending',
      index: true,
    },
    deadlineHours: { type: Number, default: 48 },
    expiresAt: { type: Date, required: true, index: true },
    meetingSchedule: {
      type: SquadMeetingScheduleSchema,
      default: () => ({ status: 'none', durationMinutes: 15 }),
    },
    decisionNote: { type: String, trim: true },
    decisionAt: { type: Date },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    retentionExpiresAt: { type: Date, index: true },
  },
  { timestamps: true }
);

SquadRequestSchema.index({ receiverId: 1, status: 1, expiresAt: 1 });
SquadRequestSchema.index({ senderId: 1, status: 1, createdAt: -1 });
SquadRequestSchema.index({ registrationId: 1, status: 1 });
