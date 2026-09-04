import React from 'react';
import { auth } from '@/auth';
import connectDB from '@/lib/db';
import { Like, Post, User, Comment, ProjectRequest } from '@/models/User';
import Link from 'next/link';
import { Activity, Heart, MessageSquare, GitPullRequest, Sparkles, ArrowRight, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/UserAvatar';
import Timestamp from '@/components/Timestamp';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const session = await auth();
  if (!session?.user?._id) {
    redirect('/login');
  }

  const userId = session.user._id;
  await connectDB();

  const activeTab = searchParams?.tab || 'collab';

  // Fetch Collab Requests (both sent by user and received on user's projects)
  const [sentRequests, myProjects] = await Promise.all([
    ProjectRequest.find({ requesterId: userId })
      .populate({
        path: 'projectId',
        model: Post,
        populate: { path: 'userId', model: User, select: 'user_name image' },
      })
      .sort({ createdAt: -1 })
      .lean(),
    Post.find({ userId, postType: 'project' }).select('_id').lean(),
  ]);

  const myProjectIds = myProjects.map((p: any) => p._id);
  const receivedRequests = await ProjectRequest.find({ projectId: { $in: myProjectIds } })
    .populate({
      path: 'requesterId',
      model: User,
      select: 'user_name image email bio techStack radarStatus',
    })
    .populate({
      path: 'projectId',
      model: Post,
      select: 'project.title',
    })
    .sort({ createdAt: -1 })
    .lean();

  // Fetch Liked Posts
  const likes = await Like.find({ userId })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();
  const likedPostIds = likes.map((l: any) => l.postId);
  const likedPosts = await Post.find({ _id: { $in: likedPostIds } })
    .populate({ path: 'userId', model: User, select: 'user_name image' })
    .sort({ createdAt: -1 })
    .lean();

  // Fetch User's Comments
  const userComments = await Comment.find({ userId })
    .populate({
      path: 'postId',
      model: Post,
      populate: { path: 'userId', model: User, select: 'user_name' },
    })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const tabs = [
    { id: 'collab', label: 'Collaboration Requests', icon: GitPullRequest, count: sentRequests.length + receivedRequests.length },
    { id: 'likes', label: 'Liked Posts', icon: Heart, count: likedPosts.length },
    { id: 'comments', label: 'Comments', icon: MessageSquare, count: userComments.length },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Your Activity</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Track your project collaboration requests, liked developer posts, and community discussions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 pt-2">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          const href = `/dashboard/activity?tab=${tab.id}`;
          const Icon = tab.icon;

          return (
            <Link key={tab.id} href={href}>
              <Badge
                variant={isSelected ? 'default' : 'outline'}
                className="cursor-pointer px-3.5 py-1.5 text-xs font-semibold flex items-center gap-2 transition-all hover:scale-105"
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-background/30 text-current">
                  {tab.count}
                </span>
              </Badge>
            </Link>
          );
        })}
      </div>

      {/* TAB: Collaboration Requests */}
      {activeTab === 'collab' && (
        <div className="space-y-8">
          {/* Incoming Requests */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-primary" />
              Incoming Requests on Your Projects ({receivedRequests.length})
            </h2>

            {receivedRequests.length === 0 ? (
              <div className="p-6 rounded-xl border bg-card text-center text-sm text-muted-foreground">
                No incoming collaboration requests yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {receivedRequests.map((req: any) => {
                  const requester = req.requesterId;
                  const projectTitle = req.projectId?.project?.title || 'Project';

                  return (
                    <Card key={req._id.toString()} className="p-4 space-y-3 bg-card border rounded-xl">
                      <div className="flex items-start justify-between">
                        <Link
                          href={`/dashboard/user/${requester?.user_name}`}
                          className="flex items-center gap-2.5 group"
                        >
                          <UserAvatar user={requester} className="h-9 w-9" />
                          <div>
                            <p className="text-sm font-semibold group-hover:underline">
                              {requester?.user_name}
                            </p>
                            <Timestamp createdAt={req.createdAt} />
                          </div>
                        </Link>

                        <Badge
                          variant={
                            req.status === 'accepted'
                              ? 'default'
                              : req.status === 'rejected'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-[11px] capitalize"
                        >
                          {req.status}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Applied to join: <span className="font-semibold text-foreground">{projectTitle}</span>
                      </p>

                      {requester?.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-2 italic">
                          "{requester.bio}"
                        </p>
                      )}

                      <div className="pt-2 border-t flex justify-end gap-2">
                        <Link
                          href={`/dashboard/p/${req.projectId?._id}`}
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          Manage in Post <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Outgoing Requests */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Your Outgoing Requests ({sentRequests.length})
            </h2>

            {sentRequests.length === 0 ? (
              <div className="p-6 rounded-xl border bg-card text-center text-sm text-muted-foreground">
                You haven't requested to join any projects yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sentRequests.map((req: any) => {
                  const project = req.projectId;
                  const author = project?.userId;

                  return (
                    <Card key={req._id.toString()} className="p-4 space-y-3 bg-card border rounded-xl">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-foreground">
                            {project?.project?.title || 'Collaboration Post'}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Owner: {author?.user_name || 'Developer'}
                          </p>
                        </div>

                        <Badge
                          variant={
                            req.status === 'accepted'
                              ? 'default'
                              : req.status === 'rejected'
                              ? 'destructive'
                              : 'outline'
                          }
                          className="text-[11px] capitalize flex items-center gap-1"
                        >
                          {req.status === 'accepted' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                          {req.status === 'rejected' && <XCircle className="h-3 w-3 text-red-500" />}
                          {req.status === 'pending' && <Clock className="h-3 w-3 text-amber-500" />}
                          {req.status}
                        </Badge>
                      </div>

                      <div className="pt-2 border-t flex justify-between items-center text-xs text-muted-foreground">
                        <Timestamp createdAt={req.createdAt} />
                        {project?._id && (
                          <Link
                            href={`/dashboard/p/${project._id}`}
                            className="font-semibold text-primary hover:underline flex items-center gap-1"
                          >
                            View Project <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: Liked Posts */}
      {activeTab === 'likes' && (
        <div className="space-y-4">
          {likedPosts.length === 0 ? (
            <div className="text-center py-16 border rounded-2xl bg-card space-y-3">
              <Sparkles className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-semibold">No liked posts yet</h3>
              <p className="text-sm text-muted-foreground">
                Like developer updates and projects on your home feed to see them here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {likedPosts.map((post: any) => (
                <Card key={post._id.toString()} className="p-4 space-y-3 bg-card border rounded-xl">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/dashboard/user/${post.userId?.user_name}`}
                      className="flex items-center gap-2 group"
                    >
                      <UserAvatar user={post.userId} className="h-8 w-8" />
                      <span className="text-xs font-semibold group-hover:underline">
                        {post.userId?.user_name}
                      </span>
                    </Link>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {post.postType}
                    </Badge>
                  </div>

                  <p className="text-xs text-foreground line-clamp-2">
                    {post.postType === 'project'
                      ? post.project?.title
                      : post.postType === 'poll'
                      ? post.poll?.question
                      : post.caption || 'Media Post'}
                  </p>

                  <div className="pt-2 border-t flex justify-end">
                    <Link
                      href={`/dashboard/p/${post._id}`}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      View Post <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Comments */}
      {activeTab === 'comments' && (
        <div className="space-y-4">
          {userComments.length === 0 ? (
            <div className="text-center py-16 border rounded-2xl bg-card space-y-3">
              <Sparkles className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-semibold">No comments yet</h3>
              <p className="text-sm text-muted-foreground">
                Share feedback and discuss architecture on developer posts.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {userComments.map((comment: any) => (
                <Card key={comment._id.toString()} className="p-4 space-y-2 bg-card border rounded-xl">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Commented on <span className="font-semibold text-foreground">{comment.postId?.userId?.user_name}'s</span> post
                    </span>
                    <Timestamp createdAt={comment.createdAt} />
                  </div>

                  <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded-lg">
                    "{comment.body}"
                  </p>

                  {comment.postId?._id && (
                    <div className="pt-1 flex justify-end">
                      <Link
                        href={`/dashboard/p/${comment.postId._id}`}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        View Post & Thread <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
