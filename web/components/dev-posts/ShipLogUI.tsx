import React from 'react';
import Link from 'next/link';
import UserAvatar from '../UserAvatar';
import Timestamp from '../Timestamp';
import PostOptions from '../PostOptions';
import { Card } from '../ui/card';
import PostActions from '../PostActions';
import Comments from '../Comments';
import { auth } from '@/auth';
import { Rocket, Globe, GitFork, Sparkles, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/badge';

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
  };

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
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.2 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                <Rocket className="h-3 w-3" /> Ship Log & Launch
              </span>
            </div>
          </div>
        </div>

        <PostOptions post={post} userId={userId} />
      </div>

      {/* Main Content Card */}
      <Card className="p-6 space-y-5 bg-card border rounded-2xl shadow-md">
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">{shipLog.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {shipLog.pitch}
          </p>
        </div>

        {/* Tech Stack Pills */}
        {shipLog.techStack && shipLog.techStack.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Built With</p>
            <div className="flex flex-wrap gap-1.5">
              {shipLog.techStack.map((tech: string, i: number) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium border border-border/50"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Links: Live Demo & GitHub Repo */}
        <div className="flex flex-wrap gap-3 pt-1">
          {shipLog.demoUrl && (
            <Link
              href={shipLog.demoUrl.startsWith('http') ? shipLog.demoUrl : `https://${shipLog.demoUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:opacity-90 transition-opacity"
            >
              <Globe className="h-3.5 w-3.5" /> Try Live Demo &rarr;
            </Link>
          )}

          {shipLog.repoUrl && (
            <Link
              href={shipLog.repoUrl.startsWith('http') ? shipLog.repoUrl : `https://${shipLog.repoUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-semibold text-xs hover:bg-secondary/80 transition-colors border"
            >
              <GitFork className="h-3.5 w-3.5" /> Star on GitHub
            </Link>
          )}
        </div>

        {/* Feedback Desired Checklist */}
        {shipLog.feedbackWanted && shipLog.feedbackWanted.length > 0 && (
          <div className="pt-3 border-t space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Looking for Feedback on:
            </p>
            <div className="flex flex-wrap gap-2">
              {shipLog.feedbackWanted.map((item: string, i: number) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-foreground border"
                >
                  <CheckCircle2 className="h-3 w-3 text-primary" /> {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      <PostActions post={post} userId={userId} className="px-3 sm:px-0" />
      <Comments postId={post._id} comments={post.comments} user={session.user} />
    </div>
  );
};

export default ShipLogUI;
