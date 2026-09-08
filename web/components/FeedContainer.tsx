'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Rocket,
  PenSquare,
  Film,
  Filter,
  PlusCircle,
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

const FeedTabContext = React.createContext<string>('all');

export function useFeedTab() {
  return React.useContext(FeedTabContext);
}

export function FeedItemWrapper({
  postType,
  children,
}: {
  postType: string;
  children: React.ReactNode;
}) {
  const activeTab = useFeedTab();
  const isVisible =
    activeTab === 'all' ||
    (activeTab === 'hackathon_crew' && postType === 'hackathon_crew') ||
    (activeTab === 'projects' && ['ship_log', 'media'].includes(postType));

  if (!isVisible) return null;
  return <>{children}</>;
}

export default function FeedContainer({ children, postsMeta = [] }: FeedContainerProps) {
  const [activeTab, setActiveTab] = useState<string>('all');

  // Count posts per category
  const counts = {
    all: postsMeta.length,
    hackathon_crew: postsMeta.filter((p) => p.type === 'hackathon_crew').length,
    projects: postsMeta.filter((p) => ['ship_log', 'media'].includes(p.type)).length,
  };

  const tabs = [
    { id: 'all', label: 'All Updates', count: counts.all },
    { id: 'hackathon_crew', label: '⚡ Squad Calls', count: counts.hackathon_crew },
    { id: 'projects', label: '🚀 Projects & Demos', count: counts.projects },
  ];

  const currentCount =
    activeTab === 'all'
      ? counts.all
      : activeTab === 'hackathon_crew'
      ? counts.hackathon_crew
      : counts.projects;

  return (
    <FeedTabContext.Provider value={activeTab}>
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
                <span>Recruit for a hackathon squad or showcase an open-source project...</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/60 border text-muted-foreground">
                New Post
              </span>
            </Link>
          </div>

          {/* Quick Action Chips */}
          <div className="flex items-center gap-2 pt-2.5 overflow-x-auto no-scrollbar">
            <Link
              href="/dashboard/create?type=hackathon_crew"
              title="Recruit teammates with complementary skills for hackathons with auto-provisioned squad channels"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 transition-all shrink-0"
            >
              <Users className="w-3.5 h-3.5" />
              <span>⚡ Recruit Squad</span>
            </Link>

            <Link
              href="/dashboard/create?type=ship_log"
              title="Showcase your live MVP, tool, or repo to get alpha testers, stars & feedback"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all shrink-0"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>🚀 Showcase Project</span>
            </Link>

            <Link
              href="/dashboard/create?type=media"
              title="Upload video reels, screen recordings & architecture snapshots"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-500/10 hover:bg-neutral-500/20 text-neutral-400 border border-neutral-500/20 transition-all shrink-0"
            >
              <Film className="w-3.5 h-3.5" />
              <span>🎬 Demo Reel</span>
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
        {currentCount === 0 ? (
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
                  'Be the first to recruit a squad for upcoming hackathons.'}
                {activeTab === 'projects' &&
                  'No project showcases yet. Shipped an MVP or open-source tool? Share your demo.'}
                {activeTab === 'all' && 'No activity found in the feed. Be the first to share an update!'}
              </p>
            </div>
            <div className="pt-1">
              <Link
                href={
                  activeTab === 'hackathon_crew'
                    ? '/dashboard/create?type=hackathon_crew'
                    : '/dashboard/create?type=ship_log'
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
            {children}
          </div>
        )}
      </div>
    </FeedTabContext.Provider>
  );
}
