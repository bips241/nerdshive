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



const fetchContentType = async (url: string) => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.headers.get('Content-Type');
  } catch (error) {
    console.error('Error fetching content type:', error);
    return null;
  }
};

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

  const posT: any = {
    _id: post._id.toString(),
    userId: post.userId._id.toString(),
    isLikedByMe: post.isLikedByCurrentUser,
    likes: post.likes.map((like: { _id: { toString: () => any; }; postId: any; userId: any; createdAt: any; updatedAt: any; }) => ({
      _id: like._id.toString(),
      postId: like.postId.toString(),
      userId: like.userId.toString(),
      createdAt: like.createdAt,
      updatedAt: like.updatedAt,
    })),
    comments: post.comments.map((comment: CommentWithExtras) => ({
      _id: comment._id.toString(),
      body: comment.body,
      postId: comment.postId.toString(),
      userId: comment.userId.toString(),
      username: comment.userId.user_name,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    })),
    savedBy: post.savedBy.map((saved: string) => saved.toString())
  };



  const contentType = await fetchContentType(fileUrl);
  const isImage = contentType?.startsWith('image');

  return (
    <div className="flex flex-col space-y-2.5">
      <div className="flex items-center justify-between px-3 sm:px-0">
        <div className="flex space-x-3 items-center">
          <UserAvatar user={user} />
          <div className="text-sm">
            <p className="space-x-1">
              <span className="font-semibold">{username}</span>
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
      <Card className="relative h-[450px] w-full overflow-hidden rounded-none sm:rounded-md">
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
          <Link href={`/dashboard/${username}`} className="font-bold">
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
