'use client';

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Sparkles,
  Users,
  Copy,
  Check,
  Send,
  PlusCircle,
  Layers,
  Wand2,
  Code2,
  Flame,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { inviteCandidateToSquadAction, formSquadTogetherAction } from '@/lib/radar-actions';

const COMMON_TECH_STACKS = [
  'Next.js 14',
  'FastAPI',
  'Python',
  'Rust',
  'TypeScript',
  'PyTorch',
  'Tailwind CSS',
  'Solidity',
  'PostgreSQL',
  'Redis',
  'Docker',
  'LangChain',
];

export interface PitchCanvasData {
  projectName: string;
  targetTrack: string;
  problemSynopsis: string;
  proposedSolution: string;
  techStack: string[];
  roleUserA: string;
  roleUserB: string;
}

interface Props {
  canvasData: PitchCanvasData;
  onChange: (updated: PitchCanvasData) => void;
  selectedHackathon: any;
  userSquads: any[];
  partnerProfile: any;
  connected: boolean;
  onOpenMessages?: (chatRoomId: string) => void;
}

export default function HackathonPitchCanvas({
  canvasData,
  onChange,
  selectedHackathon,
  userSquads,
  partnerProfile,
  connected,
  onOpenMessages,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [formSquadModalOpen, setFormSquadModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form squad state
  const [newTeamName, setNewTeamName] = useState(canvasData.projectName || 'Apex Hackers');
  const [selectedSquadId, setSelectedSquadId] = useState<string>(
    userSquads.find((s) => s.hackathonSlug === selectedHackathon?.slug)?._id || userSquads[0]?._id || ''
  );

  const eligibleLeaderSquads = userSquads.filter((s) => s.isLeader);

  const handleFieldChange = (field: keyof PitchCanvasData, value: any) => {
    const updated = { ...canvasData, [field]: value };
    onChange(updated);
  };

  const toggleTechStack = (tech: string) => {
    const current = canvasData.techStack || [];
    const updated = current.includes(tech)
      ? current.filter((t) => t !== tech)
      : [...current, tech];
    handleFieldChange('techStack', updated);
  };

  const handleCopyPitch = () => {
    const text = `🏆 Project: ${canvasData.projectName || 'Untitled Hackathon Idea'}
🎯 Event: ${selectedHackathon?.name || 'Hackathon'} (${canvasData.targetTrack || 'General Track'})
💡 Problem: ${canvasData.problemSynopsis || 'N/A'}
🛠️ Solution: ${canvasData.proposedSolution || 'N/A'}
⚙️ Tech Stack: ${canvasData.techStack.join(', ') || 'N/A'}
👥 Team Roles:
- Builder 1: ${canvasData.roleUserA || 'Fullstack'}
- Builder 2: ${canvasData.roleUserB || 'AI / Backend'}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Pitch synopsis copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Send Squad Invite
  const handleSendSquadInvite = async () => {
    if (!selectedSquadId || !partnerProfile?._id) {
      toast.error('Please select a squad and ensure partner is connected.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await inviteCandidateToSquadAction(
        selectedSquadId,
        partnerProfile._id,
        `Let's build "${canvasData.projectName || 'our project'}" for ${selectedHackathon?.name}!`
      );

      if (res.failure) {
        toast.error(res.failure);
      } else {
        toast.success(res.message || 'Squad recruitment offer sent!');
        setInviteModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invite');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Form Squad Together
  const handleFormSquad = async () => {
    if (!newTeamName.trim()) {
      toast.error('Please enter a squad name.');
      return;
    }

    if (!selectedHackathon?.slug) {
      toast.error('No hackathon selected.');
      return;
    }

    if (!partnerProfile?._id) {
      toast.error('You must be matched with a partner to form a squad together.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await formSquadTogetherAction({
        hackathonSlug: selectedHackathon.slug,
        teamName: newTeamName.trim(),
        partnerUserId: partnerProfile._id,
        targetTrack: canvasData.targetTrack,
        pitchSynopsis: canvasData.problemSynopsis,
      });

      if (res.failure) {
        toast.error(res.failure);
      } else {
        toast.success(`Squad "${newTeamName}" created! Private Discord server provisioned.`);
        setFormSquadModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to form squad');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 overflow-y-auto p-4 space-y-4">
      {/* Top Banner / Event Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-gradient-to-r from-purple-950/40 via-neutral-900/60 to-neutral-900/40 border border-purple-900/30 rounded-xl">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-white">
                {selectedHackathon?.name || 'Verified Hackathon'}
              </h2>
              <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-300 border-purple-500/20">
                Live Pitch Canvas
              </Badge>
            </div>
            <p className="text-[11px] text-neutral-400">
              {selectedHackathon?.prizePool || 'Official Prize Tracks'} &bull; Real-time P2P sync
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopyPitch}
            className="h-7 text-[11px] gap-1 text-neutral-300 hover:text-white"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy Pitch'}
          </Button>

          {connected && partnerProfile && (
            <>
              {eligibleLeaderSquads.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setInviteModalOpen(true)}
                  className="h-7 text-[11px] font-bold bg-purple-600 hover:bg-purple-700 text-white gap-1"
                >
                  <Send className="w-3 h-3" /> Invite to Squad
                </Button>
              )}

              <Button
                size="sm"
                onClick={() => setFormSquadModalOpen(true)}
                className="h-7 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              >
                <PlusCircle className="w-3 h-3" /> Form Squad Together
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Track Selector */}
      {selectedHackathon?.tracks && selectedHackathon.tracks.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" /> Target Prize Track
          </label>
          <div className="flex flex-wrap gap-1.5">
            {selectedHackathon.tracks.map((track: any, idx: number) => {
              const isSelected = canvasData.targetTrack === track.name;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleFieldChange('targetTrack', track.name)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all text-left ${
                    isSelected
                      ? 'bg-purple-600/20 border-purple-500 text-purple-200 font-bold shadow-sm'
                      : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700'
                  }`}
                >
                  {track.name} {track.prizePool ? `(${track.prizePool})` : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Project Concept Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
            <Wand2 className="w-3.5 h-3.5 text-emerald-400" /> Project Name
          </label>
          <Input
            value={canvasData.projectName || ''}
            onChange={(e) => handleFieldChange('projectName', e.target.value)}
            placeholder="e.g. SwarmMind AI / ZeroTrust Bridge"
            className="h-8 text-xs bg-neutral-900/80 border-neutral-800 text-white placeholder:text-neutral-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-neutral-300">Your Sprint Role</label>
            <Input
              value={canvasData.roleUserA || ''}
              onChange={(e) => handleFieldChange('roleUserA', e.target.value)}
              placeholder="e.g. Frontend & UI/UX"
              className="h-8 text-xs bg-neutral-900/80 border-neutral-800 text-white placeholder:text-neutral-600"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-neutral-300">Partner Role</label>
            <Input
              value={canvasData.roleUserB || ''}
              onChange={(e) => handleFieldChange('roleUserB', e.target.value)}
              placeholder="e.g. AI / Fastify Backend"
              className="h-8 text-xs bg-neutral-900/80 border-neutral-800 text-white placeholder:text-neutral-600"
            />
          </div>
        </div>
      </div>

      {/* Problem & Solution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-neutral-300">
            Problem Statement (The Friction)
          </label>
          <Textarea
            value={canvasData.problemSynopsis || ''}
            onChange={(e) => handleFieldChange('problemSynopsis', e.target.value)}
            placeholder="What core developer or user pain point does this project solve during the 36-hour sprint?"
            className="text-xs bg-neutral-900/80 border-neutral-800 text-white placeholder:text-neutral-600 min-h-[90px] resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-neutral-300">
            Proposed Architecture & Solution
          </label>
          <Textarea
            value={canvasData.proposedSolution || ''}
            onChange={(e) => handleFieldChange('proposedSolution', e.target.value)}
            placeholder="How will we build the MVP? What is the core user flow or demo showcase?"
            className="text-xs bg-neutral-900/80 border-neutral-800 text-white placeholder:text-neutral-600 min-h-[90px] resize-none"
          />
        </div>
      </div>

      {/* Tech Stack Matrix */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-neutral-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" /> Agreed Tech Stack
          </span>
          <span className="text-[10px] text-neutral-500">Click to toggle tags</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_TECH_STACKS.map((tech) => {
            const isSelected = canvasData.techStack?.includes(tech);
            return (
              <Badge
                key={tech}
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => toggleTechStack(tech)}
                className={`cursor-pointer text-[10px] py-0.5 px-2 transition-all ${
                  isSelected
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                    : 'bg-neutral-900/50 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                }`}
              >
                {tech}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Invite to Squad Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-400" /> Invite Partner to Your Squad
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Select which squad to enroll @{partnerProfile?.user_name || 'developer'} into. They will receive the 6-digit join code and access to your private squad Discord server.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Select Squad</label>
              <select
                value={selectedSquadId}
                onChange={(e) => setSelectedSquadId(e.target.value)}
                className="w-full h-9 rounded-md bg-neutral-900 border border-neutral-800 text-xs px-3 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {eligibleLeaderSquads.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.teamName} &bull; {s.hackathonName} (Code: {s.teamCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setInviteModalOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSendSquadInvite}
              disabled={isSubmitting}
              className="text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              {isSubmitting ? 'Sending...' : 'Send Squad Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Form Squad Together Modal */}
      <Dialog open={formSquadModalOpen} onOpenChange={setFormSquadModalOpen}>
        <DialogContent className="bg-neutral-950 border-neutral-800 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-400" /> Form Squad Together
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Register a new squad for {selectedHackathon?.name}. This will auto-provision a private squad Discord server with #general, #resources, and voice:pair-hacking channels.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Squad Name</label>
              <Input
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="e.g. Apex Synthetics"
                className="h-8 text-xs bg-neutral-900 border-neutral-800 text-white"
              />
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-300">
              Both you and @{partnerProfile?.user_name} will be added as founding members and gain instant access to your private squad voice stage.
            </div>
          </div>

          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFormSquadModalOpen(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleFormSquad}
              disabled={isSubmitting}
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isSubmitting ? 'Provisioning...' : 'Create & Auto-Provision Squad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
