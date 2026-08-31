'use client';

import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import Chat from './fireChat';
import { getSession } from 'next-auth/react';

interface User {
  id: string;
  name: string;
  avatar: string;
}

const ChatList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [myUserid, setMyUserid] = useState<string | undefined>(undefined);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const session = await getSession();
      setMyUserid(session?.user?._id);
    };

    fetchSession();
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch('/api/chats');
        const data: User[] = await response.json();
        if (response.ok) {
          const uniqueUsers = Array.from(new Map(data.map((user: User) => [user.id, user])).values());
          setUsers(uniqueUsers);
        } else {
          console.error('error in chats ui');
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  return (
    <Card className="w-full max-w-lg mx-auto mt-6 p-4 shadow-lg border rounded-2xl bg-background sm:max-w-xl md:max-w-2xl lg:max-w-3xl">
      <h2 className="text-2xl font-semibold mb-4 text-center">Chats</h2>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-center text-muted-foreground">No mutual users to chat with</p>
      ) : (
        <>
          {!selectedUser ? (
            <ScrollArea className="h-[300px] pr-2 mb-4 sm:h-[400px] md:h-[500px]">
              <ul className="space-y-3">
                {users.map((user) => (
                  <li key={user.id}>
                    <div
                      className={`flex items-center gap-4 p-2 rounded-lg transition-colors cursor-pointer ${
                        selectedUser?.id === user.id ? 'bg-muted' : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <Avatar>
                        <AvatarImage src={user.avatar || '/avatar.png'} />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">Click to chat</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">Chat with {selectedUser.name}</h3>
                <button
                  className="text-sm text-red-500 hover:underline"
                  onClick={() => setSelectedUser(null)}
                >
                  Close
                </button>
              </div>
              {myUserid && <Chat currentUserId={myUserid} targetUserId={selectedUser.id} />}
            </div>
          )}
        </>
      )}
    </Card>
  );
};

export default ChatList;
