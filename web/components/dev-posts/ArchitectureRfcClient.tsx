'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Award, Scale, Check, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { voteRfcConsensus, finalizeRfcDecision } from '@/lib/actions';
import { toast } from 'sonner';

interface ArchitectureRfcClientProps {
  postId: string;
  isAuthor: boolean;
  initialStatus: 'under_review' | 'adopted' | 'superseded';
  initialAdoptedOption?: string;
  initialDecisionSummary?: string;
  initialVotesA: number;
  initialVotesB: number;
  initialVotesRevise: number;
  userVote?: 'adoptA' | 'adoptB' | 'revise' | null;
  optionAName: string;
  optionBName: string;
}

export default function ArchitectureRfcClient({
  postId,
  isAuthor,
  initialStatus,
  initialAdoptedOption,
  initialDecisionSummary,
  initialVotesA,
  initialVotesB,
  initialVotesRevise,
  userVote: initialUserVote,
  optionAName,
  optionBName,
}: ArchitectureRfcClientProps) {
  const [status, setStatus] = useState(initialStatus);
  const [adoptedOption, setAdoptedOption] = useState(initialAdoptedOption || '');
  const [decisionSummary, setDecisionSummary] = useState(initialDecisionSummary || '');

  const [votesA, setVotesA] = useState(initialVotesA);
  const [votesB, setVotesB] = useState(initialVotesB);
  const [votesRevise, setVotesRevise] = useState(initialVotesRevise);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [isVoting, setIsVoting] = useState(false);

  const hasTradeOffs = Boolean(optionAName && optionBName);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState(
    hasTradeOffs ? optionAName : 'Architecture Approved'
  );
  const [summaryInput, setSummaryInput] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  const totalVotes = votesA + votesB + votesRevise;
  const pctA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : (hasTradeOffs ? 33 : 50);
  const pctB = totalVotes > 0 ? Math.round((votesB / totalVotes) * 100) : 33;
  const pctRevise = totalVotes > 0 ? Math.round((votesRevise / totalVotes) * 100) : (hasTradeOffs ? 34 : 50);

  const handleVote = async (choice: 'adoptA' | 'adoptB' | 'revise') => {
    setIsVoting(true);
    try {
      const res = await voteRfcConsensus({ postId, choice });
      if (res.success) {
        setUserVote(choice);
        setVotesA(res.votesAdoptA ?? votesA);
        setVotesB(res.votesAdoptB ?? votesB);
        setVotesRevise(res.votesRevise ?? votesRevise);
        const choiceLabel = hasTradeOffs
          ? (choice === 'adoptA' ? optionAName : choice === 'adoptB' ? optionBName : 'Needs Revision')
          : (choice === 'adoptA' ? 'Approve Architecture' : 'Request Revisions');
        toast.success(`Consensus vote recorded: ${choiceLabel}`);
      } else {
        toast.error(res.failure || 'Failed to vote');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setIsVoting(false);
    }
  };

  const handleFinalize = async () => {
    if (!summaryInput.trim()) {
      toast.error('Please enter a brief decision rationale');
      return;
    }
    setIsFinalizing(true);
    try {
      const res = await finalizeRfcDecision({
        postId,
        adoptedOption: selectedDecision,
        decisionSummary: summaryInput.trim(),
      });
      if (res.success) {
        setStatus('adopted');
        setAdoptedOption(selectedDecision);
        setDecisionSummary(summaryInput.trim());
        setShowFinalizeModal(false);
        toast.success('Architecture RFC decision finalized and published!');
      } else {
        toast.error(res.failure || 'Failed to finalize decision');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className="space-y-3.5 pt-2 border-t">
      {/* Adopted State Banner */}
      {status === 'adopted' ? (
        <div className="rounded-xl p-3.5 bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wide">
              <CheckCircle2 className="h-4 w-4 text-indigo-500" />
              Consensus Finalized • {adoptedOption.startsWith('Adopt') || adoptedOption.startsWith('Architecture') ? adoptedOption : `Adopted: ${adoptedOption}`}
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-500">
              Approved Architecture
            </span>
          </div>
          {decisionSummary && (
            <p className="text-xs text-foreground/90 bg-card/60 p-2.5 rounded-lg border border-indigo-500/20 leading-relaxed font-mono">
              {decisionSummary}
            </p>
          )}
        </div>
      ) : (
        /* Under Review State */
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-primary" />
              Architect Consensus Vote ({totalVotes} peer reviews)
            </span>
            {isAuthor && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFinalizeModal(true)}
                className="text-xs h-7 gap-1 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10"
              >
                <CheckCircle2 className="h-3 w-3" /> Finalize Decision
              </Button>
            )}
          </div>

          {/* Consensus Progress Split Bar */}
          <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-muted">
            <div
              style={{ width: `${hasTradeOffs ? pctA : (votesA + votesRevise > 0 ? Math.round((votesA / (votesA + votesRevise)) * 100) : 50)}%` }}
              className="bg-indigo-500 transition-all duration-500"
              title={hasTradeOffs ? `${optionAName}: ${pctA}%` : `Approve: ${pctA}%`}
            />
            {hasTradeOffs && (
              <div
                style={{ width: `${pctB}%` }}
                className="bg-violet-500 transition-all duration-500"
                title={`${optionBName}: ${pctB}%`}
              />
            )}
            <div
              style={{ width: `${hasTradeOffs ? pctRevise : (votesA + votesRevise > 0 ? Math.round((votesRevise / (votesA + votesRevise)) * 100) : 50)}%` }}
              className="bg-amber-500 transition-all duration-500"
              title={`Revise: ${pctRevise}%`}
            />
          </div>

          {/* Interactive Voting Buttons */}
          {hasTradeOffs ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button
                size="sm"
                variant={userVote === 'adoptA' ? 'default' : 'outline'}
                onClick={() => handleVote('adoptA')}
                disabled={isVoting}
                className={`text-xs min-h-[36px] px-2.5 ${userVote === 'adoptA' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
              >
                <span className="truncate">{optionAName} ({pctA}%)</span>
              </Button>
              <Button
                size="sm"
                variant={userVote === 'adoptB' ? 'default' : 'outline'}
                onClick={() => handleVote('adoptB')}
                disabled={isVoting}
                className={`text-xs min-h-[36px] px-2.5 ${userVote === 'adoptB' ? 'bg-violet-600 hover:bg-violet-700 text-white' : ''}`}
              >
                <span className="truncate">{optionBName} ({pctB}%)</span>
              </Button>
              <Button
                size="sm"
                variant={userVote === 'revise' ? 'default' : 'outline'}
                onClick={() => handleVote('revise')}
                disabled={isVoting}
                className={`text-xs min-h-[36px] px-2.5 ${userVote === 'revise' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
              >
                <span className="truncate">Revise ({pctRevise}%)</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button
                size="sm"
                variant={userVote === 'adoptA' ? 'default' : 'outline'}
                onClick={() => handleVote('adoptA')}
                disabled={isVoting}
                className={`text-xs min-h-[36px] px-2.5 ${userVote === 'adoptA' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
              >
                <span className="truncate">Approve Architecture ({pctA}%)</span>
              </Button>
              <Button
                size="sm"
                variant={userVote === 'revise' ? 'default' : 'outline'}
                onClick={() => handleVote('revise')}
                disabled={isVoting}
                className={`text-xs min-h-[36px] px-2.5 ${userVote === 'revise' ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}`}
              >
                <span className="truncate">Request Changes ({pctRevise}%)</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Finalize Decision Modal */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="font-bold text-base flex items-center gap-1.5 text-foreground">
                <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                Finalize RFC Architectural Decision
              </h3>
              <p className="text-xs text-muted-foreground">
                Declare the consensus outcome based on community reviews and benchmark tradeoffs.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Decision Outcome:</label>
                <select
                  value={selectedDecision}
                  onChange={(e) => setSelectedDecision(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {hasTradeOffs ? (
                    <>
                      <option value={optionAName}>Adopt Option: {optionAName}</option>
                      <option value={optionBName}>Adopt Option: {optionBName}</option>
                      <option value="Hybrid / Custom Architecture">Hybrid / Custom Architecture</option>
                      <option value="Needs Major Revision">Needs Major Revision</option>
                    </>
                  ) : (
                    <>
                      <option value="Architecture Approved">Architecture Approved</option>
                      <option value="Approved with Minor Changes">Approved with Minor Changes</option>
                      <option value="Revisions Required">Revisions Required</option>
                      <option value="Declined / Shelved">Declined / Shelved</option>
                    </>
                  )}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Decision Rationale:</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Adopted Option A because partition ordering and sub-10ms P99 latency outweigh operational overhead."
                  value={summaryInput}
                  onChange={(e) => setSummaryInput(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowFinalizeModal(false)}
                disabled={isFinalizing}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleFinalize}
                disabled={isFinalizing}
                className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isFinalizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Publish Final Decision
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
