'use client';

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { voteTechShowdown } from '@/lib/actions';
import { toast } from 'sonner';
import { Loader2, Check } from 'lucide-react';

interface TechShowdownVoteClientProps {
  postId: string;
  optionA: { name: string; description?: string; votes: number };
  optionB: { name: string; description?: string; votes: number };
  initialUserVote?: 'optionA' | 'optionB' | null;
}

export default function TechShowdownVoteClient({
  postId,
  optionA,
  optionB,
  initialUserVote = null,
}: TechShowdownVoteClientProps) {
  const [userVote, setUserVote] = useState<'optionA' | 'optionB' | null>(initialUserVote);
  const [votesA, setVotesA] = useState(optionA.votes || 0);
  const [votesB, setVotesB] = useState(optionB.votes || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalVotes = votesA + votesB;
  const percentA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;
  const percentB = totalVotes > 0 ? 100 - percentA : 50;

  const handleVote = async (choice: 'optionA' | 'optionB') => {
    if (userVote === choice) {
      toast.info(`You have already voted for ${choice === 'optionA' ? optionA.name : optionB.name}`);
      return;
    }
    setIsSubmitting(true);

    const prevVote = userVote;
    const prevA = votesA;
    const prevB = votesB;

    let nextA = votesA;
    let nextB = votesB;

    if (prevVote === 'optionA') nextA = Math.max(0, nextA - 1);
    if (prevVote === 'optionB') nextB = Math.max(0, nextB - 1);

    if (choice === 'optionA') nextA += 1;
    if (choice === 'optionB') nextB += 1;

    setUserVote(choice);
    setVotesA(nextA);
    setVotesB(nextB);

    try {
      const res = await voteTechShowdown(postId, choice);
      if (res?.success) {
        if (typeof res.votesA === 'number') setVotesA(res.votesA);
        if (typeof res.votesB === 'number') setVotesB(res.votesB);
        toast.success(
          prevVote
            ? `Vote switched to ${choice === 'optionA' ? optionA.name : optionB.name}!`
            : `Vote recorded for ${choice === 'optionA' ? optionA.name : optionB.name}!`
        );
      } else {
        // Rollback on failure
        setUserVote(prevVote);
        setVotesA(prevA);
        setVotesB(prevB);
        toast.error(res?.failure || 'Failed to record vote');
      }
    } catch (err: any) {
      setUserVote(prevVote);
      setVotesA(prevA);
      setVotesB(prevB);
      toast.error(err.message || 'Voting failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Side-by-Side Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Option A */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            userVote === 'optionA'
              ? 'bg-blue-500/10 border-blue-500 ring-1 ring-blue-500/30'
              : 'bg-secondary/20 hover:bg-secondary/30'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-sm font-bold text-foreground">{optionA.name}</span>
            <span className="text-xs font-mono font-bold text-blue-500">
              {votesA} {votesA === 1 ? 'vote' : 'votes'}
            </span>
          </div>
          {optionA.description && (
            <p className="text-xs text-muted-foreground mt-1">{optionA.description}</p>
          )}
          <Button
            size="sm"
            variant={userVote === 'optionA' ? 'default' : 'outline'}
            disabled={isSubmitting}
            onClick={() => handleVote('optionA')}
            className={`w-full mt-3 font-semibold text-xs gap-1 min-h-[36px] transition-colors ${
              userVote === 'optionA'
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                : 'hover:bg-blue-500/10 hover:text-blue-500'
            }`}
          >
            {isSubmitting && userVote !== 'optionA' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : userVote === 'optionA' ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : null}
            <span className="truncate">
              {userVote === 'optionA' ? `Voted: ${optionA.name}` : `Vote ${optionA.name}`}
            </span>
          </Button>
        </div>

        {/* Option B */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            userVote === 'optionB'
              ? 'bg-purple-500/10 border-purple-500 ring-1 ring-purple-500/30'
              : 'bg-secondary/20 hover:bg-secondary/30'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-sm font-bold text-foreground">{optionB.name}</span>
            <span className="text-xs font-mono font-bold text-purple-500">
              {votesB} {votesB === 1 ? 'vote' : 'votes'}
            </span>
          </div>
          {optionB.description && (
            <p className="text-xs text-muted-foreground mt-1">{optionB.description}</p>
          )}
          <Button
            size="sm"
            variant={userVote === 'optionB' ? 'default' : 'outline'}
            disabled={isSubmitting}
            onClick={() => handleVote('optionB')}
            className={`w-full mt-3 font-semibold text-xs gap-1 min-h-[36px] transition-colors ${
              userVote === 'optionB'
                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                : 'hover:bg-purple-500/10 hover:text-purple-500'
            }`}
          >
            {isSubmitting && userVote !== 'optionB' ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : userVote === 'optionB' ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : null}
            <span className="truncate">
              {userVote === 'optionB' ? `Voted: ${optionB.name}` : `Vote ${optionB.name}`}
            </span>
          </Button>
        </div>
      </div>

      {/* Split Percentage Progress Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-xs font-semibold text-muted-foreground">
          <span>{percentA}% {optionA.name}</span>
          <span>{percentB}% {optionB.name}</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden flex">
          <div className="bg-blue-500 transition-all duration-300" style={{ width: `${percentA}%` }} />
          <div className="bg-purple-500 transition-all duration-300" style={{ width: `${percentB}%` }} />
        </div>
        <p className="text-[11px] text-muted-foreground text-center pt-0.5">
          {totalVotes} total developer {totalVotes === 1 ? 'vote' : 'votes'} cast
        </p>
      </div>
    </div>
  );
}
