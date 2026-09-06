import React from 'react';
import { auth } from '@/auth';
import connectDB from '@/lib/db';
import { Post } from '@/models/User';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Bug, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LiveCodeSosRoomClient from '@/components/dev-posts/LiveCodeSosRoomClient';

interface Props {
  params: {
    id: string;
  };
}

export const dynamic = 'force-dynamic';

export default async function CodeSosDebugPage({ params: { id } }: Props) {
  const session = await auth();
  if (!session?.user?._id) {
    redirect(`/login?callbackUrl=/dashboard/p/${id}/debug`);
  }

  await connectDB();

  let post: any = null;
  try {
    post = await Post.findById(id)
      .populate('userId', 'user_name name image email')
      .lean();
  } catch (err) {
    post = null;
  }

  if (!post || post.postType !== 'code_sos') {
    return (
      <div className="max-w-xl mx-auto my-20 p-8 rounded-2xl border border-neutral-800 bg-neutral-950 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center mx-auto">
          <Bug className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Code SOS Request Not Found</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The requested debug session does not exist or is not a Code SOS post.
        </p>
        <Link href="/dashboard">
          <Button size="sm" variant="outline" className="text-xs gap-1.5 mt-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Feed
          </Button>
        </Link>
      </div>
    );
  }

  const sos = post.codeSos || {};
  const isAuthor = session.user._id.toString() === (post.userId?._id?.toString() || post.userId?.toString());

  // If already resolved, display celebration & summary banner
  if (sos.isResolved) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 rounded-2xl border border-emerald-500/30 bg-neutral-950 text-center space-y-5 shadow-lg">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-2xl font-extrabold text-foreground">Bug Resolved & Verified!</h2>
          <p className="text-xs text-muted-foreground">
            This Code SOS issue was successfully resolved. The live pair-debugging session has concluded.
          </p>
        </div>

        {sos.solutionSummary && (
          <div className="text-left p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
              Verified Fix Summary:
            </span>
            <p className="text-xs font-mono text-neutral-200 leading-relaxed whitespace-pre-wrap">
              {sos.solutionSummary}
            </p>
          </div>
        )}

        <div className="pt-3 flex justify-center gap-3">
          <Link href={`/dashboard/p/${post._id}`}>
            <Button size="sm" variant="outline" className="text-xs gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> View Original Post
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" className="bg-primary text-primary-foreground text-xs">
              Explore Active SOS Feed
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <LiveCodeSosRoomClient
      post={{
        _id: post._id.toString(),
        title: sos.title || 'Code SOS Pair-Debug',
        snippet: sos.snippet || '// Paste reproducible code snippet here',
        errorLog: sos.errorLog || '',
        triedSteps: sos.triedSteps || '',
        language: sos.language || 'typescript',
        bountyKarma: sos.bountyKarma || 50,
        author: {
          _id: post.userId?._id?.toString() || post.userId?.toString(),
          user_name: post.userId?.user_name || 'developer',
          name: post.userId?.name || 'Developer',
          image: post.userId?.image,
        },
      }}
      currentUser={{
        _id: session.user._id.toString(),
        user_name: session.user.user_name || (session.user as any).username || 'developer',
        name: session.user.name || 'Developer',
        image: session.user.image,
      }}
      isAuthor={isAuthor}
    />
  );
}
