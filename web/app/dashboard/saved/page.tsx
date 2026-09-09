import React from 'react';
import { auth } from '@/auth';
import connectDB from '@/lib/db';
import { SavedPost, Post, User } from '@/models/User';
import Link from 'next/link';
import { Bookmark, Sparkles, Film, GitFork, BarChart3, Target, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/UserAvatar';
import Timestamp from '@/components/Timestamp';
import BookmarkButton from '@/components/BookmarkButton';
import { redirect } from 'next/navigation';
import { formatDisplayDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SavedPostsPage({
  searchParams,
}: {
  searchParams?: { type?: string };
}) {
  const session = await auth();
  if (!session?.user?._id) {
    redirect('/login');
  }

  const userId = session.user._id;
  await connectDB();

  const selectedType = searchParams?.type || 'all';

  // Fetch all saved posts for current user
  const savedRecords = await SavedPost.find({ userId })
    .sort({ createdAt: -1 })
    .lean();

  const postIds = savedRecords.map((r: any) => r.postId);

  let query: any = { _id: { $in: postIds } };
  if (selectedType !== 'all') {
    query.postType = selectedType;
  }

  const posts = await Post.find(query)
    .populate({
      path: 'userId',
      model: User,
      select: 'user_name image email',
    })
    .sort({ createdAt: -1 })
    .lean();

  const filterTabs = [
    { id: 'all', label: 'All Saved', icon: Bookmark },
    { id: 'project', label: 'Projects', icon: GitFork },
    { id: 'media', label: 'Media & Demos', icon: Film },
    { id: 'poll', label: 'Polls', icon: BarChart3 },
    { id: 'goal', label: 'Goals', icon: Target },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bookmark className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Saved Posts & Bookmarks</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Access all your bookmarked developer projects, tech polls, learning goals, and media posts.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 pt-2">
        {filterTabs.map((tab) => {
          const isSelected = selectedType === tab.id;
          const href = tab.id === 'all' ? '/dashboard/saved' : `/dashboard/saved?type=${tab.id}`;
          const Icon = tab.icon;

          return (
            <Link key={tab.id} href={href}>
              <Badge
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all hover:scale-105"
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Badge>
            </Link>
          );
        })}
      </div>

      {/* Content */}
      {posts.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-card space-y-3">
          <Sparkles className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">No saved posts in this category</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Bookmark posts on your home feed or explore tab to easily find them here later.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/explore"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              Explore Developer Projects <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((post: any) => {
            const author = post.userId;
            const isProject = post.postType === 'project';
            const isMedia = post.postType === 'media';
            const isPoll = post.postType === 'poll';
            const isGoal = post.postType === 'goal';

            return (
              <Card
                key={post._id.toString()}
                className="p-5 flex flex-col justify-between space-y-4 hover:shadow-lg transition-shadow border rounded-xl bg-card"
              >
                {/* Author & Header */}
                <div className="flex items-center justify-between">
                  <Link
                    href={`/dashboard/user/${author?.user_name}`}
                    className="flex items-center gap-3 group"
                  >
                    <UserAvatar user={author} className="h-9 w-9" />
                    <div>
                      <p className="text-sm font-semibold group-hover:underline">
                        {author?.user_name}
                      </p>
                      <Timestamp createdAt={post.createdAt} />
                    </div>
                  </Link>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border">
                      {post.postType}
                    </span>
                    <BookmarkButton post={post} userId={userId.toString()} />
                  </div>
                </div>

                {/* Body Content */}
                <Link href={`/dashboard/p/${post._id}`} className="space-y-2 block group">
                  {isProject && (
                    <>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        {post.project?.title}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {post.project?.description}
                      </p>
                      {post.project?.techStack && post.project.techStack.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {post.project.techStack.map((tech: string, i: number) => (
                            <span
                              key={i}
                              className="text-[11px] px-2 py-0.5 rounded bg-muted text-foreground font-medium"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {isMedia && (
                    <>
                      {post.caption && (
                        <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                          {post.caption}
                        </p>
                      )}
                      {post.fileUrl && (
                        <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden relative">
                          <img
                            src={post.fileUrl}
                            alt="Media post"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </>
                  )}

                  {isPoll && (
                    <>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                        📊 {post.poll?.question}
                      </h3>
                      <div className="space-y-1.5 pt-1">
                        {post.poll?.options?.map((opt: any, idx: number) => (
                          <div
                            key={idx}
                            className="text-xs p-2 rounded-lg bg-secondary/50 border flex justify-between"
                          >
                            <span>{opt.option}</span>
                            <span className="font-semibold text-muted-foreground">{opt.votes || 0} votes</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {isGoal && (
                    <>
                      <h3 className="text-sm font-semibold text-foreground">
                        🎯 {post.goal?.description}
                      </h3>
                      {post.goal?.goalTargetDate && (
                        <p suppressHydrationWarning className="text-xs text-muted-foreground">
                          Target: {formatDisplayDate(post.goal.goalTargetDate)}
                        </p>
                      )}
                    </>
                  )}
                </Link>

                {/* Footer */}
                <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <Link
                    href={`/dashboard/p/${post._id}`}
                    className="flex items-center gap-1 font-semibold text-primary hover:underline ml-auto"
                  >
                    View Post <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
