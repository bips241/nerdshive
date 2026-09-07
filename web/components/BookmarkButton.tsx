"use client";

import { bookmarkPost } from "@/lib/actions";
import { PostWithExtras } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import ActionIcon from "@/components/ActionIcon";
import { Bookmark as BookmarkIcon } from "lucide-react";
import { useState } from "react";

type Props = {
  post: PostWithExtras;
  userId?: string;
};

function BookmarkButton({ post, userId }: Props) {
  const [isBookmarked, setIsBookmarked] = useState<boolean>(() => {
    if (!userId || !post.savedBy) return false;
    return (post.savedBy as any[]).some((bookmark: any) => {
      const bId =
        typeof bookmark === "object" && bookmark !== null
          ? bookmark._id?.toString() || bookmark.toString()
          : bookmark?.toString();
      return bId === userId.toString();
    });
  });

  const handleBookmark = async () => {
    if (!userId) return;

    const postId = post._id;
    const wasBookmarked = isBookmarked;

    // Optimistically update the UI
    setIsBookmarked(!wasBookmarked);

    try {
      await bookmarkPost(postId);
    } catch (error) {
      console.error("Failed to bookmark post:", error);
      // Revert optimistic UI update on error
      setIsBookmarked(wasBookmarked);
    }
  };

  return (
    <ActionIcon
      onClick={handleBookmark}
      className="ml-auto cursor-pointer"
      title={isBookmarked ? "Remove bookmark" : "Save post"}
    >
      <BookmarkIcon
        className={cn("h-6 w-6 transition-colors", {
          "dark:fill-white fill-black": isBookmarked,
        })}
      />
    </ActionIcon>
  );
}

export default BookmarkButton;
