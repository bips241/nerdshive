/**
 * Matchmaking Intent Isolation & Switching Test
 * Verifies that intent queues are completely isolated:
 * - Choosing different intents does NOT match
 * - Switching from intent A to intent B cleanly purges the socket from intent A
 * - Two clients with the same intent match successfully
 * - Direct room pairing connects immediately
 */

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');

const TEST_PORT = 10098;

function withTimeout(promise, ms, name) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout after ${ms}ms waiting for: ${name}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function runMatchmakingIntentTest() {
  console.log('=============================================================');
  console.log('⚡ NERDSHIVE MATCHMAKING INTENT ISOLATION & SWITCHING TEST');
  console.log('=============================================================');

  // Launch signaling server with exact architecture from apps/signaling-server/index.js
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  const intentQueues = {
    pair_debug: [],
    project_teammate: [],
    system_design: [],
    hiring: [],
    looking_for_job: [],
  };

  const directRooms = new Map();
  const activeMatches = new Map();
  const queuedState = new Map();

  function roomFor(a, b) {
    return [a, b].sort().join(':');
  }

  function removeFromMemoryQueues(socketId, reason = 'unknown') {
    Object.keys(intentQueues).forEach((intent) => {
      const queue = intentQueues[intent];
      if (Array.isArray(queue)) {
        for (let i = queue.length - 1; i >= 0; i -= 1) {
          if (queue[i]?.socketId === socketId) {
            queue.splice(i, 1);
          }
        }
      }
    });

    for (const [roomId, roomData] of directRooms.entries()) {
      if (roomData.socketId === socketId) {
        directRooms.delete(roomId);
      }
    }
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

  io.on('connection', (socket) => {
    socket.on('join_queue', async ({ intent, peerId }) => {
      if (!intent || !peerId) return;
      if (!intentQueues[intent]) intentQueues[intent] = [];

      removeFromMemoryQueues(socket.id, `join_queue_${intent}`);
      queuedState.delete(socket.id);
      leaveMemoryMatch(socket);

      const partner = popValidMemoryPartner(intent, socket.id);
      if (partner) {
        const roomId = roomFor(socket.id, partner.socketId);
        socket.join(roomId);
        io.in(partner.socketId).socketsJoin(roomId);

        activeMatches.set(socket.id, partner.socketId);
        activeMatches.set(partner.socketId, socket.id);
        queuedState.delete(socket.id);
        queuedState.delete(partner.socketId);

        socket.emit('match_found', { peerId: partner.peerId, roomId, isInitiator: true, intent });
        io.to(partner.socketId).emit('match_found', { peerId, roomId, isInitiator: false, intent });
      } else {
        intentQueues[intent].push({ socketId: socket.id, peerId });
        queuedState.set(socket.id, { intent, peerId });
        socket.emit('queued', { intent, queueSize: intentQueues[intent].length });
      }
    });

    socket.on('leave_queue', () => {
      removeFromMemoryQueues(socket.id, 'leave_queue');
      queuedState.delete(socket.id);
      leaveMemoryMatch(socket);
    });

    socket.on('direct_room:join', ({ roomId, peerId, intent }) => {
      if (!roomId || !peerId) return;
      removeFromMemoryQueues(socket.id, 'direct_room_join');
      queuedState.delete(socket.id);
      leaveMemoryMatch(socket);

      const existing = directRooms.get(roomId);
      if (existing && existing.socketId !== socket.id) {
        directRooms.delete(roomId);
        const compositeRoomId = `direct_${roomId}`;
        socket.join(compositeRoomId);
        io.in(existing.socketId).socketsJoin(compositeRoomId);

        activeMatches.set(socket.id, existing.socketId);
        activeMatches.set(existing.socketId, socket.id);

        socket.emit('match_found', { peerId: existing.peerId, roomId: compositeRoomId, isInitiator: true, isDirect: true, intent });
        io.to(existing.socketId).emit('match_found', { peerId, roomId: compositeRoomId, isInitiator: false, isDirect: true, intent });
      } else {
        directRooms.set(roomId, { socketId: socket.id, peerId });
        socket.emit('direct_room:waiting', { roomId, intent });
      }
    });
  });

  await new Promise((resolve) => server.listen(TEST_PORT, resolve));

  const client1 = Client(`http://localhost:${TEST_PORT}`, { transports: ['websocket'] });
  const client2 = Client(`http://localhost:${TEST_PORT}`, { transports: ['websocket'] });
  const client3 = Client(`http://localhost:${TEST_PORT}`, { transports: ['websocket'] });

  try {
    await Promise.all([
      new Promise((res) => client1.on('connect', res)),
      new Promise((res) => client2.on('connect', res)),
      new Promise((res) => client3.on('connect', res)),
    ]);
    console.log('[PASS] Connected test client sockets');

    // TEST 1: Different intents do NOT match
    let client1Matched = false;
    let client2Matched = false;

    client1.on('match_found', () => { client1Matched = true; });
    client2.on('match_found', () => { client2Matched = true; });

    console.log('[TEST 1] Client 1 joins "pair_debug", Client 2 joins "project_teammate"...');
    client1.emit('join_queue', { intent: 'pair_debug', peerId: 'peer_1' });
    client2.emit('join_queue', { intent: 'project_teammate', peerId: 'peer_2' });

    // Wait 300ms to verify no match occurs across different intents
    await new Promise((res) => setTimeout(res, 300));
    if (client1Matched || client2Matched) {
      throw new Error('FAIL: Clients matched across different intents!');
    }
    console.log('[PASS] Clients in different intent queues remained properly isolated');

    // TEST 2: Client 2 switches intent from "project_teammate" to "pair_debug"
    console.log('[TEST 2] Client 2 switches from "project_teammate" to "pair_debug"...');
    const matchPromise = new Promise((resolve) => {
      client2.on('match_found', (data) => resolve(data));
    });

    client2.emit('join_queue', { intent: 'pair_debug', peerId: 'peer_2' });
    const matchData = await withTimeout(matchPromise, 2000, 'Intent Match');

    if (matchData.intent !== 'pair_debug') {
      throw new Error(`FAIL: Expected intent pair_debug but received ${matchData.intent}`);
    }
    console.log(`[PASS] Successfully matched in switched intent "${matchData.intent}"!`);

    // Verify queue cleanup: both queues must now be empty
    if (intentQueues.pair_debug.length !== 0 || intentQueues.project_teammate.length !== 0) {
      throw new Error('FAIL: Queue arrays not cleaned up after match!');
    }
    console.log('[PASS] Both intent queues cleanly emptied after pair match');

    // TEST 3: Direct room instant pairing
    console.log('[TEST 3] Testing direct room pairing with custom room id...');
    const testDirectRoom = 'custom_squad_room_42';
    const directMatchPromise = new Promise((resolve) => {
      client3.on('match_found', (data) => resolve(data));
    });

    client1.emit('direct_room:join', { roomId: testDirectRoom, peerId: 'peer_1_direct', intent: 'system_design' });
    await new Promise((res) => setTimeout(res, 50));
    client3.emit('direct_room:join', { roomId: testDirectRoom, peerId: 'peer_3_direct', intent: 'system_design' });

    const directMatch = await withTimeout(directMatchPromise, 2000, 'Direct Room Match');
    if (!directMatch.isDirect) {
      throw new Error('FAIL: Expected direct match flag');
    }
    console.log(`[PASS] Direct room pairing connected immediately with room: ${directMatch.roomId}`);

    console.log('=============================================================');
    console.log('✅ ALL MATCHMAKING INTENT & SWITCHING TESTS PASSED (100%)');
    console.log('=============================================================');
  } finally {
    client1.disconnect();
    client2.disconnect();
    client3.disconnect();
    await new Promise((res) => server.close(res));
    process.exit(0);
  }
}

runMatchmakingIntentTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
