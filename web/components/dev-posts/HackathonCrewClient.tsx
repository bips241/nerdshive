'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Check, X, Loader2, Sparkles, Lock, MessageSquare, ArrowRight } from 'lucide-react';
import { applyToHackathonCrew, manageCrewApplicant } from '@/lib/actions';
import { toast } from 'sonner';
import Link from 'next/link';

interface SquadMember {
  user: any;
  role: string;
  joinedAt: string | Date;
}

interface SquadApplicant {
  user: any;
  role: string;
  pitch: string;
  appliedAt: string | Date;
}

interface HackathonCrewClientProps {
  postId: string;
  isLeader: boolean;
  isMember: boolean;
  hasApplied: boolean;
  initialSquadStatus: 'recruiting' | 'full' | 'building';
  maxSquadSize: number;
  initialMembers: SquadMember[];
  initialApplicants: SquadApplicant[];
  rolesNeed: string[];
}

export default function HackathonCrewClient({
  postId,
  isLeader,
  isMember: initialIsMember,
  hasApplied: initialHasApplied,
  initialSquadStatus,
  maxSquadSize,
  initialMembers,
  initialApplicants,
  rolesNeed,
}: HackathonCrewClientProps) {
  const [squadStatus, setSquadStatus] = useState(initialSquadStatus);
  const [members, setMembers] = useState<SquadMember[]>(initialMembers || []);
  const [applicants, setApplicants] = useState<SquadApplicant[]>(initialApplicants || []);
  const [hasApplied, setHasApplied] = useState(initialHasApplied);
  const [isMember, setIsMember] = useState(initialIsMember);

  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(rolesNeed[0] || 'Developer');
  const [pitch, setPitch] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [processingApplicantId, setProcessingApplicantId] = useState<string | null>(null);

  const totalFilled = members.length + 1; // 1 leader + accepted members
  const isSquadFull = squadStatus === 'full' || totalFilled >= maxSquadSize;

  const handleApply = async () => {
    if (!pitch.trim()) {
      toast.error('Please include a brief pitch about your experience');
      return;
    }
    setIsApplying(true);
    try {
      const res = await applyToHackathonCrew({
        postId,
        role: selectedRole,
        pitch: pitch.trim(),
      });
      if (res.success) {
        setHasApplied(true);
        setShowApplyModal(false);
        toast.success('Application sent to squad leader!');
      } else {
        toast.error(res.failure || 'Failed to submit application');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setIsApplying(false);
    }
  };

  const handleApplicantAction = async (applicantUserId: string, action: 'accept' | 'decline') => {
    setProcessingApplicantId(applicantUserId);
    try {
      const res = await manageCrewApplicant({
        postId,
        applicantUserId,
        action,
      });
      if (res.success) {
        const targetApplicant = applicants.find(
          (a) => (a.user?._id || a.user)?.toString() === applicantUserId
        );
        setApplicants(applicants.filter((a) => (a.user?._id || a.user)?.toString() !== applicantUserId));

        if (action === 'accept' && targetApplicant) {
          const updatedMembers = [...members, { user: targetApplicant.user, role: targetApplicant.role, joinedAt: new Date() }];
          setMembers(updatedMembers);
          if (updatedMembers.length + 1 >= maxSquadSize) {
            setSquadStatus('full');
          }
          toast.success('Applicant accepted into hackathon squad!');
        } else {
          toast.info('Applicant declined.');
        }
      } else {
        toast.error(res.failure || 'Failed to process applicant');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setProcessingApplicantId(null);
    }
  };

  return (
    <div className="space-y-3.5 pt-2 border-t">
      {/* Roster Slot Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={`font-semibold px-2.5 py-0.5 rounded-full border ${
              isSquadFull
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
            }`}
          >
            {isSquadFull ? (
              <span className="flex items-center gap-1">
                <Lock className="h-3 w-3" /> Squad Full ({totalFilled}/{maxSquadSize})
              </span>
            ) : (
              <span>⚡ Recruiting: {totalFilled}/{maxSquadSize} Spots Filled</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* If user is part of the squad (leader or member) */}
          {(isLeader || isMember) && (
            <Link
              href={`/dashboard/stranger-chat?mode=hackathon_squad&room=${postId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-secondary text-secondary-foreground font-semibold text-xs border hover:bg-secondary/80 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Squad Chat Room &rarr;
            </Link>
          )}

          {/* If user is a visitor */}
          {!isLeader && !isMember && (
            <Button
              size="sm"
              onClick={() => setShowApplyModal(true)}
              disabled={isSquadFull || hasApplied}
              className={`text-xs h-8 gap-1.5 ${
                hasApplied
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-cyan-600 hover:bg-cyan-700 text-white'
              }`}
            >
              {hasApplied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Application Submitted
                </>
              ) : isSquadFull ? (
                <>
                  <Lock className="h-3.5 w-3.5" /> Squad Full
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" /> Apply for Role
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Leader Review Panel: Applicants */}
      {isLeader && applicants.length > 0 && (
        <div className="rounded-xl p-3.5 bg-cyan-500/10 border border-cyan-500/30 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-600 dark:text-cyan-400">
            <span>Pending Crew Applicants ({applicants.length}):</span>
            <span className="text-[10px] font-normal text-muted-foreground">Review and accept into squad</span>
          </div>

          <div className="space-y-2">
            {applicants.map((app, idx) => {
              const applicantId = (app.user?._id || app.user)?.toString();
              const applicantName = app.user?.user_name || 'Developer';
              return (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-card/70 border border-cyan-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <strong className="text-foreground">@{applicantName}</strong>
                      <span className="px-1.5 py-0.2 rounded bg-secondary text-secondary-foreground font-mono text-[10px]">
                        {app.role}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-[11px] italic">"{app.pitch}"</p>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleApplicantAction(applicantId, 'accept')}
                      disabled={processingApplicantId === applicantId}
                      className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    >
                      <Check className="h-3 w-3" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleApplicantAction(applicantId, 'decline')}
                      disabled={processingApplicantId === applicantId}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Apply Modal Dialog */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="font-bold text-base flex items-center gap-1.5 text-foreground">
                <UserPlus className="h-4 w-4 text-cyan-500" />
                Apply to Join Hackathon Squad
              </h3>
              <p className="text-xs text-muted-foreground">
                The squad leader will review your proof of work and pitch.
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Role You Are Applying For:</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {rolesNeed.map((r, i) => (
                    <option key={i} value={r}>
                      {r}
                    </option>
                  ))}
                  <option value="Fullstack Generalist">Fullstack Generalist</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Pitch / Why You're a Fit:</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Built 3 production Next.js apps, familiar with web sockets, ready to hack 36h."
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowApplyModal(false)}
                disabled={isApplying}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={isApplying}
                className="text-xs gap-1.5 bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Send Application
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
