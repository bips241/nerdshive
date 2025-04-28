import { NextResponse } from 'next/server';
import  connectDB  from '@/lib/db'; // <-- your MongoDB connection file
import { ProjectRequest } from '@/models/User';
import { User } from '@/models/User';

export async function GET(req: Request, { params }: { params: { postId: string } }) {
  await connectDB();
  
  try {
    const requests = await ProjectRequest.find({ projectId: params.postId })
      .populate({ path: 'requesterId', model: User, select: 'user_name' })
      .lean();
    return NextResponse.json(requests, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Error fetching requests' }, { status: 500 });
  }
}
export async function PATCH(req: Request, { params }: { params: { requestId: string } }) {
    await connectDB();
  
    const { status } = await req.json();
    console.log('Status:', status);
  
    if (!['accepted', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
  
    try {
      const updatedRequest = await ProjectRequest.findByIdAndUpdate(
        params.requestId,
        { status },
        { new: true }
      );
  
      if (!updatedRequest) {
        return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      }
  
      return NextResponse.json(updatedRequest, { status: 200 });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
    }
  }