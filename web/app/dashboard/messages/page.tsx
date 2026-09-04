import React from 'react';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { DiscordLayout } from '@/components/chat/DiscordLayout';
import connectDB from '@/lib/db';
import { User } from '@/models/User';

export const metadata = {
  title: 'Messages & Voice Channels | NerdShive',
  description: 'Real-time developer chat, multi-party voice lounges, and collaborative video rooms.',
};

const MessagesPage = async () => {
  const session = await auth();

  if (!session?.user?._id) {
    redirect('/login');
  }

  await connectDB();
  const dbUser = await User.findById(session.user._id).select('user_name image avatar').lean();

  const currentUser = {
    _id: session.user._id.toString(),
    user_name: (dbUser as any)?.user_name || session.user.user_name || 'Developer',
    image: (dbUser as any)?.image || session.user.image || '',
    avatar: (dbUser as any)?.avatar || '',
  };

  return (
    <div className="h-[calc(100vh)] w-full overflow-hidden">
      <DiscordLayout currentUser={currentUser} />
    </div>
  );
};

export default MessagesPage;