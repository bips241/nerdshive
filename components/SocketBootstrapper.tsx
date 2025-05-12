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
  
    const socket = io(socketServerUrl, {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true
    });
  
    return () => {
      socket.disconnect();
    };
  }, []); // Dependency array ensures this runs only once

  return null;
}
