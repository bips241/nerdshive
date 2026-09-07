"use client";

import Error from "@/components/Error";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import useMount from "@/hooks/useMount";
import { updatePost } from "@/lib/actions";
import { UpdatePost } from "@/schemas/Post";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Post } from "@/lib/definitions";
import { useEffect, useState } from "react";
import ReactPlayer from "react-player";
import { Loader2 } from "lucide-react";

function EditPost({ id, post }: { id: string; post: Post }) {
  const mount = useMount();
  const pathname = usePathname();
  const isEditPage = pathname === `/dashboard/p/${id}/edit`;
  const router = useRouter();
  const form = useForm<z.infer<typeof UpdatePost>>({
    resolver: zodResolver(UpdatePost),
    defaultValues: {
      id: post._id,
      caption: post.caption || "",
      fileUrl: post.fileUrl || "",
    },
  });
  const fileUrl = form.watch("fileUrl");

  const [fileType, setFileType] = useState<string | null>(null);

  useEffect(() => {
    async function fetchFileType(url?: string) {
      if (!url) {
        setFileType(null);
        return;
      }
      try {
        const response = await fetch(url, { method: "HEAD" });
        setFileType(response.headers.get("Content-Type"));
      } catch (error) {
        console.error("Error fetching file type:", error);
      }
    }

    if (fileUrl) {
      fetchFileType(fileUrl);
    }
  }, [fileUrl]);

  if (!mount) return null;

  return (
    <Dialog open={isEditPage} onOpenChange={(open) => !open && router.back()}>
      <DialogContent className="w-[95vw] sm:w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-2xl p-5 sm:p-6 bg-card border border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">Edit post caption</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            className="space-y-4 pt-1"
            onSubmit={form.handleSubmit(async (values) => {
              const res = await updatePost(values);

              if (res?.success) {
                toast.success(res.message || "Post updated successfully!");
                router.push("/dashboard");
              } else if (res?.errors) {
                toast.error(<Error res={res} />);
              } else if (res?.message) {
                toast.error(res.message);
              }
            })}
          >
            {fileUrl ? (
              <div className="relative h-64 sm:h-72 w-full overflow-hidden rounded-xl bg-black/90 flex items-center justify-center border border-border">
                {fileType?.startsWith("video") ? (
                  <ReactPlayer
                    url={fileUrl}
                    controls
                    width="100%"
                    height="100%"
                    className="rounded-xl object-contain"
                  />
                ) : (
                  <Image
                    src={fileUrl}
                    alt="Post preview"
                    fill
                    className="rounded-xl object-contain"
                  />
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-1 text-sm">
                <span className="text-xs uppercase font-bold tracking-wider text-primary">
                  {post.postType ? post.postType.replace("_", " ") : "Post"}
                </span>
                <p className="text-foreground font-medium">{post.caption || "No caption"}</p>
              </div>
            )}

            <FormField
              control={form.control}
              name="caption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="caption" className="text-sm font-semibold text-foreground">
                    Caption
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      id="caption"
                      placeholder="Write an updated caption..."
                      className="bg-secondary/20 border-border text-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="border-border text-foreground"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="min-w-[80px]">
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default EditPost;