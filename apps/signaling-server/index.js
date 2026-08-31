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
  hiring: [],
  looking_for_job: [],
  project_teammate: [],
};

const activeMatches = new Map();
const queuedState = new Map();

function roomFor(a, b) {
  return [a, b].sort().join(':');
}

// Memory Queue Helpers
function removeFromMemoryQueues(socketId, reason = 'unknown') {
  Object.keys(intentQueues).forEach((intent) => {
    const queue = intentQueues[intent];
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
  });
}

function leaveMemoryMatch(socket) {
  const partnerSocketId = activeMatches.get(socket.id);
  if (!partnerSocketId) return;

  activeMatches.delete(socket.id);
  activeMatches.delete(partnerSocketId);

  const roomId = roomFor(socket.id, partnerSocketId);
  socket.leave(roomId);
  io.to(partnerSocketId).emit('left');
}

function popValidMemoryPartner(intent, currentSocketId) {
  const queue = intentQueues[intent];
  if (!queue) return null;

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
    hiring: intentQueues.hiring.length,
    looking_for_job: intentQueues.looking_for_job.length,
    project_teammate: intentQueues.project_teammate.length,
  };

  if (isRedisReady && redisClient) {
    try {
      const [h, l, p] = await Promise.all([
        redisClient.llen('match_queue:hiring'),
        redisClient.llen('match_queue:looking_for_job'),
        redisClient.llen('match_queue:project_teammate'),
      ]);
      redisStatus = 'connected';
      queueSizes = { hiring: h, looking_for_job: l, project_teammate: p };
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

io.on('connection', (socket) => {
  console.log(`[CONNECT:${instanceId}] socket=${socket.id} clientsCount=${io.engine.clientsCount}`);

  socket.on('join_queue', async ({ intent, peerId }) => {
    if (!intent || !peerId) {
      socket.emit('queue_error', { message: 'Invalid queue payload' });
      return;
    }

    console.log(`[JOIN_QUEUE:${instanceId}] intent=${intent} socket=${socket.id} peerId=${peerId}`);

    const currentQueued = queuedState.get(socket.id);
    if (currentQueued && currentQueued.intent === intent && currentQueued.peerId === peerId) {
      console.log(`[DEDUP:${instanceId}] socket=${socket.id} already queued`);
      socket.emit('queued', { intent });
      return;
    }

    removeFromMemoryQueues(socket.id, 'join_queue');
    queuedState.delete(socket.id);
    leaveMemoryMatch(socket);

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

      activeMatches.set(socket.id, partner.socketId);
      activeMatches.set(partner.socketId, socket.id);
      queuedState.delete(socket.id);
      queuedState.delete(partner.socketId);

      socket.emit('match_found', { peerId: partner.peerId, roomId, isInitiator: true });
      io.to(partner.socketId).emit('match_found', { peerId, roomId, isInitiator: false });
    } else {
      if (isRedisReady && redisClient) {
        await enqueueRedisUser(intent, socket.id, peerId);
      } else {
        const queue = intentQueues[intent];
        if (queue) queue.push({ socketId: socket.id, peerId });
      }

      queuedState.set(socket.id, { intent, peerId });
      socket.emit('queued', { intent });
    }
  });

  socket.on('skip', () => {
    console.log(`[SKIP:${instanceId}] socket=${socket.id}`);
    removeFromMemoryQueues(socket.id, 'skip');
    queuedState.delete(socket.id);
    leaveMemoryMatch(socket);
  });

  socket.on('disconnect', () => {
    console.log(`[DISCONNECT:${instanceId}] socket=${socket.id}`);
    removeFromMemoryQueues(socket.id, 'disconnect');
    queuedState.delete(socket.id);
    leaveMemoryMatch(socket);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT} [Instance: ${instanceId}]`);
});
