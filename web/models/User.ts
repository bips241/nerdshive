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
import {
  ServerSchema,
  IServer,
} from './entities/server.entity';
import {
  HackathonEventSchema,
  IHackathonEvent,
} from './entities/hackathon.entity';
import {
  HackathonRegistrationSchema,
  IHackathonRegistration,
} from './entities/hackathon-registration.entity';
import {
  HackathonEvaluationSchema,
  IHackathonEvaluation,
} from './entities/hackathon-evaluation.entity';
import {
  SquadRequestSchema,
  ISquadRequest,
} from './entities/squad-request.entity';

// Re-export entity schemas & types
export * from './entities/user.entity';
export * from './entities/post.entity';
export * from './entities/collaboration.entity';
export * from './entities/chat.entity';
export * from './entities/server.entity';
export * from './entities/hackathon.entity';
export * from './entities/hackathon-registration.entity';
export * from './entities/hackathon-evaluation.entity';
export * from './entities/squad-request.entity';

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


export const ChatRoom: Model<IChatRoom> =
  (mongoose.models?.ChatRoom as Model<IChatRoom>) ||
  mongoose.model<IChatRoom>('ChatRoom', ChatRoomSchema);

export const Message: Model<IMessage> =
  (mongoose.models?.Message as Model<IMessage>) ||
  mongoose.model<IMessage>('Message', MessageSchema);

export const Server: Model<IServer> =
  (mongoose.models?.Server as Model<IServer>) ||
  mongoose.model<IServer>('Server', ServerSchema);

export const HackathonEvent: Model<IHackathonEvent> =
  (mongoose.models?.HackathonEvent as Model<IHackathonEvent>) ||
  mongoose.model<IHackathonEvent>('HackathonEvent', HackathonEventSchema);

export const HackathonRegistration: Model<IHackathonRegistration> =
  (mongoose.models?.HackathonRegistration as Model<IHackathonRegistration>) ||
  mongoose.model<IHackathonRegistration>('HackathonRegistration', HackathonRegistrationSchema);

export const HackathonEvaluation: Model<IHackathonEvaluation> =
  (mongoose.models?.HackathonEvaluation as Model<IHackathonEvaluation>) ||
  mongoose.model<IHackathonEvaluation>('HackathonEvaluation', HackathonEvaluationSchema);

export const SquadRequest: Model<ISquadRequest> =
  (mongoose.models?.SquadRequest as Model<ISquadRequest>) ||
  mongoose.model<ISquadRequest>('SquadRequest', SquadRequestSchema);