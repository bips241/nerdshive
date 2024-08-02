import { unstable_noStore as noStore } from "next/cache";

import {User,Post,Comment,Like,SavedPost} from '../models/User';
import connectDB from './db';
import { getUserId } from "./getSession";



export async function fetchPosts() {
  const userId = await getUserId();
    await connectDB();
    noStore();
    try {
      const posts = await Post.find({}).select('-__v')
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
          populate: {
            path: 'userId',
            select: '-updatedAt -role -comments -followedBy -following -createdAt -isVerified -email -posts -saved -password -verifyCode -sessions -accounts -verifyCodeExpiry -__v', // Exclude multiple fields
          },
        })
        .populate({
          path: 'userId',
          select: '-updatedAt -role -comments -followedBy -following -createdAt -isVerified -email -posts -saved -password -verifyCode -sessions -accounts -verifyCodeExpiry -__v', // Exclude multiple fields
        })
        .sort({ createdAt: -1 });
  const plainPosts = posts.map(post => post.toObject()); // Convert Mongoose documents to plain objects
        
        return plainPosts.map(post => {
            const likesCount = post.likes.length;
            const isLikedByCurrentUser = post.likes.some((like: { userId: { _id: { toString: () => string | null; }; }; }) => like.userId._id.toString() === userId);
            
            return {
                ...post,
                likesCount,
                isLikedByCurrentUser,
            };
        });
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch posts');
    }
}

export async function fetchPostById(id: any) {
    await connectDB();
    noStore();
    try {
    const post = await Post.findById(id)
      .populate({
        path: 'comments',
        populate: {
            path: 'user',
            select: '-password -verifyCode -sessions -accounts -verifyCodeExpiry'
          },
        options: { sort: { createdAt: -1 } }
      })
      .populate({
        path: 'likes',
        populate: {
            path: 'user',
            select: '-password -verifyCode -sessions -accounts -verifyCodeExpiry'
          }
      })
      .populate('savedBy')
      .populate('userId');

    return post;
  } catch (error) {
    console.error("Database Error:", error);
    throw new Error("Failed to fetch post");
  }
}

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
            path: 'user',
            select: '-password -verifyCode -sessions -accounts -verifyCodeExpiry'
          },
          options: { sort: { createdAt: -1 } }
        },
        {
          path: 'likes',
          populate: { path: 'user' }
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
        options: { sort: { createdAt: -1 } }
      })
      .populate({
        path: 'saved',
        options: { sort: { createdAt: -1 } }
      })
      .populate({
        path: 'followedBy',
        populate: {
          path: 'follower',
          populate: ['following', 'followedBy']
        }
      })
      .populate({
        path: 'following',
        populate: {
          path: 'following',
          populate: ['following', 'followedBy']
        }
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
                path: 'user',
                select: '-password -verifyCode -sessions -accounts -verifyCodeExpiry' // Exclude the password -verifyCode -sessions -accounts -verifyCodeExpiry field
              },
            options: { sort: { createdAt: -1 } }
          },
          {
            path: 'likes',
            populate: {
                path: 'user',
                select: '-password -verifyCode -sessions -accounts -verifyCodeExpiry' // Exclude the password -verifyCode -sessions -accounts -verifyCodeExpiry field
              }
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
