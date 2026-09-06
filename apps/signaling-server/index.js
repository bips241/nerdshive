const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const instanceId = process.env.INSTANCE_ID || `pid-${process.pid}`;

const allowedOrigins = (
  process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : ["https://nerdshive.online", "http://localhost:3000", "https://nerdshive.vercel.app"]
);

const app = express();
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

let redisClient = null;
let isRedisReady = false;

if (process.env.REDIS_URL) {
  try {
    const { createAdapter } = require('@socket.io/redis-adapter');
    const Redis = require('ioredis');
    const shouldUseTls =
      process.env.REDIS_TLS === 'true' ||
      process.env.REDIS_URL.startsWith('rediss://') ||
      process.env.REDIS_URL.includes('upstash.io');

    const redisOptions = {
      maxRetriesPerRequest: null,
      lazyConnect: true,
      ...(shouldUseTls ? { tls: {} } : {}),
    };

    const pubClient = new Redis(process.env.REDIS_URL, redisOptions);
    const subClient = pubClient.duplicate();
    redisClient = pubClient;

    Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
      isRedisReady = true;
      io.adapter(createAdapter(pubClient, subClient));
      console.log(`[BOOT:${instanceId}] Redis adapter & queue storage connected (tls=${shouldUseTls})`);
    }).catch((err) => {
      console.error(`[BOOT:${instanceId}] Redis connection failed, falling back to in-memory mode:`, err.message);
      isRedisReady = false;
    });
  } catch (error) {
    console.error(`[BOOT:${instanceId}] Failed to initialize Redis`, error);
  }
}

// In-Memory Fallback State
const intentQueues = {
  pair_debug: [],
  project_teammate: [],
  system_design: [],
  hiring: [],
  looking_for_job: [],
};

const directRooms = new Map(); // roomId -> { socketId, peerId }
const activeMatches = new Map();
const queuedState = new Map();

function roomFor(a, b) {
  return [a, b].sort().join(':');
}

// Memory Queue Helpers
function removeFromMemoryQueues(socketId, reason = 'unknown') {
  Object.keys(intentQueues).forEach((intent) => {
    const queue = intentQueues[intent];
    if (Array.isArray(queue)) {
      const before = queue.length;
      for (let i = queue.length - 1; i >= 0; i -= 1) {
        if (queue[i]?.socketId === socketId) {
          queue.splice(i, 1);
        }
      }
      const after = queue.length;
      if (before !== after) {
        console.log(`[DEQUEUE:${instanceId}] intent=${intent} socket=${socketId} reason=${reason} before=${before} after=${after}`);
      }
    }
  });

  // Also purge any direct room registrations for this socket
  for (const [roomId, roomData] of directRooms.entries()) {
    if (roomData.socketId === socketId) {
      directRooms.delete(roomId);
      if (isRedisReady && redisClient) {
        redisClient.del(`direct_room:${roomId}`).catch(() => {});
      }
      console.log(`[DIRECT_ROOM_CLEAN:${instanceId}] room=${roomId} socket=${socketId}`);
    }
  }
}

// Distributed Direct Room Helpers (Redis + In-Memory Fallback)
async function getDirectRoom(roomId) {
  if (isRedisReady && redisClient) {
    try {
      const raw = await redisClient.get(`direct_room:${roomId}`);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error(`[REDIS_GET_ROOM_ERR:${instanceId}]`, e);
    }
  }
  return directRooms.get(roomId);
}

async function setDirectRoom(roomId, data) {
  directRooms.set(roomId, data);
  if (isRedisReady && redisClient) {
    try {
      await redisClient.set(`direct_room:${roomId}`, JSON.stringify(data), 'EX', 3600);
    } catch (e) {
      console.error(`[REDIS_SET_ROOM_ERR:${instanceId}]`, e);
    }
  }
}

async function delDirectRoom(roomId) {
  directRooms.delete(roomId);
  if (isRedisReady && redisClient) {
    try {
      await redisClient.del(`direct_room:${roomId}`);
    } catch (e) {
      console.error(`[REDIS_DEL_ROOM_ERR:${instanceId}]`, e);
    }
  }
}

