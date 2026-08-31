import React from 'react';
import connectDB from '@/lib/db';
import { Post, User } from '@/models/User';
import { Card } from '@/components/ui/card';
import UserAvatar from '@/components/UserAvatar';
import Timestamp from '@/components/Timestamp';
import Like from '@/components/Like';
import BookmarkButton from '@/components/BookmarkButton';
import { auth } from '@/auth';
import Link from 'next/link';
import { Clapperboard, MessageCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReelsPage() {
  const session = await auth();
  const currentUserId = session?.user?._id?.toString();

  await connectDB();

  // Find media posts with video URLs
  const videoPosts = await Post.find({
    postType: 'media',
    fileUrl: { $regex: /\.(mp4|mov|webm)(\?.*)?$/i },
  })
    .populate({
      path: 'userId',
      model: User,
      select: 'user_name image email',
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-2 px-2">
        <Clapperboard className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Dev Reels</h1>
      </div>

      {videoPosts.length === 0 ? (
        <div className="text-center py-16 border rounded-2xl bg-card">
          <Clapperboard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold">No video reels yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Share a short developer video, demo, or tutorial!
          </p>
          <Link
            href="/dashboard/create"
            className="inline-block mt-4 text-xs font-semibold text-primary underline"
          >
            Upload a Video Reel
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {videoPosts.map((post: any) => {
            const author = post.userId;
            const isLikedByMe = currentUserId
              ? post.likes?.some((id: any) => id.toString() === currentUserId)
              : false;

            return (
              <Card
                key={post._id.toString()}
                className="relative overflow-hidden rounded-2xl border bg-black text-white shadow-xl aspect-[9/16] max-h-[680px] w-full flex flex-col justify-between"
              >
                {/* Video Player */}
                <video
                  src={post.fileUrl}
                  controls
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Top Overlay */}
                <div className="relative z-10 p-4 bg-gradient-to-b from-black/60 to-transparent flex items-center gap-3">
                  <Link href={`/dashboard/user/${author?.user_name}`}>
                    <UserAvatar user={author} className="h-9 w-9 border border-white/20" />
                  </Link>
                  <div>
                    <Link
                      href={`/dashboard/user/${author?.user_name}`}
                      className="text-sm font-bold hover:underline drop-shadow"
                    >
                      {author?.user_name}
                    </Link>
                    <div className="text-[11px] text-white/80">
                      <Timestamp createdAt={post.createdAt} />
                    </div>
                  </div>
                </div>

                {/* Bottom Overlay & Actions */}
                <div className="relative z-10 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end justify-between">
                  <div className="space-y-1 max-w-[75%]">
                    {post.caption && (
                      <p className="text-sm font-medium leading-relaxed drop-shadow">
                        {post.caption}
                      </p>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex flex-col items-center gap-4 text-white">
                    <div className="flex flex-col items-center">
                      <Like post={post} userId={currentUserId} />
                    </div>

                    <Link href={`/dashboard/p/${post._id.toString()}`} className="hover:opacity-80">
                      <MessageCircle className="h-6 w-6" />
                    </Link>

                    <BookmarkButton post={post} userId={currentUserId} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
