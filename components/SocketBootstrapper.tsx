'use client';

import { useEffect } from 'react';

export default function SocketBootstrapper() {
  useEffect(() => {
    fetch('/api/socket'); // boot up the server-side socket.io instance
  }, []);

  return null;
}
