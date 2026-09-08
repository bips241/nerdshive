'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Users,
  Trophy,
  Shield,
  Layers,
  ChevronDown,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Calendar,
  Send,
  CheckCircle2,
  Video,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/UserAvatar';
import { toast } from 'sonner';
import GranularFinderFilter, { CandidateCard, SquadCard } from './GranularFinderFilter';
import RadarControlPanel, { RequestItem, ScheduledMeetingItem } from './RadarControlPanel';
import RadarVettingRoom from './RadarVettingRoom';
import SendOfferModal from './SendOfferModal';
import ScheduleMeetingModal from './ScheduleMeetingModal';
import {
  searchGranularCandidatesAction,
  getUserSquadControlPanelAction,
  connectDevelopersAction,
} from '@/lib/radar-actions';

interface Props {
  currentUser: {
    _id: string;
    user_name: string;
    name: string;
    image?: string;
    bio?: string;
    college?: string;
    location?: string;
    timezone?: string;
    techStack?: string[];
    debugKarma?: number;
    bugsSolvedCount?: number;
    occupancyStatus?: 'open' | 'occupied';
    acceptingRequests?: boolean;
    preferredRole?: string;
  };
  initialHackathons: any[];
  initialUserSquads: any[];
  initialSelectedSlug: string;
  initialFreeAgents: {
    teams: any[];
    soloHackers: any[];
  };
  initialUserSettings?: {
    acceptingRequests: boolean;
    occupancyStatus: 'open' | 'occupied';
    occupiedTeamId?: string;
    college: string;
    location: string;
    timezone?: string;
    preferredRole: string;
  };
}

