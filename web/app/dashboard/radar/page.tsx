import React from 'react';
import { auth } from '@/auth';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { redirect } from 'next/navigation';
import RadarMatchClient from '@/components/radar/RadarMatchClient';

export const dynamic = 'force-dynamic';

export default async function RadarPage() {
  const session = await auth();
  if (!session?.user?._id) {
    redirect('/login?callbackUrl=/dashboard/radar');
  }

  await connectDB();
  const dbUser: any = await User.findById(session.user._id).lean();

  return (
    <RadarMatchClient
      currentUser={{
        _id: session.user._id.toString(),
        user_name: dbUser?.user_name || (session.user as any).username || 'developer',
        name: dbUser?.name || session.user.name || 'Developer',
        image: dbUser?.image || session.user.image,
        bio: dbUser?.bio || '',
        skills: dbUser?.skills || [],
      }}
    />
  );
}
