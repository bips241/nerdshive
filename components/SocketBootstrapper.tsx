'use client';

import { useEffect } from 'react';

export default function SocketBootstrapper() {
  useEffect(() => {
    const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;
    if (!socketServerUrl) {
      console.error('NEXT_PUBLIC_SOCKET_SERVER_URL is not defined');
      return;
    }
    fetch(socketServerUrl).catch((error) => {
      console.error('Failed to fetch the socket server URL:', error);
    }); // boot up the server-side socket.io instance
  }, []);

  return null;
}
