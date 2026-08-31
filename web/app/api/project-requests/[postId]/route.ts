export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { ProjectRequest, User } from '@/models/User';

export async function GET(req: Request, { params }: { params: { postId: string } }) {
  await connectDB();
  
  try {
    const requests = await ProjectRequest.find({ projectId: params.postId })
      .populate({ path: 'requesterId', model: User, select: 'user_name image email' })
      .lean();
    return NextResponse.json(requests, { status: 200 });
  } catch (error) {
    console.error('Error fetching project requests:', error);
    return NextResponse.json({ error: 'Error fetching requests' }, { status: 500 });
  }
}