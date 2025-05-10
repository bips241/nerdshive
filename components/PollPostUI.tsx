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
import Poll from './pollStats';

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
            className="relative overflow-hidden p-8 h-96 md:h-[500px] lg:h-[700px] xl:h-[800px] max-w-4xl w-full flex flex-col justify-center items-center space-y-8"
            style={{
                backgroundImage: 'url(/poll.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '24px',
            }}
            >
            <h2 className="text-4xl md:text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 px-8 py-4 rounded-full shadow-lg transform transition-transform hover:scale-105 tracking-wide leading-tight">
                {pollQuestion}
            </h2>
            {userId && (
                <Poll 
                    pollId={post._id} 
                    userId={userId} 
                    pollOptions={pollOptions} 
                />
            )}
            </Card>

            <PostActions post={post} userId={userId} className="px-3 sm:px-0" />
            <Comments postId={post._id} comments={post.comments} user={user} />
        </div>
    );
};

export default PollPostUI;
