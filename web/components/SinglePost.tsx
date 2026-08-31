import { auth } from "@/auth";
import Comment from "@/components/Comment";
import CommentForm from "@/components/CommentForm";
import Post from "@/components/Post";
import PostActions from "@/components/PostActions";
import PostOptions from "@/components/PostOptions";
import UserAvatar from "@/components/UserAvatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchPostById } from "@/lib/data";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "./ui/card";
import MiniPost from "./MiniPost";
import { CommentWithExtras } from "@/lib/definitions";
import Media from "./Media";

async function SinglePost({ id }: { id: string }) {
  const post = await fetchPostById(id);
  const posT = JSON.parse(post);
   console.log('come:',posT);
  const session = await auth();
  const postUsername = posT?.userId?.user_name;
  const userId = session?.user?._id?.toString();

  if (!post) {
    notFound();
  }

// console.log('image',posT.fileUrl);

  async function getFileType(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.headers.get('Content-Type');
    } catch (error) {
      console.error('Error fetching file type:', error);
      return null;
    }
  }

  const fileType = await getFileType(posT.fileUrl);

  // console.log('filetype',fileType);

  return (
    <>
      <Card className="max-w-3xl lg:max-w-4xl hidden md:flex mx-auto">
        <div className="relative overflow-hidden h-[450px] max-w-sm lg:max-w-lg w-full">
        {fileType?.startsWith('video') ? (
          <Media fileUrl={posT.fileUrl} />
        ) : (
          <Image
              src={posT.fileUrl}
              alt="Post preview"
              fill
              className="md:rounded-l-md object-cover"
            />
        )}
        </div>

        <div className="flex max-w-sm flex-col flex-1">
          <div className="flex items-center justify-between border-b px-5 py-3">
            <HoverCard>
              <HoverCardTrigger asChild>
                <Link
                  className="font-semibold text-sm"
                  href={`/dashboard/${postUsername}`}
                >
                  {postUsername}
                </Link>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="flex items-center space-x-2">
                  <UserAvatar user={posT.userId} className="h-14 w-14" />
                  <div>
                    <p className="font-bold">{postUsername}</p>
                    <p className="text-sm font-medium dark:text-neutral-400">
                      {posT.userId.user_name}
                    </p>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>

            <PostOptions post={posT} userId={userId} />
          </div>

          {posT.comments.length === 0 && (
            <div className="flex flex-col items-center gap-1.5 flex-1 justify-center">
              <p className="text-xl lg:text-2xl font-extrabold">
                No comments yet.
              </p>
              <p className="text-sm font-medium">Start the conversation.</p>
            </div>
          )}

          {posT.comments.length > 0 && (
            <ScrollArea className="hidden md:inline py-1.5 flex-1">
              <MiniPost post={posT} />
              {posT.comments.map((comment: { _id: string | null | undefined; }) => (
                <Comment key={comment._id} comment={comment} />
              ))}
            </ScrollArea>
          )}

          <div className="px-2 hidden md:block mt-auto border-y p-2.5">
            {/* <PostActions post={posT} userId={userId} /> */}
            <time className="text-[11px] uppercase text-zinc-500 font-medium">
              {new Date(posT.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
              })}
            </time>
          </div>
          <CommentForm postId={posT._id} className="hidden md:inline-flex" />
        </div>
      </Card>
      <div className="md:hidden">
        <Post post={posT} />
      </div>
    </>
  );
}

export default SinglePost;