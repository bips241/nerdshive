import { z } from "zod";

export const PostSchema = z.object({
  id: z.string(),
  fileUrl: z.string().optional(),
  caption: z.string().optional(),
});

export const CreatePost = z.object({
  fileUrl: z.string().url("Must provide a valid file URL"),
  caption: z.string().optional(),
});
export const UpdatePost = z.object({
  id: z.string(),
  fileUrl: z.string().optional(),
  caption: z.string().optional(),
});
export const DeletePost = z.object({
  id: z.string(),
});

export const CreateShipLogSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  pitch: z.string().min(10, "Pitch must be at least 10 characters").max(500),
  demoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  repoUrl: z.string().url("Must be a valid GitHub/Git URL").optional().or(z.literal("")),
  techStack: z.array(z.string()).min(1, "Select at least 1 tech stack tag"),
  feedbackWanted: z.array(z.string()).default([]),
});

export const CreateCodeSosSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(120),
  snippet: z.string().min(5, "Code snippet is required"),
  language: z.string().default("typescript"),
  errorLog: z.string().optional(),
  environment: z.string().optional(),
  triedSteps: z.string().optional(),
});

export const CreateArchitectureRfcSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(120),
  challenge: z.string().min(10, "Challenge description required"),
  diagramMarkdown: z.string().optional(),
  tradeOffs: z.array(z.object({
    option: z.string(),
    pros: z.string(),
    cons: z.string(),
  })).default([]),
  targetAudience: z.string().optional(),
});

export const CreateHackathonCrewSchema = z.object({
  hackathonName: z.string().min(2, "Hackathon name required"),
  urgencyDate: z.string().optional(),
  rolesHave: z.array(z.string()).default([]),
  rolesNeed: z.array(z.string()).min(1, "Specify at least one needed role"),
  commitmentLevel: z.enum(['hardcore', 'moderate', 'casual']).default('moderate'),
});

export const CreateTechShowdownSchema = z.object({
  topic: z.string().min(3, "Debate topic required"),
  optionAName: z.string().min(1, "Option A name required"),
  optionADescription: z.string().optional(),
  optionBName: z.string().min(1, "Option B name required"),
  optionBDescription: z.string().optional(),
  benchmark: z.string().optional(),
});

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

export const UpdateUser = z.object({
  user_name: z.string().min(2, "Username must be at least 2 characters").max(30).regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores").optional(),
  name: z.string().max(50).optional(),
  bio: z.string().max(250).optional(),
  gender: z.string().optional(),
  website: z.string().optional(),
  repo: z.string().optional(),
  image: z.string().optional(),
  radarStatus: z.enum(['open_for_hackathons', 'seeking_cofounder', 'open_for_collab', 'open_for_work', 'none']).optional(),
  techStack: z.array(z.string()).optional(),
});
export const DeleteUser = UserSchema.pick({ id: true });
export const FollowUser = UserSchema.pick({ id: true });