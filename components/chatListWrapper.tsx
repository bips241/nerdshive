'use client';

import { usePathname } from 'next/navigation';
import ChatList from './chatList';

const ChatListWrapper = () => {
  const pathname = usePathname();

  // Hide ChatList on exact `/dashboard/messages` path
  if (pathname === '/dashboard/messages') return null;

  return <ChatList />;
};

export default ChatListWrapper;
