'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/UserAvatar';
import {
  Radio,
  Trophy,
  Sparkles,
  ExternalLink,
  Code2,
  Video,
  Medal,
  Award,
  Crown,
  ChevronRight,
  Flame,
} from 'lucide-react';

interface Props {
  hackathon: any;
  leaderboard: any[];
  totalTeams: number;
}

export default function BroadcastClient({ hackathon, leaderboard, totalTeams }: Props) {
  const [selectedRound, setSelectedRound] = useState<number>(hackathon.currentRoundNumber || 1);
  const [revealedCount, setRevealedCount] = useState<number>(leaderboard.length);

  useEffect(() => {
    // Launch celebratory confetti when broadcast opens
    if (typeof window !== 'undefined') {
      import('canvas-confetti')
        .then((mod) => {
          const confettiFn = (mod.default || mod) as any;
          if (typeof confettiFn === 'function') {
            confettiFn({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
        })
        .catch(() => {});
    }
  }, []);

  const top3 = leaderboard.slice(0, 3);
  const otherTeams = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-neutral-950 text-foreground">
      {/* Top Broadcast Ticker Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-neutral-950 border-b border-purple-500/30 px-4 py-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-bold text-red-400 uppercase tracking-widest animate-pulse">
            <Radio className="h-4 w-4" /> Live Broadcast
          </span>
          <span className="text-neutral-400">|</span>
          <span className="text-neutral-200 font-semibold">{hackathon.name}</span>
          <span className="hidden sm:inline text-neutral-400">• Round {selectedRound} Official Arena</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400 font-mono font-semibold">
            <Flame className="h-3.5 w-3.5 text-orange-400" /> {totalTeams} Teams Competing
          </span>
          <Link href={`/dashboard/hackathons/${hackathon.slug}`}>
            <Button variant="ghost" size="sm" className="text-xs h-7 text-neutral-300 hover:text-white">
              Exit Broadcast
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-10">
        {/* Stage Progression Banner */}
        <div className="text-center space-y-3">
          <Badge variant="outline" className="text-purple-300 border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs">
            <Sparkles className="h-3.5 w-3.5 mr-1 text-purple-400" /> Grand Stage Evaluation Arena
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {hackathon.name}
          </h1>
          <p className="text-sm sm:text-base text-neutral-400 max-w-2xl mx-auto">
            Transparent live leaderboard results, verified rubric score breakdowns, and track winner announcements.
          </p>
        </div>

        {/* Podium Celebration: Top 3 Winners */}
        {top3.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 items-end">
            {/* 2nd Place */}
            {top3[1] && (
              <div className="p-6 bg-gradient-to-b from-neutral-900 to-neutral-950 border border-slate-700/60 rounded-2xl text-center space-y-3 order-2 md:order-1">
                <div className="inline-flex p-3 rounded-full bg-slate-800 border border-slate-600 text-slate-300">
                  <Medal className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">2nd Place</span>
                  <h3 className="text-xl font-extrabold text-white">{top3[1].teamName}</h3>
                  <p className="text-xs text-purple-300 mt-0.5">{top3[1].submissions?.[0]?.projectTitle || 'Prototype'}</p>
                </div>
                <div className="font-mono font-bold text-xl text-slate-200">
                  {top3[1].averageScore} <span className="text-xs text-muted-foreground font-normal">pts</span>
                </div>
              </div>
            )}

            {/* 1st Place Champion */}
            {top3[0] && (
              <div className="p-8 bg-gradient-to-b from-amber-950/40 via-neutral-900 to-neutral-950 border-2 border-amber-500/60 rounded-2xl text-center space-y-4 shadow-2xl shadow-amber-500/10 order-1 md:order-2 transform md:-translate-y-4">
                <div className="inline-flex p-4 rounded-full bg-amber-500/20 border border-amber-400 text-amber-400">
                  <Crown className="h-9 w-9" />
                </div>
                <div>
                  <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-300 bg-amber-500/10 mb-1">
                    Grand Champion
                  </Badge>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">{top3[0].teamName}</h3>
                  <p className="text-sm font-semibold text-purple-300 mt-1">{top3[0].submissions?.[0]?.projectTitle || 'Winning Solution'}</p>
                </div>
                <div className="font-mono font-black text-3xl text-amber-400">
                  {top3[0].averageScore} <span className="text-sm text-neutral-400 font-normal">pts</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {top3[2] && (
              <div className="p-6 bg-gradient-to-b from-neutral-900 to-neutral-950 border border-amber-800/40 rounded-2xl text-center space-y-3 order-3">
                <div className="inline-flex p-3 rounded-full bg-amber-950/60 border border-amber-700/60 text-amber-600">
                  <Award className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">3rd Place</span>
                  <h3 className="text-xl font-extrabold text-white">{top3[2].teamName}</h3>
                  <p className="text-xs text-purple-300 mt-0.5">{top3[2].submissions?.[0]?.projectTitle || 'Prototype'}</p>
                </div>
                <div className="font-mono font-bold text-xl text-amber-600">
                  {top3[2].averageScore} <span className="text-xs text-muted-foreground font-normal">pts</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Complete Transparent Leaderboard Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-neutral-100 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-purple-400" /> Full Transparent Leaderboard
            </h3>
            <span className="text-xs text-muted-foreground">
              Evaluated across {hackathon.rounds?.length || 1} official rounds
            </span>
          </div>

          <div className="space-y-3">
            {leaderboard.map((team, index) => {
              const sub = team.submissions?.[0];

              return (
                <div
                  key={team._id}
                  className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-neutral-700 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono font-black text-lg text-neutral-500 w-8 text-center">
                      #{index + 1}
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-neutral-100">{team.teamName}</span>
                        {team.isAdvanced && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-950/40 text-emerald-300 border-emerald-500/40">
                            Advanced to Next Stage
                          </Badge>
                        )}
                        {team.trackName && (
                          <Badge variant="secondary" className="text-[10px]">
                            {team.trackName}
                          </Badge>
                        )}
                      </div>

                      {sub && (
                        <p className="text-xs text-purple-300 font-medium">
                          {sub.projectTitle}
                          {sub.tagline && <span className="text-neutral-400"> — {sub.tagline}</span>}
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex -space-x-2">
                          {team.members.map((m: any, i: number) => (
                            <UserAvatar key={i} user={m} className="h-5 w-5 border border-neutral-900" />
                          ))}
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {team.members.length} members
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-neutral-800 pt-3 sm:pt-0">
                    <div className="text-right">
                      <span className="font-mono font-bold text-xl text-amber-400 block">
                        {team.averageScore} pts
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {team.evaluationCount} judge evaluations
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {sub?.repoUrl && (
                        <a
                          href={sub.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-neutral-800 text-purple-400 hover:bg-neutral-700"
                        >
                          <Code2 className="h-4 w-4" />
                        </a>
                      )}
                      {sub?.demoUrl && (
                        <a
                          href={sub.demoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-neutral-800 text-emerald-400 hover:bg-neutral-700"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      {sub?.videoUrl && (
                        <a
                          href={sub.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-neutral-800 text-blue-400 hover:bg-neutral-700"
                        >
                          <Video className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
