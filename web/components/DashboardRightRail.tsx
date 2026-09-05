import React from 'react';
import Link from 'next/link';
import {
  Video,
  Trophy,
  Users,
  Rocket,
  Bug,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from './ui/button';

interface HackathonSnippet {
  title: string;
  slug: string;
  daysLeft: number;
  tag: string;
  organizer: string;
}

const UPCOMING_HACKATHONS: HackathonSnippet[] = [
  {
    title: 'HackMIT 2026',
    slug: 'hackmit-2026',
    daysLeft: 4,
    tag: 'Web3 & AI',
    organizer: 'MIT Tech Club',
  },
  {
    title: 'ETHGlobal DevConnect',
    slug: 'ethglobal-devconnect',
    daysLeft: 7,
    tag: 'Smart Contracts',
    organizer: 'ETHGlobal',
  },
  {
    title: 'AI Agents World Cup',
    slug: 'ai-agents-world-cup',
    daysLeft: 14,
    tag: 'Autonomous AI',
    organizer: 'OpenSource Labs',
  },
];

export default function DashboardRightRail() {
  return (
    <aside className="w-full space-y-5">
      {/* 1. Pair Radar Live Card */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/10 via-card to-card p-4.5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold tracking-tight text-foreground uppercase">
                Pair Radar
              </h3>
              <p className="text-[11px] text-muted-foreground">1-on-1 Video & Code</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Now
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-3.5 leading-relaxed">
          Stuck on a bug or need architecture feedback? Hop into a peer video pairing lounge.
        </p>

        <Link href="/dashboard/stranger-chat" className="block">
          <Button
            size="sm"
            className="w-full h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all"
          >
            Launch Radar
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>

      {/* 2. Verified Hackathons */}
      <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-4 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Trophy className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold tracking-tight text-foreground uppercase">
              Target Hackathons
            </h3>
          </div>
          <Link
            href="/dashboard/explore"
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
          >
            View all
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="space-y-2">
          {UPCOMING_HACKATHONS.map((hackathon) => (
            <Link
              key={hackathon.slug}
              href={`/dashboard/hackathons/${hackathon.slug}`}
              className="group block p-2.5 rounded-xl border border-border/40 hover:border-amber-500/30 bg-secondary/20 hover:bg-secondary/40 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-foreground group-hover:text-amber-400 transition-colors truncate">
                  {hackathon.title}
                </span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                  {hackathon.daysLeft}d left
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="truncate">{hackathon.tag}</span>
                <span className="truncate opacity-75">{hackathon.organizer}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 3. Fast Quick Actions */}
      <div className="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-3 shadow-sm">
        <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Quick Launch
        </h4>
        <div className="grid grid-cols-1 gap-1.5 text-xs">
          <Link
            href="/dashboard/create?type=hackathon_crew"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/20 hover:bg-secondary/50 border border-transparent hover:border-border/60 transition-colors group"
          >
            <span className="flex items-center gap-2 text-foreground/90 font-medium">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              Recruit Squad Teammates
            </span>
            <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/dashboard/create?type=ship_log"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/20 hover:bg-secondary/50 border border-transparent hover:border-border/60 transition-colors group"
          >
            <span className="flex items-center gap-2 text-foreground/90 font-medium">
              <Rocket className="w-3.5 h-3.5 text-purple-400" />
              Ship Product Demo
            </span>
            <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/dashboard/create?type=code_sos"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/20 hover:bg-secondary/50 border border-transparent hover:border-border/60 transition-colors group"
          >
            <span className="flex items-center gap-2 text-foreground/90 font-medium">
              <Bug className="w-3.5 h-3.5 text-red-400" />
              Ask Code SOS
            </span>
            <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>

      {/* 4. Subtle Platform Meta */}
      <div className="px-2 pt-1 text-[11px] text-muted-foreground/60 flex items-center justify-between">
        <span>Nerd&apos;sHive v2.0</span>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/explore" className="hover:underline">
            Explore
          </Link>
          <Link href="/dashboard/settings" className="hover:underline">
            Settings
          </Link>
        </div>
      </div>
    </aside>
  );
}
