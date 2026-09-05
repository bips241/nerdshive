import React from 'react';
import connectDB from '@/lib/db';
import { Post, User } from '@/models/User';
import { Card } from '@/components/ui/card';
import UserAvatar from '@/components/UserAvatar';
import Timestamp from '@/components/Timestamp';
import CollabReqButton from '@/components/collabReq';
import { auth } from '@/auth';
import Link from 'next/link';
import { Compass, Sparkles, GitFork, Users, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';

export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: { tag?: string; q?: string };
}) {
  const session = await auth();
  const currentUserId = session?.user?._id?.toString();

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

  const [projects, hackathonSquads] = await Promise.all([
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
      .limit(3)
      .lean(),
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
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Compass className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Explore Developer Projects</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Discover active open-source projects, hackathon teams, and teammates looking for complementary skillsets.
        </p>
      </div>

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
