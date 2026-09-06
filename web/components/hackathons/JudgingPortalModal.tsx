'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { submitJudgeEvaluationAction } from '@/lib/hackathon-actions';
import { toast } from 'sonner';
import {
  Gavel,
  Code2,
  ExternalLink,
  Video,
  FileText,
  CheckCircle,
  Loader2,
  EyeOff,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  hackathon: any;
  registration: any;
  roundNumber: number;
  onScored?: () => void;
}

export default function JudgingPortalModal({
  isOpen,
  onClose,
  hackathon,
  registration,
  roundNumber,
  onScored,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active round rubric
  const currentRound = (hackathon?.rounds || []).find((r: any) => r.roundNumber === roundNumber) || {
    rubric: [
      { criterion: 'Innovation & Creativity', maxScore: 10, description: 'Originality of approach' },
      { criterion: 'Technical Execution', maxScore: 10, description: 'Code quality and stability' },
      { criterion: 'Product Design & UX', maxScore: 10, description: 'Finesse and usability' },
    ],
  };

  const submission = (registration?.submissions || []).find((s: any) => s.roundNumber === roundNumber) ||
    registration?.submissions?.[0];

  const [scores, setScores] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    (currentRound.rubric || []).forEach((r: any) => {
      init[r.criterion] = 8;
    });
    return init;
  });

  const [generalRemarks, setGeneralRemarks] = useState('');

  const totalScore = Object.values(scores).reduce((acc, curr) => acc + Number(curr || 0), 0);
  const maxPossible = (currentRound.rubric || []).reduce((acc: number, curr: any) => acc + Number(curr.maxScore || 10), 0);

  const isBlind = !!hackathon?.isBlindJudging;
  const displayName = isBlind ? `Anonymous Project #${registration?.code || '409'}` : registration?.teamName;

  const handleScoreChange = (criterion: string, val: number, max: number) => {
    const clamped = Math.max(0, Math.min(val, max));
    setScores((prev) => ({ ...prev, [criterion]: clamped }));
  };

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formattedScores = (currentRound.rubric || []).map((r: any) => ({
      criterion: r.criterion,
      score: scores[r.criterion] !== undefined ? scores[r.criterion] : 8,
      maxScore: r.maxScore || 10,
      feedback: '',
    }));

    try {
      const res = await submitJudgeEvaluationAction(hackathon.slug, {
        registrationId: registration._id,
        roundNumber,
        scores: formattedScores,
        generalRemarks,
      });

      if (res?.success) {
        toast.success(`Evaluation recorded successfully! Total: ${totalScore}/${maxPossible}`);
        if (onScored) onScored();
        onClose();
      } else {
        toast.error(res?.failure || 'Failed to submit evaluation.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error recording score.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!registration) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-neutral-950 border-neutral-800 text-foreground">
        <DialogHeader className="border-b border-neutral-800 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Gavel className="h-5 w-5 text-amber-400" />
                {displayName}
                {isBlind && (
                  <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-300 flex items-center gap-1">
                    <EyeOff className="h-3 w-3" /> Blind Review
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs mt-1">
                Evaluating Round {roundNumber}: {currentRound.name || 'Submission'} • Track: {registration.trackName || 'Open Track'}
              </DialogDescription>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg text-right">
              <span className="text-xs text-amber-300 font-semibold block">Total Score</span>
              <span className="font-mono font-bold text-lg text-amber-400">
                {totalScore} / {maxPossible}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Project Submission Review Details */}
        <div className="space-y-4 pt-4 border-b border-neutral-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-neutral-100">
              {submission?.projectTitle || 'Untitled Prototype'}
            </h3>
            {submission?.tagline && (
              <p className="text-xs text-neutral-400 mt-0.5">{submission.tagline}</p>
            )}
            {submission?.description && (
              <p className="text-xs text-neutral-300 mt-2 p-3 bg-neutral-900 rounded-lg whitespace-pre-wrap">
                {submission.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {submission?.repoUrl && (
              <a
                href={submission.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 text-purple-400 border border-neutral-800 hover:bg-neutral-800"
              >
                <Code2 className="h-3.5 w-3.5" /> Repository <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {submission?.demoUrl && (
              <a
                href={submission.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 text-emerald-400 border border-neutral-800 hover:bg-neutral-800"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Live Demo <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {submission?.videoUrl && (
              <a
                href={submission.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 text-blue-400 border border-neutral-800 hover:bg-neutral-800"
              >
                <Video className="h-3.5 w-3.5" /> Demo Video <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {submission?.pitchDeckUrl && (
              <a
                href={submission.pitchDeckUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 text-amber-400 border border-neutral-800 hover:bg-neutral-800"
              >
                <FileText className="h-3.5 w-3.5" /> Pitch Deck <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Rubric Evaluation Form */}
        <form onSubmit={handleSubmitScore} className="space-y-4 pt-4">
          <h4 className="text-xs font-bold text-neutral-300 tracking-wider uppercase">
            Official Rubric Scorecard
          </h4>

          <div className="space-y-3">
            {(currentRound.rubric || []).map((r: any, idx: number) => {
              const currentVal = scores[r.criterion] !== undefined ? scores[r.criterion] : 8;
              const max = r.maxScore || 10;

              return (
                <div key={idx} className="p-3 bg-neutral-900/70 border border-neutral-800/80 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-sm font-semibold text-neutral-200">{r.criterion}</p>
                      {r.description && (
                        <p className="text-xs text-muted-foreground">{r.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={max}
                        value={currentVal}
                        onChange={(e) => handleScoreChange(r.criterion, Number(e.target.value), max)}
                        className="w-16 h-8 text-center text-sm font-mono font-bold bg-neutral-950 border-neutral-700"
                      />
                      <span className="text-xs text-neutral-400">/ {max}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Constructive Feedback & Jury Remarks (Shared Transparently)
            </label>
            <Textarea
              placeholder="Highlight strengths, architecture elegance, and recommendations for improvement..."
              rows={3}
              value={generalRemarks}
              onChange={(e) => setGeneralRemarks(e.target.value)}
              className="bg-neutral-900 border-neutral-800 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" /> Save & Submit Score
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
