import React from 'react';
import ChatList from '@/components/chatList';


const MessagesPage = () => {
    return (
        <div className="flex h-screen relative flex-col md:flex-row md:overflow-hidden">
          <ChatList/>
        </div>
    );
};

export default MessagesPage;