"use client";

import { useState } from "react";
import { deletePost } from "@/lib/actions";
import { PostWithExtras } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import SubmitButton from "@/components/SubmitButton";
import { MoreHorizontal, Trash2, Edit3, ExternalLink, Link2, X } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type Props = {
  post: PostWithExtras;
  userId?: string;
  className?: string;
};

function PostOptions({ post, userId, className }: Props) {
  const [open, setOpen] = useState(false);

  // Robustly extract post author ID whether populated as an object, ObjectId, or string
  const postAuthorId =
    typeof post.userId === "object" && post.userId !== null
      ? (post.userId as any)._id?.toString() || (post.userId as any).toString()
      : post.userId?.toString();

  const currentUserId = userId?.toString();
  const isPostMine = Boolean(currentUserId && postAuthorId && postAuthorId === currentUserId);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/dashboard/p/${post._id}`;
    navigator.clipboard.writeText(url);
    toast.success("Post link copied to clipboard");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Post options"
          className="p-1 rounded-full hover:bg-secondary/60 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <MoreHorizontal
            className={cn(
              "h-5 w-5",
              className
            )}
          />
        </button>
      </DialogTrigger>
      <DialogContent className="w-[88vw] max-w-xs sm:max-w-sm rounded-2xl overflow-hidden p-0 border border-border bg-card shadow-2xl gap-0">
        <div className="flex flex-col divide-y divide-border/60 text-sm font-medium">
          {/* OWNER-ONLY ACTIONS: Strictly visible only to the author */}
          {isPostMine && (
            <form
              action={async (formData) => {
                setOpen(false);
                const { message } = await deletePost(formData);
                toast(message);
              }}
              className="w-full"
            >
              <input type="hidden" name="id" value={post._id} />
              <SubmitButton className="w-full py-3.5 px-4 text-red-600 dark:text-red-400 font-bold hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2">
                <Trash2 className="h-4 w-4" /> Delete post
              </SubmitButton>
            </form>
          )}

          {isPostMine && (
            <Link
              scroll={false}
              href={`/dashboard/p/${post._id}/edit`}
              onClick={() => setOpen(false)}
              className="w-full py-3.5 px-4 text-center text-foreground hover:bg-secondary/60 transition-colors flex items-center justify-center gap-2"
            >
              <Edit3 className="h-4 w-4 text-muted-foreground" /> Edit post / caption
            </Link>
          )}

          {/* PUBLIC ACTIONS: Available to all viewers */}
          <Link
            scroll={false}
            href={`/dashboard/p/${post._id}`}
            onClick={() => setOpen(false)}
            className="w-full py-3.5 px-4 text-center text-foreground hover:bg-secondary/60 transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" /> Go to post
          </Link>

          <button
            type="button"
            onClick={handleCopyLink}
            className="w-full py-3.5 px-4 text-center text-foreground hover:bg-secondary/60 transition-colors flex items-center justify-center gap-2"
          >
            <Link2 className="h-4 w-4 text-muted-foreground" /> Copy link
          </button>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full py-3.5 px-4 text-center text-muted-foreground hover:bg-secondary/60 transition-colors flex items-center justify-center gap-2"
          >
            <X className="h-4 w-4 text-muted-foreground" /> Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PostOptions;
