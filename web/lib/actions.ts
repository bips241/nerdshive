"use server";

import { auth } from "@/auth";
import { getUserId } from "@/lib/getSession";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  BookmarkSchema,
  CreateComment,
  CreatePost,
  DeleteComment,
  DeletePost,
  FollowUser,
  LikeSchema,
  UpdatePost,
  UpdateUser,
} from "@/schemas/Post";

import { User, Post, Like, SavedPost, Comment, Follows, ProjectRequest } from "@/models/User";
import connectDB from "@/lib/db";

export async function createPost(values: z.infer<typeof CreatePost>) {
  console.log("Creating Post:", values);
  await connectDB();
  const userId = await getUserId();

  const validatedFields = CreatePost.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Post.",
    };
  }

  const { fileUrl, caption } = validatedFields.data;

  try {
    const newPost = await Post.create({ caption, fileUrl, userId });
    await User.findByIdAndUpdate(userId, { $push: { posts: newPost._id } });
    revalidatePath("/dashboard");
    return { message: "Created Post.", post: newPost };
  } catch (error) {
    return { message: "Database Error: Failed to Create Post." };
  }
}

export async function deletePost(formData: { get: (arg0: string) => any; }) {
  await connectDB();
  const userId = await getUserId();
  const { id } = DeletePost.parse({ id: formData.get("id") });

  const post = await Post.findOne({ _id: id, userId });

  if (!post) {
    throw new Error("Post not found");
  }

  try {
    await Post.deleteOne({ _id: id });
    revalidatePath("/dashboard");
    return { message: "Deleted Post." };
  } catch (error) {
    return { message: "Database Error: Failed to Delete Post." };
  }
}

export async function likePost(value: any) {
  await connectDB();
  const userId = await getUserId();
  const validatedFields = LikeSchema.safeParse({ postId: value });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Like Post.",
    };
  }

  const { postId } = validatedFields.data;
  const post = await Post.findById(postId);

  if (!post) {
    throw new Error("Post not found");
  }

  const like = await Like.findOne({ postId, userId });

  try {
    if (like) {
      await Like.deleteOne({ postId, userId });
      await Post.findByIdAndUpdate(postId, { $pull: { likes: like._id } });
      await User.findByIdAndUpdate(userId, { $pull: { likes: like._id } });
      revalidatePath("/dashboard");
      return { message: "Unliked Post." };
    } else {
      const newLike = await Like.create({ postId, userId });
      await Post.findByIdAndUpdate(postId, { $push: { likes: newLike._id } });
      await User.findByIdAndUpdate(userId, { $push: { likes: newLike._id } });
      revalidatePath("/dashboard");
      return { message: "Liked Post." };
    }
  } catch (error) {
    return { message: "Database Error: Failed to (Un)Like Post." };
  }
}

export async function bookmarkPost(value: any) {
  await connectDB();
  const userId = await getUserId();
  const validatedFields = BookmarkSchema.safeParse({ postId: value });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Bookmark Post.",
    };
  }

  const { postId } = validatedFields.data;
  
  const post = await Post.findById(postId);

  if (!post) {
    throw new Error("Post not found.");
  }

  const bookmark = await SavedPost.findOne({ postId, userId });

  try {
    if (bookmark) {
      await SavedPost.deleteOne({ postId, userId });
      
      await Post.findByIdAndUpdate(postId, { $pull: { savedBy: userId } });
      await User.findByIdAndUpdate(userId, { $pull: { saved: postId } });
      revalidatePath("/dashboard");
      return { message: "Unbookmarked Post." };
    } else {
      
      const newBookMark = await SavedPost.create({ postId, userId });
      await Post.findByIdAndUpdate(postId, { $push: { savedBy: newBookMark.userId } });
      await User.findByIdAndUpdate(userId, { $push: { saved: postId } });

      revalidatePath("/dashboard");
      return { message: "Bookmarked Post." };
    }
  } catch (error) {
    return { message: "Database Error: Failed to (Un)Bookmark Post." };
  }
}

