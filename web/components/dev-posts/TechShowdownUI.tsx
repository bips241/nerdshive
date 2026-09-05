import React from 'react';
import Link from 'next/link';
import UserAvatar from '../UserAvatar';
import Timestamp from '../Timestamp';
import PostOptions from '../PostOptions';
import { Card } from '../ui/card';
import PostActions from '../PostActions';
import Comments from '../Comments';
import { auth } from '@/auth';
import { Swords, BarChart2 } from 'lucide-react';
import TechShowdownVoteClient from './TechShowdownVoteClient';

interface TechShowdownUIProps {
  post: any;
}

const TechShowdownUI: React.FC<TechShowdownUIProps> = async ({ post }) => {
  const session = await auth();
  const userId = session?.user?._id?.toString();

  if (!session?.user) return null;

  const username = post?.userId?.user_name;
  const showdown = post?.techShowdown || {};
  const user = {
    _id: post.userId._id.toString(),
    username: post.userId.user_name,
    email: post.userId.email,
    image: post.userId.image,
  };

  const userVote = (showdown.voters || []).find(
    (v: any) => (v.user?._id || v.user)?.toString() === userId
  )?.option || null;

  const votesA = showdown.voters && showdown.voters.length > 0
    ? showdown.voters.filter((v: any) => v.option === 'optionA').length
    : (showdown.optionA?.votes || 0);

  const votesB = showdown.voters && showdown.voters.length > 0
    ? showdown.voters.filter((v: any) => v.option === 'optionB').length
    : (showdown.optionB?.votes || 0);

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
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/30">
                <Swords className="h-3 w-3" /> Tech Showdown & Debate
              </span>
            </div>
          </div>
        </div>

        <PostOptions post={post} userId={userId} />
      </div>

      {/* Main Content Card */}
      <Card className="p-6 space-y-5 bg-card border rounded-2xl shadow-md border-blue-500/20">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Swords className="h-5 w-5 text-blue-500" /> {showdown.topic}
          </h2>
          {showdown.benchmark && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
              <BarChart2 className="h-3.5 w-3.5 text-primary" /> Benchmark: <span className="font-mono text-foreground font-semibold">{showdown.benchmark}</span>
            </p>
          )}
        </div>

        {/* Voting & Split Bar */}
        <TechShowdownVoteClient
          postId={post._id.toString()}
          optionA={{
            name: showdown.optionA?.name || 'Option A',
            description: showdown.optionA?.description,
            votes: votesA,
          }}
          optionB={{
            name: showdown.optionB?.name || 'Option B',
            description: showdown.optionB?.description,
            votes: votesB,
          }}
          initialUserVote={userVote}
        />
      </Card>

      <PostActions post={post} userId={userId} className="px-3 sm:px-0" />
      <Comments postId={post._id} comments={post.comments} user={session.user} />
    </div>
  );
};

export default TechShowdownUI;
