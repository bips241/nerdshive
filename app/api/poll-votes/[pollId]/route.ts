// app/api/poll-votes/[pollId]/route.ts
import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { PollVote } from '@/models/User';

export async function GET(req: Request, { params }: { params: { pollId: string } }) {
  await connectDB();

  try {
    const votes = await PollVote.find({ pollId: params.pollId });

    const totalVotes = votes.length;
    const optionCounts: { [key: number]: number } = {};

    votes.forEach((vote) => {
      optionCounts[vote.selectedOptionIndex] = (optionCounts[vote.selectedOptionIndex] || 0) + 1;
    });

    return NextResponse.json({ totalVotes, optionCounts }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch poll stats' }, { status: 500 });
  }
}
