// Removed unused import of Server from 'socket.io'
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';
import { Server as IOServer } from 'socket.io';

// Extend NextApiResponse to include socket information
type NextApiResponseWithSocket = NextApiResponse & {
  socket: NetSocket & {
    server: HTTPServer & {
      io?: IOServer;
    };
  };
};

const intentQueues: Record<string, string[]> = {
  hiring: [],
  looking_for_job: [],
  project_teammate: [],
};

const handler = (_: NextApiRequest, res: NextApiResponseWithSocket): void => {
  if (!res.socket.server.io) {
    const httpServer: HTTPServer = res.socket.server as any;
    const io = new IOServer(httpServer, {
      path: '/api/socket_io',
      addTrailingSlash: false,
    });

    console.log('Socket.io server started');

    io.on('connection', (socket) => {
      console.log('New client connected:', socket.id);

      socket.on('join_queue', ({ intent }: { intent: string }) => {
        const queue = intentQueues[intent];
        if (!queue) return;

        // Check if there’s a waiting user
        const partnerId = queue.shift();
        if (partnerId) {
          // Match both
          socket.join(partnerId);
          socket.emit('match_found', { peerId: partnerId });
          io.to(partnerId).emit('match_found', { peerId: socket.id });
        } else {
          // No one to match yet, add to queue
          queue.push(socket.id);
        }
      });

      socket.on('skip', () => {
        // Remove from all queues
        for (const key in intentQueues) {
          intentQueues[key] = intentQueues[key].filter((id) => id !== socket.id);
        }
        // Notify peer if in room
        const roomsToNotify = Array.from(socket.rooms);
        roomsToNotify.forEach((roomId) => {
          if (roomId !== socket.id) {
            io.to(roomId).emit('left');
          }
        });
        // Leave all rooms manually
        const roomsToLeave = Array.from(socket.rooms);
        roomsToLeave.forEach((roomId) => {
          if (roomId !== socket.id) {
            socket.leave(roomId);
          }
        });
      });

      socket.on('disconnect', () => {
        for (const key in intentQueues) {
          intentQueues[key] = intentQueues[key].filter((id) => id !== socket.id);
        }
        io.emit('left');
      });
    });

    res.socket.server.io = io;
  }

  res.status(200).end(); // Corrected this to use status(200) and then end the response
};

export default handler;

