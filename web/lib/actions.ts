"use server";

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

  const { bio, gender, image, name, user_name, website, repo } = validatedFields.data;

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