export async function createComment(values: unknown) {
  await connectDB();
  const userId = await getUserId();
  const validatedFields = CreateComment.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Create Comment.",
    };
  }

  const { postId, body } = validatedFields.data;
  const post = await Post.findById(postId);

  if (!post) {
    throw new Error("Post not found");
  }

  try {
    const newComment = await Comment.create({ body, postId, userId });
    await User.findByIdAndUpdate(userId, { $push: { comments: newComment._id } });
    await Post.findByIdAndUpdate(postId, { $push: { comments: newComment._id } });
    revalidatePath("/dashboard");
    return { message: "Created Comment." };
  } catch (error) {
    return { message: "Database Error: Failed to Create Comment." };
  }
}

export async function deleteComment(formData: { get: (arg0: string) => any; }) {
  await connectDB();
  const userId = await getUserId();
  const { id } = DeleteComment.parse({ id: formData.get("id") });

  const comment = await Comment.findOne({ _id: id, userId });

  if (!comment) {
    throw new Error("Comment not found");
  }

  try {
    await Comment.deleteOne({ _id: id });
    // await User.findByIdAndUpdate(userId, { $pull: { comments: newComment._id } });
    // await Post.findByIdAndUpdate(postId, { $pull: { comments: newComment._id } });
    revalidatePath("/dashboard");
    return { message: "Deleted Comment." };
  } catch (error) {
    return { message: "Database Error: Failed to Delete Comment." };
  }
}

export async function updatePost(values: unknown) {
  await connectDB();
  const userId = await getUserId();
  const validatedFields = UpdatePost.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Update Post.",
    };
  }

  const { id, fileUrl, caption } = validatedFields.data;
  const post = await Post.findOne({ _id: id, userId });

  if (!post) {
    throw new Error("Post not found");
  }

  try {
    await Post.updateOne({ _id: id }, { fileUrl, caption });
    revalidatePath("/dashboard");
    redirect("/dashboard");
  } catch (error) {
    return { message: "Database Error: Failed to Update Post." };
  }
}

export async function updateProfile(values: unknown) {
  await connectDB();
  const userId = await getUserId();
  const validatedFields = UpdateUser.safeParse(values);

  if (!validatedFields.success) {
    const errorDetails = Object.values(validatedFields.error.flatten().fieldErrors).flat().join(", ");
    return {
      success: false,
      error: errorDetails || "Invalid profile fields. Please check your inputs.",
    };
  }

  const { bio, gender, image, name, user_name, website, repo, radarStatus, techStack } = validatedFields.data;

  try {
    // Check if new user_name is already taken by another account
    if (user_name) {
      const existingUser = await User.findOne({
        user_name,
        _id: { $ne: userId },
      });

      if (existingUser) {
        return {
          success: false,
          error: `Username "${user_name}" is already taken by another developer.`,
        };
      }
    }

    const updatePayload: Record<string, any> = {};
    if (user_name !== undefined) updatePayload.user_name = user_name;
    if (name !== undefined) updatePayload.name = name;
    if (bio !== undefined) updatePayload.bio = bio;
    if (gender !== undefined) updatePayload.gender = gender;
    if (website !== undefined) updatePayload.website = website;
    if (repo !== undefined) updatePayload.repo = repo;
    if (image !== undefined) updatePayload.image = image;
    if (radarStatus !== undefined) updatePayload.radarStatus = radarStatus;
    if (techStack !== undefined) updatePayload.techStack = techStack;

    await User.findByIdAndUpdate(userId, updatePayload, { new: true });

    revalidatePath("/dashboard");
    if (user_name) {
      revalidatePath(`/dashboard/user/${user_name}`);
    }

    return {
      success: true,
      message: "Profile updated successfully.",
      user_name,
    };
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return {
      success: false,
      error: error.message || "Database Error: Failed to Update Profile.",
    };
  }
}

