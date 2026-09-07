"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import SubmitButton from "@/components/SubmitButton";
import { Comment } from "@/lib/definitions";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { deleteComment } from "@/lib/actions";

type Props = {
  comment: Comment;
};

function CommentOptions({ comment }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="Comment options"
          className="p-0.5 rounded-full hover:bg-secondary/60 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="w-[88vw] max-w-xs sm:max-w-sm rounded-2xl overflow-hidden p-0 border border-border bg-card shadow-2xl gap-0">
        <div className="flex flex-col divide-y divide-border/60 text-sm font-medium">
          <form
            action={async (formData) => {
              const { message } = await deleteComment(formData);
              toast(message);
            }}
            className="w-full"
          >
            <input type="hidden" name="id" value={comment._id} />
            <SubmitButton className="w-full py-3.5 px-4 text-red-600 dark:text-red-400 font-bold hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2">
              Delete comment
            </SubmitButton>
          </form>

          <DialogClose className="w-full py-3.5 px-4 text-center text-muted-foreground hover:bg-secondary/60 transition-colors cursor-pointer">
            Cancel
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default CommentOptions;