import React from 'react';
import { auth } from '@/auth';
import connectDB from '@/lib/db';
import { User } from '@/models/User';
import { redirect } from 'next/navigation';
import RadarMatchClient from '@/components/radar/RadarMatchClient';
import { getRadarInitialContextAction } from '@/lib/radar-actions';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams?: {
    mode?: string;
    hackathon?: string;
  };
}

export default async function RadarPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?._id) {
    redirect('/login?callbackUrl=/dashboard/radar');
  }

  await connectDB();
  const dbUser: any = await User.findById(session.user._id).lean();

  const requestedSlug = searchParams?.hackathon;
  const radarContext = await getRadarInitialContextAction(requestedSlug);

  return (
    <RadarMatchClient
      currentUser={{
        _id: session.user._id.toString(),
        user_name: dbUser?.user_name || (session.user as any).username || 'developer',
        name: dbUser?.name || session.user.name || 'Developer',
        image: dbUser?.image || session.user.image,
        bio: dbUser?.bio || '',
        college: dbUser?.college || '',
        location: dbUser?.location || '',
        timezone: dbUser?.timezone || '',
        techStack: dbUser?.techStack || [],
        debugKarma: dbUser?.debugKarma || 0,
        bugsSolvedCount: dbUser?.bugsSolvedCount || 0,
        occupancyStatus: dbUser?.occupancyStatus || 'open',
        acceptingRequests: dbUser?.acceptingRequests !== false,
        preferredRole: dbUser?.preferredRole || 'Fullstack Developer',
      }}
      initialHackathons={radarContext.verifiedHackathons || []}
      initialUserSquads={radarContext.userSquads || []}
      initialSelectedSlug={radarContext.selectedSlug || 'hackmit-2026'}
      initialFreeAgents={radarContext.freeAgents || { teams: [], soloHackers: [] }}
      initialUserSettings={radarContext.userSettings}
    />
  );
}
