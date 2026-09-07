"use client";

import { CommentWithExtras } from "@/lib/definitions";
import CommentOptions from "@/components/CommentOptions";
import UserAvatar from "@/components/UserAvatar";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Timestamp from "./Timestamp";

type Props = {
  comment: CommentWithExtras;
  inputRef?: React.RefObject<HTMLInputElement>;
};

function Comment({ comment, inputRef }: Props) {
  const { data: session } = useSession();
  const username = comment.userId?.user_name || "developer";
  const href = `/dashboard/user/${username}`;

  const commentAuthorId =
    typeof comment.userId === "object" && comment.userId !== null
      ? (comment.userId as any)._id?.toString() || (comment.userId as any).toString()
      : comment.userId?.toString();
  const currentUserId = session?.user?._id?.toString();
  const isCommentMine = Boolean(currentUserId && commentAuthorId && commentAuthorId === currentUserId);

  return (
    <div className="group p-3 px-3.5 flex items-start space-x-2.5">
      <Link href={href}>
        <UserAvatar user={comment.userId} />
      </Link>
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center space-x-1.5 leading-none text-sm">
          <Link href={href} className="font-semibold hover:underline truncate">
            {username}
          </Link>
          <p className="font-medium text-foreground break-words">{comment.body}</p>
        </div>
        <div className="flex h-5 items-center space-x-2.5">
          <Timestamp createdAt={comment.createdAt} />
          <button
            className="text-xs font-semibold text-neutral-500 hover:text-foreground cursor-pointer"
            onClick={() => inputRef?.current?.focus()}
          >
            Reply
          </button>
          {isCommentMine && (
            <CommentOptions comment={comment} />
          )}
        </div>
      </div>
    </div>
  );
}

export default Comment;