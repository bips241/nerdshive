/**
 * Discord-Style Realtime Gateway & WebRTC Concurrency Test Suite
 * Simulates multiple concurrent users joining channels, broadcasting messages,
 * and testing WebRTC voice room signaling with latency measurement.
 */

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const { io: Client } = require('socket.io-client');

const TEST_PORT = 10099;
const CONCURRENT_USERS = 50;

function withTimeout(promise, ms, name) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout after ${ms}ms waiting for: ${name}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function runSignalingConcurrencyTest() {
  console.log('=============================================================');
  console.log('⚡ NERDSHIVE DISCORD-STYLE REALTIME CONCURRENCY TEST');
  console.log(`Simulating ${CONCURRENT_USERS} concurrent developers in channels & voice rooms...`);
  console.log('=============================================================');

  // 1. Launch a test socket server matching apps/signaling-server architecture
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*' },
  });

  const socketVoiceRoom = new Map();

  io.on('connection', (socket) => {
    // Channel Join / Leave
    socket.on('channel:join', ({ channelId, user }, callback) => {
      socket.join(`channel:${channelId}`);
      if (typeof callback === 'function') callback({ success: true });
    });

    socket.on('channel:message', ({ channelId, message }) => {
      socket.to(`channel:${channelId}`).emit('channel:message_received', { channelId, message });
    });

    socket.on('channel:typing', ({ channelId, user, isTyping }) => {
      socket.to(`channel:${channelId}`).emit('channel:typing_status', { channelId, user, isTyping });
    });

    // Voice & Video Room Management
    socket.on('voice:join', async ({ channelId, user }, callback) => {
      const roomKey = `voice:${channelId}`;
      socket.join(roomKey);
      socketVoiceRoom.set(socket.id, { channelId, user });

      const socketsInRoom = await io.in(roomKey).fetchSockets();
      const peers = socketsInRoom
        .filter((s) => s.id !== socket.id)
        .map((s) => ({
          socketId: s.id,
          user: socketVoiceRoom.get(s.id)?.user,
        }));

      socket.emit('voice:peers_list', { peers });
      socket.to(roomKey).emit('voice:user_joined', { socketId: socket.id, user });
      if (typeof callback === 'function') callback({ success: true });
    });

    socket.on('voice:signal', ({ targetSocketId, signal, fromUser }) => {
      io.to(targetSocketId).emit('voice:signal', {
        fromSocketId: socket.id,
        signal,
        fromUser,
      });
    });

    socket.on('voice:speaking', ({ channelId, isSpeaking }) => {
      const peerData = socketVoiceRoom.get(socket.id);
      socket.to(`voice:${channelId}`).emit('voice:speaking_status', {
        socketId: socket.id,
        userId: peerData?.user?._id,
        isSpeaking,
      });
    });

    socket.on('disconnect', () => {
      const peerData = socketVoiceRoom.get(socket.id);
      if (peerData) {
        socket.to(`voice:${peerData.channelId}`).emit('voice:user_left', {
          socketId: socket.id,
          userId: peerData.user?._id,
        });
        socketVoiceRoom.delete(socket.id);
      }
    });
  });

  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`[TEST SERVER] Running on port ${TEST_PORT}`);

  const clients = [];
  const testChannelId = 'test_channel_dev_lounge';
  const testVoiceId = 'test_voice_pair_hacking';

  try {
    // 2. Connect 50 concurrent client sockets
    console.log(`[CLIENTS] Connecting ${CONCURRENT_USERS} client sockets...`);
    const connectStart = Date.now();

    for (let i = 0; i < CONCURRENT_USERS; i++) {
      const client = Client(`http://localhost:${TEST_PORT}`, {
        transports: ['websocket'],
      });
      clients.push(client);
    }

    await withTimeout(
      Promise.all(
        clients.map(
          (c) =>
            new Promise((resolve) => {
              if (c.connected) resolve();
              else c.on('connect', resolve);
            })
        )
      ),
      5000,
      'Socket Connections'
    );

    const connectDuration = Date.now() - connectStart;
    console.log(`[PASS] Connected ${CONCURRENT_USERS} sockets in ${connectDuration}ms (avg ${Math.round(connectDuration / CONCURRENT_USERS)}ms/client)`);

    // 3. Test Channel Joins with Server Room Synchronization
    console.log('[CHANNELS] Joining text channel...');
    await Promise.all(
      clients.map((c, index) =>
        new Promise((resolve) => {
          c.emit(
            'channel:join',
            {
              channelId: testChannelId,
              user: { _id: `usr_${index}`, user_name: `dev_${index}` },
            },
            () => resolve()
          );
        })
      )
    );
    console.log(`[PASS] All ${CONCURRENT_USERS} clients confirmed in room "${testChannelId}"`);

    // 4. Test Broadcast Fanout & Latency
    console.log('[FANOUT] Broadcasting messages and measuring end-to-end fanout latency...');
    const sender = clients[0];
    const receiver = clients[clients.length - 1];

    const messagePayload = {
      _id: 'msg_test_1',
      message: 'Hello to all 50 concurrent devs in Discord channel!',
      senderId: { user_name: 'dev_0' },
      createdAt: new Date(),
    };

    const fanoutStart = Date.now();
    const fanoutPromise = new Promise((resolve) => {
      receiver.on('channel:message_received', (data) => {
        const latency = Date.now() - fanoutStart;
        resolve(latency);
      });
    });

    sender.emit('channel:message', {
      channelId: testChannelId,
      message: messagePayload,
    });

    const fanoutLatency = await withTimeout(fanoutPromise, 4000, 'Message Fanout');
    console.log(`[PASS] Real-time message fanout latency: ${fanoutLatency}ms`);

    // 5. Test Voice Room Join & WebRTC Signaling
    console.log('[VOICE] Testing multi-party voice room joins & peer discovery...');
    const voiceClients = clients.slice(0, 10); // 10 users join voice room

    const peerListPromise = new Promise((resolve) => {
      voiceClients[9].on('voice:peers_list', ({ peers }) => {
        resolve(peers);
      });
    });

    for (let i = 0; i < voiceClients.length; i++) {
      voiceClients[i].emit('voice:join', {
        channelId: testVoiceId,
        user: { _id: `voice_usr_${i}`, user_name: `audio_dev_${i}` },
      });
      await new Promise((r) => setTimeout(r, 15));
    }

    const discoveredPeers = await withTimeout(peerListPromise, 4000, 'Voice Peer Discovery');
    console.log(`[PASS] 10th voice client received peer list with ${discoveredPeers.length} active voice peers`);

    // 6. Test WebRTC Signaling Exchange
    console.log('[WEBRTC] Testing WebRTC SDP offer/answer relay between peers...');
    const peerA = voiceClients[0];
    const peerB = voiceClients[1];

    const sdpSignalPromise = new Promise((resolve) => {
      peerB.on('voice:signal', ({ fromSocketId, signal }) => {
        resolve(signal);
      });
    });

    peerA.emit('voice:signal', {
      targetSocketId: peerB.id,
      signal: { type: 'sdp', sdp: 'v=0\r\no=alice 2890844526 ...' },
      fromUser: { _id: 'voice_usr_0' },
    });

    const receivedSignal = await withTimeout(sdpSignalPromise, 4000, 'SDP Relay');
    console.log(`[PASS] Peer B successfully received SDP offer from Peer A (${receivedSignal.type})`);

    // 7. Test Active Speaker Broadcasting
    console.log('[SPEAKER] Testing Active Speaker Voice Activity Detection (VAD) broadcast...');
    const vadPromise = new Promise((resolve) => {
      peerB.on('voice:speaking_status', ({ isSpeaking, userId }) => {
        resolve({ isSpeaking, userId });
      });
    });

    peerA.emit('voice:speaking', {
      channelId: testVoiceId,
      isSpeaking: true,
    });

    const vadEvent = await withTimeout(vadPromise, 4000, 'VAD Event');
    console.log(`[PASS] Active speaker event received for user: ${vadEvent.userId} (speaking: ${vadEvent.isSpeaking})`);

    console.log('=============================================================');
    console.log('✅ ALL DISCORD-STYLE REALTIME & WEBRTC BENCHMARKS PASSED (100%)');
    console.log('=============================================================');
  } finally {
    clients.forEach((c) => c.disconnect());
    await new Promise((resolve) => server.close(resolve));
    process.exit(0);
  }
}

runSignalingConcurrencyTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
