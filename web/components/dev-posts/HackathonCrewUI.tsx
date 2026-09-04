import React from 'react';
import Link from 'next/link';
import UserAvatar from '../UserAvatar';
import Timestamp from '../Timestamp';
import PostOptions from '../PostOptions';
import { Card } from '../ui/card';
import PostActions from '../PostActions';
import Comments from '../Comments';
import { auth } from '@/auth';
import { Zap, Clock, ShieldCheck, UserPlus, Trophy, ArrowRight } from 'lucide-react';
import { Badge } from '../ui/badge';
import HackathonCrewClient from './HackathonCrewClient';

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
  };

  const isAuthor = userId === post.userId._id.toString();

  return (
    <div className="flex flex-col space-y-2.5 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-0">
        <div className="flex space-x-3 items-center">
          <Link href={`/dashboard/user/${username}`}>
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
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.2 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30">
                <Zap className="h-3 w-3" /> Hackathon Crew Call
              </span>
            </div>
          </div>
        </div>

        <PostOptions post={post} userId={userId} />
      </div>

      {/* Main Content Card */}
      <Card className="p-6 space-y-5 bg-card border rounded-2xl shadow-md border-amber-500/20">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs uppercase font-bold tracking-wider text-amber-500">Target Hackathon</span>
            <h2 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" /> {crew.hackathonName}
            </h2>
          </div>

          {crew.commitmentLevel && (
            <Badge variant="outline" className="capitalize text-xs font-semibold">
              {crew.commitmentLevel === 'hardcore' && '🏆 Hardcore'}
              {crew.commitmentLevel === 'moderate' && '⚡ Moderate'}
              {crew.commitmentLevel === 'casual' && '☕ Casual'}
            </Badge>
          )}
        </div>

        {/* Roles Needed vs Roles Have */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Roles We Need */}
          <div className="space-y-2 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <p className="text-xs font-bold text-amber-500 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Roles Urgently Needed:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {crew.rolesNeed?.map((role: string, i: number) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/30"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>

          {/* Roles We Have */}
          <div className="space-y-2 p-3.5 rounded-xl bg-secondary/30 border">
            <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Roles Already on Team:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {crew.rolesHave?.map((role: string, i: number) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground font-medium border border-border/50"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Deadline & Urgency */}
        <div className="pt-2 border-t flex items-center justify-between">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {crew.urgencyDate ? (
              <span>
                Deadline: <span className="font-semibold text-foreground">{new Date(crew.urgencyDate).toLocaleDateString()}</span>
              </span>
            ) : (
              <span>Urgent formation open</span>
            )}
          </div>
        </div>

        {/* Interactive Lifecycle: Squad Recruitment, Role Applications & Roster Management */}
        <HackathonCrewClient
          postId={post._id.toString()}
          isLeader={isAuthor}
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
          rolesNeed={crew.rolesNeed && crew.rolesNeed.length > 0 ? crew.rolesNeed : ['Developer']}
        />
      </Card>

      <PostActions post={post} userId={userId} className="px-3 sm:px-0" />
      <Comments postId={post._id} comments={post.comments} user={session.user} />
    </div>
  );
};

export default HackathonCrewUI;
