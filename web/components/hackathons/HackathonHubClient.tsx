'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
import { updateHackathonEventAction } from '@/lib/hackathon-actions';
import { toast } from 'sonner';

interface HackathonHubClientProps {
  hackathon: any;
  currentUserId?: string;
}

export default function HackathonHubClient({
  hackathon,
  currentUserId,
}: HackathonHubClientProps) {
  const [selectedTrack, setSelectedTrack] = useState<string>('All');
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

  const isOrganizer =
    currentUserId &&
    hackathon.organizerId &&
    (hackathon.organizerId._id || hackathon.organizerId).toString() === currentUserId;

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

  const handleUpdateHackathon = async () => {
    setIsSaving(true);
    try {
      const res = await updateHackathonEventAction(hackathon.slug, {
        tagline,
        description,
        prizePool,
        submissionDeadline: deadlineStr ? new Date(deadlineStr).toISOString() : undefined,
      });

      if (res.success) {
        toast.success('Official hackathon details updated!');
        setEditModalOpen(false);
      } else {
        toast.error(res.failure || 'Failed to update hackathon');
      }
    } catch (err) {
      toast.error('Network error updating hackathon');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredSquads = (hackathon.squads || []).filter((squad: any) => {
    if (selectedTrack === 'All') return true;
    return (
      squad.hackathonCrew?.targetTrack?.toLowerCase() === selectedTrack.toLowerCase()
    );
  });

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Hero / Header Banner */}
      <div className="relative rounded-2xl overflow-hidden border border-amber-500/20 bg-gradient-to-br from-card via-card/80 to-amber-950/10 p-6 sm:p-8 shadow-xl">
        <div className="absolute top-0 right-0 p-4 sm:p-6 flex items-center gap-2">
          {hackathon.isVerified && (
            <Badge className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 gap-1.5 py-1 px-3">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              Verified Hackathon Partner
            </Badge>
          )}

          {isOrganizer && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditModalOpen(true)}
              className="gap-1.5 text-xs font-semibold border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
            >
              <Edit3 className="w-3.5 h-3.5" /> Organizer Controls
            </Button>
          )}
        </div>

        <div className="max-w-2xl space-y-4 pt-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500">
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
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
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
                <ExternalLink className="w-3.5 h-3.5" /> Devpost / Submission Portal
              </a>
            )}
          </div>
        </div>

        {/* Live Countdown Clock Bar */}
        <div className="mt-8 pt-6 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Project Submission Deadline</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {hackathon.submissionDeadline
                ? new Date(hackathon.submissionDeadline).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
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
                  <div className="text-lg font-bold text-amber-500">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Sec</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Action Hub Banner: Team Formation & Speed Matchmaking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assemble Squad */}
        <div className="p-6 rounded-2xl border bg-card/60 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Assemble Hackathon Squad</h3>
                <p className="text-xs text-muted-foreground">
                  Recruit builders with complementary skills and auto-provision a private squad server.
                </p>
              </div>
            </div>
          </div>
          <Link
            href={`/dashboard/create?type=hackathon_crew&hackathonSlug=${hackathon.slug}&hackathonName=${encodeURIComponent(
              hackathon.name
            )}`}
          >
            <Button className="w-full gap-2 font-semibold bg-amber-600 hover:bg-amber-700 text-white">
              <PlusCircle className="w-4 h-4" /> Create Squad for {hackathon.name}
            </Button>
          </Link>
        </div>

        {/* Speed Radar Matchmaking */}
        <div className="p-6 rounded-2xl border bg-card/60 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Instant Teammate Radar</h3>
                <p className="text-xs text-muted-foreground">
                  Jump into 1-on-1 video speed dating with other solo builders attending this hackathon.
                </p>
              </div>
            </div>
          </div>
          <Link
            href={`/dashboard/stranger-chat?mode=project_teammate&hackathon=${hackathon.slug}`}
          >
            <Button variant="outline" className="w-full gap-2 font-semibold border-primary/40 hover:bg-primary/10 text-primary">
              <Zap className="w-4 h-4 text-primary" /> ⚡ Launch Hackathon Teammate Radar
            </Button>
          </Link>
        </div>
      </div>

      {/* 3. Official Prize Tracks */}
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
                      <span className="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
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

      {/* 4. Active Recruiting Squads for this Hackathon */}
      <div className="space-y-4 pt-4 border-t border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" /> Active Recruiting Squads
            </h2>
            <p className="text-xs text-muted-foreground">
              Browse squads targeting {hackathon.name} and apply with your skills.
            </p>
          </div>

          {/* Track Filter */}
          {hackathon.tracks && hackathon.tracks.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant={selectedTrack === 'All' ? 'default' : 'outline'}
                onClick={() => setSelectedTrack('All')}
                className="text-xs h-7 px-2.5"
              >
                All Tracks
              </Button>
              {hackathon.tracks.map((track: any, idx: number) => (
                <Button
                  key={idx}
                  size="sm"
                  variant={selectedTrack === track.name ? 'default' : 'outline'}
                  onClick={() => setSelectedTrack(track.name)}
                  className="text-xs h-7 px-2.5"
                >
                  {track.name.split('&')[0].trim()}
                </Button>
              ))}
            </div>
          )}
        </div>

        {filteredSquads.length === 0 ? (
          <div className="p-8 rounded-2xl border border-dashed text-center space-y-3 bg-card/30">
            <Users className="w-10 h-10 text-muted-foreground mx-auto opacity-40" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                No squads recruiting for this track yet
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Be the first leader to establish a squad for {hackathon.name}. Define your project vision and recruit top builders.
              </p>
            </div>
            <Link
              href={`/dashboard/create?type=hackathon_crew&hackathonSlug=${hackathon.slug}&hackathonName=${encodeURIComponent(
                hackathon.name
              )}`}
            >
              <Button size="sm" className="gap-1.5 font-semibold bg-primary text-primary-foreground">
                <PlusCircle className="w-3.5 h-3.5" /> Post First Squad Call
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSquads.map((squad: any) => {
              const crew = squad.hackathonCrew || {};
              const filledCount = (crew.members?.length || 0) + 1;
              const maxSquad = crew.maxSquadSize || 4;
              const isFull = crew.squadStatus === 'full' || filledCount >= maxSquad;

              return (
                <Card
                  key={squad._id}
                  className="p-5 space-y-4 bg-card/80 border hover:border-amber-500/30 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          {crew.targetTrack && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                              {crew.targetTrack}
                            </span>
                          )}
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border">
                            {crew.commitmentLevel === 'hardcore'
                              ? '🏆 Hardcore'
                              : crew.commitmentLevel === 'casual'
                              ? '☕ Casual'
                              : '⚡ Moderate'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-foreground line-clamp-1 pt-1">
                          {squad.caption}
                        </h3>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 border ${
                          isFull
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                        }`}
                      >
                        {filledCount} / {maxSquad} spots
                      </span>
                    </div>

                    {/* Roles Urgently Needed */}
                    {crew.rolesNeed && crew.rolesNeed.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">
                          Urgently Seeking:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {crew.rolesNeed.map((role: string, rIdx: number) => (
                            <span
                              key={rIdx}
                              className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium border border-amber-500/20"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Leader & View CTA */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/60">
                    <div className="flex items-center gap-2">
                      <UserAvatar
                        user={squad.userId}
                        className="h-6 w-6"
                      />
                      <span className="text-xs text-muted-foreground">
                        Lead: <strong className="text-foreground font-semibold">@{squad.userId?.user_name}</strong>
                      </span>
                    </div>

                    <Link href={`/dashboard/p/${squad._id}`}>
                      <Button size="sm" variant="outline" className="text-xs h-7 gap-1 font-semibold">
                        View Squad &rarr;
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Official Rules & Code of Conduct */}
      {hackathon.rules && hackathon.rules.length > 0 && (
        <div className="space-y-3 pt-6 border-t border-border/60">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Official Rules & Eligibility
          </h2>
          <ul className="space-y-1.5 text-xs text-muted-foreground pl-4 list-disc">
            {hackathon.rules.map((rule: string, rIdx: number) => (
              <li key={rIdx} className="leading-relaxed">
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Organizer Controls Dialog */}
      {isOrganizer && (
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-500" />
                Organizer Event Management
              </DialogTitle>
              <DialogDescription>
                You are authorized as the official organizer of {hackathon.name}. Updates here immediately synchronize across the platform.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Event Tagline</Label>
                <Input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. The premier global student hackathon at MIT"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Description</Label>
                <textarea
                  className="w-full min-h-[80px] p-2.5 text-xs rounded-md border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Prize Pool</Label>
                  <Input
                    value={prizePool}
                    onChange={(e) => setPrizePool(e.target.value)}
                    placeholder="e.g. $50,000 in Prizes & Grants"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Submission Deadline</Label>
                  <Input
                    type="datetime-local"
                    value={deadlineStr}
                    onChange={(e) => setDeadlineStr(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="ghost" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateHackathon}
                  disabled={isSaving}
                  className="font-semibold bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Save Official Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