// Distributed Active Match Tracking (Redis + In-Memory Fallback)
async function registerActiveMatch(socketIdA, socketIdB) {
  activeMatches.set(socketIdA, socketIdB);
  activeMatches.set(socketIdB, socketIdA);
  if (isRedisReady && redisClient) {
    try {
      await Promise.all([
        redisClient.set(`active_match:${socketIdA}`, socketIdB, 'EX', 86400),
        redisClient.set(`active_match:${socketIdB}`, socketIdA, 'EX', 86400),
      ]);
    } catch (e) {
      console.error(`[REDIS_SET_MATCH_ERR:${instanceId}]`, e);
    }
  }
}

async function handleLeaveMatch(socket) {
  let partnerSocketId = activeMatches.get(socket.id);
  if (!partnerSocketId && isRedisReady && redisClient) {
    try {
      partnerSocketId = await redisClient.get(`active_match:${socket.id}`);
    } catch (e) {
      console.error(`[REDIS_GET_MATCH_ERR:${instanceId}]`, e);
    }
  }

  if (!partnerSocketId) return;

  activeMatches.delete(socket.id);
  activeMatches.delete(partnerSocketId);
  if (isRedisReady && redisClient) {
    try {
      await Promise.all([
        redisClient.del(`active_match:${socket.id}`),
        redisClient.del(`active_match:${partnerSocketId}`),
      ]);
    } catch (e) {}
  }

  const roomId = roomFor(socket.id, partnerSocketId);
  socket.leave(roomId);
  io.to(partnerSocketId).emit('left');
}

function popValidMemoryPartner(intent, currentSocketId) {
  if (!intentQueues[intent]) {
    intentQueues[intent] = [];
  }
  const queue = intentQueues[intent];

  while (queue.length > 0) {
    const candidate = queue.shift();
    if (!candidate) break;
    if (candidate.socketId === currentSocketId) continue;
    if (!candidate.peerId) continue;
    return candidate;
  }

  return null;
}

// Redis Queue Helpers
async function popValidRedisPartner(intent, currentSocketId) {
  if (!isRedisReady || !redisClient) return null;
  const queueKey = `match_queue:${intent}`;
  try {
    const len = await redisClient.llen(queueKey);
    for (let i = 0; i < len; i++) {
      const rawCandidate = await redisClient.rpop(queueKey);
      if (!rawCandidate) break;
      const candidate = JSON.parse(rawCandidate);
      if (candidate.socketId === currentSocketId) {
        continue;
      }
      return candidate;
    }
  } catch (err) {
    console.error(`[REDIS_POP_ERR:${instanceId}]`, err);
  }
  return null;
}

async function enqueueRedisUser(intent, socketId, peerId) {
  if (!isRedisReady || !redisClient) return;
  const queueKey = `match_queue:${intent}`;
  const payload = JSON.stringify({ socketId, peerId, instanceId, enqueuedAt: Date.now() });
  await redisClient.lpush(queueKey, payload);
}

// Health & Metrics Route
app.get('/', (req, res) => {
  res.send('NerdShive Socket & Matchmaking Server is running');
});

