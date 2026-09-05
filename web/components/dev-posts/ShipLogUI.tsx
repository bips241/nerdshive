import React from 'react';
import Link from 'next/link';
import UserAvatar from '../UserAvatar';
import Timestamp from '../Timestamp';
import PostOptions from '../PostOptions';
import { Card } from '../ui/card';
import PostActions from '../PostActions';
import Comments from '../Comments';
import { auth } from '@/auth';
import { Rocket, Globe, GitFork, ExternalLink, Layers } from 'lucide-react';
import { Badge } from '../ui/badge';
import ShipLogClient from './ShipLogClient';

interface ShipLogUIProps {
  post: any;
}

const ShipLogUI: React.FC<ShipLogUIProps> = async ({ post }) => {
  const session = await auth();
  const userId = session?.user?._id?.toString();

  if (!session?.user) return null;

  const username = post?.userId?.user_name;
  const shipLog = post?.shipLog || {};
  const user = {
    _id: post.userId._id.toString(),
    username: post.userId.user_name,
    email: post.userId.email,
    image: post.userId.image,
    name: post.userId.name,
  };

  const isAuthor = userId === post.userId._id.toString();
  const alphaTesters = (shipLog.alphaTesters || []).map((t: any) => {
    if (typeof t === 'object' && t._id) return t;
    return { _id: t.toString(), user_name: 'Developer' };
  });

  const isTester = alphaTesters.some(
    (t: any) => (t._id || t).toString() === userId
  );

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
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <Rocket className="h-3 w-3" /> Ship Log & Launch
              </span>
            </div>
          </div>
        </div>

        <PostOptions post={post} userId={userId} />
      </div>

      {/* Main Content Card */}
      <Card className="p-5 sm:p-6 space-y-5 bg-card border rounded-2xl shadow-md border-emerald-500/20">
        {/* Project Header: Title, Monogram & Current Version */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold tracking-tight text-foreground truncate">
                {shipLog.title}
              </h2>
              <Badge variant="outline" className="font-mono text-xs font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 shrink-0">
                {shipLog.version || 'v0.1.0'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {shipLog.pitch}
            </p>
          </div>
        </div>

        {/* Tech Stack Tags */}
        {shipLog.techStack && shipLog.techStack.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Layers className="h-3 w-3 text-emerald-500" />
              <span>Built With</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {shipLog.techStack.map((tech: string, i: number) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium border border-border/60"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Project Links: Live Demo & GitHub Repo */}
        {(shipLog.demoUrl || shipLog.repoUrl) && (
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {shipLog.demoUrl && (
              <Link
                href={shipLog.demoUrl.startsWith('http') ? shipLog.demoUrl : `https://${shipLog.demoUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 min-h-[36px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors whitespace-nowrap"
              >
                <Globe className="h-3.5 w-3.5" /> Try Live Demo <ExternalLink className="h-3 w-3 opacity-70" />
              </Link>
            )}

            {shipLog.repoUrl && (
              <Link
                href={shipLog.repoUrl.startsWith('http') ? shipLog.repoUrl : `https://${shipLog.repoUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 min-h-[36px] rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border transition-colors whitespace-nowrap"
              >
                <GitFork className="h-3.5 w-3.5 text-muted-foreground" /> View Source / GitHub
              </Link>
            )}
          </div>
        )}

        {/* Interactive Lifecycle: Alpha Testers Roster, Milestone Shipping & Targeted Feedback */}
        <ShipLogClient
          postId={post._id.toString()}
          isAuthor={isAuthor}
          initialVersion={shipLog.version || 'v0.1.0'}
          initialAlphaTesters={alphaTesters}
          initialIsTester={isTester}
          initialChangelog={shipLog.changelog || []}
          feedbackWanted={shipLog.feedbackWanted || []}
        />
      </Card>

      <PostActions post={post} userId={userId} className="px-3 sm:px-0" />
      <Comments postId={post._id} comments={post.comments} user={session.user} />
    </div>
  );
};

export default ShipLogUI;
