"use client";

import ActionIcon from "@/components/ActionIcon";
import { Link, Send } from "lucide-react";
import { toast } from "sonner";

function ShareButton({ postId }: { postId: string }) {
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/dashboard/p/${postId}`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "NerdShive Developer Post",
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        // If user cancelled, don't show error; if failed, fallback to clipboard
        if (err.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Post link copied to clipboard!");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <ActionIcon
      onClick={handleShare}
      className="cursor-pointer"
      title="Share post"
    >
      <Send className="h-6 w-6" />
    </ActionIcon>
  );
}

export default ShareButton;