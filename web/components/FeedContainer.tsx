'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Video,
  Trophy,
  Users,
  Rocket,
  Bug,
  Network,
  Swords,
  Layers,
  Sparkles,
  Filter,
  PlusCircle,
  ArrowRight,
} from 'lucide-react';
import { Button } from './ui/button';

interface FeedItemMeta {
  id: string;
  type: string;
}

interface FeedContainerProps {
  children: React.ReactNode[];
  postsMeta: FeedItemMeta[];
}

export default function FeedContainer({ children, postsMeta }: FeedContainerProps) {
  const [activeTab, setActiveTab] = useState<string>('all');

  // Count posts per category
  const counts = {
    all: postsMeta.length,
    hackathon_crew: postsMeta.filter((p) => p.type === 'hackathon_crew').length,
    ship_log: postsMeta.filter((p) => p.type === 'ship_log').length,
    code_sos: postsMeta.filter((p) => p.type === 'code_sos').length,
    architecture_rfc: postsMeta.filter((p) => p.type === 'architecture_rfc').length,
    tech_showdown: postsMeta.filter((p) => p.type === 'tech_showdown').length,
  };

  const tabs = [
    { id: 'all', label: 'All Activity', icon: Sparkles, count: counts.all },
    { id: 'hackathon_crew', label: '⚡ Squad Calls', icon: Users, count: counts.hackathon_crew },
    { id: 'ship_log', label: '🚀 Ship Logs', icon: Rocket, count: counts.ship_log },
    { id: 'code_sos', label: '🐛 Code SOS', icon: Bug, count: counts.code_sos },
    { id: 'architecture_rfc', label: '📐 System RFCs', icon: Network, count: counts.architecture_rfc },
    { id: 'tech_showdown', label: '⚔️ Debates', icon: Swords, count: counts.tech_showdown },
  ];

  // Filter children based on active tab
  const visibleIndices: number[] = [];
  postsMeta.forEach((meta, idx) => {
    if (activeTab === 'all' || meta.type === activeTab) {
      visibleIndices.push(idx);
    }
  });

  return (
    <div className="space-y-6 w-full">
      {/* 1. Developer Quick Action Station */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* Pair Radar */}
        <Link
          href="/dashboard/stranger-chat"
          className="group p-3 rounded-xl border bg-card/80 hover:bg-secondary/40 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-2 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:scale-105 transition-transform">
              <Video className="w-4 h-4" />
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Radar
            </span>
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block truncate">Pair Radar</span>
            <span className="text-[10px] text-muted-foreground block truncate">1-on-1 video pairing</span>
          </div>
        </Link>

        {/* Verified Hackathons */}
        <Link
          href="/dashboard/explore"
          className="group p-3 rounded-xl border bg-card/80 hover:bg-secondary/40 hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-2 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-105 transition-transform">
              <Trophy className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
              Verified
            </span>
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block truncate">Hackathons</span>
            <span className="text-[10px] text-muted-foreground block truncate">Deadlines & prizes</span>
          </div>
        </Link>

        {/* Assemble Squad */}
        <Link
          href="/dashboard/create?type=hackathon_crew"
          className="group p-3 rounded-xl border bg-card/80 hover:bg-secondary/40 hover:border-primary/40 transition-all flex flex-col justify-between space-y-2 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">
              Auto Room
            </span>
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block truncate">Assemble Squad</span>
            <span className="text-[10px] text-muted-foreground block truncate">Recruit teammates</span>
          </div>
        </Link>

        {/* Ship Log */}
        <Link
          href="/dashboard/create?type=ship_log"
          className="group p-3 rounded-xl border bg-card/80 hover:bg-secondary/40 hover:border-purple-500/40 transition-all flex flex-col justify-between space-y-2 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20 group-hover:scale-105 transition-transform">
              <Rocket className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-purple-500 bg-purple-500/10 px-1.5 py-0.5 rounded-full border border-purple-500/20">
              Launch
            </span>
          </div>
          <div>
            <span className="text-xs font-bold text-foreground block truncate">Ship Log</span>
            <span className="text-[10px] text-muted-foreground block truncate">Demo & feedback</span>
          </div>
        </Link>
      </div>

      {/* 2. Zero-Friction Feed Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-border/50">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-secondary text-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. Filtered Posts List */}
      {visibleIndices.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed text-center space-y-3 bg-card/40 my-4">
          <div className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center mx-auto text-muted-foreground">
            <Filter className="w-5 h-5 opacity-60" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">
              No posts in this category yet
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {activeTab === 'hackathon_crew' &&
                'Be the first leader to broadcast a hackathon crew call and assemble your team.'}
              {activeTab === 'code_sos' &&
                'No open debug requests right now. Stuck on a tricky bug? Ask for pair debugging.'}
              {activeTab === 'ship_log' &&
                'No recent ship logs. Shipped an MVP or feature? Share your proof-of-work.'}
              {activeTab === 'architecture_rfc' &&
                'No system RFCs under review. Planning an architecture change? Request peer review.'}
              {activeTab === 'tech_showdown' &&
                'No active tech debates. Compare two frameworks or databases.'}
              {activeTab === 'all' && 'No activity found in feed.'}
            </p>
          </div>
          <div className="pt-1">
            <Link
              href={
                activeTab === 'hackathon_crew'
                  ? '/dashboard/create?type=hackathon_crew'
                  : activeTab === 'code_sos'
                  ? '/dashboard/create?type=code_sos'
                  : activeTab === 'ship_log'
                  ? '/dashboard/create?type=ship_log'
                  : activeTab === 'architecture_rfc'
                  ? '/dashboard/create?type=architecture_rfc'
                  : activeTab === 'tech_showdown'
                  ? '/dashboard/create?type=tech_showdown'
                  : '/dashboard/create'
              }
            >
              <Button size="sm" className="text-xs gap-1.5 font-semibold">
                <PlusCircle className="w-3.5 h-3.5" /> Post First in this Category
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {visibleIndices.map((idx) => children[idx])}
        </div>
      )}
    </div>
  );
}