export async function followUser(formData: { get: (arg0: string) => any; }) {
  await connectDB();
  const userId = await getUserId();
  const { id } = FollowUser.parse({ id: formData.get("id") });

  const user = await User.findById(id);

  if (!user) {
    throw new Error("User not found");
  }

  const follows = await Follows.findOne({
    followerId: userId,
    followingId: id,
  });

  try {
    if (follows) {
      await Follows.deleteOne({ followerId: userId, followingId: id });
      revalidatePath("/dashboard");
      return { message: "Unfollowed User." };
    } else {
      await Follows.create({ followerId: userId, followingId: id });
      revalidatePath("/dashboard");
      return { message: "Followed User." };
    }
  } catch (error) {
    return { message: "Database Error: Failed to (Un)Follow User." };
  }
}



export const submitPollPost = async (data: { question: string; options: string[] }) => {
  await connectDB();
  const userId = await getUserId();

  try {
    const newPost = await Post.create({
      poll: {
        question: data.question,
        options: data.options.map((opt) => ({ text: opt, votes: [] })),
      },
      postType: "poll",
      userId,
    });
    await User.findByIdAndUpdate(userId, { $push: { posts: newPost._id } });
    revalidatePath("/dashboard");
    return { success: true, post: newPost };
  } catch (error) {
    console.error(error);
    throw new Error("Database Error: Failed to create Poll Post.");
  }
};

export const submitGoalPost = async (data: { goal: string; goalTargetDate: Date }) => {
  console.log("Submitting Goal:", data);
  await connectDB();
  const userId = await getUserId();

  try {
    console.log("Creating Goal Post with data:", data);
    const newPost = await Post.create({
      goal: {
        description: data.goal,
        goalTargetDate: data.goalTargetDate,
        interestedUsers: [],
      },
      postType: "goal",
      userId,
    });
    await User.findByIdAndUpdate(userId, { $push: { posts: newPost._id } });
    revalidatePath("/dashboard");
    return { success: true, post: newPost };
  } catch (error) {
    console.error(error);
    throw new Error("Database Error: Failed to create Goal Post.");
  }
};

export const submitProjectPost = async (data: { title: string; description: string; techStack: string; repoUrl?: string | null }) => {
  console.log("Submitting Project:", data);
  await connectDB();
  const userId = await getUserId();

  try {
    const newPost = await Post.create({
      postType: "project",
      userId,
      project: {
        title: data.title,
        description: data.description,
        techStack: data.techStack.split(",").map((tech) => tech.trim()),
        repoUrl: data.repoUrl || null,
      },
    });
    await User.findByIdAndUpdate(userId, { $push: { posts: newPost._id } });
    revalidatePath("/dashboard");
    return { success: true, post: newPost };
  } catch (error) {
    console.error(error);
    throw new Error("Database Error: Failed to create Project Post.");
  }
};

export const submitShipLogPost = async (data: {
  title: string;
  pitch: string;
  version?: string;
  demoUrl?: string;
  repoUrl?: string;
  techStack: string[];
  feedbackWanted?: string[];
}) => {
  await connectDB();
  const userId = await getUserId();
  try {
    const newPost = await Post.create({
      userId,
      postType: "ship_log",
      caption: `${data.title} — ${data.pitch}`,
      shipLog: {
        title: data.title,
        pitch: data.pitch,
        version: data.version || "v0.1.0",
        demoUrl: data.demoUrl || undefined,
        repoUrl: data.repoUrl || undefined,
        techStack: data.techStack || [],
        feedbackWanted: data.feedbackWanted || [],
        alphaTesters: [],
        changelog: [],
      },
    });
    await User.findByIdAndUpdate(userId, { $push: { posts: newPost._id } });
    revalidatePath("/dashboard");
    return { success: true, post: newPost };
  } catch (error) {
    console.error("Ship log submission error:", error);
    throw new Error("Database Error: Failed to create Ship Log post.");
  }
};

