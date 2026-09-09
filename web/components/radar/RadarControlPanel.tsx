'use client';

import React, { useState, useEffect } from 'react';
import {
  Inbox,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Shield,
  Users,
  Video,
  ChevronRight,
  MessageSquare,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Settings,
  GraduationCap,
  MapPin,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/UserAvatar';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  respondToSquadRequestAction,
  withdrawSquadRequestAction,
  scheduleRadarMeetingAction,
  toggleUserAvailabilityAction,
} from '@/lib/radar-actions';

export interface RequestItem {
  _id: string;
  type: 'leader_offer' | 'candidate_application';
  hackathonSlug: string;
  hackathonName: string;
  teamName: string;
  registrationId?: string;
  role: string;
  personalNote?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';
  expiresAt: string | null;
  createdAt: string | null;
  partner: {
    _id: string;
    name: string;
    user_name: string;
    image?: string;
    bio?: string;
    college?: string;
    location?: string;
    timezone?: string;
    techStack?: string[];
    debugKarma?: number;
    bugsSolvedCount?: number;
  };
  meetingSchedule?: {
    scheduledAt: string | null;
    durationMinutes: number;
    status: 'none' | 'proposed' | 'confirmed' | 'rescheduled' | 'declined' | 'completed';
    proposedBy?: string;
    meetingRoomId?: string;
    notes?: string;
  } | null;
}

export interface ScheduledMeetingItem {
  requestId: string;
  hackathonName: string;
  teamName: string;
  role: string;
  scheduledAt: string | null;
  durationMinutes: number;
  status: string;
  meetingRoomId?: string;
  notes?: string;
  partner: any;
  isProposedByMe: boolean;
}

interface Props {
  sentRequests: RequestItem[];
  receivedRequests: RequestItem[];
  scheduledMeetings: ScheduledMeetingItem[];
  userSettings: {
    acceptingRequests: boolean;
    occupancyStatus: 'open' | 'occupied';
    occupiedTeamId?: string;
    college: string;
    location: string;
    timezone?: string;
    preferredRole: string;
  };
  userSquads: any[];
  currentUserId: string;
  onRefresh: () => void;
  onLaunchMeeting: (meetingRoomId: string, requestId: string, counterparty: any) => void;
}

