import React from 'react';
import Link from 'next/link';

import UserAvatar from './UserAvatar';
import Timestamp from './Timestamp';
import PostOptions from './PostOptions';
import {Card} from './ui/card';
import PostActions from './PostActions';
import Comments from './Comments';
import { format } from 'date-fns';

import { PostWithExtras } from '@/lib/definitions';
import { auth } from '@/auth';
import { handleInterest } from '@/lib/actions';
import { toast } from 'sonner';
import { InterestedButton } from './interestedButton';

const GoalPostUI: React.FC<PostWithExtras> = async ({post}) => {
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

    const handleInterestedClick = async () => {
        try {
            if (userId) {
                await handleInterest(post._id, userId);
                return toast.success("Yay, you are interested!", {
                    style: {
                        background: '#d4edda',
                        color: '#155724',
                    },
                });
            } else {
                console.error("User ID is undefined");
            }
        }
        catch (error) {
            console.error("Error handling interested click:", error);
        }
    };
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
                            <Timestamp createdAt={post.createdAt} />
                        </p>
                        <p className="text-xs text-black dark:text-white font-medium">
                            WestBengal, India
                        </p>
                    </div>
                </div>

                <PostOptions post={post} userId={userId} />
            </div>

            <Card className="relative overflow-hidden p-6 h-96 md:h-[500px] lg:h-[700px] xl:h-[800px] max-w-3xl w-full flex flex-col justify-center space-y-6">
                <h2 className="text-3xl font-extrabold text-center text-black dark:text-white tracking-wide">
                    {post.goalTitle}
                </h2>
                <p className="text-center text-2xl text-neutral-800 dark:text-neutral-200 font-semibold leading-relaxed">
                    {post.goal.description}
                </p>
                <p className="text-center text-xl text-red-600 dark:text-red-400 font-medium italic">
                    Target Date: {format(new Date(post.goal.goalTargetDate), 'dd MMM yyyy')}
                </p>
                <div className="flex justify-center space-x-4 mt-4">
                    {userId && <InterestedButton postId={post._id} userId={userId} />}
                </div>
                <div className="flex justify-center space-x-6 mt-2">
                    <p className="font-medium">
                        Interested: <span className="text-blue-600 dark:text-blue-400">{post.goal.interestedUsers.length || 0}</span>    
                    </p>
                </div>
            </Card>

            <PostActions post={post} userId={userId} className="px-3 sm:px-0" />
            <Comments postId={post._id} comments={post.comments} user={session.user} />
        </div>
    );
};

export default GoalPostUI;
