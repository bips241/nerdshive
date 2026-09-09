'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDisplayDateTime } from '@/lib/utils';
import {
  Trophy,
  Calendar,
  Clock,
  MapPin,
  Globe,
  ExternalLink,
  ShieldCheck,
  Users,
  Sparkles,
  Zap,
  PlusCircle,
  Video,
  Edit3,
  CheckCircle2,
  Lock,
  Tag,
  AlertCircle,
  Loader2,
  Radio,
  Layers,
  KeyRound,
  UserCheck,
  Gavel,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import UserAvatar from '@/components/UserAvatar';
import TeamRoomModal from './TeamRoomModal';
import {
  createOrJoinHackathonTeamAction,
  updateHackathonEventAction,
} from '@/lib/hackathon-actions';
import { toast } from 'sonner';

interface HackathonHubClientProps {
  hackathon: any;
  currentUserId?: string;
}

export default function HackathonHubClient({
  hackathon,
  currentUserId,
}: HackathonHubClientProps) {
  const router = useRouter();
  const [selectedTrack, setSelectedTrack] = useState<string>('All');
  const [teamRoomOpen, setTeamRoomOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [regMode, setRegMode] = useState<'create' | 'join' | 'solo'>('create');
  const [isRegistering, setIsRegistering] = useState(false);

  // Registration Form State
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [selectedTrackName, setSelectedTrackName] = useState('');
  const [lookingForSkillsStr, setLookingForSkillsStr] = useState('React, UI/UX');
  const [lookingForDesc, setLookingForDesc] = useState('Looking for enthusiastic builders to collaborate with.');

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isEnded: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: false });

  // Organizer Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tagline, setTagline] = useState(hackathon.tagline || '');
  const [description, setDescription] = useState(hackathon.description || '');
  const [prizePool, setPrizePool] = useState(hackathon.prizePool || '');
  const [deadlineStr, setDeadlineStr] = useState(
    hackathon.submissionDeadline
      ? new Date(hackathon.submissionDeadline).toISOString().slice(0, 16)
      : ''
  );

  const isOrganizer = hackathon.isOrganizer;
  const isJudge = hackathon.isJudge;
  const myReg = hackathon.myRegistration;

  // Real-time ticking countdown to official submission deadline
  useEffect(() => {
    if (!hackathon.submissionDeadline) return;

    const targetTime = new Date(hackathon.submissionDeadline).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, isEnded: false });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [hackathon.submissionDeadline]);

  const handleRegisterOrJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);

    try {
      const skillsArray = lookingForSkillsStr
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await createOrJoinHackathonTeamAction(hackathon.slug, {
        teamName: regMode === 'create' ? teamName : undefined,
        joinCode: regMode === 'join' ? joinCode : undefined,
        isSolo: regMode === 'solo',
        trackName: selectedTrackName || undefined,
        lookingForSkills: regMode === 'create' ? skillsArray : undefined,
        lookingForDescription: regMode === 'create' ? lookingForDesc : undefined,
      });

      if (res?.success) {
        toast.success(`Successfully registered in team "${res.teamName}"! Code: ${res.code}`);
        setRegisterModalOpen(false);
        router.refresh();
      } else {
        toast.error(res?.failure || 'Registration failed.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing registration.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUpdateHackathon = async () => {
    setIsSaving(true);
    try {
      const res = await updateHackathonEventAction(hackathon.slug, {
        tagline,
        description,
        prizePool,
        submissionDeadline: deadlineStr ? new Date(deadlineStr).toISOString() : undefined,
      });

      if (res?.success) {
        toast.success('Official hackathon details updated!');
        setEditModalOpen(false);
        router.refresh();
      } else {
        toast.error(res?.failure || 'Failed to update hackathon');
      }
    } catch (err) {
      toast.error('Network error updating hackathon');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Hero / Header Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-purple-500/20 bg-gradient-to-br from-card via-card/80 to-purple-950/20 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 p-4 sm:p-6 flex flex-wrap items-center gap-2">
          {hackathon.isVerified && (
            <Badge className="bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 gap-1.5 py-1 px-3">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              Verified Event
            </Badge>
          )}

          <Link href={`/dashboard/hackathons/${hackathon.slug}/broadcast`}>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs font-bold border-red-500/40 text-red-400 hover:bg-red-500/10"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" /> Live Broadcast Arena
            </Button>
          </Link>

          {isOrganizer && (
            <Link href={`/dashboard/hackathons/${hackathon.slug}/manage`}>
              <Button
                size="sm"
                className="gap-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Edit3 className="w-3.5 h-3.5" /> Organizer Command Center
              </Button>
            </Link>
          )}

          {!isOrganizer && isJudge && (
            <Link href={`/dashboard/hackathons/${hackathon.slug}/manage`}>
              <Button
                size="sm"
                className="gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Gavel className="w-3.5 h-3.5" /> Official Judging Desk
              </Button>
            </Link>
          )}
        </div>

        <div className="max-w-2xl space-y-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
            <Trophy className="w-4 h-4" /> Official Event Hub
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {hackathon.name}
          </h1>

          <p className="text-base text-muted-foreground leading-relaxed">
            {hackathon.tagline}
          </p>

          {/* Quick Meta: Location, Organizer, Prize Pool */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>{hackathon.location}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-foreground">{hackathon.prizePool}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span>Managed by:</span>
              <span className="font-semibold text-foreground">
                @{hackathon.organizerId?.user_name || hackathon.organizerName}
              </span>
            </div>
          </div>

          {/* External Links */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {hackathon.websiteUrl && (
              <a
                href={hackathon.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <Globe className="w-3.5 h-3.5" /> Official Website
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-60" />
              </a>
            )}

            {hackathon.devpostUrl && (
              <a
                href={hackathon.devpostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Devpost / Community Portal
              </a>
            )}
          </div>
        </div>

        {/* Live Countdown Clock Bar */}
        <div className="mt-8 pt-6 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Submission Deadline</span>
            </div>
            <p suppressHydrationWarning className="text-xs text-muted-foreground">
              {hackathon.submissionDeadline
                ? formatDisplayDateTime(hackathon.submissionDeadline)
                : 'TBA'}
            </p>
          </div>

          {/* Ticking Digit Blocks */}
          <div className="flex items-center gap-2">
            {timeLeft.isEnded ? (
              <Badge variant="destructive" className="text-xs px-3 py-1 font-bold">
                Submission Window Closed
              </Badge>
            ) : (
              <div className="flex items-center gap-1.5 font-mono text-center">
                <div className="px-2.5 py-1.5 rounded-lg bg-secondary/80 border border-border min-w-[52px]">
                  <div className="text-lg font-bold text-foreground">{timeLeft.days}</div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Days</div>
                </div>
                <span className="font-bold text-muted-foreground">:</span>
                <div className="px-2.5 py-1.5 rounded-lg bg-secondary/80 border border-border min-w-[52px]">
                  <div className="text-lg font-bold text-foreground">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Hrs</div>
                </div>
                <span className="font-bold text-muted-foreground">:</span>
                <div className="px-2.5 py-1.5 rounded-lg bg-secondary/80 border border-border min-w-[52px]">
                  <div className="text-lg font-bold text-foreground">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Min</div>
                </div>
                <span className="font-bold text-muted-foreground">:</span>
                <div className="px-2.5 py-1.5 rounded-lg bg-secondary/80 border border-border min-w-[52px]">
                  <div className="text-lg font-bold text-purple-400">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Sec</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Registration & Team Room CTA Box */}
      <div className="p-6 rounded-2xl border bg-gradient-to-r from-neutral-900 to-neutral-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {myReg ? (
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-neutral-100">{myReg.teamName}</span>
                <Badge variant="outline" className="text-xs bg-emerald-950/30 text-emerald-300 border-emerald-700/40">
                  {myReg.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Team Code: <strong className="font-mono text-purple-300">{myReg.code}</strong> • Round {myReg.currentRound}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-base font-bold text-neutral-100">Ready to Compete?</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Form a team, join teammates with a 6-digit code, or register solo with 1 click.
            </p>
          </div>
        )}

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {myReg ? (
            <Button
              onClick={() => setTeamRoomOpen(true)}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Users className="h-4 w-4" /> Open Team Room & Submissions
            </Button>
          ) : (
            <Button
              onClick={() => setRegisterModalOpen(true)}
              className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5"
            >
              <Sparkles className="h-4 w-4" /> Register / Form Team
            </Button>
          )}
        </div>
      </div>

      {/* 3. Multi-Round Pipeline Timeline */}
      {hackathon.rounds && hackathon.rounds.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" /> Multi-Round Stage Timeline
              </h2>
              <p className="text-xs text-muted-foreground">
                Progress through customizable evaluation rounds configured by the organizer.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hackathon.rounds.map((round: any, idx: number) => {
              const isActive = round.status === 'active' || (hackathon.currentRoundNumber || 1) === round.roundNumber;

              return (
                <Card
                  key={idx}
                  className={`p-5 space-y-3 transition-all border ${
                    isActive
                      ? 'bg-purple-950/20 border-purple-500/50 ring-1 ring-purple-500/30'
                      : 'bg-card/60 border-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                      Round {round.roundNumber}
                    </span>
                    <Badge variant={isActive ? 'default' : 'secondary'} className="text-[10px] capitalize">
                      {round.status}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground">{round.name}</h3>
                    {round.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {round.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-border/50 text-[11px] text-muted-foreground flex justify-between">
                    <span>Type: {round.submissionType}</span>
                    <span>{round.rubric?.length || 2} Evaluation Criteria</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Official Prize Tracks */}
      {hackathon.tracks && hackathon.tracks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Official Competition Tracks</h2>
              <p className="text-xs text-muted-foreground">
                Target a specific track to qualify for targeted bounties and grants.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {hackathon.tracks.length} Official Tracks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {hackathon.tracks.map((track: any, i: number) => (
              <Card
                key={i}
                className="p-4 space-y-3 bg-secondary/20 hover:bg-secondary/30 transition-colors border"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">{track.name}</span>
                    {track.prizePool && (
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {track.prizePool}
                      </span>
                    )}
                  </div>
                  {track.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {track.description}
                    </p>
                  )}
                </div>

                {track.tags && track.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {track.tags.map((tag: string, tIdx: number) => (
                      <span
                        key={tIdx}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-card text-muted-foreground border border-border/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Registration & Team Modal */}
      <Dialog open={registerModalOpen} onOpenChange={setRegisterModalOpen}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md max-h-[88vh] overflow-y-auto bg-neutral-950 border-neutral-800 text-foreground rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-400" />
              Join {hackathon.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Choose how you want to participate in this hackathon.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 border-b border-neutral-800 pb-3">
            <Button
              size="sm"
              variant={regMode === 'create' ? 'secondary' : 'ghost'}
              onClick={() => setRegMode('create')}
              className="text-xs flex-1"
            >
              Create Team
            </Button>
            <Button
              size="sm"
              variant={regMode === 'join' ? 'secondary' : 'ghost'}
              onClick={() => setRegMode('join')}
              className="text-xs flex-1"
            >
              Join by Code
            </Button>
            <Button
              size="sm"
              variant={regMode === 'solo' ? 'secondary' : 'ghost'}
              onClick={() => setRegMode('solo')}
              className="text-xs flex-1"
            >
              Solo Hacker
            </Button>
          </div>

          <form onSubmit={handleRegisterOrJoin} className="space-y-4 pt-2">
            {regMode === 'create' && (
              <>
                <div>
                  <Label className="text-xs font-semibold">Team Name</Label>
                  <Input
                    placeholder="e.g. NeuralMesh Architects"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    required
                    className="bg-neutral-900 border-neutral-800 text-sm mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Looking For Teammates (Skills, comma separated)</Label>
                  <Input
                    placeholder="e.g. React, UI/UX, Python, Open to all"
                    value={lookingForSkillsStr}
                    onChange={(e) => setLookingForSkillsStr(e.target.value)}
                    className="bg-neutral-900 border-neutral-800 text-sm mt-1"
                  />
                </div>
              </>
            )}

            {regMode === 'join' && (
              <div>
                <Label className="text-xs font-semibold">Enter 6-Digit Team Invite Code</Label>
                <Input
                  placeholder="e.g. K9X2P1"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  required
                  className="bg-neutral-900 border-neutral-800 text-center font-mono font-bold text-lg tracking-widest mt-1"
                />
              </div>
            )}

            {regMode === 'solo' && (
              <p className="text-xs text-muted-foreground p-3 bg-neutral-900 rounded-lg">
                You will be registered as a solo participant. You can always merge with another team or recruit teammates later.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <Button type="button" variant="outline" onClick={() => setRegisterModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isRegistering} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold">
                {isRegistering ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  'Confirm & Enter Hackathon'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Team Room Modal */}
      {myReg && (
        <TeamRoomModal
          isOpen={teamRoomOpen}
          onClose={() => setTeamRoomOpen(false)}
          hackathon={hackathon}
          registration={myReg}
          onUpdate={() => router.refresh()}
        />
      )}
    </div>
  );
}
