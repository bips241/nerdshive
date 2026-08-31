"use client";

import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { useState } from "react";
import ActionIcon from "./ActionIcon";
import { likePost } from "@/lib/actions";

type LikeButtonProps = {
  post: {
    _id: string;
    userId: string;
    likes: { userId: { _id: string } }[];
    isLikedByMe: boolean;
  };
  userId?: string;
};

function LikeButton({ post, userId }: LikeButtonProps) {
  const [likes, setLikes] = useState(post.likes || []);
  const [isLiked, setIsLiked] = useState(post.isLikedByMe);

  const handleLike = async () => {
    if (!userId) return;

    const postId = post._id;
    const updatedIsLiked = !isLiked;

    // Optimistic UI Update: Update state instantly
    const updatedLikes = updatedIsLiked
      ? [...likes, { userId: { _id: userId } }]
      : likes.filter((like) => like.userId._id !== userId);

    setIsLiked(updatedIsLiked);
    setLikes(updatedLikes);

    try {
      await likePost(postId);
    } catch (error) {
      console.error("Failed to like post:", error);
      // Revert optimistic update if API call fails
      setIsLiked(!updatedIsLiked);
      setLikes(likes);
    }
  };

  return (
    <div className="flex flex-col items-center">
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