export const submitCodeSosPost = async (data: {
  title: string;
  snippet: string;
  language?: string;
  errorLog?: string;
  environment?: string;
  triedSteps?: string;
}) => {
  await connectDB();
  const userId = await getUserId();
  try {
    const newPost = await Post.create({
      userId,
      postType: "code_sos",
      caption: `[Code SOS] ${data.title}`,
      codeSos: {
        title: data.title,
        snippet: data.snippet,
        language: data.language || "typescript",
        errorLog: data.errorLog || undefined,
        environment: data.environment || undefined,
        triedSteps: data.triedSteps || undefined,
        isResolved: false,
      },
    });
    await User.findByIdAndUpdate(userId, { $push: { posts: newPost._id } });
    revalidatePath("/dashboard");
    return { success: true, post: newPost };
  } catch (error) {
    console.error("Code SOS submission error:", error);
    throw new Error("Database Error: Failed to create Code SOS post.");
  }
};

export const submitArchitectureRfcPost = async (data: {
  title: string;
  challenge: string;
  diagramMarkdown?: string;
  tradeOffs?: Array<{ option: string; pros: string; cons: string }>;
  targetAudience?: string;
}) => {
  await connectDB();
  const userId = await getUserId();
  try {
    const newPost = await Post.create({
      userId,
      postType: "architecture_rfc",
      caption: `[RFC] ${data.title}`,
      architectureRfc: {
        title: data.title,
        challenge: data.challenge,
        diagramMarkdown: data.diagramMarkdown || undefined,
        tradeOffs: data.tradeOffs || [],
        targetAudience: data.targetAudience || undefined,
      },
    });
    await User.findByIdAndUpdate(userId, { $push: { posts: newPost._id } });
    revalidatePath("/dashboard");
    return { success: true, post: newPost };
  } catch (error) {
    console.error("Architecture RFC submission error:", error);
    throw new Error("Database Error: Failed to create Architecture RFC post.");
  }
};

export const submitHackathonCrewPost = async (data: {
  hackathonName: string;
  urgencyDate?: string;
  rolesHave: string[];
  rolesNeed: string[];
  commitmentLevel?: "hardcore" | "moderate" | "casual";
  maxSquadSize?: number;
}) => {
  await connectDB();
  const userId = await getUserId();
  try {
    const newPost = await Post.create({
      userId,
      postType: "hackathon_crew",
      caption: `[Team Call] ${data.hackathonName} — Seeking ${data.rolesNeed.join(", ")}`,
      hackathonCrew: {
        hackathonName: data.hackathonName,
        urgencyDate: data.urgencyDate ? new Date(data.urgencyDate) : undefined,
        rolesHave: data.rolesHave || [],
        rolesNeed: data.rolesNeed || [],
        commitmentLevel: data.commitmentLevel || "moderate",
        squadStatus: "recruiting",
        maxSquadSize: data.maxSquadSize || 4,
        members: [],
        applicants: [],
      },
    });
    await User.findByIdAndUpdate(userId, { $push: { posts: newPost._id } });
    revalidatePath("/dashboard");
    return { success: true, post: newPost };
  } catch (error) {
    console.error("Hackathon crew submission error:", error);
    throw new Error("Database Error: Failed to create Hackathon Crew post.");
  }
};

export const submitTechShowdownPost = async (data: {
  topic: string;
  optionAName: string;
  optionADescription?: string;
  optionBName: string;
  optionBDescription?: string;
  benchmark?: string;
}) => {
  await connectDB();
  const userId = await getUserId();
  try {
    const newPost = await Post.create({
      userId,
      postType: "tech_showdown",
      caption: `[Tech Showdown] ${data.topic}: ${data.optionAName} vs ${data.optionBName}`,
      techShowdown: {
        topic: data.topic,
        optionA: {
          name: data.optionAName,
          description: data.optionADescription || undefined,
          votes: 0,
        },
        optionB: {
          name: data.optionBName,
          description: data.optionBDescription || undefined,
          votes: 0,
        },
        benchmark: data.benchmark || undefined,
      },
    });
    await User.findByIdAndUpdate(userId, { $push: { posts: newPost._id } });
    revalidatePath("/dashboard");
    return { success: true, post: newPost };
  } catch (error) {
    console.error("Tech showdown submission error:", error);
    throw new Error("Database Error: Failed to create Tech Showdown post.");
  }
};

