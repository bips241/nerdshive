'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Video, Award, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { resolveCodeSosPost } from '@/lib/actions';
import { toast } from 'sonner';
import Link from 'next/link';

interface CodeSosClientProps {
  postId: string;
  isAuthor: boolean;
  isResolved: boolean;
  bountyKarma?: number;
  solutionSummary?: string;
  pairDebugUrl: string;
}

export default function CodeSosClient({
  postId,
  isAuthor,
  isResolved: initialResolved,
  bountyKarma = 50,
  solutionSummary: initialSummary,
  pairDebugUrl,
}: CodeSosClientProps) {
  const [isResolved, setIsResolved] = useState(initialResolved);
  const [solutionSummary, setSolutionSummary] = useState(initialSummary || '');
  const [isResolving, setIsResolving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [customSummary, setCustomSummary] = useState('');

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      const res = await resolveCodeSosPost({
        postId,
        solutionSummary: customSummary || 'Verified and resolved with peer feedback.',
      });
      if (res.success) {
        setIsResolved(true);
        setSolutionSummary(customSummary || 'Verified and resolved with peer feedback.');
        setShowModal(false);
        toast.success('Bug marked as resolved! +50 Debug Karma credited to the helper.');
      } else {
        toast.error(res.failure || 'Failed to resolve SOS');
      }
    } catch (err) {
      toast.error('Failed to mark as resolved');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Resolved Banner */}
      {isResolved ? (
        <div className="rounded-xl p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Verified Solution Found
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500">
              <Award className="h-3 w-3" /> +{bountyKarma} Karma Awarded
            </span>
          </div>
          {solutionSummary && (
            <p className="text-xs text-foreground/90 font-mono bg-card/60 p-2 rounded-lg border border-emerald-500/20 leading-relaxed">
              {solutionSummary}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl p-3 bg-red-500/5 border border-red-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span>Active SOS Beacon • 48h Urgency Window</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
            {isAuthor && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowModal(true)}
                className="text-xs min-h-[36px] px-3.5 gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Mark Resolved
              </Button>
            )}

            <Link
              href={pairDebugUrl}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[36px] rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <Video className="h-3.5 w-3.5" /> Pair-Debug Live &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Resolution Dialog Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="font-bold text-base flex items-center gap-1.5 text-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Mark SOS as Solved
              </h3>
              <p className="text-xs text-muted-foreground">
                Help future developers who encounter this error by summarizing what fixed the issue.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                Solution Summary / Fix Notes:
              </label>
              <textarea
                value={customSummary}
                onChange={(e) => setCustomSummary(e.target.value)}
                placeholder="e.g. Fixed by adding a cleanup function in useEffect and unpipe the readable stream."
                rows={3}
                className="w-full text-xs p-2.5 rounded-lg border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowModal(false)}
                disabled={isResolving}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleResolve}
                disabled={isResolving}
                className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isResolving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Confirm & Award +50 Karma
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