export default function RadarMatchClient({
  currentUser,
  initialHackathons,
  initialUserSquads,
  initialSelectedSlug,
  initialFreeAgents,
  initialUserSettings,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Navigation Tab State
  const initialTab = searchParams?.get('tab') === 'control_panel' ? 'control_panel' : 'finder';
  const initialRoomId = searchParams?.get('room');
  const [activeTab, setActiveTab] = useState<'finder' | 'control_panel' | 'vetting_room'>(
    initialRoomId ? 'vetting_room' : initialTab
  );

  // Target Hackathon
  const [selectedHackathonSlug, setSelectedHackathonSlug] = useState<string>(initialSelectedSlug);
  const selectedHackathon =
    initialHackathons.find((h) => h.slug === selectedHackathonSlug) || initialHackathons[0];

  // Candidates & Squads in Finder
  const [candidates, setCandidates] = useState<CandidateCard[]>([]);
  const [squads, setSquads] = useState<SquadCard[]>([]);
  const [isLoadingFinder, setIsLoadingFinder] = useState(false);

  // Control Panel Data
  const [sentRequests, setSentRequests] = useState<RequestItem[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<RequestItem[]>([]);
  const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeetingItem[]>([]);
  const [userSettings, setUserSettings] = useState(
    initialUserSettings || {
      acceptingRequests: currentUser.acceptingRequests !== false,
      occupancyStatus: currentUser.occupancyStatus || 'open',
      occupiedTeamId: undefined,
      college: currentUser.college || '',
      location: currentUser.location || '',
      timezone: currentUser.timezone || '',
      preferredRole: currentUser.preferredRole || 'Fullstack Developer',
    }
  );
  const [userSquads, setUserSquads] = useState(initialUserSquads);

  // Vetting Room State
  const [activeVettingRoomId, setActiveVettingRoomId] = useState<string | null>(initialRoomId || null);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(searchParams?.get('request') || null);
  const [vettingCounterparty, setVettingCounterparty] = useState<any>(null);

  // Modals State
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [targetCandidateForOffer, setTargetCandidateForOffer] = useState<CandidateCard | null>(null);
  const [targetSquadForApply, setTargetSquadForApply] = useState<SquadCard | null>(null);
  const [targetUserForMeeting, setTargetUserForMeeting] = useState<any>(null);

  // 1. Fetch Granular Finder Candidates
  const fetchCandidates = useCallback(
    async (filters?: {
      statusFilter?: 'all' | 'registered_free_agents' | 'unregistered_community' | 'recruiting_squads';
      organization?: string;
      organizationType?: 'company' | 'university' | 'dao' | 'independent' | 'other' | 'all';
      experienceLevel?: 'student' | 'entry' | 'mid' | 'senior' | 'lead' | 'founder' | 'all';
      onlyWinners?: boolean;
      college?: string;
      location?: string;
      role?: string;
      searchQuery?: string;
    }) => {
      setIsLoadingFinder(true);
      try {
        const res = await searchGranularCandidatesAction({
          hackathonSlug: selectedHackathonSlug,
          registrationStatus: filters?.statusFilter || 'all',
          organization: filters?.organization,
          organizationType: filters?.organizationType,
          experienceLevel: filters?.experienceLevel,
          onlyWinners: filters?.onlyWinners,
          college: filters?.college,
          location: filters?.location,
          role: filters?.role,
          searchQuery: filters?.searchQuery,
        });

        if (res.success) {
          setCandidates(res.candidates || []);
          setSquads(res.squads || []);
        } else {
          toast.error(res.failure || 'Failed to search candidates');
        }
      } catch (err: any) {
        console.error('Error fetching candidates:', err);
      } finally {
        setIsLoadingFinder(false);
      }
    },
    [selectedHackathonSlug]
  );

  // 2. Fetch Control Panel Data
  const fetchControlPanel = useCallback(async () => {
    try {
      const res = await getUserSquadControlPanelAction(selectedHackathonSlug);
      if (res.success) {
        setSentRequests(res.sentRequests || []);
        setReceivedRequests(res.receivedRequests || []);
        setScheduledMeetings(res.scheduledMeetings || []);
        if (res.userSettings) setUserSettings(res.userSettings);
      }
    } catch (err) {
      console.error('Error fetching control panel:', err);
    }
  }, [selectedHackathonSlug]);

  useEffect(() => {
    fetchCandidates();
    fetchControlPanel();
  }, [fetchCandidates, fetchControlPanel]);

  // Handle Launch Vetting Call
  const handleLaunchMeeting = (roomId: string, requestId: string, counterparty: any) => {
    setActiveVettingRoomId(roomId);
    setActiveRequestId(requestId);
    setVettingCounterparty(counterparty);
    setActiveTab('vetting_room');
  };

  // Handle DM Connect
  const handleConnectDM = async (targetUserId: string) => {
    try {
      const res = await connectDevelopersAction(targetUserId);
      if (res.failure) {
        toast.error(res.failure);
      } else {
        toast.success('Direct message connection opened!');
        router.push(`/dashboard/messages/${res.chatRoomId}`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to open direct message');
    }
  };

  // Open Offer Modal for candidate
  const handleOpenSendOffer = (candidate: CandidateCard) => {
    setTargetCandidateForOffer(candidate);
    setTargetSquadForApply(null);
    setIsOfferModalOpen(true);
  };

  // Open Apply Modal for squad
  const handleOpenApplyToSquad = (squad: SquadCard) => {
    setTargetSquadForApply(squad);
    setTargetCandidateForOffer(null);
    setIsOfferModalOpen(true);
  };

  // Open Meeting Modal
  const handleOpenScheduleMeeting = (
    targetUser: { _id: string; name: string; user_name: string; image?: string },
    registrationId?: string
  ) => {
    setTargetUserForMeeting(targetUser);
    setIsMeetingModalOpen(true);
  };

  const isUserLeader = userSquads.some((sq) => sq.isLeader);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8 space-y-6">
      {/* 1. Header & Context Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Nerd'sHive Radar
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[11px] font-mono font-semibold">
                  Squad Command Center
                </Badge>
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                Granular teammate discovery, meeting scheduling, and automated squad enrollment state machines.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls: Hackathon Switcher & View Switcher */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Target Hackathon Selector */}
          <div className="relative">
            <select
              value={selectedHackathonSlug}
              onChange={(e) => {
                setSelectedHackathonSlug(e.target.value);
                router.push(`/dashboard/radar?hackathon=${e.target.value}`);
              }}
              className="px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer appearance-none pr-8"
            >
              {initialHackathons.map((h) => (
                <option key={h.slug} value={h.slug}>
                  🏆 {h.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* Navigation Mode Switcher */}
          <div className="flex p-1 bg-zinc-900/90 border border-zinc-800 rounded-xl">
            <button
              onClick={() => setActiveTab('finder')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'finder'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Radar Finder
            </button>
            <button
              onClick={() => setActiveTab('control_panel')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'control_panel'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              Control Panel
              {receivedRequests.filter(
                (r) => r.status === 'pending' && (!r.expiresAt || new Date(r.expiresAt) > new Date())
              ).length > 0 && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Tab View Rendering */}
      {activeTab === 'finder' && (
        <GranularFinderFilter
          candidates={candidates}
          squads={squads}
          loading={isLoadingFinder}
          onFilterChange={(filters) => fetchCandidates(filters)}
          onOpenSendOffer={handleOpenSendOffer}
          onOpenApplyToSquad={handleOpenApplyToSquad}
          onOpenScheduleMeeting={handleOpenScheduleMeeting}
          onConnectDM={handleConnectDM}
          isUserLeader={isUserLeader}
        />
      )}

      {activeTab === 'control_panel' && (
        <RadarControlPanel
          sentRequests={sentRequests}
          receivedRequests={receivedRequests}
          scheduledMeetings={scheduledMeetings}
          userSettings={userSettings}
          userSquads={userSquads}
          currentUserId={currentUser._id}
          onRefresh={fetchControlPanel}
          onLaunchMeeting={handleLaunchMeeting}
        />
      )}

      {activeTab === 'vetting_room' && activeVettingRoomId && (
        <RadarVettingRoom
          roomId={activeVettingRoomId}
          requestId={activeRequestId || undefined}
          currentUser={currentUser}
          counterparty={vettingCounterparty}
          squadContext={{
            teamName: userSquads[0]?.teamName || selectedHackathon?.name || 'Hackathon Squad',
            hackathonName: selectedHackathon?.name || 'Verified Hackathon',
            trackName: userSquads[0]?.trackName,
            rolesNeeded: userSquads[0]?.rolesNeeded,
            isLeader: isUserLeader,
          }}
          onLeave={() => {
            setActiveTab('control_panel');
            setActiveVettingRoomId(null);
            setActiveRequestId(null);
            fetchControlPanel();
          }}
        />
      )}

      {/* 3. Send Offer / Application Modal */}
      <SendOfferModal
        isOpen={isOfferModalOpen}
        onClose={() => setIsOfferModalOpen(false)}
        targetCandidate={targetCandidateForOffer}
        targetSquad={targetSquadForApply}
        userSquads={userSquads}
        hackathonSlug={selectedHackathonSlug}
        isApplication={!!targetSquadForApply}
        onSuccess={() => {
          fetchControlPanel();
          fetchCandidates();
        }}
      />

      {/* 4. Schedule Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        targetUser={targetUserForMeeting}
        userSquads={userSquads}
        hackathonSlug={selectedHackathonSlug}
        onSuccess={() => {
          fetchControlPanel();
        }}
      />
    </div>
  );
}
