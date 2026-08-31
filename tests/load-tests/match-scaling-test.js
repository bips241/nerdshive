/**
 * NerdShive Matchmaking Concurrency & Scale Simulation Test
 * Simulates N concurrent users queueing, matching, and skipping across intent pools.
 */

const { io } = require('socket.io-client');

const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL || 'http://localhost:10000';
const CONCURRENT_CLIENTS = Number(process.env.CONCURRENT_CLIENTS || 20);
const INTENTS = ['hiring', 'looking_for_job', 'project_teammate'];

async function runMatchLoadTest() {
  console.log(`=======================================================`);
  console.log(`Starting Matchmaking Scale Test on ${SOCKET_SERVER_URL}`);
  console.log(`Concurrent Clients: ${CONCURRENT_CLIENTS}`);
  console.log(`=======================================================`);

  let connectedCount = 0;
  let matchesFormed = 0;
  const startTimes = new Map();
  const matchLatencies = [];

  const clients = [];

  for (let i = 0; i < CONCURRENT_CLIENTS; i++) {
    const intent = INTENTS[i % INTENTS.length];
    const peerId = `test-peer-${i}-${Math.random().toString(36).slice(2, 7)}`;

    const socket = io(SOCKET_SERVER_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: false,
      reconnection: false,
    });

    socket.on('connect', () => {
      connectedCount++;
      startTimes.set(socket.id, Date.now());
      socket.emit('join_queue', { intent, peerId });
    });

    socket.on('match_found', ({ peerId: remotePeerId, roomId, isInitiator }) => {
      matchesFormed++;
      const startTime = startTimes.get(socket.id);
      if (startTime) {
        matchLatencies.push(Date.now() - startTime);
      }
      if (isInitiator) {
        console.log(`[MATCH] ${socket.id} paired with ${remotePeerId} in room ${roomId}`);
      }
    });

    socket.on('connect_error', (err) => {
      console.warn(`[Client ${i}] Connection error:`, err.message);
    });

    clients.push(socket);
  }

  console.log('Connecting simulated sockets...');
  clients.forEach((c) => c.connect());

  await new Promise((resolve) => setTimeout(resolve, 4000));

  console.log(`\n--- Test Results ---`);
  console.log(`Total Connected Clients: ${connectedCount} / ${CONCURRENT_CLIENTS}`);
  console.log(`Total Matches Generated: ${matchesFormed / 2} pairs`);
  if (matchLatencies.length > 0) {
    const avgLatency = matchLatencies.reduce((a, b) => a + b, 0) / matchLatencies.length;
    console.log(`Average Match Latency: ${avgLatency.toFixed(2)} ms`);
    console.log(`Min Latency: ${Math.min(...matchLatencies)} ms | Max Latency: ${Math.max(...matchLatencies)} ms`);
  } else {
    console.log(`Note: If socket server is not running locally, start it with npm start in nerdshive-socket-server.`);
  }

  // Teardown
  clients.forEach((c) => c.disconnect());
  console.log(`=======================================================\n`);
}

if (require.main === module) {
  runMatchLoadTest().catch(console.error);
}

module.exports = { runMatchLoadTest };
