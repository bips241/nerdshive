'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Rocket,
  Bug,
  Network,
  Swords,
  Sparkles,
  Filter,
  PlusCircle,
  PenSquare,
  ArrowRight,
} from 'lucide-react';
import { Button } from './ui/button';

interface FeedItemMeta {
  id: string;
  type: string;
}

interface FeedContainerProps {
  children: React.ReactNode;
  postsMeta: FeedItemMeta[];
}

export default function FeedContainer({ children, postsMeta }: FeedContainerProps) {
  const [activeTab, setActiveTab] = useState<string>('all');
  const childrenArray = React.Children.toArray(children);

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
    { id: 'all', label: 'All', count: counts.all },
    { id: 'hackathon_crew', label: '⚡ Squads', count: counts.hackathon_crew },
    { id: 'ship_log', label: '🚀 Ship Logs', count: counts.ship_log },
    { id: 'code_sos', label: '🐛 Code SOS', count: counts.code_sos },
    { id: 'architecture_rfc', label: '📐 RFCs', count: counts.architecture_rfc },
    { id: 'tech_showdown', label: '⚔️ Debates', count: counts.tech_showdown },
  ];

  // Filter children based on active tab
  const visibleIndices: number[] = [];
  postsMeta.forEach((meta, idx) => {
    if (activeTab === 'all' || meta.type === activeTab) {
      visibleIndices.push(idx);
    }
  });

  return (
    <div className="space-y-5 w-full">
      {/* 1. Sleek Developer Quick-Composer Bar */}
      <div className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm p-3 sm:p-3.5 shadow-xs transition-all hover:border-border">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/create"
            className="flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-secondary/30 hover:bg-secondary/60 border border-border/40 text-muted-foreground hover:text-foreground text-xs font-medium transition-all group"
          >
            <span className="flex items-center gap-2">
              <PenSquare className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span>What are you building, debugging, or shipping?</span>
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/60 border text-muted-foreground">
              New Post
            </span>
          </Link>
        </div>

        {/* Quick Action Chips */}
        <div className="flex items-center gap-1.5 pt-2.5 overflow-x-auto no-scrollbar">
          <Link
            href="/dashboard/create?type=hackathon_crew"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 transition-all shrink-0"
          >
            <Users className="w-3 h-3" />
            <span>Recruit Squad</span>
          </Link>

          <Link
            href="/dashboard/create?type=ship_log"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20 transition-all shrink-0"
          >
            <Rocket className="w-3 h-3" />
            <span>Ship Demo</span>
          </Link>

          <Link
            href="/dashboard/create?type=code_sos"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all shrink-0"
          >
            <Bug className="w-3 h-3" />
            <span>Code SOS</span>
          </Link>

          <Link
            href="/dashboard/create?type=architecture_rfc"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 transition-all shrink-0"
          >
            <Network className="w-3 h-3" />
            <span>System RFC</span>
          </Link>

          <Link
            href="/dashboard/stranger-chat"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all shrink-0 ml-auto"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Pair Radar</span>
          </Link>
        </div>
      </div>

      {/* 2. Streamlined Minimalist Category Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar border-b border-border/60">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                isSelected
                  ? 'bg-secondary text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-foreground/15 text-foreground font-bold'
                      : 'bg-secondary text-muted-foreground'
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
        <div className="p-8 rounded-2xl border border-dashed border-border/70 text-center space-y-3 bg-card/30 my-4">
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center mx-auto text-muted-foreground">
            <Filter className="w-4 h-4 opacity-70" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">
              No posts in this category yet
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {activeTab === 'hackathon_crew' &&
                'Be the first to recruit a team for upcoming hackathons.'}
              {activeTab === 'code_sos' &&
                'No open debug requests right now. Stuck on a bug? Broadcast a pair debug SOS.'}
              {activeTab === 'ship_log' &&
                'No ship logs yet. Shipped something awesome? Share your release demo.'}
              {activeTab === 'architecture_rfc' &&
                'No system RFCs. Planning an architecture design? Ask for peer feedback.'}
              {activeTab === 'tech_showdown' &&
                'No active tech showdowns. Compare tools or discuss tradeoffs.'}
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
              <Button size="sm" className="text-xs gap-1.5 font-medium h-8">
                <PlusCircle className="w-3.5 h-3.5" /> Post First in this Category
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {visibleIndices.map((idx) => childrenArray[idx])}
        </div>
      )}
    </div>
  );
}
