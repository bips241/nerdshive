"use client";

import CommentForm from "@/components/CommentForm";
import PostActions from "@/components/PostActions";
import UserAvatar from "@/components/UserAvatar";
import PostOptions from "@/components/PostOptions";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import useMount from "@/hooks/useMount";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Key, useRef } from "react";
import MiniPost from "./MiniPost";
import Comment from "./Comment";
import Media from "./Media";

function PostView({ id, post, isImage }: { id: string; post: any; isImage?: boolean }) {
  const pathname = usePathname();
  const isPostModal = pathname === `/dashboard/p/${id}`;
  const router = useRouter();
  const { data: session } = useSession();
  const userId = session?.user?._id?.toString();
  const inputRef = useRef<HTMLInputElement>(null);
  const username = post.userId?.user_name || "developer";
  const href = `/dashboard/user/${username}`;
  const mount = useMount();

  if (!mount) return null;

  return (
    <Dialog open={isPostModal} onOpenChange={(open) => !open && router.back()}>
      <DialogContent className="w-[95vw] md:w-[90vw] max-w-5xl h-[88vh] max-h-[750px] flex flex-col md:flex-row p-0 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl gap-0">
        {/* Media Container: Left (Desktop) / Top (Mobile) */}
        <div className="relative flex-1 bg-black/95 flex items-center justify-center min-h-[200px] md:min-h-0 h-[40vh] md:h-full w-full overflow-hidden">
          {!isImage ? (
            <Media fileUrl={post.fileUrl} />
          ) : (
            <Image
              src={post.fileUrl}
              fill
              alt={post.caption || "Post preview"}
              className="object-contain"
              priority
            />
          )}
        </div>

        {/* Details & Discussion Panel: Right (Desktop) / Bottom (Mobile) */}
        <div className="flex flex-col flex-1 md:flex-none md:w-[380px] lg:w-[420px] h-[48vh] md:h-full border-t md:border-t-0 md:border-l border-border bg-card min-w-0 justify-between">
          {/* Header */}
          <div className="flex items-center justify-between py-3 px-4 border-b border-border shrink-0">
            <div className="flex items-center space-x-2.5 min-w-0">
              <Link href={href}>
                <UserAvatar user={post.userId} className="h-8 w-8" />
              </Link>
              <Link href={href} className="font-semibold text-sm hover:underline truncate">
                {username}
              </Link>
            </div>
            <PostOptions post={post} userId={userId} />
          </div>

          {/* Comments & Caption Scroll Area */}
          <ScrollArea className="flex-1 min-h-0 py-1 px-1">
            <MiniPost post={post} />
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comment: { _id: Key | null | undefined }) => (
                <Comment
                  key={comment._id}
                  comment={comment as any}
                  inputRef={inputRef}
                />
              ))
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No comments yet. Start the conversation!
              </div>
            )}
          </ScrollArea>

          {/* Actions & Timestamp */}
          <div className="border-t border-border px-4 py-2.5 space-y-1 shrink-0 bg-card">
            <PostActions post={post} userId={userId} />
            <time className="text-[10px] uppercase text-muted-foreground font-medium block">
              {new Date(post.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </time>
          </div>

          {/* Comment Input */}
          <div className="shrink-0 border-t border-border">
            <CommentForm
              postId={id}
              inputRef={inputRef}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PostView;