export default function RadarControlPanel({
  sentRequests,
  receivedRequests,
  scheduledMeetings,
  userSettings: initialSettings,
  userSquads,
  currentUserId,
  onRefresh,
  onLaunchMeeting,
}: Props) {
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'meetings' | 'settings'>('received');
  const [settings, setSettings] = useState(initialSettings);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Active Countdown calculation
  const getRemainingTime = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m left`;
  };

  // 1. Handle Accept Request
  const handleAccept = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const res = await respondToSquadRequestAction(requestId, 'accept');
      if (res.failure) {
        toast.error(res.failure);
      } else {
        toast.success(res.message || 'Accepted into squad!');
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept request');
    } finally {
      setProcessingId(null);
    }
  };

  // 2. Handle Reject Request
  const handleReject = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const res = await respondToSquadRequestAction(requestId, 'reject');
      if (res.failure) {
        toast.error(res.failure);
      } else {
        toast.info(res.message || 'Request declined.');
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to decline request');
    } finally {
      setProcessingId(null);
    }
  };

  // 3. Handle Withdraw Request
  const handleWithdraw = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const res = await withdrawSquadRequestAction(requestId);
      if (res.failure) {
        toast.error(res.failure);
      } else {
        toast.success('Request withdrawn.');
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to withdraw');
    } finally {
      setProcessingId(null);
    }
  };

  // 4. Handle Confirm Meeting
  const handleConfirmMeeting = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      const res = await scheduleRadarMeetingAction({
        requestId,
        action: 'confirm',
      });
      if (res.failure) {
        toast.error(res.failure);
      } else {
        toast.success('Meeting confirmed! You can launch the Radar Vetting call at the scheduled time.');
        onRefresh();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm meeting');
    } finally {
      setProcessingId(null);
    }
  };

  // 5. Handle Toggle Availability
  const handleToggleAccepting = async () => {
    const nextVal = !settings.acceptingRequests;
    setSettings((prev) => ({ ...prev, acceptingRequests: nextVal }));
    setIsUpdatingSettings(true);
    try {
      const res = await toggleUserAvailabilityAction({ acceptingRequests: nextVal });
      if (res.failure) {
        toast.error(res.failure);
        setSettings((prev) => ({ ...prev, acceptingRequests: !nextVal }));
      } else {
        toast.success(nextVal ? 'Now accepting new teammate requests.' : 'Paused incoming teammate requests.');
      }
    } catch (err) {
      setSettings((prev) => ({ ...prev, acceptingRequests: !nextVal }));
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // 6. Handle Toggle Occupancy
  const handleToggleOccupancy = async () => {
    const nextStatus = settings.occupancyStatus === 'open' ? 'occupied' : 'open';
    setSettings((prev) => ({ ...prev, occupancyStatus: nextStatus }));
    setIsUpdatingSettings(true);
    try {
      const res = await toggleUserAvailabilityAction({ occupancyStatus: nextStatus });
      if (res.failure) {
        toast.error(res.failure);
        setSettings((prev) => ({
          ...prev,
          occupancyStatus: nextStatus === 'open' ? 'occupied' : 'open',
        }));
      } else {
        toast.success(
          nextStatus === 'occupied'
            ? 'Flagged as occupied by squad.'
            : 'Flagged as open for squads.'
        );
      }
    } catch (err) {
      setSettings((prev) => ({
        ...prev,
        occupancyStatus: nextStatus === 'open' ? 'occupied' : 'open',
      }));
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const pendingReceivedCount = receivedRequests.filter(
    (r) => r.status === 'pending' && (!r.expiresAt || new Date(r.expiresAt) > new Date())
  ).length;

  return (
    <div className="space-y-6">
      {/* Quick Status Bar & Availability Controls */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Recruitment Status & Availability Cockpit
            </h3>
            <p className="text-xs text-zinc-400">
              Control whether teams can discover and invite you, and manage your team occupancy.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Receiving Requests Toggle */}
            <button
              onClick={handleToggleAccepting}
              disabled={isUpdatingSettings}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                settings.acceptingRequests
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-zinc-800/80 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  settings.acceptingRequests ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                }`}
              />
              {settings.acceptingRequests ? 'Accepting Requests: ON' : 'Requests Paused: OFF'}
            </button>

            {/* Occupancy Status Toggle */}
            <button
              onClick={handleToggleOccupancy}
              disabled={isUpdatingSettings}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                settings.occupancyStatus === 'open'
                  ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60'
              }`}
            >
              {settings.occupancyStatus === 'open' ? '🟢 Open for Squad' : '🔒 Occupied by Team'}
            </button>
          </div>
        </div>

        {/* Current Active Squads Quick Strip */}
        {userSquads.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-zinc-400">Your Active Squads:</span>
            {userSquads.map((sq) => (
              <div
                key={sq._id}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs"
              >
                <span className="font-bold text-white">{sq.teamName}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-zinc-800 rounded text-emerald-400">
                  {sq.teamCode}
                </span>
                {sq.squadServerId && (
                  <Link
                    href={`/dashboard/servers/${sq.squadServerId}`}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-medium ml-1"
                  >
                    Discord Lounge
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Control Panel Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('received')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'received'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          Received Requests
          {pendingReceivedCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-zinc-950 font-bold text-[10px] flex items-center justify-center">
              {pendingReceivedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('sent')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'sent'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          Sent Requests ({sentRequests.length})
        </button>

        <button
          onClick={() => setActiveTab('meetings')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === 'meetings'
              ? 'bg-zinc-800 text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          Scheduled Meetings ({scheduledMeetings.length})
        </button>
      </div>

      {/* TAB A: RECEIVED REQUESTS */}
      {activeTab === 'received' && (
        <div className="space-y-4">
          {receivedRequests.length === 0 ? (
            <div className="py-16 text-center bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-8">
              <Inbox className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-white">No recruitment requests received</h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                When squad leaders extend offers or developers apply to join your squad, their requests with deadline countdowns will appear here.
              </p>
            </div>
          ) : (
            receivedRequests.map((req) => {
              const remainingTime = getRemainingTime(req.expiresAt);
              const isPending = req.status === 'pending';
              const isExpired = req.status === 'expired' || remainingTime === 'Expired';

              return (
                <div
                  key={req._id}
                  className="bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition-all rounded-2xl p-5"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={req.partner} className="w-12 h-12 rounded-xl" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">
                            {req.partner?.name || 'Developer'}
                          </h4>
                          <span className="text-xs text-zinc-400">@{req.partner?.user_name}</span>
                          {req.partner?.college && (
                            <span className="text-[11px] px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-md font-medium">
                              {req.partner.college}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {req.type === 'leader_offer' ? 'Offered you role:' : 'Applied for role:'}{' '}
                          <span className="text-emerald-400 font-semibold">{req.role}</span> in{' '}
                          <span className="text-white font-medium">"{req.teamName}"</span> (
                          {req.hackathonName})
                        </p>
                      </div>
                    </div>

                    {/* Deadline Countdown & Status */}
                    <div className="flex items-center gap-2">
                      {isPending && !isExpired && remainingTime && (
                        <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-300 text-xs px-2.5 py-1 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {remainingTime}
                        </Badge>
                      )}
                      {req.status === 'accepted' && (
                        <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-300 text-xs px-2.5 py-1 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Accepted
                        </Badge>
                      )}
                      {req.status === 'rejected' && (
                        <Badge className="bg-red-500/10 border-red-500/30 text-red-400 text-xs px-2.5 py-1 font-semibold flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Declined
                        </Badge>
                      )}
                      {isExpired && (
                        <Badge className="bg-zinc-800 border-zinc-700 text-zinc-400 text-xs px-2.5 py-1 font-mono">
                          Expired
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Personal Note */}
                  {req.personalNote && (
                    <div className="mt-3.5 p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl text-xs text-zinc-300 leading-relaxed">
                      "{req.personalNote}"
                    </div>
                  )}

                  {/* Proposed Meeting Details if attached */}
                  {req.meetingSchedule && req.meetingSchedule.status !== 'none' && (
                    <div className="mt-3 p-3 bg-cyan-950/20 border border-cyan-800/40 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-cyan-300">
                        <Calendar className="w-4 h-4" />
                        <span suppressHydrationWarning>
                          Proposed Call:{' '}
                          <strong suppressHydrationWarning className="text-white">
                            {req.meetingSchedule.scheduledAt
                              ? new Date(req.meetingSchedule.scheduledAt).toLocaleString()
                              : 'TBD'}
                          </strong>{' '}
                          ({req.meetingSchedule.durationMinutes} mins)
                        </span>
                      </div>
                      {req.meetingSchedule.status === 'proposed' && (
                        <Button
                          size="sm"
                          onClick={() => handleConfirmMeeting(req._id)}
                          disabled={processingId === req._id}
                          className="bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] h-7 px-2.5 rounded-lg"
                        >
                          Confirm Call
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Action Buttons for Pending Requests */}
                  {isPending && !isExpired && (
                    <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-zinc-800/80">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(req._id)}
                        disabled={processingId === req._id}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs h-8 px-3 rounded-lg"
                      >
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAccept(req._id)}
                        disabled={processingId === req._id}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-8 px-4 rounded-lg shadow-sm flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accept & Join Squad
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB B: SENT REQUESTS */}
      {activeTab === 'sent' && (
        <div className="space-y-4">
          {sentRequests.length === 0 ? (
            <div className="py-16 text-center bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-8">
              <Send className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-white">No requests sent yet</h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Discover developers or squads in the Granular Radar tab and extend offers or applications.
              </p>
            </div>
          ) : (
            sentRequests.map((req) => {
              const remainingTime = getRemainingTime(req.expiresAt);
              const isPending = req.status === 'pending';

              return (
                <div
                  key={req._id}
                  className="bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition-all rounded-2xl p-5"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar user={req.partner} className="w-12 h-12 rounded-xl" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm">
                            {req.partner?.name || 'Developer'}
                          </h4>
                          <span className="text-xs text-zinc-400">@{req.partner?.user_name}</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Sent offer for <span className="text-emerald-400 font-semibold">{req.role}</span> in{' '}
                          <span className="text-white font-medium">"{req.teamName}"</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPending && remainingTime && (
                        <Badge className="bg-amber-500/10 border-amber-500/30 text-amber-300 text-xs px-2.5 py-1 font-mono">
                          {remainingTime}
                        </Badge>
                      )}
                      <Badge
                        className={`text-xs px-2.5 py-1 font-semibold ${
                          req.status === 'accepted'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : req.status === 'rejected'
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : req.status === 'withdrawn'
                            ? 'bg-zinc-800 text-zinc-400'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {req.status.toUpperCase()}
                      </Badge>

                      {isPending && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleWithdraw(req._id)}
                          disabled={processingId === req._id}
                          className="text-xs text-zinc-400 hover:text-red-400 h-8 px-2"
                        >
                          Withdraw
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Meeting status if confirmed */}
                  {req.meetingSchedule && req.meetingSchedule.status === 'confirmed' && (
                    <div className="mt-3.5 p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <Video className="w-4 h-4" />
                        <span suppressHydrationWarning>
                          Vetting Call Confirmed:{' '}
                          <strong suppressHydrationWarning>
                            {req.meetingSchedule.scheduledAt
                              ? new Date(req.meetingSchedule.scheduledAt).toLocaleString()
                              : 'Scheduled'}
                          </strong>
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() =>
                          onLaunchMeeting(
                            req.meetingSchedule?.meetingRoomId || `vetting_${req._id}`,
                            req._id,
                            req.partner
                          )
                        }
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7 px-3 rounded-lg font-semibold flex items-center gap-1"
                      >
                        <Video className="w-3 h-3" />
                        Launch Vetting Room
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB C: SCHEDULED MEETINGS */}
      {activeTab === 'meetings' && (
        <div className="space-y-4">
          {scheduledMeetings.length === 0 ? (
            <div className="py-16 text-center bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-8">
              <Calendar className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-white">No vetting meetings scheduled</h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Propose a 15-minute alignment call with candidate developers to discuss architecture, roles, and project ideas before making squad decisions.
              </p>
            </div>
          ) : (
            scheduledMeetings.map((m) => (
              <div
                key={m.requestId}
                className="bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 transition-all rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <UserAvatar user={m.partner} className="w-12 h-12 rounded-xl" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">{m.partner?.name || 'Developer'}</h4>
                      <span className="text-xs text-zinc-400">@{m.partner?.user_name}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Squad <span className="text-white font-medium">"{m.teamName}"</span> • Role:{' '}
                      <span className="text-emerald-400 font-medium">{m.role}</span>
                    </p>
                    <div suppressHydrationWarning className="flex items-center gap-2 mt-2 text-xs text-cyan-300 font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : 'Date TBD'} (
                      {m.durationMinutes} mins)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    className={`text-xs px-2.5 py-1 ${
                      m.status === 'confirmed'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    }`}
                  >
                    {m.status.toUpperCase()}
                  </Badge>

                  {m.status === 'proposed' && !m.isProposedByMe && (
                    <Button
                      size="sm"
                      onClick={() => handleConfirmMeeting(m.requestId)}
                      disabled={processingId === m.requestId}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-8 px-3 rounded-lg"
                    >
                      Confirm Time
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={() =>
                      onLaunchMeeting(
                        m.meetingRoomId || `vetting_${m.requestId}`,
                        m.requestId,
                        m.partner
                      )
                    }
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs h-8 px-4 rounded-lg shadow-sm flex items-center gap-1.5"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Launch Radar Vetting Room
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
