import mongoose, { Schema, Document } from 'mongoose';

export interface IEvaluationScore {
  criterion: string;
  score: number;
  maxScore: number;
  feedback?: string;
}

export interface IHackathonEvaluation extends Document {
  hackathonId: mongoose.Types.ObjectId;
  roundNumber: number;
  registrationId: mongoose.Types.ObjectId;
  judgeId: mongoose.Types.ObjectId;
  isBlind: boolean;
  scores: IEvaluationScore[];
  totalScore: number;
  maxPossibleScore: number;
  generalRemarks?: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const EvaluationScoreSchema = new Schema<IEvaluationScore>(
  {
    criterion: { type: String, required: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true, default: 10 },
    feedback: { type: String, default: '' },
  },
  { _id: false }
);

export const HackathonEvaluationSchema: Schema<IHackathonEvaluation> = new Schema(
  {
    hackathonId: {
      type: Schema.Types.ObjectId,
      ref: 'HackathonEvent',
      required: true,
      index: true,
    },
    roundNumber: { type: Number, required: true, default: 1, index: true },
    registrationId: {
      type: Schema.Types.ObjectId,
      ref: 'HackathonRegistration',
      required: true,
      index: true,
    },
    judgeId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isBlind: { type: Boolean, default: false },
    scores: [EvaluationScoreSchema],
    totalScore: { type: Number, required: true, default: 0 },
    maxPossibleScore: { type: Number, required: true, default: 100 },
    generalRemarks: { type: String, default: '' },
    isPublished: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

HackathonEvaluationSchema.index(
  { hackathonId: 1, roundNumber: 1, registrationId: 1, judgeId: 1 },
  { unique: true }
);
