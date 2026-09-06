import React from 'react';
import connectDB from '@/lib/db';
import { Post, User } from '@/models/User';
import { Card } from '@/components/ui/card';
import UserAvatar from '@/components/UserAvatar';
import Timestamp from '@/components/Timestamp';
import CollabReqButton from '@/components/collabReq';
import { auth } from '@/auth';
import Link from 'next/link';
import { Compass, Sparkles, GitFork, Users, Search, Trophy, ShieldCheck, Clock, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getVerifiedHackathons } from '@/lib/hackathon-actions';
import { canCreateHackathon } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: { tag?: string; q?: string };
}) {
  const session = await auth();
  const currentUserId = session?.user?._id?.toString();
  const canHost = canCreateHackathon(session?.user);

  await connectDB();

  const selectedTag = searchParams?.tag;
  const searchQuery = searchParams?.q;

  const query: any = { postType: 'project' };

  if (selectedTag) {
    query['project.techStack'] = { $regex: new RegExp(selectedTag, 'i') };
  }

  if (searchQuery) {
    query.$or = [
      { 'project.title': { $regex: searchQuery, $options: 'i' } },
      { 'project.description': { $regex: searchQuery, $options: 'i' } },
    ];
  }

  const [projects, hackathonSquads, verifiedHackathons] = await Promise.all([
    Post.find(query)
      .populate({
        path: 'userId',
        model: User,
        select: 'user_name image email',
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    Post.find({ postType: 'hackathon_crew' })
      .populate({
        path: 'userId',
        model: User,
        select: 'user_name image email',
      })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    getVerifiedHackathons(),
  ]);

  const popularTags = [
    'All',
    'Next.js',
    'TypeScript',
    'React',
    'Node.js',
    'Python',
    'Rust',
    'Tailwind',
    'AI/ML',
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Explore & Hackathon Radar</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Discover verified hackathons, active squad calls, open-source repositories, and developer teammates.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/radar?mode=project_teammate"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs border border-primary/30 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" /> ⚡ Teammate Radar
          </Link>
          <Link
            href="/dashboard/create?type=hackathon_crew"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <Users className="w-3.5 h-3.5" /> + Assemble Squad
          </Link>
          {canHost && (
            <Link
              href="/dashboard/hackathons/create"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> + Host Hackathon
            </Link>
          )}
        </div>
      </div>

      {/* Verified Real-World Hackathons Showcase */}
      {verifiedHackathons && verifiedHackathons.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <h2 className="text-base font-bold text-foreground">Verified Real-World Hackathons</h2>
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Official Partner Events
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {verifiedHackathons.map((h: any) => {
              const deadline = h.submissionDeadline ? new Date(h.submissionDeadline) : null;
              const now = new Date();
              const daysLeft = deadline
                ? Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
                : null;

              return (
                <div
                  key={h._id}
                  className="p-4 rounded-xl border bg-gradient-to-br from-card via-card to-amber-500/5 hover:border-amber-500/30 transition-all flex flex-col justify-between space-y-3 shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-foreground truncate block">
                            {h.name}
                          </span>
                          <ShieldCheck className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        </div>
                        <span className="text-[10px] text-muted-foreground line-clamp-1 block">
                          {h.location}
                        </span>
                      </div>

                      {daysLeft !== null && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                          {daysLeft}d left
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {h.tagline}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-bold text-amber-500">
                        {h.prizePool}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {h.activeSquadsCount} {h.activeSquadsCount === 1 ? 'squad' : 'squads'} formed
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <Link
                      href={`/dashboard/hackathons/${h.slug}`}
                      className="flex-1 text-center py-1.5 px-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-[11px] border transition-colors"
                    >
                      Event Hub &rarr;
                    </Link>
                    <Link
                      href={`/dashboard/radar?mode=project_teammate&hackathon=${h.slug}`}
                      className="py-1.5 px-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-[11px] border border-primary/20 transition-colors shrink-0"
                      title="Instant Teammate Speed Radar"
                    >
                      ⚡ Speed Match
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Hackathon Squads & Crew Calls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold text-foreground">Active Hackathon Formation Squads</h2>
          </div>
          <Link
            href="/dashboard/create"
            className="text-xs text-primary font-semibold hover:underline"
          >
            + Create Squad Call
          </Link>
        </div>

        {hackathonSquads.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-border text-center space-y-2 bg-card/40">
            <Users className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
            <p className="text-xs font-semibold text-foreground">No squads actively recruiting right now</p>
            <p className="text-[11px] text-muted-foreground">
              Assembling a team for an upcoming hackathon? Create a Crew Call to recruit builders with complementary skills.
            </p>
            <div className="pt-1">
              <Link
                href="/dashboard/create"
                className="inline-flex items-center text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                + Post Hackathon Crew Call
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {hackathonSquads.map((squad: any) => {
              const crew = squad.hackathonCrew || {};
              const membersCount = crew.members?.length || 1;
              const maxSquad = crew.maxSquadSize || 4;
              return (
                <div
                  key={squad._id}
                  className="p-4 rounded-xl border bg-gradient-to-br from-card to-secondary/30 space-y-2.5 relative overflow-hidden flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-primary truncate max-w-[70%]">
                        ⚡ {crew.hackathonName || 'Hackathon Squad'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20 shrink-0">
                        {membersCount}/{maxSquad} spots
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {crew.projectIdea || squad.caption || 'Looking for builders to assemble a hackathon team.'}
                    </p>

                    {crew.rolesNeed && crew.rolesNeed.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {crew.rolesNeed.slice(0, 3).map((role: string, idx: number) => (
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

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                    <span>Lead: @{squad.userId?.user_name || 'developer'}</span>
                    <Link
                      href={`/dashboard/p/${squad._id}`}
                      className="text-primary font-semibold hover:underline"
                    >
                      View Squad &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tech Stack Pills */}
      <div className="space-y-2">
        <h2 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          Filter Projects by Tech Stack & Focus
        </h2>
        <div className="flex flex-wrap gap-2">
          {popularTags.map((tag) => {
            const isSelected = (!selectedTag && tag === 'All') || selectedTag?.toLowerCase() === tag.toLowerCase();
            const href = tag === 'All' ? '/dashboard/explore' : `/dashboard/explore?tag=${encodeURIComponent(tag)}`;

            return (
              <Link key={tag} href={href}>
                <Badge
                  variant={isSelected ? 'default' : 'outline'}
                  className="cursor-pointer px-3.5 py-1.5 text-xs font-semibold transition-all hover:scale-105"
                >
                  {tag}
                </Badge>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-card">
          <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold">No projects found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Be the first to post a project in this category!
          </p>
          <Link
            href="/dashboard/create"
            className="inline-block mt-4 text-xs font-semibold text-primary underline"
          >
            Create a Project Post
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((post: any) => {
            const author = post.userId;
            const project = post.project || {};
            const isAuthor = currentUserId === author?._id?.toString();

            return (
              <Card
                key={post._id.toString()}
                className="p-5 flex flex-col justify-between space-y-4 hover:shadow-lg transition-shadow border rounded-xl bg-card"
              >
                {/* Author Header */}
                <div className="flex items-center justify-between">
                  <Link
                    href={`/dashboard/user/${author?.user_name}`}
                    className="flex items-center gap-3 group"
                  >
                    <UserAvatar user={author} className="h-10 w-10" />
                    <div>
                      <p className="text-sm font-semibold group-hover:underline">
                        {author?.user_name}
                      </p>
                      <Timestamp createdAt={post.createdAt} />
                    </div>
                  </Link>

                  {author?.radarStatus && author.radarStatus !== 'none' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 animate-pulse">
                      🎯 Teammate Radar
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-foreground">{project.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                {/* Tech Stack */}
                {project.techStack && project.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {project.techStack.map((tech: string, i: number) => (
                      <span
                        key={i}
                        className="text-xs px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer Metadata & CTA */}
                <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 font-medium">
                      <Users className="h-3.5 w-3.5" />
                      {project.members?.length || 1} members
                    </span>

                    {project.repoUrl && (
                      <Link
                        href={project.repoUrl.startsWith('http') ? project.repoUrl : `https://${project.repoUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:underline text-primary"
                      >
                        <GitFork className="h-3.5 w-3.5" /> Repo
                      </Link>
                    )}
                  </div>

                  {currentUserId && !isAuthor && (
                    <CollabReqButton postId={post._id.toString()} userId={currentUserId} />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
