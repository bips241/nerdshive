'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Rocket, FlaskConical, Plus, Check, Loader2, History, GitCommit } from 'lucide-react';
import { toggleShipLogAlphaTester, appendShipLogChangelog } from '@/lib/actions';
import { toast } from 'sonner';

interface ChangelogItem {
  version: string;
  note: string;
  date: string | Date;
}

interface ShipLogClientProps {
  postId: string;
  isAuthor: boolean;
  initialVersion?: string;
  initialAlphaTestersCount: number;
  initialIsTester: boolean;
  initialChangelog: ChangelogItem[];
}

export default function ShipLogClient({
  postId,
  isAuthor,
  initialVersion = 'v0.1.0',
  initialAlphaTestersCount,
  initialIsTester,
  initialChangelog,
}: ShipLogClientProps) {
  const [isTester, setIsTester] = useState(initialIsTester);
  const [testersCount, setTestersCount] = useState(initialAlphaTestersCount);
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
        setIsTester(!!res.joined);
        setTestersCount(res.count ?? (res.joined ? testersCount + 1 : Math.max(0, testersCount - 1)));
        toast.success(res.joined ? 'Joined alpha tester roster! You will receive release updates.' : 'Left alpha tester roster.');
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
      toast.error('Version and release notes are required');
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
        toast.success(`Milestone ${newVersion.trim()} published to project timeline!`);
      } else {
        toast.error(res.failure || 'Failed to append milestone');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setIsSubmittingLog(false);
    }
  };

  return (
    <div className="space-y-4 pt-2 border-t">
      {/* Action Bar: Alpha Testing & Version Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            {currentVersion}
          </span>
          <span className="text-muted-foreground flex items-center gap-1">
            <FlaskConical className="h-3.5 w-3.5 text-primary" />
            <strong className="text-foreground">{testersCount}</strong> alpha testers
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isAuthor && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddChangelog(true)}
              className="text-xs h-8 gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Ship Milestone
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleToggleAlpha}
            disabled={isToggling}
            className={`text-xs h-8 gap-1.5 ${
              isTester
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {isToggling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isTester ? (
              <>
                <Check className="h-3.5 w-3.5" /> Testing Active
              </>
            ) : (
              <>
                <FlaskConical className="h-3.5 w-3.5" /> Request Alpha Access
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Evolving Changelog Timeline (if updates exist) */}
      {changelog.length > 0 && (
        <div className="rounded-xl p-3.5 bg-muted/30 border space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <History className="h-3.5 w-3.5 text-primary" />
            <span>Ship Milestone History & Changelog:</span>
          </div>

          <div className="space-y-2 relative pl-3 border-l-2 border-primary/30 ml-1">
            {changelog.map((entry, idx) => (
              <div key={idx} className="relative text-xs space-y-0.5">
                <div className="absolute -left-[19px] top-1 h-2 w-2 rounded-full bg-primary" />
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-foreground">{entry.version}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(entry.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-muted-foreground leading-relaxed">{entry.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Changelog Milestone Modal */}
      {showAddChangelog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="font-bold text-base flex items-center gap-1.5 text-foreground">
                <GitCommit className="h-4 w-4 text-primary" />
                Post Project Milestone Update
              </h3>
              <p className="text-xs text-muted-foreground">
                Keep your alpha testers informed with new features, benchmarks, or bug fixes.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Version Tag:</label>
                <input
                  type="text"
                  placeholder="e.g. v0.2.0 - Beta"
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">What Shipped / Changelog:</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Switched data layer to gRPC streaming, reduced P99 latency by 65%. Added Docker Compose file."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAddChangelog(false)}
                disabled={isSubmittingLog}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddChangelog}
                disabled={isSubmittingLog}
                className="text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
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
