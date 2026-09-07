'use client';

import { PostWithExtras } from "@/lib/definitions";
import { cn } from "@/lib/utils";
import ActionIcon from "@/components/ActionIcon";
import { MessageCircle } from "lucide-react";
import LikeButton from "./Like";
import ShareButton from "./ShareButton";
import BookmarkButton from "./BookmarkButton";
import { useOptionalFeed } from "./FeedProvider";
import { useRouter } from "next/navigation";

type Props = {
  post: PostWithExtras;
  userId?: string;
  className?: string;
};

function PostActions({ post, userId, className }: Props) {
  const feedContext = useOptionalFeed();
  const router = useRouter();

  const handleCommentClick = () => {
    if (feedContext?.focusPostDiscussion) {
      feedContext.focusPostDiscussion(post);
    } else {
      router.push(`/dashboard/p/${post._id}`);
    }
  };

  return (
    <div className={cn("relative flex items-start w-full gap-x-2", className)}>
      <LikeButton post={post} userId={userId} />
      <button
        onClick={handleCommentClick}
        type="button"
        className="focus:outline-none cursor-pointer"
        title="Open Discussion in Right Cockpit"
      >
        <ActionIcon>
          <MessageCircle className="h-6 w-6" />
        </ActionIcon>
      </button>
      <ShareButton postId={post._id} />
      <BookmarkButton post={post} userId={userId} />
    </div>
  );
}

export default PostActions;