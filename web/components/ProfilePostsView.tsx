'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Grid,
  Heart,
  MessageCircle,
  Video,
  Bug,
  Zap,
  Rocket,
  Layers,
  Users,
  Vote,
  ExternalLink,
  Target,
  Briefcase,
  FileCode,
  Terminal,
  Sparkles,
} from 'lucide-react';

interface ProfilePostsViewProps {
  posts: any[];
  username: string;
  isOwnProfile?: boolean;
}

export const ProfilePostsView: React.FC<ProfilePostsViewProps> = ({
  posts,
  username,
  isOwnProfile,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'dev' | 'media'>('all');

  const mediaPosts = posts.filter(
    (p) => p.fileUrl && (p.postType === 'media' || !p.postType)
  );
  const devPosts = posts.filter(
    (p) => p.postType && p.postType !== 'media'
  );

  const displayedPosts =
    activeTab === 'media'
      ? mediaPosts
      : activeTab === 'dev'
      ? devPosts
      : posts;

  const isVideoUrl = (url?: string) => {
    if (!url) return false;
    const clean = url.split('?')[0].toLowerCase();
    return (
      clean.endsWith('.mp4') ||
      clean.endsWith('.mov') ||
      clean.endsWith('.webm') ||
      clean.endsWith('.quicktime')
    );
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            All Posts
            <span className="text-[10px] opacity-75">({posts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dev')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'dev'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            <Terminal className="w-3 h-3" />
            Dev Dispatches
            <span className="text-[10px] opacity-75">({devPosts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'media'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            Media
            <span className="text-[10px] opacity-75">({mediaPosts.length})</span>
          </button>
        </div>

        <div className="text-xs text-muted-foreground font-mono hidden sm:block">
          Click any card to open interactive post
        </div>
      </div>

      {/* Posts Content Grid */}
      {displayedPosts.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-xl border border-dashed border-border bg-card/40 space-y-2">
          <Terminal className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm font-semibold text-foreground">No posts found in this filter</p>
          <p className="text-xs text-muted-foreground">
            {activeTab === 'media'
              ? 'No photos or video posts have been uploaded yet.'
              : activeTab === 'dev'
              ? 'No Code SOS, Tech Showdowns, or Ship Logs published yet.'
              : 'No posts published yet.'}
          </p>
          {isOwnProfile && (
            <div className="pt-2">
              <Link
                href="/dashboard/create"
                className="inline-flex items-center gap-1 text-xs px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all"
              >
                + Create First Post
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedPosts.map((post) => {
            const isVideo = isVideoUrl(post.fileUrl);
            const hasMedia = !!post.fileUrl;
            const postType = post.postType || 'media';

            // 1. MEDIA POST CARD (Photo or Video)
            if (hasMedia && postType === 'media') {
              return (
                <Link
                  key={post._id}
                  href={`/dashboard/p/${post._id}`}
                  scroll={false}
                  className="aspect-square rounded-xl overflow-hidden relative group border border-border/80 bg-neutral-950 block hover:border-primary/60 transition-all shadow-sm"
                >
                  {isVideo ? (
                    <video
                      src={post.fileUrl}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.fileUrl}
                      alt={post.caption || 'Post image'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}

                  {isVideo && (
                    <div className="absolute top-2 right-2 p-1.5 rounded-md bg-black/70 backdrop-blur-xs text-white shadow">
                      <Video className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Dark hover overlay with likes and comments */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-2 text-white font-bold text-sm transition-opacity duration-200">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <Heart className="w-4 h-4 fill-white" /> {post.likes?.length || 0}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4 fill-white" /> {post.comments?.length || 0}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-white/90 bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-full flex items-center gap-1">
                      View Media <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              );
            }

            // 2. CODE SOS CARD
            if (postType === 'code_sos') {
              const sos = post.codeSos || {};
              return (
                <Link
                  key={post._id}
                  href={`/dashboard/p/${post._id}`}
                  scroll={false}
                  className="aspect-square rounded-xl overflow-hidden p-3.5 flex flex-col justify-between bg-gradient-to-br from-red-950/25 via-card to-card border border-red-500/25 hover:border-red-500/60 transition-all group shadow-sm relative block text-left"
                >
                  <div className="space-y-2 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                        <Bug className="w-3 h-3" /> Code SOS
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase px-1.5 py-0.5 bg-secondary/50 rounded border border-border/50">
                        {sos.language || 'Code'}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                      {sos.title || post.caption || 'Live Code SOS Request'}
                    </h3>

                    {sos.snippet && (
                      <div className="p-2 rounded bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-emerald-400 line-clamp-3 leading-relaxed overflow-hidden">
                        <code>{sos.snippet.slice(0, 140)}</code>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      ⚡ {sos.bountyKarma || 50} Karma
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {post.comments?.length || 0}
                    </span>
                  </div>

                  {/* Hover indicator */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-3.5 h-3.5 text-red-400" />
                  </div>
                </Link>
              );
            }

            // 3. TECH SHOWDOWN CARD
            if (postType === 'tech_showdown') {
              const showdown = post.techShowdown || {};
              const totalVotes =
                showdown.voters?.length ||
                (showdown.votesA || 0) + (showdown.votesB || 0);

              return (
                <Link
                  key={post._id}
                  href={`/dashboard/p/${post._id}`}
                  scroll={false}
                  className="aspect-square rounded-xl overflow-hidden p-3.5 flex flex-col justify-between bg-gradient-to-br from-purple-950/25 via-card to-card border border-purple-500/25 hover:border-purple-500/60 transition-all group shadow-sm relative block text-left"
                >
                  <div className="space-y-2.5 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Zap className="w-3 h-3" /> Tech Showdown
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-purple-400 transition-colors">
                      {showdown.topic || post.caption || 'Technology Showdown'}
                    </h3>

                    <div className="flex items-center justify-center gap-2 py-2 px-2.5 bg-secondary/50 rounded-lg border border-border text-[11px] font-bold">
                      <span className="text-blue-400 truncate max-w-[45%]">
                        {showdown.optionA?.name || 'Option A'}
                      </span>
                      <span className="text-muted-foreground text-[10px] font-black">VS</span>
                      <span className="text-purple-400 truncate max-w-[45%]">
                        {showdown.optionB?.name || 'Option B'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                    <span className="text-purple-400 font-semibold flex items-center gap-1">
                      <Vote className="w-3 h-3" /> Cast Vote
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {post.comments?.length || 0}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                </Link>
              );
            }

            // 4. SHIP LOG CARD
            if (postType === 'ship_log') {
              const ship = post.shipLog || {};
              return (
                <Link
                  key={post._id}
                  href={`/dashboard/p/${post._id}`}
                  scroll={false}
                  className="aspect-square rounded-xl overflow-hidden p-3.5 flex flex-col justify-between bg-gradient-to-br from-emerald-950/25 via-card to-card border border-emerald-500/25 hover:border-emerald-500/60 transition-all group shadow-sm relative block text-left"
                >
                  <div className="space-y-2 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Rocket className="w-3 h-3" /> Ship Log
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                        {ship.version || 'v1.0'}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors">
                      {ship.title || post.caption || 'Product Launch'}
                    </h3>

                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {ship.pitch || 'Developer building in public on NerdShive.'}
                    </p>

                    {ship.techStack && ship.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {ship.techStack.slice(0, 3).map((t: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-foreground font-mono"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      ✨ {ship.alphaTesters?.length || 0} Testers
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {post.comments?.length || 0}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </Link>
              );
            }

            // 5. ARCHITECTURE RFC CARD
            if (postType === 'architecture_rfc') {
              const rfc = post.architectureRfc || {};
              return (
                <Link
                  key={post._id}
                  href={`/dashboard/p/${post._id}`}
                  scroll={false}
                  className="aspect-square rounded-xl overflow-hidden p-3.5 flex flex-col justify-between bg-gradient-to-br from-blue-950/25 via-card to-card border border-blue-500/25 hover:border-blue-500/60 transition-all group shadow-sm relative block text-left"
                >
                  <div className="space-y-2 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Layers className="w-3 h-3" /> RFC Review
                      </span>
                      <span className="text-[10px] text-blue-400 font-mono">RFC</span>
                    </div>

                    <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-blue-400 transition-colors">
                      {rfc.title || post.caption || 'System Design RFC'}
                    </h3>

                    <p className="text-[11px] text-muted-foreground line-clamp-3 leading-relaxed">
                      {rfc.challenge || 'Architecture design proposal open for review.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                    <span className="text-blue-400 font-semibold flex items-center gap-1">
                      💬 Peer Review
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {post.comments?.length || 0}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                </Link>
              );
            }

            // 6. HACKATHON CREW CARD
            if (postType === 'hackathon_crew') {
              const crew = post.hackathonCrew || {};
              const membersCount = crew.members?.length || 1;
              const maxSquad = crew.maxSquadSize || 4;

              return (
                <Link
                  key={post._id}
                  href={`/dashboard/p/${post._id}`}
                  scroll={false}
                  className="aspect-square rounded-xl overflow-hidden p-3.5 flex flex-col justify-between bg-gradient-to-br from-amber-950/25 via-card to-card border border-amber-500/25 hover:border-amber-500/60 transition-all group shadow-sm relative block text-left"
                >
                  <div className="space-y-2 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Users className="w-3 h-3" /> Squad Call
                      </span>
                      <span className="text-[10px] text-amber-400 font-mono">
                        {membersCount}/{maxSquad}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-foreground line-clamp-2 leading-snug group-hover:text-amber-400 transition-colors">
                      {crew.hackathonName || post.caption || 'Hackathon Team Call'}
                    </h3>

                    {crew.rolesNeed && crew.rolesNeed.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {crew.rolesNeed.slice(0, 2).map((role: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      🎯 Join Squad
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" /> {post.comments?.length || 0}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                </Link>
              );
            }

            // 7. GENERIC / POLL / GOAL / PROJECT / TEXT CARD
            return (
              <Link
                key={post._id}
                href={`/dashboard/p/${post._id}`}
                scroll={false}
                className="aspect-square rounded-xl overflow-hidden p-3.5 flex flex-col justify-between bg-card border border-border/80 hover:border-primary/60 transition-all group shadow-sm relative block text-left"
              >
                <div className="space-y-2 overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary text-foreground border border-border">
                      {postType === 'poll' ? (
                        <>
                          <Vote className="w-3 h-3 text-indigo-400" /> Poll
                        </>
                      ) : postType === 'goal' ? (
                        <>
                          <Target className="w-3 h-3 text-cyan-400" /> Goal
                        </>
                      ) : postType === 'project' ? (
                        <>
                          <Briefcase className="w-3 h-3 text-emerald-400" /> Project
                        </>
                      ) : (
                        <>
                          <FileCode className="w-3 h-3 text-primary" /> Post
                        </>
                      )}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      @{username}
                    </span>
                  </div>

                  <p className="text-xs text-foreground font-medium line-clamp-4 leading-relaxed whitespace-pre-line">
                    {post.caption || 'Developer post on NerdShive'}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-2 border-t border-border/50">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3" /> {post.likes?.length || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> {post.comments?.length || 0}
                  </span>
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProfilePostsView;