app.get('/health', async (req, res) => {
  let redisStatus = 'disabled';
  let queueSizes = {
    pair_debug: intentQueues.pair_debug?.length || 0,
    project_teammate: intentQueues.project_teammate?.length || 0,
    system_design: intentQueues.system_design?.length || 0,
    hiring: intentQueues.hiring?.length || 0,
    looking_for_job: intentQueues.looking_for_job?.length || 0,
  };

  if (isRedisReady && redisClient) {
    try {
      const [pd, pt, sd, h, l] = await Promise.all([
        redisClient.llen('match_queue:pair_debug'),
        redisClient.llen('match_queue:project_teammate'),
        redisClient.llen('match_queue:system_design'),
        redisClient.llen('match_queue:hiring'),
        redisClient.llen('match_queue:looking_for_job'),
      ]);
      redisStatus = 'connected';
      queueSizes = { pair_debug: pd, project_teammate: pt, system_design: sd, hiring: h, looking_for_job: l };
    } catch (e) {
      redisStatus = 'error';
    }
  }

  res.json({
    status: 'healthy',
    instanceId,
    uptimeSeconds: Math.floor(process.uptime()),
    activeConnections: io.engine.clientsCount,
    memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    redis: redisStatus,
    queueSizes,
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  path: '/socket.io',
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

const socketVoiceRoom = new Map();

io.on('connection', (socket) => {
  console.log(`[CONNECT:${instanceId}] socket=${socket.id} clientsCount=${io.engine.clientsCount}`);

  socket.on('join_queue', async ({ intent, peerId }) => {
    if (!intent || !peerId) {
      socket.emit('queue_error', { message: 'Invalid queue payload' });
      return;
    }

    console.log(`[JOIN_QUEUE:${instanceId}] intent=${intent} socket=${socket.id} peerId=${peerId}`);

    // Ensure queue exists for the requested intent
    if (!intentQueues[intent]) {
      intentQueues[intent] = [];
    }

    const currentQueued = queuedState.get(socket.id);
    if (currentQueued && currentQueued.intent === intent && currentQueued.peerId === peerId) {
      console.log(`[DEDUP:${instanceId}] socket=${socket.id} already queued in ${intent}`);
      socket.emit('queued', { intent, queueSize: intentQueues[intent].length });
      return;
    }

    // Purge socket from all queues before joining a new intent queue
    removeFromMemoryQueues(socket.id, `join_queue_${intent}`);
    queuedState.delete(socket.id);
    await handleLeaveMatch(socket);

    let partner = null;
    if (isRedisReady && redisClient) {
      partner = await popValidRedisPartner(intent, socket.id);
    } else {
      partner = popValidMemoryPartner(intent, socket.id);
    }

    console.log(`[POP_PARTNER:${instanceId}] intent=${intent} socket=${socket.id} found=${partner ? partner.socketId : 'null'}`);

    if (partner) {
      console.log(`[MATCH:${instanceId}] intent=${intent} ${socket.id} <-> ${partner.socketId}`);

      const roomId = roomFor(socket.id, partner.socketId);
      socket.join(roomId);
      io.in(partner.socketId).socketsJoin(roomId);

      await registerActiveMatch(socket.id, partner.socketId);
      queuedState.delete(socket.id);
      queuedState.delete(partner.socketId);

      socket.emit('match_found', { peerId: partner.peerId, roomId, isInitiator: true, intent });
      io.to(partner.socketId).emit('match_found', { peerId, roomId, isInitiator: false, intent });
    } else {
      if (isRedisReady && redisClient) {
        await enqueueRedisUser(intent, socket.id, peerId);
      } else {
        const queue = intentQueues[intent];
        if (queue) queue.push({ socketId: socket.id, peerId });
      }

      queuedState.set(socket.id, { intent, peerId });
      socket.emit('queued', { intent, queueSize: intentQueues[intent]?.length || 1 });
    }
  });

  socket.on('leave_queue', async ({ intent } = {}) => {
    console.log(`[LEAVE_QUEUE:${instanceId}] socket=${socket.id} intent=${intent}`);
    removeFromMemoryQueues(socket.id, 'leave_queue');
    queuedState.delete(socket.id);
    await handleLeaveMatch(socket);
  });

  socket.on('skip', async () => {
    console.log(`[SKIP:${instanceId}] socket=${socket.id}`);
    removeFromMemoryQueues(socket.id, 'skip');
    queuedState.delete(socket.id);
    await handleLeaveMatch(socket);
  });

  // Direct Peer-to-Peer Invite Link Support (Redis Distributed)
  socket.on('direct_room:join', async ({ roomId, peerId, intent }) => {
    if (!roomId || !peerId) return;
    console.log(`[DIRECT_ROOM_JOIN:${instanceId}] roomId=${roomId} socket=${socket.id} peerId=${peerId}`);

    removeFromMemoryQueues(socket.id, 'direct_room_join');
    queuedState.delete(socket.id);
    await handleLeaveMatch(socket);

    const existing = await getDirectRoom(roomId);
    if (existing && existing.socketId !== socket.id) {
      await delDirectRoom(roomId);
      const compositeRoomId = `direct_${roomId}`;
      socket.join(compositeRoomId);
      io.in(existing.socketId).socketsJoin(compositeRoomId);

      await registerActiveMatch(socket.id, existing.socketId);

      socket.emit('match_found', { peerId: existing.peerId, roomId: compositeRoomId, isInitiator: true, isDirect: true, intent });
      io.to(existing.socketId).emit('match_found', { peerId, roomId: compositeRoomId, isInitiator: false, isDirect: true, intent });
    } else {
      await setDirectRoom(roomId, { socketId: socket.id, peerId });
      socket.emit('direct_room:waiting', { roomId, intent });
    }
  });

  socket.on('direct_room:leave', async ({ roomId }) => {
    if (!roomId) return;
    const existing = await getDirectRoom(roomId);
    if (existing && existing.socketId === socket.id) {
      await delDirectRoom(roomId);
    }
    await handleLeaveMatch(socket);
  });

  // ==========================================
  // DISCORD-STYLE REALTIME CHANNELS & MEDIA
  // ==========================================
  socket.on('channel:join', ({ channelId, user }) => {
    if (!channelId) return;
    const roomKey = `channel:${channelId}`;
    socket.join(roomKey);
    console.log(`[CHANNEL_JOIN:${instanceId}] socket=${socket.id} room=${roomKey} user=${user?.user_name || user?.name || 'anon'}`);
  });

  socket.on('channel:leave', ({ channelId }) => {
    if (!channelId) return;
    socket.leave(`channel:${channelId}`);
  });

  socket.on('channel:message', ({ channelId, message }) => {
    if (!channelId || !message) return;
    socket.to(`channel:${channelId}`).emit('channel:message_received', { channelId, message });
  });

  socket.on('channel:typing', ({ channelId, user, isTyping }) => {
    if (!channelId) return;
    socket.to(`channel:${channelId}`).emit('channel:typing_status', { channelId, user, isTyping });
  });

  socket.on('voice:join', async ({ channelId, user }) => {
    if (!channelId || !user) return;
    const roomKey = `voice:${channelId}`;
    socket.join(roomKey);
    socketVoiceRoom.set(socket.id, { channelId, user });

    const socketsInRoom = await io.in(roomKey).fetchSockets();
    const existingPeers = [];

    for (const s of socketsInRoom) {
      if (s.id !== socket.id) {
        const peerData = socketVoiceRoom.get(s.id);
        if (peerData) {
          existingPeers.push({
            socketId: s.id,
            user: peerData.user,
          });
        }
      }
    }

    socket.emit('voice:peers_list', { peers: existingPeers });
    socket.to(roomKey).emit('voice:user_joined', {
      socketId: socket.id,
      user,
    });
    console.log(`[VOICE_JOIN:${instanceId}] socket=${socket.id} channel=${channelId} peersCount=${existingPeers.length + 1}`);
  });

  socket.on('voice:signal', ({ targetSocketId, signal, fromUser }) => {
    if (!targetSocketId || !signal) return;
    io.to(targetSocketId).emit('voice:signal', {
      fromSocketId: socket.id,
      signal,
      fromUser,
    });
  });

  socket.on('voice:speaking', ({ channelId, isSpeaking }) => {
    if (!channelId) return;
    const peerData = socketVoiceRoom.get(socket.id);
    socket.to(`voice:${channelId}`).emit('voice:speaking_status', {
      socketId: socket.id,
      userId: peerData?.user?._id || peerData?.user?.id,
      isSpeaking,
    });
  });

  socket.on('voice:media_toggle', ({ channelId, isMuted, isVideoOff, isScreenSharing }) => {
    if (!channelId) return;
    const peerData = socketVoiceRoom.get(socket.id);
    socket.to(`voice:${channelId}`).emit('voice:media_status', {
      socketId: socket.id,
      userId: peerData?.user?._id || peerData?.user?.id,
      isMuted,
      isVideoOff,
      isScreenSharing,
    });
  });

  socket.on('voice:leave', ({ channelId }) => {
    const peerData = socketVoiceRoom.get(socket.id);
    if (peerData) {
      const targetChannel = channelId || peerData.channelId;
      socket.leave(`voice:${targetChannel}`);
      socket.to(`voice:${targetChannel}`).emit('voice:user_left', {
        socketId: socket.id,
        userId: peerData.user?._id || peerData.user?.id,
      });
      socketVoiceRoom.delete(socket.id);
      console.log(`[VOICE_LEAVE:${instanceId}] socket=${socket.id} channel=${targetChannel}`);
    }
  });

  socket.on('disconnect', async () => {
    console.log(`[DISCONNECT:${instanceId}] socket=${socket.id}`);
    removeFromMemoryQueues(socket.id, 'disconnect');
    queuedState.delete(socket.id);
    await handleLeaveMatch(socket);

    const peerData = socketVoiceRoom.get(socket.id);
    if (peerData) {
      socket.to(`voice:${peerData.channelId}`).emit('voice:user_left', {
        socketId: socket.id,
        userId: peerData.user?._id || peerData.user?.id,
      });
      socketVoiceRoom.delete(socket.id);
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT} [Instance: ${instanceId}]`);
});
