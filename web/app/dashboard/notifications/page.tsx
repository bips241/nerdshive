import React from 'react';
import connectDB from '@/lib/db';
import { ProjectRequest, Follows, Post, User } from '@/models/User';
import { Card } from '@/components/ui/card';
import UserAvatar from '@/components/UserAvatar';
import Timestamp from '@/components/Timestamp';
import { auth } from '@/auth';
import Link from 'next/link';
import { Bell, Heart, UserPlus, Hammer, CheckCircle2, XCircle } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?._id) {
    redirect('/login');
  }

  const userId = session.user._id;
  await connectDB();

  // Find user's own projects
  const userProjects = await Post.find({ userId, postType: 'project' }).select('_id project.title').lean();
  const projectIds = userProjects.map((p) => p._id);

  // Fetch collaboration requests for user's projects
  const collabRequests = await ProjectRequest.find({
    projectId: { $in: projectIds },
  })
    .populate({
      path: 'requesterId',
      model: User,
      select: 'user_name image email',
    })
    .populate({
      path: 'projectId',
      model: Post,
      select: 'project.title',
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // Fetch new followers
  const newFollowers = await Follows.find({ followingId: userId })
    .populate({
      path: 'followerId',
      model: User,
      select: 'user_name image email',
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Stay updated on teammate collaboration requests, follows, and project activity.
        </p>
      </div>

      {/* Collaboration Requests Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Project Collaboration Requests ({collabRequests.length})
        </h2>

        {collabRequests.length === 0 ? (
          <div className="text-center py-8 border rounded-xl bg-card text-sm text-muted-foreground">
            No pending collaboration requests.
          </div>
        ) : (
          <div className="space-y-2.5">
            {collabRequests.map((req: any) => {
              const requester = req.requesterId;
              const projectTitle = req.projectId?.project?.title || 'Your Project';

              return (
                <Card
                  key={req._id.toString()}
                  className="p-4 flex items-center justify-between gap-4 border rounded-xl bg-card"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar user={requester} className="h-10 w-10" />
                    <div>
                      <p className="text-sm">
                        <Link
                          href={`/dashboard/user/${requester?.user_name}`}
                          className="font-bold hover:underline"
                        >
                          {requester?.user_name}
                        </Link>{' '}
                        requested to join <span className="font-semibold text-primary">{projectTitle}</span>
                      </p>
                      <Timestamp createdAt={req.createdAt} />
                    </div>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                      req.status === 'accepted'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : req.status === 'rejected'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-amber-500/10 text-amber-600'
                    }`}
                  >
                    {req.status}
                  </span>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Followers Section */}
      <div className="space-y-3 pt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Recent Followers ({newFollowers.length})
        </h2>

        {newFollowers.length === 0 ? (
          <div className="text-center py-8 border rounded-xl bg-card text-sm text-muted-foreground">
            No new followers yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {newFollowers.map((f: any) => {
              const follower = f.followerId;

              return (
                <Card
                  key={f._id.toString()}
                  className="p-4 flex items-center justify-between gap-4 border rounded-xl bg-card"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar user={follower} className="h-10 w-10" />
                    <div>
                      <p className="text-sm">
                        <Link
                          href={`/dashboard/user/${follower?.user_name}`}
                          className="font-bold hover:underline"
                        >
                          {follower?.user_name}
                        </Link>{' '}
                        started following you.
                      </p>
                      <Timestamp createdAt={f.createdAt} />
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/user/${follower?.user_name}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View Profile
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
