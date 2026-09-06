import { auth } from '@/auth';
import connectDB from '@/lib/db';
import { HackathonEvent, HackathonRegistration, HackathonEvaluation } from '@/models/User';
import { redirect } from 'next/navigation';
import OrganizerManageClient from './manage-client';

import { canManageHackathon, canJudgeHackathon } from '@/lib/rbac';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Props {
  params: {
    slug: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function HackathonManagePage({ params: { slug } }: Props) {
  const session = await auth();
  if (!session?.user?._id) {
    redirect('/login');
  }

  await connectDB();

  const event: any = await HackathonEvent.findOne({ slug: slug.toLowerCase() })
    .populate({
      path: 'judges',
      select: 'user_name name image email role',
    })
    .lean();

  if (!event) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Hackathon not found.
      </div>
    );
  }

  // Strict RBAC Guard: Only official organizer, assigned judge, or platform admin can enter
  const isOrganizer = canManageHackathon(session.user, event);
  const isJudge = canJudgeHackathon(session.user, event);

  if (!isOrganizer && !isJudge) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 rounded-2xl border border-border/80 bg-card text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-foreground">403 Forbidden: Access Restricted</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          You do not have organizer or judging permissions for <strong>{event.name}</strong>. Only the official host, appointed judges, or platform administrators have access to this operations console.
        </p>
        <div className="pt-2 flex justify-center">
          <Link href={`/dashboard/hackathons/${slug}`}>
            <Button size="sm" variant="outline" className="text-xs gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Event Hub
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Fetch all registrations
  const registrations = await HackathonRegistration.find({
    hackathonId: event._id,
  })
    .populate({
      path: 'members.user',
      select: 'user_name name image email skills bio',
    })
    .populate({
      path: 'leaderId',
      select: 'user_name name image email',
    })
    .sort({ createdAt: -1 })
    .lean();

  // Fetch all evaluations
  const evaluations = await HackathonEvaluation.find({
    hackathonId: event._id,
  }).lean();

  const serializedRegistrations = registrations.map((r: any) => {
    const teamEvals = evaluations.filter((e) => e.registrationId.toString() === r._id.toString());
    const averageScore = teamEvals.length > 0
      ? teamEvals.reduce((acc, curr) => acc + curr.totalScore, 0) / teamEvals.length
      : null;

    return {
      ...r,
      _id: r._id.toString(),
      hackathonId: r.hackathonId.toString(),
      leaderId: r.leaderId ? {
        ...r.leaderId,
        _id: r.leaderId._id?.toString() || r.leaderId.toString(),
      } : null,
      members: r.members.map((m: any) => ({
        ...m,
        user: m.user ? {
          ...m.user,
          _id: m.user._id?.toString() || m.user.toString(),
        } : null,
      })),
      averageScore: averageScore !== null ? Number(averageScore.toFixed(1)) : null,
      evaluationCount: teamEvals.length,
    };
  });

  return (
    <OrganizerManageClient
      hackathon={JSON.parse(JSON.stringify({
        ...event,
        _id: event._id.toString(),
        organizerId: (event.organizerId?._id || event.organizerId)?.toString(),
      }))}
      registrations={JSON.parse(JSON.stringify(serializedRegistrations))}
      isOrganizer={isOrganizer}
      isJudge={isJudge}
    />
  );
}
