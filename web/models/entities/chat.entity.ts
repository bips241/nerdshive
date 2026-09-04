import mongoose, { Schema, Document } from 'mongoose';

export interface IChatRoom extends Document {
  _id: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export const ChatRoomSchema: Schema<IChatRoom> = new Schema(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  },
  { timestamps: true }
);

ChatRoomSchema.index({ participants: 1 });

export interface IMessageAttachment {
  url: string;
  fileType: string;
  fileName: string;
}

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  chatRoomId?: mongoose.Types.ObjectId;
  serverId?: mongoose.Types.ObjectId;
  channelId?: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  receiverId?: mongoose.Types.ObjectId;
  message: string;
  attachments?: IMessageAttachment[];
  codeSnippet?: {
    language: string;
    code: string;
  };
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const MessageSchema: Schema<IMessage> = new Schema(
  {
    chatRoomId: { type: Schema.Types.ObjectId, ref: 'ChatRoom' },
    serverId: { type: Schema.Types.ObjectId, ref: 'Server' },
    channelId: { type: Schema.Types.ObjectId, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receiverId: { type: Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: true },
    attachments: [
      {
        url: { type: String, required: true },
        fileType: { type: String, default: 'image' },
        fileName: { type: String, default: '' },
      },
    ],
    codeSnippet: {
      language: { type: String },
      code: { type: String },
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MessageSchema.index({ chatRoomId: 1, createdAt: 1 });
MessageSchema.index({ channelId: 1, createdAt: -1 });
MessageSchema.index({ serverId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ receiverId: 1 });
