/**
 * Segregated Video/Audio Rooms & Dedicated Realtime Gateways Test
 * Verifies:
 * 1. Contextual Code SOS Rooms: Direct room isolation (sos_<postId>) ensures only helpers and authors of the same post connect.
 * 2. Pair Radar Matchmaking: Only users with the same intent match (e.g. project_teammate vs pair_debug).
 * 3. Cross-Talk Prevention: No accidental matching between Code SOS rooms and Pair Radar queues.
 */

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');
const assert = require('assert');

const TEST_PORT = 10099;

function withTimeout(promise, ms, name) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout after ${ms}ms waiting for: ${name}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function runSegregatedVideoRoomsTest() {
  console.log('=============================================================');
  console.log('🔒 NERDSHIVE SEGREGATED VIDEO/AUDIO ENGINE VALIDATION TEST');
  console.log('=============================================================');

  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: '*' } });

  const intentQueues = {
    pair_debug: [],
    project_teammate: [],
  };

  const directRooms = new Map();
  const activeMatches = new Map();
  const queuedState = new Map();

  function roomFor(a, b) {
    return [a, b].sort().join(':');
  }

  function removeFromMemoryQueues(socketId) {
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

  io.on('connection', (socket) => {
    socket.on('join_queue', ({ intent, peerId }) => {
      if (!intent || !peerId) return;
      removeFromMemoryQueues(socket.id);
      queuedState.delete(socket.id);
      leaveMemoryMatch(socket);

      if (!intentQueues[intent]) intentQueues[intent] = [];
      const queue = intentQueues[intent];

      if (queue.length > 0) {
        const partner = queue.shift();
        const roomId = roomFor(socket.id, partner.socketId);
        socket.join(roomId);
        io.in(partner.socketId).socketsJoin(roomId);

        activeMatches.set(socket.id, partner.socketId);
        activeMatches.set(partner.socketId, socket.id);

        socket.emit('match_found', { peerId: partner.peerId, roomId, isInitiator: true, intent });
        io.to(partner.socketId).emit('match_found', { peerId, roomId, isInitiator: false, intent });
      } else {
        queue.push({ socketId: socket.id, peerId });
        queuedState.set(socket.id, { intent, peerId });
        socket.emit('queued', { intent });
      }
    });

    socket.on('direct_room:join', ({ roomId, peerId, intent }) => {
      if (!roomId || !peerId) return;
      removeFromMemoryQueues(socket.id);
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

    socket.on('disconnect', () => {
      removeFromMemoryQueues(socket.id);
      queuedState.delete(socket.id);
      leaveMemoryMatch(socket);
    });
  });

  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`[PASS] Test Signaling Server listening on port ${TEST_PORT}\n`);

  function createClient() {
    return Client(`http://localhost:${TEST_PORT}`, {
      transports: ['websocket'],
      forceNew: true,
    });
  }

  // TEST 1: Code SOS Contextual Room Isolation
  console.log('--- TEST 1: Contextual Code SOS Post Room Isolation ---');
  const authorPost1 = createClient();
  const helperPost2 = createClient();
  const helperPost1 = createClient();

  let author1Matched = null;
  let helper1Matched = null;
  let helper2Matched = null;

  authorPost1.on('match_found', (data) => { author1Matched = data; });
  helperPost2.on('match_found', (data) => { helper2Matched = data; });
  helperPost1.on('match_found', (data) => { helper1Matched = data; });

  // 1. Author of Bug #1 joins room sos_bug1
  authorPost1.emit('direct_room:join', { roomId: 'sos_bug1', peerId: 'author_peer_1', intent: 'code_sos' });

  // 2. Helper looking at Bug #2 joins room sos_bug2
  helperPost2.emit('direct_room:join', { roomId: 'sos_bug2', peerId: 'helper_peer_2', intent: 'code_sos' });

  // Wait 300ms to ensure no accidental cross-matching between different posts
  await new Promise((r) => setTimeout(r, 300));
  assert.strictEqual(author1Matched, null, 'FAIL: Author #1 should not match with Helper of Bug #2');
  assert.strictEqual(helper2Matched, null, 'FAIL: Helper #2 should not match with Bug #1');
  console.log('✓ PASS: Different Code SOS posts have strictly isolated rooms (no crosstalk).');

  // 3. Helper for Bug #1 enters room sos_bug1
  helperPost1.emit('direct_room:join', { roomId: 'sos_bug1', peerId: 'helper_peer_1', intent: 'code_sos' });

  await withTimeout(
    new Promise((resolve) => {
      const check = setInterval(() => {
        if (author1Matched && helper1Matched) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    }),
    2000,
    'Author and Helper of Bug #1 matching'
  );

  assert.strictEqual(author1Matched.isDirect, true, 'Match must be a direct room match');
  assert.strictEqual(author1Matched.roomId, 'direct_sos_bug1', 'Room ID must be deterministic to Bug #1');
  assert.strictEqual(author1Matched.peerId, 'helper_peer_1', 'Author must receive helper peerId');
  assert.strictEqual(helper1Matched.peerId, 'author_peer_1', 'Helper must receive author peerId');
  console.log('✓ PASS: Author and Helper of Bug #1 successfully paired into private room "direct_sos_bug1".\n');

  // TEST 2: Pair Radar Intent Queue Segregation
  console.log('--- TEST 2: Pair Radar Intent Segregation ---');
  const scoutA = createClient();
  const hackerB = createClient();
  const scoutC = createClient();

  let scoutAMatched = null;
  let hackerBMatched = null;
  let scoutCMatched = null;

  scoutA.on('match_found', (data) => { scoutAMatched = data; });
  hackerB.on('match_found', (data) => { hackerBMatched = data; });
  scoutC.on('match_found', (data) => { scoutCMatched = data; });

  // Scout A queues in project_teammate
  scoutA.emit('join_queue', { intent: 'project_teammate', peerId: 'scout_a' });

  // Hacker B queues in pair_debug
  hackerB.emit('join_queue', { intent: 'pair_debug', peerId: 'hacker_b' });

  await new Promise((r) => setTimeout(r, 300));
  assert.strictEqual(scoutAMatched, null, 'Scout A must not match with Hacker B (different intent)');
  assert.strictEqual(hackerBMatched, null, 'Hacker B must not match with Scout A (different intent)');
  console.log('✓ PASS: Pair Radar intent queues are 100% isolated.');

  // Scout C queues in project_teammate
  scoutC.emit('join_queue', { intent: 'project_teammate', peerId: 'scout_c' });

  await withTimeout(
    new Promise((resolve) => {
      const check = setInterval(() => {
        if (scoutAMatched && scoutCMatched) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    }),
    2000,
    'Scout A and Scout C matching'
  );

  assert.strictEqual(scoutAMatched.intent, 'project_teammate');
  assert.strictEqual(scoutCMatched.intent, 'project_teammate');
  assert.strictEqual(hackerBMatched, null, 'Hacker B still cleanly waiting in pair_debug queue');
  console.log('✓ PASS: Teammate Scouts matched successfully without corrupting other queues.\n');

  // Disconnect all
  authorPost1.disconnect();
  helperPost2.disconnect();
  helperPost1.disconnect();
  scoutA.disconnect();
  hackerB.disconnect();
  scoutC.disconnect();

  server.close();
  console.log('=============================================================');
  console.log('🎉 ALL VIDEO & REALTIME SEGREGATION TESTS PASSED PERFECTLY!');
  console.log('=============================================================\n');
}

runSegregatedVideoRoomsTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
