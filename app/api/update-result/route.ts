// app/api/poll-votes/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { PollVote } from '@/models/User';

export async function POST(req: Request) {
  console.log('Received request to update poll result');
  await connectDB();

  const { pollId, userId, selectedOptionIndex } = await req.json();

  console.log('Received data:', { pollId, userId, selectedOptionIndex });

  if (!pollId || !userId || selectedOptionIndex === undefined) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    // upsert vote (one vote per user per poll)
    const vote = await PollVote.findOneAndUpdate(
      { pollId, userId },
      { selectedOptionIndex },
      { upsert: true, new: true }
    );

    return NextResponse.json(vote, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 });
  }
}
