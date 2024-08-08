"use client";

import Link from "next/link";
import PostOptions from "./PostOptions";
import UserAvatar from "./UserAvatar";
import { useSession } from "next-auth/react";
import { CommentWithExtras, PostWithExtras } from "@/lib/definitions";
import Timestamp from "./Timestamp";
import { postcss } from "tailwindcss";

function MiniPost({ post }: { post: PostWithExtras }) {
  const username = post.userId.user_name;
  const href = `/dashboard/${username}`;
  const { data: session, status } = useSession();
  const user = session?.user;

  const posT: any = {
    _id: post._id.toString(),
    userId: post.userId._id,
    isLikedByMe: post.isLikedByCurrentUser,
    likes: post.likes.map((like: { _id: { toString: () => any; }; postId: any; userId: any; createdAt: any; updatedAt: any; }) => ({
      _id: like._id.toString(),
      postId: like.postId.toString(),
      userId: like.userId.toString(),
      createdAt: like.createdAt,
      updatedAt: like.updatedAt,
    })),
    comments: post.comments.map((comment: CommentWithExtras) => ({
      _id: comment._id.toString(),
      body: comment.body,
      postId: comment.postId.toString(),
      userId: comment.userId.toString(),
      username: comment.userId.user_name,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    })),
    savedBy: post.savedBy.map((saved: string) => saved.toString())
  };

  if (!user) return null;

  return (
    <div className="group p-3 px-3.5  flex items-start space-x-2.5">
      <Link href={href}>
        <UserAvatar user={posT.userId} />
      </Link>
      <div className="space-y-1.5">
        <div className="flex items-center space-x-1.5 leading-none text-sm">
          <Link href={href} className="font-semibold">
            {username}
          </Link>
          <p className="font-medium">{posT.caption}</p>
        </div>
        <div className="flex h-5 items-center space-x-2.5">
          <Timestamp createdAt={post.createdAt} />
          <PostOptions
            post={posT}
            userId={user._id}
            className="hidden group-hover:inline"
          />
        </div>
      </div>
    </div>
  );
}

export default MiniPost;