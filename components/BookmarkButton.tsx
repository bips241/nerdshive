"use client";

import { bookmarkPost } from "@/lib/actions";
import { PostWithExtras } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import ActionIcon from "@/components/ActionIcon";
import { Bookmark as BookmarkIcon } from "lucide-react";
import { useState } from "react";

type SavedPost = {
  userId: string;
  postId: string;
};

type Props = {
  post: PostWithExtras;
  userId?: string;
};

function BookmarkButton({ post, userId }: Props) {
  const [bookmarks, setBookmarks] = useState<SavedPost[]>(post.savedBy || []);
  const isBookmarked = bookmarks.some((bookmark) => bookmark.userId === userId && bookmark.postId === post.id);

  const handleBookmark = async () => {
    if (!userId) return;

    const postId = post.id;
    const newBookmark: SavedPost = { userId, postId };

    // Optimistically update UI
    const updatedBookmarks = isBookmarked
      ? bookmarks.filter((bookmark) => bookmark.userId !== userId)
      : [...bookmarks, newBookmark];

    setBookmarks(updatedBookmarks);

    try {
      await bookmarkPost(postId);
    } catch (error) {
      console.error("Failed to bookmark post:", error);
      // Revert optimistic UI update on error
      setBookmarks(bookmarks);
    }
  };

  return (
    <ActionIcon onClick={handleBookmark} className="ml-auto">
      <BookmarkIcon
        className={cn("h-6 w-6", {
          "dark:fill-white fill-black": isBookmarked,
        })}
      />
    </ActionIcon>
  );
}

export default BookmarkButton;