export const voteTechShowdown = async (postId: string, choice: "optionA" | "optionB") => {
  await connectDB();
  try {
    const incField = choice === "optionA" ? "techShowdown.optionA.votes" : "techShowdown.optionB.votes";
    await Post.findByIdAndUpdate(postId, { $inc: { [incField]: 1 } });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error voting on tech showdown:", error);
    return { failure: "Failed to cast vote" };
  }
};

export const handleInterest = async (postId: string, userId: string) => {
  await connectDB();
  try {
    const post = await Post.findById(postId);
    if (!post || !post.goal) {
      return { failure: "Post or goal not found" };
    }
    const alreadyInterested = (post.goal.interestedUsers as any[]).some(
      (id: any) => id.toString() === userId.toString()
    );

    if (alreadyInterested) {
      // If already interested, remove user
      (post.goal.interestedUsers as any).pull(userId);
    } else {
      // Else, add user
      const res = (post.goal.interestedUsers as any).push(userId);
      console.log("Added user to interested users:", res);
    }

    await post.save();

    return { success: true };
  }
  catch (error) {
    console.error("Error finding post:", error);
    return { failure: "Post not found" };
  }
};

export const checkExistingRequest = async (postId: string, userId: string) => {
  await connectDB();
  try {
    const existingRequest = await ProjectRequest.findOne({ projectId: postId, requesterId: userId });

    if (existingRequest) {
      return { status: existingRequest.status };
    }

    return { status: null };
  } catch (error) {
    console.error("Error checking request:", error);
    return { status: null };
  }
};

export const createCollabRequest = async (postId: string, userId: string) => {
  await connectDB();
  try {
    const existingRequest = await ProjectRequest.findOne({ projectId: postId, requesterId: userId });

    if (existingRequest) {
      return { message: "Already requested", status: existingRequest.status };
    }

    await ProjectRequest.create({
      projectId: postId,
      requesterId: userId,
      status: "pending",
    });

    return { success: true, status: "pending" };
  } catch (error) {
    console.error("Error creating collab request:", error);
    return { failure: "Server error" };
  }
};

/**
 * -------------------------------------------------------------
 * FULL-LIFECYCLE DEVELOPER SERVER ACTIONS
 * -------------------------------------------------------------
 */

