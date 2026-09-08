'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/UserAvatar';
import { Send, Clock, Calendar, Shield, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { sendSquadRequestAction } from '@/lib/radar-actions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetCandidate?: {
    _id: string;
    name: string;
    user_name: string;
    image?: string;
    college?: string;
    preferredRole?: string;
  } | null;
  targetSquad?: {
    _id: string;
    teamName: string;
    rolesNeeded: string[];
  } | null;
  userSquads: any[];
  hackathonSlug: string;
  isApplication?: boolean;
  onSuccess: () => void;
}

export default function SendOfferModal({
  isOpen,
  onClose,
  targetCandidate,
  targetSquad,
  userSquads,
  hackathonSlug,
  isApplication = false,
  onSuccess,
}: Props) {
  const [selectedSquadId, setSelectedSquadId] = useState<string>(
    userSquads[0]?._id || targetSquad?._id || ''
  );
  const [role, setRole] = useState(
    targetCandidate?.preferredRole || targetSquad?.rolesNeeded?.[0] || 'Fullstack Developer'
  );
  const [personalNote, setPersonalNote] = useState('');
  const [deadlineHours, setDeadlineHours] = useState<number>(48);
  const [proposeMeeting, setProposeMeeting] = useState<boolean>(false);
  const [meetingDate, setMeetingDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim()) {
      toast.error('Please specify the role.');
      return;
    }

    const regId = isApplication ? targetSquad?._id : selectedSquadId;
    if (!regId) {
      toast.error('Please select an active squad.');
      return;
    }

    const targetUserId = isApplication ? '' : targetCandidate?._id;
    if (!targetUserId && !isApplication) {
      toast.error('No target developer selected.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await sendSquadRequestAction({
        type: isApplication ? 'candidate_application' : 'leader_offer',
        hackathonSlug,
        registrationId: regId,
        targetUserId: targetUserId || '',
        role: role.trim(),
        personalNote: personalNote.trim(),
        deadlineHours,
        meetingProposal:
          proposeMeeting && meetingDate
            ? {
                scheduledAt: meetingDate,
                durationMinutes: 15,
                notes: `15-minute alignment call for ${role.trim()}`,
              }
            : undefined,
      });

      if (res.failure) {
        toast.error(res.failure);
      } else {
        toast.success(res.message || 'Request dispatched with deadline countdown!');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-lg p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            {isApplication ? (
              <>
                <Shield className="w-5 h-5 text-emerald-400" />
                Apply to Join "{targetSquad?.teamName}"
              </>
            ) : (
              <>
                <Send className="w-5 h-5 text-emerald-400" />
                Send Official Squad Offer
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            {isApplication
              ? 'Pitch your skills to the squad leader and set an acceptance deadline.'
              : 'Extend an official invitation to join your core squad with a defined decision window.'}
          </DialogDescription>
        </DialogHeader>

        {/* Target Profile Snippet */}
        {targetCandidate && !isApplication && (
          <div className="flex items-center gap-3 p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl my-2">
            <UserAvatar user={targetCandidate} className="w-10 h-10 rounded-xl" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{targetCandidate.name}</span>
                <span className="text-xs text-zinc-400">@{targetCandidate.user_name}</span>
              </div>
              {targetCandidate.college && (
                <p className="text-xs text-zinc-400">🎓 {targetCandidate.college}</p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Squad Selector (if Leader has multiple squads) */}
          {!isApplication && userSquads.length > 1 && (
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Select Your Squad:
              </label>
              <select
                value={selectedSquadId}
                onChange={(e) => setSelectedSquadId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-1 focus:ring-emerald-500"
              >
                {userSquads.map((sq) => (
                  <option key={sq._id} value={sq._id}>
                    {sq.teamName} ({sq.hackathonName})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Role Offered / Sought */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              {isApplication ? 'Target Role You Seek:' : 'Role Offered to Candidate:'}
            </label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Frontend Architect, AI Engineer, Solidity Dev"
              className="bg-zinc-900 border-zinc-800 text-xs text-white"
              required
            />
          </div>

          {/* Specified Acceptance Deadline */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1 flex items-center justify-between">
              <span>Acceptance Deadline:</span>
              <span className="text-emerald-400 text-[11px] font-mono">{deadlineHours} Hours</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[24, 48, 72].map((hours) => (
                <button
                  type="button"
                  key={hours}
                  onClick={() => setDeadlineHours(hours)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    deadlineHours === hours
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {hours} Hours
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Request will auto-expire if not accepted within this timeframe.
            </p>
          </div>

          {/* Personal Note / Pitch */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              {isApplication ? 'Pitch & Experience Note:' : 'Personal Message from Team Lead:'}
            </label>
            <Textarea
              value={personalNote}
              onChange={(e) => setPersonalNote(e.target.value)}
              placeholder={
                isApplication
                  ? "Describe what you'll build and your relevant tech stack experience..."
                  : "Introduce the problem statement, why you chose their profile, and milestones..."
              }
              rows={3}
              className="bg-zinc-900 border-zinc-800 text-xs text-white resize-none"
            />
          </div>

          {/* Optional: Propose Meeting Schedule right away */}
          <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={proposeMeeting}
                  onChange={(e) => setProposeMeeting(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-emerald-500"
                />
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Attach 15-Minute Alignment Call Proposal
              </label>
            </div>

            {proposeMeeting && (
              <div className="pt-2">
                <Input
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs text-white"
                  required={proposeMeeting}
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Once accepted, an isolated Radar Vetting Room link will be provisioned automatically.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="mt-6 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-zinc-800 text-xs text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 rounded-lg shadow-sm"
            >
              {isSubmitting ? 'Dispatching...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
