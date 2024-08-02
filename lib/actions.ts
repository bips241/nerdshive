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

import { User, Post, Like, SavedPost, Comment, Follows } from "@/models/User";

export async function createPost(values: z.infer<typeof CreatePost>) {
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
    await Post.create({ caption, fileUrl, userId });
  } catch (error) {
    return { message: "Database Error: Failed to Create Post." };
  }
}

export async function deletePost(formData: { get: (arg0: string) => any; }) {
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
  const userId = await getUserId();
  const validatedFields = UpdateUser.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Missing Fields. Failed to Update Profile.",
    };
  }

  const { bio, gender, image, name, user_name, website } = validatedFields.data;

  try {
    await User.updateOne(
      { _id: userId },
      { bio, gender, image, name, user_name, website }
    );
    revalidatePath("/dashboard");
    return { message: "Updated Profile." };
  } catch (error) {
    return { message: "Database Error: Failed to Update Profile." };
  }
}

export async function followUser(formData: { get: (arg0: string) => any; }) {
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