// 1. Resolve Code SOS and Award Debug Karma
export const resolveCodeSosPost = async ({
  postId,
  commentId,
  solutionSummary,
  helperUserId,
}: {
  postId: string;
  commentId?: string;
  solutionSummary?: string;
  helperUserId?: string;
}) => {
  const session = await auth();
  if (!session?.user?._id) return { failure: "Unauthorized" };
  await connectDB();

  try {
    const post = await Post.findById(postId);
    if (!post || post.postType !== "code_sos") return { failure: "Post not found or not a Code SOS" };

    if (post.userId.toString() !== session.user._id.toString()) {
      return { failure: "Only the author of the SOS can mark it as resolved" };
    }

    post.codeSos = post.codeSos || ({} as any);
    post.codeSos.isResolved = true;
    if (commentId) post.codeSos.resolvedCommentId = commentId as any;
    if (helperUserId) post.codeSos.resolvedBy = helperUserId as any;
    if (solutionSummary) post.codeSos.solutionSummary = solutionSummary;

    await post.save();

    // Award helper 50 Debug Karma and increment bugs solved
    if (helperUserId && helperUserId !== session.user._id.toString()) {
      await User.findByIdAndUpdate(helperUserId, {
        $inc: { debugKarma: 50, bugsSolvedCount: 1 },
      });
    }

    revalidatePath(`/dashboard/p/${postId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error resolving Code SOS:", error);
    return { failure: "Database error resolving Code SOS" };
  }
};

// 2. Join / Leave Ship Log Alpha Testers
export const toggleShipLogAlphaTester = async (postId: string) => {
  const session = await auth();
  if (!session?.user?._id) return { failure: "Unauthorized" };
  const userId = session.user._id;
  await connectDB();

  try {
    const post = await Post.findById(postId);
    if (!post || post.postType !== "ship_log") return { failure: "Ship Log not found" };

    post.shipLog = post.shipLog || ({} as any);
    const alphaTesters = (post.shipLog.alphaTesters || []) as any[];
    const alreadyJoined = alphaTesters.some((id: any) => id.toString() === userId.toString());

    if (alreadyJoined) {
      (post.shipLog.alphaTesters as any).pull(userId);
    } else {
      (post.shipLog.alphaTesters as any).push(userId);
    }

    await post.save();
    revalidatePath(`/dashboard/p/${postId}`);
    revalidatePath("/dashboard");
    return { success: true, joined: !alreadyJoined, count: post.shipLog.alphaTesters?.length || 0 };
  } catch (error) {
    console.error("Error toggling alpha tester:", error);
    return { failure: "Database error" };
  }
};

// 3. Append Ship Log Changelog Milestone
export const appendShipLogChangelog = async ({
  postId,
  version,
  note,
}: {
  postId: string;
  version: string;
  note: string;
}) => {
  const session = await auth();
  if (!session?.user?._id) return { failure: "Unauthorized" };
  await connectDB();

  try {
    const post = await Post.findById(postId);
    if (!post || post.postType !== "ship_log") return { failure: "Ship Log not found" };

    if (post.userId.toString() !== session.user._id.toString()) {
      return { failure: "Only the project creator can post changelog updates" };
    }

    post.shipLog = post.shipLog || ({} as any);
    post.shipLog.changelog = post.shipLog.changelog || [];
    post.shipLog.changelog.push({
      version,
      note,
      date: new Date(),
    } as any);
    post.shipLog.version = version;

    await post.save();
    revalidatePath(`/dashboard/p/${postId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error appending changelog:", error);
    return { failure: "Failed to post update" };
  }
};

// 4. Vote on Architecture RFC Consensus
export const voteRfcConsensus = async ({
  postId,
  choice,
}: {
  postId: string;
  choice: "adoptA" | "adoptB" | "revise";
}) => {
  const session = await auth();
  if (!session?.user?._id) return { failure: "Unauthorized" };
  const userId = session.user._id;
  await connectDB();

  try {
    const post = await Post.findById(postId);
    if (!post || post.postType !== "architecture_rfc") return { failure: "RFC not found" };

    post.architectureRfc = post.architectureRfc || ({} as any);
    post.architectureRfc.votesAdoptA = (post.architectureRfc.votesAdoptA || []) as any;
    post.architectureRfc.votesAdoptB = (post.architectureRfc.votesAdoptB || []) as any;
    post.architectureRfc.votesRevise = (post.architectureRfc.votesRevise || []) as any;

    // Pull user from all lists first
    (post.architectureRfc.votesAdoptA as any).pull(userId);
    (post.architectureRfc.votesAdoptB as any).pull(userId);
    (post.architectureRfc.votesRevise as any).pull(userId);

    // Add to chosen list
    if (choice === "adoptA") (post.architectureRfc.votesAdoptA as any).push(userId);
    else if (choice === "adoptB") (post.architectureRfc.votesAdoptB as any).push(userId);
    else if (choice === "revise") (post.architectureRfc.votesRevise as any).push(userId);

    await post.save();
    revalidatePath(`/dashboard/p/${postId}`);
    revalidatePath("/dashboard");
    return {
      success: true,
      votesAdoptA: post.architectureRfc.votesAdoptA.length,
      votesAdoptB: post.architectureRfc.votesAdoptB.length,
      votesRevise: post.architectureRfc.votesRevise.length,
    };
  } catch (error) {
    console.error("Error voting on RFC:", error);
    return { failure: "Database error voting on RFC" };
  }
};

// 5. Finalize Architecture RFC Decision
export const finalizeRfcDecision = async ({
  postId,
  adoptedOption,
  decisionSummary,
}: {
  postId: string;
  adoptedOption: string;
  decisionSummary: string;
}) => {
  const session = await auth();
  if (!session?.user?._id) return { failure: "Unauthorized" };
  await connectDB();

  try {
    const post = await Post.findById(postId);
    if (!post || post.postType !== "architecture_rfc") return { failure: "RFC not found" };

    if (post.userId.toString() !== session.user._id.toString()) {
      return { failure: "Only the author can finalize an RFC decision" };
    }

    post.architectureRfc = post.architectureRfc || ({} as any);
    post.architectureRfc.status = "adopted";
    post.architectureRfc.adoptedOption = adoptedOption;
    post.architectureRfc.decisionSummary = decisionSummary;

    await post.save();
    revalidatePath(`/dashboard/p/${postId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error finalizing RFC:", error);
    return { failure: "Failed to finalize RFC" };
  }
};

// 6. Apply to Hackathon Crew
export const applyToHackathonCrew = async ({
  postId,
  role,
  pitch,
}: {
  postId: string;
  role: string;
  pitch: string;
}) => {
  const session = await auth();
  if (!session?.user?._id) return { failure: "Unauthorized" };
  const userId = session.user._id;
  await connectDB();

  try {
    const post = await Post.findById(postId);
    if (!post || post.postType !== "hackathon_crew") return { failure: "Hackathon Crew not found" };

    post.hackathonCrew = post.hackathonCrew || ({} as any);
    const applicants = (post.hackathonCrew.applicants || []) as any[];
    const members = (post.hackathonCrew.members || []) as any[];

    if (members.some((m: any) => m.user?.toString() === userId.toString())) {
      return { failure: "You are already a member of this squad!" };
    }

    if (applicants.some((a: any) => a.user?.toString() === userId.toString())) {
      return { failure: "You have already applied to this squad." };
    }

    post.hackathonCrew.applicants = applicants;
    post.hackathonCrew.applicants.push({
      user: userId,
      role,
      pitch,
      appliedAt: new Date(),
    } as any);

    await post.save();
    revalidatePath(`/dashboard/p/${postId}`);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error applying to hackathon squad:", error);
    return { failure: "Database error submitting application" };
  }
};

// 7. Manage Hackathon Crew Applicant (Accept / Decline)
export const manageCrewApplicant = async ({
  postId,
  applicantUserId,
  action,
}: {
  postId: string;
  applicantUserId: string;
  action: "accept" | "decline";
}) => {
  const session = await auth();
  if (!session?.user?._id) return { failure: "Unauthorized" };
  await connectDB();

  try {
    const post = await Post.findById(postId);
    if (!post || post.postType !== "hackathon_crew") return { failure: "Squad not found" };

    if (post.userId.toString() !== session.user._id.toString()) {
      return { failure: "Only the squad leader can accept or decline applicants" };
    }

    post.hackathonCrew = post.hackathonCrew || ({} as any);
    const applicants = (post.hackathonCrew.applicants || []) as any[];
    const targetAppIndex = applicants.findIndex(
      (a: any) => a.user?.toString() === applicantUserId.toString()
    );

    if (targetAppIndex === -1) return { failure: "Applicant not found" };
    const [acceptedApplicant] = applicants.splice(targetAppIndex, 1);

    if (action === "accept") {
      post.hackathonCrew.members = post.hackathonCrew.members || [];
      post.hackathonCrew.members.push({
        user: applicantUserId as any,
        role: acceptedApplicant.role,
        joinedAt: new Date(),
      });

      const maxSquadSize = post.hackathonCrew.maxSquadSize || 4;
      if (post.hackathonCrew.members.length >= maxSquadSize) {
        post.hackathonCrew.squadStatus = "full";
      }
    }

    await post.save();
    revalidatePath(`/dashboard/p/${postId}`);
    revalidatePath("/dashboard");
    return { success: true, action };
  } catch (error) {
    console.error("Error managing applicant:", error);
    return { failure: "Database error" };
  }
};