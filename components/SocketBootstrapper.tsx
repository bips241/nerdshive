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
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
    });
  
    return () => {
      socket.disconnect();
    };
  }, []); // Dependency array ensures this runs only once

  return null;
}
