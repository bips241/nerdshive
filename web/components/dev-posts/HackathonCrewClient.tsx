'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Users,
  UserPlus,
  Check,
  X,
  Loader2,
  Sparkles,
  Lock,
  MessageSquare,
  Crown,
  UserCheck,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { applyToHackathonCrew, manageCrewApplicant } from '@/lib/actions';
import { toast } from 'sonner';
import Link from 'next/link';
import UserAvatar from '../UserAvatar';

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
  leaderUser: {
    _id: string;
    username: string;
    image?: string;
    name?: string;
  };
  isMember: boolean;
  hasApplied: boolean;
  initialSquadStatus: 'recruiting' | 'full' | 'building';
  maxSquadSize: number;
  initialMembers: SquadMember[];
  initialApplicants: SquadApplicant[];
  rolesNeed: string[];
  rolesHave: string[];
  squadServerId?: string;
}

export default function HackathonCrewClient({
  postId,
  isLeader,
  leaderUser,
  isMember: initialIsMember,
  hasApplied: initialHasApplied,
  initialSquadStatus,
  maxSquadSize = 4,
  initialMembers = [],
  initialApplicants = [],
  rolesNeed = [],
  rolesHave = [],
  squadServerId,
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
  const openSlotsCount = Math.max(0, maxSquadSize - totalFilled);
  const isSquadFull = squadStatus === 'full' || totalFilled >= maxSquadSize;

  const handleApply = async () => {
    if (!pitch.trim()) {
      toast.error('Please write a brief pitch about your experience and availability');
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
        toast.success('Application submitted! The squad leader has been notified.');
      } else {
        toast.error(res.failure || 'Failed to submit application');
      }
    } catch (e) {
      toast.error('Network error submitting application');
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
          const updatedMembers = [
            ...members,
            { user: targetApplicant.user, role: targetApplicant.role, joinedAt: new Date() },
          ];
          setMembers(updatedMembers);
          if (updatedMembers.length + 1 >= maxSquadSize) {
            setSquadStatus('full');
          }
          toast.success(`Accepted ${targetApplicant.user?.user_name || 'candidate'} into squad!`);
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
    <div className="space-y-4 pt-3 border-t">
      {/* Squad Roster Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Confirmed Squad Roster
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border text-center">
              {totalFilled} / {maxSquadSize} Spots Filled
            </span>
          </div>

          <div>
            {isSquadFull ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <Lock className="h-3 w-3" /> Squad Full
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <Sparkles className="h-3 w-3" /> Recruiting {openSlotsCount} more
              </span>
            )}
          </div>
        </div>

        {/* Visual Roster Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Squad Leader Slot */}
          <div className="p-2.5 rounded-xl bg-secondary/25 border border-border/70 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Link href={`/dashboard/user/${leaderUser.username}`} className="shrink-0">
                <UserAvatar user={{ user_name: leaderUser.username, image: leaderUser.image, name: leaderUser.name }} className="h-7 w-7" />
              </Link>
              <div className="min-w-0">
                <Link href={`/dashboard/user/${leaderUser.username}`} className="text-xs font-semibold hover:underline truncate block text-foreground">
                  @{leaderUser.username}
                </Link>
                <p className="text-[10px] text-muted-foreground truncate">
                  {rolesHave[0] || 'Project Lead'}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/25 shrink-0">
              <Crown className="h-3 w-3 text-amber-500" /> Lead
            </span>
          </div>

          {/* Confirmed Members */}
          {members.map((member, i) => {
            const memberUsername = member.user?.user_name || 'developer';
            return (
              <div
                key={i}
                className="p-2.5 rounded-xl bg-secondary/25 border border-border/70 flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Link href={`/dashboard/user/${memberUsername}`} className="shrink-0">
                    <UserAvatar user={member.user} className="h-7 w-7" />
                  </Link>
                  <div className="min-w-0">
                    <Link href={`/dashboard/user/${memberUsername}`} className="text-xs font-semibold hover:underline truncate block text-foreground">
                      @{memberUsername}
                    </Link>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {member.role || 'Teammate'}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shrink-0">
                  <UserCheck className="h-3 w-3 text-emerald-400" /> Member
                </span>
              </div>
            );
          })}

          {/* Open Slots */}
          {Array.from({ length: openSlotsCount }).map((_, i) => {
            const neededRoleSuggestion = rolesNeed[i] || 'Open Role';
            return (
              <div
                key={`open-${i}`}
                className="p-2.5 rounded-xl border border-dashed border-border/70 bg-card/25 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-full border border-dashed border-border/80 flex items-center justify-center text-muted-foreground text-xs shrink-0">
                    +
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-foreground/90 block truncate text-xs">
                      {neededRoleSuggestion}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Open Slot</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-secondary/50 border border-border/40 shrink-0">
                  Vacant
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
        <div className="text-xs text-muted-foreground">
          {isLeader ? (
            <span>You are managing this squad</span>
          ) : isMember ? (
            <span className="text-emerald-500 font-medium">You are an active teammate on this squad</span>
          ) : (
            <span>Connect with the team or apply to join</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Squad Member / Leader Communication: Direct Link to Real-Time Chat System */}
          {(isLeader || isMember) && (
            <Link
              href={squadServerId ? `/dashboard/messages?server=${squadServerId}` : "/dashboard/messages"}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[36px] rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs border whitespace-nowrap transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5 text-primary" /> Squad Chat Room &rarr;
            </Link>
          )}

          {/* Visitor Application / Contact */}
          {!isLeader && !isMember && (
            <>
              {hasApplied ? (
                <Button
                  size="sm"
                  disabled
                  className="min-h-[36px] px-3.5 text-xs gap-1.5 whitespace-nowrap bg-muted text-muted-foreground border"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Application Pending Review
                </Button>
              ) : isSquadFull ? (
                <Button
                  size="sm"
                  disabled
                  className="min-h-[36px] px-3.5 text-xs gap-1.5 whitespace-nowrap bg-muted text-muted-foreground"
                >
                  <Lock className="h-3.5 w-3.5" /> Squad Full
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setShowApplyModal(true)}
                  className="min-h-[36px] px-3.5 text-xs gap-1.5 whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Apply for Role
                </Button>
              )}

              <Link
                href={`/dashboard/user/${leaderUser.username}`}
                className="inline-flex items-center justify-center gap-1.5 px-3 min-h-[36px] text-xs text-muted-foreground hover:text-foreground font-medium transition-colors whitespace-nowrap"
              >
                Contact Lead
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Leader Applicant Review Panel */}
      {isLeader && applicants.length > 0 && (
        <div className="rounded-xl p-4 bg-amber-500/5 border border-amber-500/30 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-amber-500">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Pending Crew Applicants ({applicants.length})
            </span>
            <span className="text-[11px] font-normal text-muted-foreground">
              Review proof of work & accept into squad
            </span>
          </div>

          <div className="space-y-2.5">
            {applicants.map((app, idx) => {
              const applicantId = (app.user?._id || app.user)?.toString();
              const applicantName = app.user?.user_name || 'developer';
              const isProcessing = processingApplicantId === applicantId;

              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-card border border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <Link href={`/dashboard/user/${applicantName}`} className="shrink-0 mt-0.5">
                      <UserAvatar user={app.user} className="h-8 w-8" />
                    </Link>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/dashboard/user/${applicantName}`} className="font-bold text-foreground hover:underline">
                          @{applicantName}
                        </Link>
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[10px] font-semibold">
                          {app.role}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px] italic bg-secondary/30 p-2 rounded border">
                        &ldquo;{app.pitch}&rdquo;
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleApplicantAction(applicantId, 'accept')}
                      disabled={isProcessing || isSquadFull}
                      className="min-h-[32px] px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 whitespace-nowrap"
                    >
                      {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleApplicantAction(applicantId, 'decline')}
                      disabled={isProcessing}
                      className="min-h-[32px] px-2.5 text-xs text-muted-foreground hover:text-destructive whitespace-nowrap"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
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
          <div className="bg-card border rounded-2xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="space-y-1">
              <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                <UserPlus className="h-4 w-4 text-amber-500" />
                Apply to Join Hackathon Squad
              </h3>
              <p className="text-xs text-muted-foreground">
                The squad leader (@{leaderUser.username}) will review your application.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Role You Are Applying For:</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border bg-background text-foreground font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {rolesNeed.length > 0 ? (
                    rolesNeed.map((r, i) => (
                      <option key={i} value={r}>
                        {r}
                      </option>
                    ))
                  ) : (
                    <option value="General Developer">General Developer</option>
                  )}
                  <option value="Frontend (React / Next.js)">Frontend (React / Next.js)</option>
                  <option value="Backend / APIs">Backend / APIs</option>
                  <option value="AI / ML Engineer">AI / ML Engineer</option>
                  <option value="UI/UX Designer">UI/UX Designer</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Pitch / Proof of Work:</label>
                <textarea
                  rows={3}
                  placeholder="Share your primary stack, GitHub/portfolio links, and your availability for the hackathon sprint..."
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowApplyModal(false)}
                disabled={isApplying}
                className="text-xs min-h-[36px]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={isApplying}
                className="text-xs min-h-[36px] px-4 gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold whitespace-nowrap"
              >
                {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Submit Application
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
