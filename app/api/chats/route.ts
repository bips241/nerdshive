import { NextResponse } from 'next/server';
import { getSession } from '@/lib/getSession';
import { Follows, User } from '@/models/User';
import connectDB from '@/lib/db';
import mongoose from 'mongoose';
import { auth } from '@/auth';

export async function GET() {
  try {
    // Get authenticated user session
    const session = await auth();
    if (!session || !session.user?._id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to DB
    await connectDB();

    const userId = session.user._id;

    console.log('User ID:', userId);

    // Step 1: Find mutual follows
    const mutualFollows = await Follows.aggregate([
      { $match: { followerId: userId } },
      {
      $lookup: {
        from: 'follows',
        localField: 'followingId',
        foreignField: 'followerId',
        as: 'reverseFollows',
      },
      },
      { $unwind: { path: '$reverseFollows', preserveNullAndEmptyArrays: false } },
      {
      $match: {
        $expr: {
        $eq: ['$followerId', '$reverseFollows.followingId'],
        },
      },
      },
    ]);

    // Step 2: Extract valid following IDs
    const userIds = mutualFollows
      .map((follow: any) => follow.followingId)
      .filter((id: any) => id.toString() !== userId.toString());

      console.log('Mutual follows:', mutualFollows);

    if (!userIds.length) {
      return NextResponse.json([], { status: 200 }); // No mutual follows
    }

    // Step 3: Get user details
    const users = await User.find({ _id: { $in: userIds } }).select('user_name avatar');

    // Step 4: Format result
    const result = users.map((user: any) => ({
      id: user._id.toString(),
      name: user.user_name || 'Unnamed',
      avatar: user.avatar || '',
    }));

    console.log('Formatted users:', result);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error fetching mutual follows:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
