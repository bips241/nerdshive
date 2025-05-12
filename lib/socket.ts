import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = () => {
  if (!socket) {
    socket = io({
      path: '/api/socket_io',
    });
  }
  return socket;
};
