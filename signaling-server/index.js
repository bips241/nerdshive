const io = require('socket.io')(3001, {
    cors: {
      origin: "*",
    }
  });
  
  const waitingUsers = new Map();
  
  io.on('connection', socket => {
    socket.on('join', ({ userId, intent }) => {
      // try to find a match
      const match = [...waitingUsers.entries()].find(([id, info]) =>
        info.intent === intent && id !== userId
      );
      if (match) {
        const [matchedId, { socketId }] = match;
        io.to(socketId).emit('match-found', { userId });
        socket.emit('match-found', { userId: matchedId });
        waitingUsers.delete(matchedId);
      } else {
        waitingUsers.set(userId, { socketId: socket.id, intent });
      }
    });
  
    socket.on('disconnect', () => {
      for (const [id, info] of waitingUsers.entries()) {
        if (info.socketId === socket.id) {
          waitingUsers.delete(id);
          break;
        }
      }
    });
  
    socket.on('signal', ({ targetId, data }) => {
      io.to(targetId).emit('signal', { from: socket.id, data });
    });
  });
  