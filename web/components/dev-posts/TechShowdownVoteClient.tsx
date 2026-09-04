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
}

export default function TechShowdownVoteClient({
  postId,
  optionA,
  optionB,
}: TechShowdownVoteClientProps) {
  const [votesA, setVotesA] = useState(optionA.votes || 0);
  const [votesB, setVotesB] = useState(optionB.votes || 0);
  const [hasVoted, setHasVoted] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalVotes = votesA + votesB;
  const percentA = totalVotes > 0 ? Math.round((votesA / totalVotes) * 100) : 50;
  const percentB = totalVotes > 0 ? 100 - percentA : 50;

  const handleVote = async (choice: 'optionA' | 'optionB') => {
    if (hasVoted) {
      toast.info('You have already voted on this showdown.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (choice === 'optionA') setVotesA((v) => v + 1);
      else setVotesB((v) => v + 1);
      setHasVoted(choice);

      const res = await voteTechShowdown(postId, choice);
      if (res?.success) {
        toast.success(`Vote recorded for ${choice === 'optionA' ? optionA.name : optionB.name}!`);
      } else {
        toast.error(res?.failure || 'Failed to record vote');
      }
    } catch (err: any) {
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
            hasVoted === 'optionA'
              ? 'bg-blue-500/10 border-blue-500'
              : 'bg-secondary/20 hover:bg-secondary/40'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-sm font-bold text-foreground">{optionA.name}</span>
            <span className="text-xs font-mono font-bold text-blue-500">{votesA} votes</span>
          </div>
          {optionA.description && (
            <p className="text-xs text-muted-foreground mt-1">{optionA.description}</p>
          )}
          <Button
            size="sm"
            variant={hasVoted === 'optionA' ? 'default' : 'outline'}
            disabled={isSubmitting || hasVoted !== null}
            onClick={() => handleVote('optionA')}
            className="w-full mt-3 font-semibold text-xs gap-1"
          >
            {hasVoted === 'optionA' && <Check className="h-3.5 w-3.5" />}
            {hasVoted === 'optionA' ? 'Voted' : `Vote ${optionA.name}`}
          </Button>
        </div>

        {/* Option B */}
        <div
          className={`p-4 rounded-xl border transition-all ${
            hasVoted === 'optionB'
              ? 'bg-purple-500/10 border-purple-500'
              : 'bg-secondary/20 hover:bg-secondary/40'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-sm font-bold text-foreground">{optionB.name}</span>
            <span className="text-xs font-mono font-bold text-purple-500">{votesB} votes</span>
          </div>
          {optionB.description && (
            <p className="text-xs text-muted-foreground mt-1">{optionB.description}</p>
          )}
          <Button
            size="sm"
            variant={hasVoted === 'optionB' ? 'default' : 'outline'}
            disabled={isSubmitting || hasVoted !== null}
            onClick={() => handleVote('optionB')}
            className="w-full mt-3 font-semibold text-xs gap-1"
          >
            {hasVoted === 'optionB' && <Check className="h-3.5 w-3.5" />}
            {hasVoted === 'optionB' ? 'Voted' : `Vote ${optionB.name}`}
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
          {totalVotes} total developer votes cast
        </p>
      </div>
    </div>
  );
}
