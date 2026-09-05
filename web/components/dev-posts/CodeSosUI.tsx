import React from 'react';
import Link from 'next/link';
import UserAvatar from '../UserAvatar';
import Timestamp from '../Timestamp';
import PostOptions from '../PostOptions';
import { Card } from '../ui/card';
import PostActions from '../PostActions';
import Comments from '../Comments';
import { auth } from '@/auth';
import { Bug, Video, Terminal, Cpu, CheckCircle2, HelpCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import CodeSosClient from './CodeSosClient';

interface CodeSosUIProps {
  post: any;
}

const CodeSosUI: React.FC<CodeSosUIProps> = async ({ post }) => {
  const session = await auth();
  const userId = session?.user?._id?.toString();

  if (!session?.user) return null;

  const username = post?.userId?.user_name;
  const sos = post?.codeSos || {};
  const user = {
    _id: post.userId._id.toString(),
    username: post.userId.user_name,
    email: post.userId.email,
    image: post.userId.image,
  };

  const pairDebugUrl = `/dashboard/stranger-chat?mode=pair_debug&title=${encodeURIComponent(
    sos.title || 'Code SOS'
  )}&snippet=${encodeURIComponent((sos.snippet || '').slice(0, 500))}`;

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
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.2 rounded-full bg-red-500/10 text-red-500 border border-red-500/30">
                <Bug className="h-3 w-3" /> Code SOS / Debug Request
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-muted text-muted-foreground border">
                {sos.language || 'Code'}
              </span>
            </div>
          </div>
        </div>

        <PostOptions post={post} userId={userId} />
      </div>

      {/* Main Content Card */}
      <Card className="p-6 space-y-4 bg-card border rounded-2xl shadow-md border-red-500/20">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-foreground">{sos.title}</h2>
          {sos.environment && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Cpu className="h-3 w-3" /> Environment: <span className="font-mono text-foreground">{sos.environment}</span>
            </p>
          )}
        </div>

        {/* Code Snippet Box */}
        {sos.snippet && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
              <span>{`// Reproducible Code Snippet`}</span>
              <span className="capitalize">{sos.language}</span>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 p-3.5 max-h-72 overflow-y-auto">
              <pre className="font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
                <code>{sos.snippet}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Error Log Stack Trace Box */}
        {sos.errorLog && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-[11px] text-red-400 font-mono font-semibold">
              <Terminal className="h-3 w-3" /> Error Output / Stack Trace
            </div>
            <div className="rounded-xl overflow-hidden bg-red-950/20 border border-red-900/30 p-3 max-h-56 overflow-y-auto">
              <pre className="font-mono text-[11px] text-red-300 overflow-x-auto whitespace-pre leading-relaxed">
                <code>{sos.errorLog}</code>
              </pre>
            </div>
          </div>
        )}

        {/* What Was Tried */}
        {sos.triedSteps && (
          <div className="text-xs text-muted-foreground space-y-1 bg-muted/40 p-2.5 rounded-lg border">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <HelpCircle className="h-3 w-3 text-primary" /> What I&apos;ve Tried:
            </span>
            <p className="italic">{sos.triedSteps}</p>
          </div>
        )}

        {/* Interactive Lifecycle: Resolution & Live Pair Debug */}
        <div className="pt-2 border-t">
          <CodeSosClient
            postId={post._id.toString()}
            isAuthor={userId === post.userId._id.toString()}
            isResolved={!!sos.isResolved}
            bountyKarma={sos.bountyKarma || 50}
            solutionSummary={sos.solutionSummary}
            pairDebugUrl={pairDebugUrl}
          />
        </div>
      </Card>

      <PostActions post={post} userId={userId} className="px-3 sm:px-0" />
      <Comments postId={post._id} comments={post.comments} user={session.user} />
    </div>
  );
};

export default CodeSosUI;
