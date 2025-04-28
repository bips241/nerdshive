import React from 'react';
import Link from 'next/link';
import UserAvatar from './UserAvatar';
import Timestamp from './Timestamp';
import PostOptions from './PostOptions';
import {Card} from './ui/card';
import PostActions from './PostActions';
import Comments from './Comments';
import { PostWithExtras } from '@/lib/definitions';
import { auth } from '@/auth';

const PollPostUI: React.FC<PostWithExtras> = async ({post}) => {

    const user = {
        _id: post.userId._id.toString(),
        username: post.userId.user_name,
        email: post.userId.email,
        image: post.userId.image,
      };

      const session = await auth();
        const userId = session?.user?._id?.toString();
      
        if (!session?.user) {
          console.error("User ID not found:", userId);
          return null;
        }
      
        const username = post?.userId?.user_name;

        const pollQuestion = post.poll.question;

        const pollOptions = post.poll.options.map((option: { text: string }) => ({
            text: option.text || "No text provided",
        }));
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
                    <span className="font-medium text-neutral-500 dark:text-neutral-400 text-xs">•</span>
                    <Timestamp createdAt={new Date(post.createdAt)} />
                </p>
                <p className="text-xs text-black dark:text-white font-medium">
                    WestBengal, India
                </p>
                </div>
            </div>

            <PostOptions post={post} userId={userId} />
            </div>

            <Card 
            className="relative overflow-hidden p-6 h-96 md:h-[500px] lg:h-[700px] xl:h-[800px] max-w-3xl w-full flex flex-col justify-center items-center space-y-6"
            style={{
                backgroundImage: 'url(/poll.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '12px',
            }}
            >
            <h2 className="text-xl font-bold text-center text-black dark:text-white bg-white/70 dark:bg-black/70 px-4 py-2 rounded-md">
                {pollQuestion}
            </h2>
            <div className="flex flex-col space-y-3 w-full max-w-md">
             {pollOptions.map((option: { text: string }, idx: number) => (
                 <div 
                     key={idx} 
                     className="w-full border border-neutral-300 dark:border-neutral-700 rounded-md px-4 py-2 text-center font-medium text-black dark:text-white bg-white/80 dark:bg-black/80"
                 >
                     {option.text}
                 </div>
                 ))}
            </div>
            </Card>

            <PostActions post={post} userId={userId} className="px-3 sm:px-0" />
            <Comments postId={post._id} comments={post.comments} user={user} />
        </div>
    );
};

export default PollPostUI;
