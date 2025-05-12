'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';

export default function SocketBootstrapper() {
  useEffect(() => {
    const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
    if (!socketServerUrl) {
      console.error('NEXT_PUBLIC_SOCKET_SERVER_URL is not defined');
      return;
    }
  
    // just initialize socket.io instead of fetch
    const socket = io(socketServerUrl, {
      path: '/socket.io',
    });
  
    return () => {
      socket.disconnect();
    };
  }, []);
  

  return null;
}
