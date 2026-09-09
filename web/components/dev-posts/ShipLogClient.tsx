'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Rocket,
  FlaskConical,
  Plus,
  Check,
  Loader2,
  History,
  GitCommit,
  MessageSquareQuote,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { toggleShipLogAlphaTester, appendShipLogChangelog } from '@/lib/actions';
import { toast } from 'sonner';
import Link from 'next/link';
import UserAvatar from '../UserAvatar';
import { formatDisplayDate } from '@/lib/utils';

interface ChangelogItem {
  version: string;
  note: string;
  date: string | Date;
}

interface AlphaTester {
  _id: string;
  user_name: string;
  image?: string;
  name?: string;
}

interface ShipLogClientProps {
  postId: string;
  isAuthor: boolean;
  initialVersion?: string;
  initialAlphaTesters: AlphaTester[];
  initialIsTester: boolean;
  initialChangelog: ChangelogItem[];
  feedbackWanted: string[];
}

export default function ShipLogClient({
  postId,
  isAuthor,
  initialVersion = 'v0.1.0',
  initialAlphaTesters = [],
  initialIsTester,
  initialChangelog = [],
  feedbackWanted = [],
}: ShipLogClientProps) {
  const [isTester, setIsTester] = useState(initialIsTester);
  const [testers, setTesters] = useState<AlphaTester[]>(initialAlphaTesters);
  const [isToggling, setIsToggling] = useState(false);

  const [changelog, setChangelog] = useState<ChangelogItem[]>(initialChangelog || []);
  const [currentVersion, setCurrentVersion] = useState(initialVersion);
  const [showAddChangelog, setShowAddChangelog] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  const handleToggleAlpha = async () => {
    setIsToggling(true);
    try {
      const res = await toggleShipLogAlphaTester(postId);
      if (res.success) {
        const joined = !!res.joined;
        setIsTester(joined);
        if (joined) {
          toast.success('Joined alpha tester roster! You will receive future milestone updates.');
        } else {
          toast.info('Left alpha tester roster.');
        }
      } else {
        toast.error(res.failure || 'Failed to update status');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setIsToggling(false);
    }
  };

  const handleAddChangelog = async () => {
    if (!newVersion.trim() || !newNote.trim()) {
      toast.error('Version tag and release notes are required');
      return;
    }
    setIsSubmittingLog(true);
    try {
      const res = await appendShipLogChangelog({
        postId,
        version: newVersion.trim(),
        note: newNote.trim(),
      });
      if (res.success) {
        setChangelog([
          ...changelog,
          { version: newVersion.trim(), note: newNote.trim(), date: new Date() },
        ]);
        setCurrentVersion(newVersion.trim());
        setNewVersion('');
        setNewNote('');
        setShowAddChangelog(false);
        toast.success(`Milestone ${newVersion.trim()} published to changelog!`);
      } else {
        toast.error(res.failure || 'Failed to publish milestone');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setIsSubmittingLog(false);
    }
  };

  const handleFocusFeedback = (tag: string) => {
    // Specifically target the comment input belonging to this post!
    let targetInput = (
      document.querySelector(`input[data-post-id="${postId}"]`) ||
      document.getElementById(`comment-input-${postId}`)
    ) as HTMLInputElement | null;

    if (!targetInput) {
      const container = document.getElementById(`post-${postId}`) || document.querySelector(`[data-post-id="${postId}"]`);
      if (container) {
        targetInput = container.querySelector('input[placeholder="Add a comment..."]') as HTMLInputElement | null;
      }
    }

    if (targetInput) {
      targetInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetInput.focus();
      const prefix = `[${tag}] `;
      if (!targetInput.value.startsWith(prefix)) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(targetInput, prefix);
        } else {
          targetInput.value = prefix;
        }
        // Dispatch synthetic input and change events for react-hook-form
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        targetInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      toast.info(`Prompted comment with [${tag}]. Enter your critique below!`);
    } else {
      toast.error('Could not find comment box for this post');
    }
  };

  return (
    <div className="space-y-4 pt-3 border-t">
      {/* Targeted Feedback Section (Only rendered if author asked for critique) */}
      {feedbackWanted.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <MessageSquareQuote className="h-3.5 w-3.5 text-amber-500" />
              Focus Areas for Feedback:
            </span>
            <span className="text-[11px] text-muted-foreground">Click a topic to leave targeted critique</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {feedbackWanted.map((item, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleFocusFeedback(item)}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-secondary/70 hover:bg-secondary border border-border/80 text-foreground font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span>{item}</span>
                <span className="text-[10px] text-muted-foreground opacity-70">&rarr;</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lifecycle Action Bar: Testers & Milestone Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Left: Alpha Tester telemetry */}
        <div className="flex items-center gap-2.5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <FlaskConical className="h-4 w-4 text-emerald-500" />
            <span>{testers.length} {testers.length === 1 ? 'tester' : 'testers'} registered</span>
          </div>

          {testers.length > 0 && (
            <div className="flex -space-x-1.5 overflow-hidden">
              {testers.slice(0, 4).map((t, idx) => (
                <Link key={idx} href={`/dashboard/user/${t.user_name || 'developer'}`} title={`@${t.user_name || 'developer'}`}>
                  <UserAvatar user={t} className="h-6 w-6 border-2 border-background ring-1 ring-border/50" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right: Author / Visitor actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Author: Ship Next Milestone */}
          {isAuthor ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddChangelog(true)}
              className="text-xs min-h-[36px] px-3.5 gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400 whitespace-nowrap shrink-0 font-semibold"
            >
              <Plus className="h-3.5 w-3.5" /> Ship Milestone
            </Button>
          ) : (
            /* Visitor: Join or Leave Alpha Tester Roster */
            <Button
              size="sm"
              onClick={handleToggleAlpha}
              disabled={isToggling}
              className={`text-xs min-h-[36px] px-3.5 gap-1.5 whitespace-nowrap shrink-0 font-semibold transition-colors ${
                isTester
                  ? 'bg-emerald-600/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/25'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isToggling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isTester ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Alpha Tester Active
                </>
              ) : (
                <>
                  <FlaskConical className="h-3.5 w-3.5" /> Request Alpha Access
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Changelog Timeline (if updates exist) */}
      {changelog.length > 0 && (
        <div className="rounded-xl p-3.5 bg-secondary/20 border border-border/80 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <History className="h-3.5 w-3.5 text-emerald-500" />
            <span>Milestone History & Changelog ({changelog.length}):</span>
          </div>

          <div className="space-y-3 relative pl-3.5 border-l-2 border-emerald-500/30 ml-1.5 pt-1">
            {changelog.map((entry, idx) => (
              <div key={idx} className="relative text-xs space-y-0.5">
                <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-foreground bg-secondary px-1.5 py-0.5 rounded text-[11px]">
                    {entry.version}
                  </span>
                  <span suppressHydrationWarning className="text-[10px] text-muted-foreground">
                    {formatDisplayDate(entry.date)}
                  </span>
                </div>
                <p className="text-muted-foreground leading-relaxed pt-0.5">{entry.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {showAddChangelog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border rounded-2xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="space-y-1">
              <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                <GitCommit className="h-4 w-4 text-emerald-500" />
                Ship Next Project Milestone
              </h3>
              <p className="text-xs text-muted-foreground">
                Document what shipped in this release for your community and alpha testers.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Version Tag:</label>
                <input
                  type="text"
                  placeholder="e.g. v0.2.0 - Beta Release"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">What Shipped (Release Notes):</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Migrated realtime transport to WebSockets, added voice lounges, reduced P99 latency by 45%."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAddChangelog(false)}
                disabled={isSubmittingLog}
                className="text-xs min-h-[36px]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddChangelog}
                disabled={isSubmittingLog}
                className="text-xs min-h-[36px] px-4 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold whitespace-nowrap"
              >
                {isSubmittingLog ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                Publish Milestone
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
