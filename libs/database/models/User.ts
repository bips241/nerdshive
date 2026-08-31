/**
 * Domain Model Facade & Mongoose Registry
 * Re-exports domain entities and initializes Mongoose models with 100% backward compatibility.
 */

import mongoose, { Model } from 'mongoose';
import {
  UserSchema,
  VerificationTokenSchema,
  AccountSchema,
  FollowsSchema,
  IUser,
} from './entities/user.entity';
import {
  PostSchema,
  SavedPostSchema,
  LikeSchema,
  CommentSchema,
  PollVoteSchema,
  IPost,
} from './entities/post.entity';
import {
  ProjectRequestSchema,
  IProjectRequest,
} from './entities/collaboration.entity';
import {
  ChatRoomSchema,
  MessageSchema,
  IChatRoom,
  IMessage,
} from './entities/chat.entity';

// Re-export entity schemas & types
export * from './entities/user.entity';
export * from './entities/post.entity';
export * from './entities/collaboration.entity';
export * from './entities/chat.entity';

// Initialized Mongoose Models (Singleton registry with explicit Model typing)
export const User: Model<IUser> =
  (mongoose.models?.User as Model<IUser>) || mongoose.model<IUser>('User', UserSchema);

export const VerificationToken: Model<any> =
  (mongoose.models?.VerificationToken as Model<any>) ||
  mongoose.model('VerificationToken', VerificationTokenSchema);

export const Account: Model<any> =
  (mongoose.models?.Account as Model<any>) || mongoose.model('Account', AccountSchema);

export const Follows: Model<any> =
  (mongoose.models?.Follows as Model<any>) || mongoose.model('Follows', FollowsSchema);

export const Post: Model<IPost> =
  (mongoose.models?.Post as Model<IPost>) || mongoose.model<IPost>('Post', PostSchema);

export const SavedPost: Model<any> =
  (mongoose.models?.SavedPost as Model<any>) || mongoose.model('SavedPost', SavedPostSchema);

export const Like: Model<any> =
  (mongoose.models?.Like as Model<any>) || mongoose.model('Like', LikeSchema);

export const Comment: Model<any> =
  (mongoose.models?.Comment as Model<any>) || mongoose.model('Comment', CommentSchema);

export const ProjectRequest: Model<IProjectRequest> =
  (mongoose.models?.ProjectRequest as Model<IProjectRequest>) ||
  mongoose.model<IProjectRequest>('ProjectRequest', ProjectRequestSchema);

export const PollVote: Model<any> =
  (mongoose.models?.PollVote as Model<any>) || mongoose.model('PollVote', PollVoteSchema);

export const ChatRoom: Model<IChatRoom> =
  (mongoose.models?.ChatRoom as Model<IChatRoom>) ||
  mongoose.model<IChatRoom>('ChatRoom', ChatRoomSchema);

export const Message: Model<IMessage> =
  (mongoose.models?.Message as Model<IMessage>) ||
  mongoose.model<IMessage>('Message', MessageSchema);