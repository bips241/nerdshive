import mongoose, { Schema, Document } from 'mongoose';

export type ChannelType = 'text' | 'voice' | 'video';

export interface IChannelItem {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: ChannelType;
  topic?: string;
  createdAt: Date;
}

export interface IServerMember {
  user: mongoose.Types.ObjectId;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

export interface IServer extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  iconUrl?: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  inviteCode: string;
  members: IServerMember[];
  channels: IChannelItem[];
  createdAt: Date;
  updatedAt: Date;
}

const ChannelItemSchema = new Schema<IChannelItem>(
  {
    name: { type: String, required: true, trim: true, lowercase: true },
    type: { type: String, enum: ['text', 'voice', 'video'], default: 'text' },
    topic: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ServerMemberSchema = new Schema<IServerMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

export const ServerSchema: Schema<IServer> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    iconUrl: { type: String, default: '' },
    description: { type: String, default: '' },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    inviteCode: { type: String, unique: true, required: true, index: true },
    members: [ServerMemberSchema],
    channels: [ChannelItemSchema],
  },
  { timestamps: true }
);

ServerSchema.index({ 'members.user': 1 });
ServerSchema.index({ ownerId: 1 });
