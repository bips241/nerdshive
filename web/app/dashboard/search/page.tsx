import React from 'react';
import connectDB from '@/lib/db';
import { User, Follows } from '@/models/User';
import { Card } from '@/components/ui/card';
import UserAvatar from '@/components/UserAvatar';
import FollowButton from '@/components/followBtn';
import { auth } from '@/auth';
import Link from 'next/link';
import { Search as SearchIcon, Users, Globe, GitFork, UserCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';

export const dynamic = 'force-dynamic';

export default async function SearchPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const session = await auth();
  const currentUserId = session?.user?._id?.toString();
  const queryText = searchParams?.q?.trim();

  await connectDB();

  let users: any[] = [];

  if (queryText) {
    users = await User.find({
      $or: [
        { user_name: { $regex: queryText, $options: 'i' } },
        { bio: { $regex: queryText, $options: 'i' } },
        { website: { $regex: queryText, $options: 'i' } },
        { repo: { $regex: queryText, $options: 'i' } },
      ],
      isVerified: true,
    })
      .select('user_name bio image gender website repo')
      .limit(30)
      .lean();
  } else {
    // Default discovery: latest registered developers
    users = await User.find({ isVerified: true })
      .select('user_name bio image gender website repo')
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <SearchIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Search Developers</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Find developers by username, bio, skills, or GitHub repository keywords.
        </p>
      </div>

      {/* Search Input Form */}
      <form method="GET" action="/dashboard/search" className="relative">
        <SearchIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
        <Input
          name="q"
          type="text"
          placeholder="Search by username, skills, tech (e.g. Next.js, Rust, Go)..."
          defaultValue={queryText || ''}
          className="pl-10 h-11 text-sm bg-card rounded-xl"
        />
      </form>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          {queryText ? `Search Results for "${queryText}" (${users.length})` : 'Suggested Developers'}
        </span>
      </div>

      {/* Users Grid */}
      {users.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-card">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold">No developers found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try searching for a different skill or username.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {users.map((user: any) => {
            const isSelf = currentUserId === user._id.toString();

            return (
              <Card
                key={user._id.toString()}
                className="p-4 flex items-start justify-between gap-4 border rounded-xl hover:shadow-md transition-shadow bg-card"
              >
                <Link
                  href={`/dashboard/user/${user.user_name}`}
                  className="flex items-start gap-3 flex-1 group"
                >
                  <UserAvatar user={user} className="h-12 w-12" />
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-bold group-hover:underline text-foreground">
                      {user.user_name}
                    </p>
                    {user.bio ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {user.bio}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No bio provided</p>
                    )}

                    <div className="flex gap-3 pt-1 text-[11px] text-muted-foreground">
                      {user.website && (
                        <span className="flex items-center gap-1 text-primary">
                          <Globe className="h-3 w-3" /> Portfolio
                        </span>
                      )}
                      {user.repo && (
                        <span className="flex items-center gap-1 text-primary">
                          <GitFork className="h-3 w-3" /> GitHub
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {currentUserId && !isSelf && (
                  <div className="shrink-0 pt-1">
                    <FollowButton name={user.user_name} followerId={currentUserId} />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
