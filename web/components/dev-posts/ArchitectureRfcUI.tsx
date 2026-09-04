import React from 'react';
import Link from 'next/link';
import UserAvatar from '../UserAvatar';
import Timestamp from '../Timestamp';
import PostOptions from '../PostOptions';
import { Card } from '../ui/card';
import PostActions from '../PostActions';
import Comments from '../Comments';
import { auth } from '@/auth';
import { Network, Scale, Users, Layers } from 'lucide-react';
import ArchitectureRfcClient from './ArchitectureRfcClient';

interface ArchitectureRfcUIProps {
  post: any;
}

const ArchitectureRfcUI: React.FC<ArchitectureRfcUIProps> = async ({ post }) => {
  const session = await auth();
  const userId = session?.user?._id?.toString();

  if (!session?.user) return null;

  const username = post?.userId?.user_name;
  const rfc = post?.architectureRfc || {};
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
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.2 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/30">
                <Network className="h-3 w-3" /> Architecture RFC
              </span>
            </div>
          </div>
        </div>

        <PostOptions post={post} userId={userId} />
      </div>

      {/* Main Content Card */}
      <Card className="p-6 space-y-4 bg-card border rounded-2xl shadow-md">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-foreground">{rfc.title}</h2>
          <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
            {rfc.challenge}
          </p>
        </div>

        {/* Diagram Flow Box */}
        {rfc.diagramMarkdown && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <Layers className="h-3.5 w-3.5 text-purple-500" /> System Architecture / Flowchart
            </div>
            <div className="rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 p-3.5">
              <pre className="font-mono text-xs text-purple-300 overflow-x-auto whitespace-pre leading-relaxed">
                <code>{rfc.diagramMarkdown}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Trade-offs Evaluated */}
        {rfc.tradeOffs && rfc.tradeOffs.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Scale className="h-3.5 w-3.5 text-primary" /> Design Trade-offs Under Consideration
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {rfc.tradeOffs.map((item: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl border bg-secondary/30 space-y-1 text-xs">
                  <p className="font-bold text-foreground">{item.option}</p>
                  {item.pros && (
                    <p className="text-emerald-500">
                      <span className="font-semibold">+ Pros:</span> {item.pros}
                    </p>
                  )}
                  {item.cons && (
                    <p className="text-red-400">
                      <span className="font-semibold">- Cons:</span> {item.cons}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Target Reviewers Tag */}
        {rfc.targetAudience && (
          <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-primary" /> Reviewers:
            </span>
            <span className="font-semibold text-foreground">{rfc.targetAudience}</span>
          </div>
        )}

        {/* Interactive Lifecycle: Peer Review Consensus & Decision Finalization */}
        <ArchitectureRfcClient
          postId={post._id.toString()}
          isAuthor={userId === post.userId._id.toString()}
          initialStatus={rfc.status || 'under_review'}
          initialAdoptedOption={rfc.adoptedOption}
          initialDecisionSummary={rfc.decisionSummary}
          initialVotesA={rfc.votesAdoptA?.length || 0}
          initialVotesB={rfc.votesAdoptB?.length || 0}
          initialVotesRevise={rfc.votesRevise?.length || 0}
          userVote={
            (rfc.votesAdoptA || []).some((id: any) => id.toString() === userId)
              ? 'adoptA'
              : (rfc.votesAdoptB || []).some((id: any) => id.toString() === userId)
              ? 'adoptB'
              : (rfc.votesRevise || []).some((id: any) => id.toString() === userId)
              ? 'revise'
              : null
          }
          optionAName={rfc.tradeOffs?.[0]?.option || 'Option A'}
          optionBName={rfc.tradeOffs?.[1]?.option || 'Option B'}
        />
      </Card>

      <PostActions post={post} userId={userId} className="px-3 sm:px-0" />
      <Comments postId={post._id} comments={post.comments} user={session.user} />
    </div>
  );
};

export default ArchitectureRfcUI;
