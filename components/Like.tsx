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
    likes: string[];
    isLikedByMe: boolean;
  };
  userId?: string;
};

function LikeButton({ post, userId }: LikeButtonProps) {
  const [likes, setLikes] = useState<string[]>(post.likes || []);
  const isLiked = post.isLikedByMe;

  ('LIke button post:',post);

  const handleLike = async () => {
    if (!userId) return;

    const postId = post._id;

    const updatedLikes = isLiked
      ? likes.filter((id) => id !== userId)
      : [...likes, userId];

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
