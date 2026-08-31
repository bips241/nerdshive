import type { Document } from 'mongoose';
import {
  Comment as CommentModel,
  Follows as FollowsModel,
  Like as LikeModel,
  Post as PostModel,
  SavedPost as SavedPostModel,
  User as UserModel,
} from '../models/User';

export type Comment = Document & typeof CommentModel.prototype;
export type Follows = Document & typeof FollowsModel.prototype;
export type Like = Document & typeof LikeModel.prototype;
export type Post = Document & typeof PostModel.prototype;
export type SavedPost = Document & typeof SavedPostModel.prototype;
export type User = Document & typeof UserModel.prototype;

export type CommentWithExtras = Comment & { user: User };
export type LikeWithExtras = Like & { user: User };

export type PostWithExtras = Post & {
  comments: CommentWithExtras[];
  likes: LikeWithExtras[];
  savedBy: SavedPost[];
  user: User;
};

export type UserWithFollows = User & {
  following: Follows[];
  followedBy: Follows[];
};

export type FollowerWithExtras = Follows & { follower: UserWithFollows };
export type FollowingWithExtras = Follows & { following: UserWithFollows };

export type UserWithExtras = User & {
  posts: Post[];
  saved: SavedPost[];
  followedBy: FollowerWithExtras[];
  following: FollowingWithExtras[];
};
