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
  const [bookmarks, setBookmarks] = useState<string[]>(post.savedBy || []);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(bookmarks.some((bookmark) => bookmark === userId));
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleBookmark = async () => {
    if (!userId) return;

    const postId = post._id;
    const wasBookmarked = isBookmarked;

    // Optimistically update the UI
    setIsBookmarked(!isBookmarked);
    setBookmarks((prevBookmarks) => {
      if (isBookmarked) {
        return prevBookmarks.filter((bookmark) => bookmark !== userId);
      } else {
        return [...prevBookmarks, userId];
      }
    });

    setIsLoading(true);
    
    try {
      await bookmarkPost(postId);
    } catch (error) {
      console.error("Failed to bookmark post:", error);
      // Revert optimistic UI update on error
      setIsBookmarked(wasBookmarked);
      setBookmarks((prevBookmarks) => {
        if (wasBookmarked) {
          return [...prevBookmarks, userId];
        } else {
          return prevBookmarks.filter((bookmark) => bookmark !== userId);
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ActionIcon onClick={handleBookmark} className="ml-auto" disabled={isLoading}>
      <BookmarkIcon
        className={cn("h-6 w-6", {
          "dark:fill-white fill-black": isBookmarked,
        })}
      />
    </ActionIcon>
  );
}

export default BookmarkButton;
