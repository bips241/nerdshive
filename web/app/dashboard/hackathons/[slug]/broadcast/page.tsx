import { getHackathonBroadcastState } from '@/lib/hackathon-actions';
import BroadcastClient from './broadcast-client';

interface Props {
  params: {
    slug: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function HackathonBroadcastPage({ params: { slug } }: Props) {
  const data = await getHackathonBroadcastState(slug);

  if (!data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Hackathon broadcast not found.
      </div>
    );
  }

  return (
    <BroadcastClient
      hackathon={data.hackathon}
      leaderboard={data.leaderboard}
      totalTeams={data.totalTeams}
    />
  );
}
