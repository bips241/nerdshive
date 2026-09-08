'use client';

import React, { useState } from 'react';
import {
  Users,
  Shield,
  Send,
  MessageSquare,
  ExternalLink,
  Github,
  Check,
  Sparkles,
  ChevronRight,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/UserAvatar';
import { toast } from 'sonner';
import { connectDevelopersAction } from '@/lib/radar-actions';
import Link from 'next/link';

interface Props {
  freeAgents: {
    teams: any[];
    soloHackers: any[];
  };
  selectedHackathonName: string;
  onSelectUserForInvite?: (user: any) => void;
  onOpenDirectChat?: (chatRoomId: string) => void;
}

export default function FreeAgentsDrawer({
  freeAgents,
  selectedHackathonName,
  onSelectUserForInvite,
  onOpenDirectChat,
}: Props) {
  const [activeTab, setActiveTab] = useState<'solo' | 'teams'>('solo');
  const [connectingUserId, setConnectingUserId] = useState<string | null>(null);

  const soloCount = freeAgents?.soloHackers?.length || 0;
  const teamCount = freeAgents?.teams?.length || 0;

  const handleMessageHacker = async (userId: string, username: string) => {
    setConnectingUserId(userId);
    try {
      const res = await connectDevelopersAction(
        userId,
        `Hey @${username}! Saw you registered as a free agent for ${selectedHackathonName} on Nerd'sHive Radar. Let's team up!`
      );

      if (res.failure) {
        toast.error(res.failure);
      } else {
        toast.success(`Message dispatched to @${username}! Check your messages.`);
        if (res.chatRoomId && onOpenDirectChat) {
          onOpenDirectChat(res.chatRoomId);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message');
    } finally {
      setConnectingUserId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-950 border-l border-neutral-800">
      {/* Top Header */}
      <div className="p-3 border-b border-neutral-800 bg-neutral-900/40 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-purple-400" /> Free Agents & Recruiting Squads
          </h3>
          <p className="text-[10px] text-neutral-400">
            Registered for {selectedHackathonName}
          </p>
        </div>

        {/* Segmented control */}
        <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
          <button
            type="button"
            onClick={() => setActiveTab('solo')}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all ${
              activeTab === 'solo'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Solo ({soloCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teams')}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md transition-all ${
              activeTab === 'teams'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Squads ({teamCount})
          </button>
        </div>
      </div>

      {/* Roster List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {activeTab === 'solo' ? (
          soloCount === 0 ? (
            <div className="text-center p-6 space-y-1 text-muted-foreground">
              <Users className="w-6 h-6 mx-auto opacity-40" />
              <p className="text-xs font-medium">No solo free agents listed yet</p>
              <p className="text-[10px]">Be the first to register as a solo hacker!</p>
            </div>
          ) : (
            freeAgents.soloHackers.map((hacker: any) => {
              const u = hacker.user;
              if (!u) return null;
              return (
                <div
                  key={hacker._id}
                  className="p-2.5 bg-neutral-900/50 border border-neutral-800/80 rounded-xl space-y-2 hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserAvatar user={u} className="w-8 h-8 border border-neutral-800" />
                      <div>
                        <h4 className="text-xs font-bold text-neutral-100 flex items-center gap-1">
                          {u.name || u.user_name}
                        </h4>
                        <p className="text-[10px] text-neutral-400">@{u.user_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {u.repo && (
                        <a
                          href={u.repo}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neutral-400 hover:text-white p-1"
                          title="GitHub Profile / Repo"
                        >
                          <Github className="w-3 h-3" />
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleMessageHacker(u._id, u.user_name)}
                        disabled={connectingUserId === u._id}
                        className="h-6 text-[10px] px-2 gap-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30"
                      >
                        <MessageSquare className="w-2.5 h-2.5" /> Message
                      </Button>
                    </div>
                  </div>

                  {u.bio && (
                    <p className="text-[11px] text-neutral-300 line-clamp-2">
                      {u.bio}
                    </p>
                  )}

                  {u.skills && u.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {u.skills.slice(0, 4).map((skill: string, idx: number) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-[9px] py-0 px-1.5 border-neutral-800 text-neutral-400 bg-neutral-900"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          teamCount === 0 ? (
            <div className="text-center p-6 space-y-1 text-muted-foreground">
              <Shield className="w-6 h-6 mx-auto opacity-40" />
              <p className="text-xs font-medium">No squads currently recruiting</p>
              <p className="text-[10px]">Create a squad to start recruiting teammates!</p>
            </div>
          ) : (
            freeAgents.teams.map((team: any) => (
              <div
                key={team._id}
                className="p-2.5 bg-neutral-900/50 border border-neutral-800/80 rounded-xl space-y-2 hover:border-neutral-700 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> {team.teamName}
                    </h4>
                    <p className="text-[10px] text-neutral-400">
                      {team.members?.length || 1} Member(s) &bull; Code: {team.teamCode}
                    </p>
                  </div>

                  <Link href={`/dashboard/hackathons/${team.hackathonSlug || 'hackmit-2026'}`}>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1 text-neutral-400 hover:text-white">
                      View Squad &rarr;
                    </Button>
                  </Link>
                </div>

                {team.targetTrack && (
                  <Badge variant="secondary" className="text-[9px] bg-purple-500/10 text-purple-300 border-purple-500/20">
                    Track: {team.targetTrack}
                  </Badge>
                )}
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
