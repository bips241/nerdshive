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
import UserAvatar from '@/components/UserAvatar';
import { Calendar, Clock, Video, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { scheduleRadarMeetingAction, sendSquadRequestAction } from '@/lib/radar-actions';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: {
    _id: string;
    name: string;
    user_name: string;
    image?: string;
  } | null;
  existingRequestId?: string;
  userSquads: any[];
  hackathonSlug: string;
  onSuccess: () => void;
}

export default function ScheduleMeetingModal({
  isOpen,
  onClose,
  targetUser,
  existingRequestId,
  userSquads,
  hackathonSlug,
  onSuccess,
}: Props) {
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [notes, setNotes] = useState('');
  const [selectedSquadId, setSelectedSquadId] = useState(userSquads[0]?._id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt) {
      toast.error('Please choose a date and time.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingRequestId) {
        // Direct schedule on existing request
        const res = await scheduleRadarMeetingAction({
          requestId: existingRequestId,
          action: 'propose',
          scheduledAt,
          durationMinutes,
          notes,
        });

        if (res.failure) {
          toast.error(res.failure);
        } else {
          toast.success('Meeting proposal dispatched! Counterparty will be notified.');
          onSuccess();
          onClose();
        }
      } else {
        // Create request with meeting proposal attached
        if (!selectedSquadId && userSquads.length > 0) {
          toast.error('Please select an active squad.');
          return;
        }

        if (!targetUser?._id) {
          toast.error('Target developer required.');
          return;
        }

        const res = await sendSquadRequestAction({
          type: 'leader_offer',
          hackathonSlug,
          registrationId: selectedSquadId,
          targetUserId: targetUser._id,
          role: 'Core Squad Member',
          personalNote: notes || 'Would love to jump on a quick 15-minute call to align on tech stack and track milestones.',
          deadlineHours: 48,
          meetingProposal: {
            scheduledAt,
            durationMinutes,
            notes,
          },
        });

        if (res.failure) {
          toast.error(res.failure);
        } else {
          toast.success('Vetting meeting proposed! Partner notified via direct chat.');
          onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to propose meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-950 border-zinc-800 text-white max-w-md p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Schedule Radar Vetting Call
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-400">
            Propose a live 15-minute alignment call. When confirmed, both parties can 1-click launch into an isolated WebRTC room.
          </DialogDescription>
        </DialogHeader>

        {targetUser && (
          <div className="flex items-center gap-3 p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl my-2">
            <UserAvatar user={targetUser} className="w-10 h-10 rounded-xl" />
            <div>
              <p className="font-bold text-white text-sm">{targetUser.name}</p>
              <p className="text-xs text-zinc-400">@{targetUser.user_name}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {!existingRequestId && userSquads.length > 1 && (
            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Select Your Squad Context:
              </label>
              <select
                value={selectedSquadId}
                onChange={(e) => setSelectedSquadId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
              >
                {userSquads.map((sq) => (
                  <option key={sq._id} value={sq._id}>
                    {sq.teamName} ({sq.hackathonName})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Call Date & Time:
            </label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-xs text-white"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Call Duration:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[15, 30, 45].map((mins) => (
                <button
                  type="button"
                  key={mins}
                  onClick={() => setDurationMinutes(mins)}
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    durationMinutes === mins
                      ? 'bg-cyan-950/70 border-cyan-500 text-cyan-300'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {mins} Mins
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1">
              Agenda & Alignment Notes:
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Architecture review, role assignment, project ideas..."
              rows={3}
              className="bg-zinc-900 border-zinc-800 text-xs text-white resize-none"
            />
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
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs px-4 rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <Video className="w-3.5 h-3.5" />
              {isSubmitting ? 'Proposing...' : 'Propose Meeting'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
