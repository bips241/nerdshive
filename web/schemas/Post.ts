import { z } from "zod";

export const PostSchema = z.object({
  id: z.string(),
  fileUrl: z.string().url(),
  caption: z.string().optional(),
});

export const CreatePost = PostSchema.omit({ id: true });
export const UpdatePost = PostSchema;
export const DeletePost = PostSchema.pick({ id: true });

export const LikeSchema = z.object({
  postId: z.string(),
});

export const BookmarkSchema = z.object({
  postId: z.string(),
});

export const CommentSchema = z.object({
  id: z.string(),
  body: z.string(),
  postId: z.string(),
});

export const CreateComment = CommentSchema.omit({ id: true });
export const UpdateComment = CommentSchema;
export const DeleteComment = CommentSchema.pick({ id: true });

export const UserSchema = z.object({
  id: z.string().optional(),
  user_name: z.string().nonempty('Username is required'),
  email: z.string().email('Please use a valid email address'),
  name: z.string().max(15).optional(),
  bio: z.string().max(150).optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  website: z.string().url().optional(),
  repo: z.string().url().optional(),
  password: z.string().nonempty('Password is required'),
  verifyCode: z.string().nonempty('Verify Code is required'),
  verifyCodeExpiry: z.string().nonempty('Verify Code Expiry is required'),
  role: z.string().optional(),
  image: z.string().url().optional(),
  isVerified: z.boolean().optional(),
  authProviderId: z.string().optional(),
});

export const UpdateUser = UserSchema;
export const DeleteUser = UserSchema.pick({ id: true });
export const FollowUser = UserSchema.pick({ id: true });