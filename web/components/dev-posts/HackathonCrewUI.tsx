import React from 'react';
import Link from 'next/link';
import UserAvatar from '../UserAvatar';
import Timestamp from '../Timestamp';
import PostOptions from '../PostOptions';
import { Card } from '../ui/card';
import PostActions from '../PostActions';
import Comments from '../Comments';
import { auth } from '@/auth';
import { Zap, Clock, ShieldCheck, Trophy, Sparkles } from 'lucide-react';
import { Badge } from '../ui/badge';
import HackathonCrewClient from './HackathonCrewClient';
import { formatDisplayDate } from '@/lib/utils';

interface HackathonCrewUIProps {
  post: any;
}

const HackathonCrewUI: React.FC<HackathonCrewUIProps> = async ({ post }) => {
  const session = await auth();
  const userId = session?.user?._id?.toString();

  if (!session?.user) return null;

  const username = post?.userId?.user_name;
  const crew = post?.hackathonCrew || {};
  const user = {
    _id: post.userId._id.toString(),
    username: post.userId.user_name,
    email: post.userId.email,
    image: post.userId.image,
    name: post.userId.name,
  };

  const isAuthor = userId === post.userId._id.toString();

  const hasRolesNeed = crew.rolesNeed && crew.rolesNeed.length > 0;
  const hasRolesHave = crew.rolesHave && crew.rolesHave.length > 0;

  return (
    <div id={`post-${post._id}`} data-post-id={post._id} className="flex flex-col space-y-2.5 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-0">
        <div className="flex space-x-3 items-center">
          <Link href={`/dashboard/user/${username}`} className="shrink-0 inline-block relative">
            <UserAvatar user={user} />
          </Link>
          <div className="text-sm">
            <p className="space-x-1">
              <Link href={`/dashboard/user/${username}`}>
                <span className="font-semibold hover:underline">{username}</span>
              </Link>
              <span className="font-medium text-neutral-500 text-xs">•</span>
              <Timestamp createdAt={post.createdAt} />
            </p>
            <div className="flex items-center gap-1.5 pt-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30">
                <Zap className="h-3 w-3" /> Hackathon Crew Call
              </span>
              {post.recommendationReason && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300 border border-zinc-700/60">
                  ✨ {post.recommendationReason}
                </span>
              )}
            </div>
          </div>
        </div>

        <PostOptions post={post} userId={userId} />
      </div>

      {/* Main Content Card */}
      <Card className="p-5 sm:p-6 space-y-4 bg-card/90 border border-border/80 rounded-2xl shadow-xs border-l-4 border-l-amber-500/90">
        {/* Hackathon Title, Track & Commitment */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase font-bold tracking-wider text-amber-500 flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5" /> Target Hackathon
              </span>
              {crew.targetTrack && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium border border-border/60">
                  Track: {crew.targetTrack}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              {crew.hackathonName}
            </h2>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {crew.commitmentLevel && (
              <Badge variant="outline" className="capitalize text-xs font-semibold border-amber-500/30 text-amber-500 bg-amber-500/10">
                {crew.commitmentLevel === 'hardcore' && '🏆 Hardcore Sprint'}
                {crew.commitmentLevel === 'moderate' && '⚡ Moderate Prototype'}
                {crew.commitmentLevel === 'casual' && '☕ Casual & Exploratory'}
              </Badge>
            )}
            {crew.urgencyDate && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/40 border border-border/60">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span suppressHydrationWarning>Deadline: <strong suppressHydrationWarning className="text-foreground">{formatDisplayDate(crew.urgencyDate)}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Roles Urgently Needed & Roles Already on Team */}
        {(hasRolesNeed || hasRolesHave) && (
          <div className={`grid gap-2.5 pt-1 ${hasRolesNeed && hasRolesHave ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
            {/* Roles Needed */}
            {hasRolesNeed && (
              <div className="space-y-1.5 p-3 rounded-xl bg-secondary/20 border border-border/60">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> Roles Urgently Needed:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {crew.rolesNeed.map((role: string, i: number) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-medium border border-amber-500/25"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Roles Already on Team */}
            {hasRolesHave && (
              <div className="space-y-1.5 p-3 rounded-xl bg-secondary/20 border border-border/60">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Skills on Squad:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {crew.rolesHave.map((role: string, i: number) => (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-0.5 rounded-md bg-secondary/70 text-secondary-foreground font-medium border border-border/50"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Interactive Lifecycle: Squad Roster, Recruitment, Applications & Review */}
        <HackathonCrewClient
          postId={post._id.toString()}
          isLeader={isAuthor}
          leaderUser={user}
          isMember={(crew.members || []).some(
            (m: any) => (m.user?._id || m.user)?.toString() === userId
          )}
          hasApplied={(crew.applicants || []).some(
            (a: any) => (a.user?._id || a.user)?.toString() === userId
          )}
          initialSquadStatus={crew.squadStatus || 'recruiting'}
          maxSquadSize={crew.maxSquadSize || 4}
          initialMembers={crew.members || []}
          initialApplicants={crew.applicants || []}
          rolesNeed={crew.rolesNeed || []}
          rolesHave={crew.rolesHave || []}
          squadServerId={crew.squadServerId?.toString()}
        />
      </Card>

      <PostActions post={post} userId={userId} className="px-3 sm:px-0" />
      <Comments postId={post._id} comments={post.comments} user={session.user} />
    </div>
  );
};

export default HackathonCrewUI;
