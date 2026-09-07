import { unstable_noStore as noStore } from "next/cache";

import {User,Post,Comment,Like,SavedPost} from '../models/User';
import connectDB from './db';
import { auth } from "@/auth";
import { getUserId } from "./getSession";

export async function fetchPosts(limit = 20) {
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.user?._id?.toString() || null;
  } catch (_) {}

  await connectDB();
  try {
    const posts = await Post.find({ isDeleted: { $ne: true } })
      .select('-__v')
      .populate({
        path: 'comments',
        options: { limit: 5, sort: { createdAt: -1 } },
        populate: {
          path: 'userId',
          select: 'user_name image name',
        },
      })
      .populate({
        path: 'likes',
        select: 'userId',
      })
      .populate({
        path: 'userId',
        select: 'user_name image name email',
      })
      .populate({
        path: 'hackathonCrew.members.user',
        select: 'user_name image name',
      })
      .populate({
        path: 'hackathonCrew.applicants.user',
        select: 'user_name image name',
      })
      .populate({
        path: 'shipLog.alphaTesters',
        select: 'user_name image name',
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return posts.map((post: any) => {
      const likesCount = post.likes?.length || 0;
      const isLikedByMe =
        (post.likes as any[])?.some(
          (like: any) => (like.userId?._id || like.userId || like).toString() === userId
        ) || false;

      const res = {
        ...post,
        _id: post._id.toString(),
        userId: post.userId
          ? {
              ...post.userId,
              _id: post.userId._id?.toString() || post.userId.toString(),
            }
          : post.userId,
        likesCount,
        isLikedByMe,
      };
      return JSON.stringify(res);
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch posts');
  }
}


export async function fetchPostById(id: any) {
  const userId = await getUserId();

  console.log('id:', id);
  await connectDB();
  noStore();

  try {
    const post = await Post.findOne({ _id: id, isDeleted: { $ne: true } })
      .populate({
        path: 'comments',
        populate: {
          path: 'userId',
          select: '-password -verifyCode -sessions -accounts -verifyCodeExpiry'
        },
        options: { sort: { createdAt: -1 } }
      })
      .populate({
        path: 'likes',
        select: 'user_name image name _id',
      })
      .populate({
        path: 'hackathonCrew.members.user',
        select: 'user_name image name',
      })
      .populate({
        path: 'hackathonCrew.applicants.user',
        select: 'user_name image name',
      })
      .populate({
        path: 'shipLog.alphaTesters',
        select: 'user_name image name',
      })
      .populate('savedBy')
      .populate('userId');

    // Determine if the post is liked by the current user
    const isLikedByMe = (post.likes as any[])?.some((like: any) => {
      const id = (like.userId?._id || like.userId || like._id || like)?.toString();
      return id === userId;
    }) || false;

    // Add isLikedByCurrentUser to the post object
    const postWithLikeStatus = {
      ...post.toObject(), // Convert Mongoose document to plain JavaScript object
      isLikedByMe,
    };

    return JSON.stringify(postWithLikeStatus);
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch post");
  }
}

///
export async function fetchProfilePosts(username: string) {
  await connectDB();
  noStore();

  try {
    const user = await User.findOne({ user_name: username });
    console.log('user:', username);
    if (!user) throw new Error("User not found");

    const posts = await Post.find({ userId: user._id.toString(), isDeleted: { $ne: true } }).select('-__v')
      .populate({
        path: 'comments',
        populate: {
          path: 'userId',
          select: '-updatedAt -role -comments -followedBy -following -createdAt -isVerified -email -posts -saved -password -verifyCode -sessions -accounts -verifyCodeExpiry -__v',
        },
        options: { sort: { createdAt: -1 } },
      })
      .populate({
        path: 'likes',
        select: 'user_name image name _id',
      })
      .populate({
        path: 'userId',
        select: '-updatedAt -role -comments -followedBy -following -createdAt -isVerified -email -posts -saved -password -verifyCode -sessions -accounts -verifyCodeExpiry -__v',
      })
      .populate({
        path: 'hackathonCrew.members.user',
        select: 'user_name image name',
      })
      .populate({
        path: 'hackathonCrew.applicants.user',
        select: 'user_name image name',
      })
      .populate({
        path: 'shipLog.alphaTesters',
        select: 'user_name image name',
      })
      .sort({ createdAt: -1 });

    const plainPosts = posts.map(post => post.toObject());

    return plainPosts.map(post => {
      const likesCount = post.likes?.length || 0;
      const isLikedByMe = false; // optional: set based on logged-in user if needed

      return JSON.stringify({
        ...post,
        likesCount,
        isLikedByMe
      });
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch posts');
  }
}
///
export async function fetchPostsByUsername(username: any, postId: any) {
await connectDB();
noStore();
  try {
    const user = await User.findOne({ user_name: username }).populate({
      path: 'posts',
      match: { _id: { $ne: postId } },
      populate: [
        {
          path: 'comments',
          populate: {
            path: 'userId',
            select: '-password -verifyCode -sessions -accounts -verifyCodeExpiry'
          },
          options: { sort: { createdAt: -1 } }
        },
        {
          path: 'likes',
          select: 'user_name image name _id',
        },
        'savedBy',
        'userId'
      ],
      options: { sort: { createdAt: -1 } }
    });

    return user.posts;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch posts");
  }
}

export async function fetchProfile(username: any) {
  noStore();
  await connectDB();
  try {
    const user = await User.findOne({ user_name: username })
      .populate({
        path: 'posts',
        options: { sort: { createdAt: -1 } },
      })
      .populate({
        path: 'saved',
        options: { sort: { createdAt: -1 } },
      });

    return user;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch profile");
  }
}

export async function fetchSavedPostsByUsername(username: any) {
  noStore();
    await connectDB();
    try {
    const user = await User.findOne({ user_name: username }).populate({
      path: 'saved',
      populate: {
        path: 'post',
        populate: [
          {
            path: 'comments',
            populate: {
                path: 'userId',
                select: '-password -verifyCode -sessions -accounts -verifyCodeExpiry'
              },
            options: { sort: { createdAt: -1 } }
          },
          {
            path: 'likes',
            select: 'user_name image name _id',
          },
          'savedBy',
          'userId'
        ]
      },
      options: { sort: { createdAt: -1 } }
    });

    return user.saved;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch saved posts");
  }
}
