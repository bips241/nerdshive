"use client";

import { PostWithExtras } from "@/lib/definitions";
import { cn } from "@/lib/utils";

import { Heart } from "lucide-react";
import { useState } from "react";
import ActionIcon from "./ActionIcon";
import { likePost } from "@/lib/actions";

type Like = {
  userId: string;
  postId: string;
};

function LikeButton({
  post,
  userId,
}: {
  post: PostWithExtras;
  userId?: string;
}) {
  const [likes, setLikes] = useState<Like[]>(post.likes || []);
  const isLiked = likes.some((like) => like.userId === userId && like.postId === post._id);

  const handleLike = async () => {
    if (!userId) return;

    const postId = post._id;

    const updatedLikes = isLiked
      ? likes.filter((like) => like.userId !== userId)
      : [...likes, { postId, userId }];

    setLikes(updatedLikes);

    try {
      await likePost(postId);
    } catch (error) {
      console.error("Failed to like post:", error);
      
      setLikes(likes);
    }
  };

  return (
    <div className="flex flex-col">
      <ActionIcon onClick={handleLike}>
        <Heart
          className={cn("h-6 w-6", {
            "text-red-500 fill-red-500": isLiked,
          })}
        />
      </ActionIcon>
      {likes.length > 0 && (
        <p className="text-sm font-bold dark:text-white">
          {likes.length} {likes.length === 1 ? "like" : "likes"}
        </p>
      )}
    </div>
  );
}

export default LikeButton;
