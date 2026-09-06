import UserAvatar from "@/components/UserAvatar";
import { CommentWithExtras, LikeWithExtras, PostWithExtras, SavedPost, User, UserWithExtras } from "../lib/definitions";
import Image from "next/image";
import Link from "next/link";
import Comments from "./Comments";
import Timestamp from "./Timestamp";
import { Card } from "./ui/card";
import PostOptions from "./PostOptions";
import PostActions from "./PostActions";
import { auth } from "@/auth";
import Media from "./Media";



async function checkIsVideo(url?: string): Promise<boolean> {
  if (!url) return false;
  if (/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url) || url.includes('video/')) return true;
  try {
    const response = await fetch(url, { method: 'HEAD', next: { revalidate: 3600 } });
    const contentType = response.headers.get('Content-Type') || '';
    return contentType.startsWith('video/');
  } catch {
    return false;
  }
}

const Post = async ({ post }: { post: PostWithExtras }) => {
  const session = await auth();
  const userId = session?.user?._id?.toString();

  if (!session?.user) {
    console.error("User ID not found:", userId);
    return null;
  }

  const username = post?.userId?.user_name;
  const fileUrl = post.fileUrl;

  const user = {
    _id: post.userId._id.toString(),
    user_name: post.userId.user_name,
    email: post.userId.email,
    image: post.userId.image,
  };
   
  const posT = post;
  const isVideo = await checkIsVideo(fileUrl);
  const isImage = !isVideo;

  return (
    <div className="flex flex-col space-y-2.5">
      <div className="flex items-center justify-between px-3 sm:px-0">
        <div className="flex space-x-3 items-center">
          <Link href={`/dashboard/user/${username}`}>
          <UserAvatar user={user} />
          </Link>
          <div className="text-sm">
            <p className="space-x-1">
            <Link href={`/dashboard/user/${username}`}>
              <span className="font-semibold">{username}</span>
            </Link>
              <span className="font-medium text-neutral-500 dark:text-neutral-400 text-xs">
                •
              </span>
              <Timestamp createdAt={post.createdAt} />
            </p>
            <p className="text-xs text-black dark:text-white font-medium">
              WestBengal, India
            </p>
          </div>
        </div>

        <PostOptions post={posT} userId={userId} />
      </div>
      <Card className="relative overflow-hidden h-96 md:h-[500px] lg:h-[700px] xl:h-[800px] max-w-3xl w-full">
        {isImage ? (
          <Image
            src={fileUrl}
            alt="Post Image"
            fill
            className="sm:rounded-md object-cover"
          />
        ) : (
          <Media fileUrl={fileUrl} />
        )}
      </Card>
      <PostActions post={posT} userId={userId} className="px-3 sm:px-0" />
      {post.caption && (
        <div className="text-sm leading-none flex items-center space-x-2 font-medium px-3 sm:px-0">
          <Link href={`/dashboard/user/${username}`} className="font-bold">
            {username}
          </Link>
          <p>{post.caption}</p>
        </div>
      )}
      <Comments postId={posT._id} comments={posT.comments} user={session.user} />
    </div>
  );
};

export default Post;
