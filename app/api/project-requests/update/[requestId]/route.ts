import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { ProjectRequest } from '@/models/User';
import { Post } from '@/models/User';// <-- (import Post model if not imported yet)

export async function PATCH(req: Request, { params }: { params: { requestId: string } }) {
  await connectDB();

  try {
    const { status } = await req.json();

    if (!['accepted', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updatedRequest = await ProjectRequest.findByIdAndUpdate(
      params.requestId,
      { status },
      { new: true }
    );

    if (!updatedRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    //If accepted, add requesterId to post.project.members
    if (status === 'accepted') {
      await Post.findByIdAndUpdate(
        updatedRequest.projectId, // projectId is stored in request
        { $addToSet: { 'project.members': updatedRequest.requesterId } }, // prevent duplicates
      );
    }

    return NextResponse.json(updatedRequest, { status: 200 });
  } catch (error) {
    console.error('Error updating project request:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
