import { NextRequest, NextResponse } from 'next/server';
import { Follows } from '@/models/User';
import connectDB from '@/lib/db';
import { fetchProfile } from '@/lib/data';
import { User } from '@/lib/definitions';

export async function POST(req: NextRequest, { params }: { params: { name: string } }) {
    const { name } = params;

    try {
        await connectDB();

        const body = await req.json();
        const { followerId } = body;

        if (!followerId || !name) {
            return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
        }
        
        const user: User = await fetchProfile(name);

        const existingFollow = await Follows.findOne({
            followerId,
            followingId: user._id,
        });

        const isFollowing = !!existingFollow;

        return NextResponse.json({ isFollowing }, { status: 200 });
    } catch (error) {
        console.error('Error processing follow request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
