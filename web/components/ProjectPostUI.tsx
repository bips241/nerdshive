import React from 'react';
import Link from 'next/link';
import UserAvatar from './UserAvatar';
import Timestamp from './Timestamp';
import PostOptions from './PostOptions';
import { Card } from './ui/card';
import PostActions from './PostActions';
import Comments from './Comments';
import { auth } from '@/auth';

import { PostWithExtras } from '@/lib/definitions';
import CollabReqButton from './collabReq';
import ClientSideRequestsDialog from './ProReqClient';

const ProjectPostUI: React.FC<PostWithExtras> = async ({ post }) => {
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

            <Card className="relative overflow-hidden p-6 h-auto md:h-[500px] lg:h-[700px] xl:h-[800px] max-w-3xl w-full flex flex-col justify-center items-center bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 text-white rounded-lg shadow-lg">
                <div className="flex flex-col items-center space-y-6">
                    <h2 className="text-3xl font-extrabold text-center drop-shadow-md">
                        {post.project.title}
                    </h2>

                    <p className="text-center text-base md:text-lg font-medium drop-shadow-sm">
                        {post.project.description}
                    </p>

                    {post.project.techStack && post.project.techStack.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-3 mt-4">
                            {post.project.techStack.map((tech: string, idx: number) => (
                                <span
                                    key={idx}
                                    className="px-4 py-2 bg-white text-purple-700 rounded-full text-sm font-semibold shadow-md hover:bg-purple-100 transition-all"
                                >
                                    {tech}
                                </span>
                            ))}
                        </div>
                    )}

                    {post.project.repoUrl && (
                        <a
                            href={`https://${post.project.repoUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 text-center text-lg font-semibold underline decoration-white hover:decoration-purple-300 transition-all"
                        >
                            View Repository
                        </a>
                    )}

                    <p className="mt-4 text-sm md:text-base font-medium">
                        Members Joined: <span className="font-bold">{post.project.members.length}</span>
                    </p>

                    {userId && (
                        <CollabReqButton
                            postId={post._id}
                            userId={userId}
                        />
                    )}

                    {userId === user._id && (
                        <ClientSideRequestsDialog
                            postId={post._id}
                        />
                    )}
                </div>
            </Card>

            <PostActions post={post} userId={userId} className="px-3 sm:px-0" />
            <Comments postId={post._id} comments={post.comments} user={session.user} />
        </div>
    );
};

export default ProjectPostUI;
