/**
 * Matchmaking & Real-Time Collaboration Operations Simulator
 * Covers pair debug queues, teammate radar, WebRTC peer signaling,
 * shared code scratchpad synchronization, and session disconnection.
 */

const crypto = require('crypto');

const MATCH_MODES = [
  'pair_debug',
  'project_teammate',
  'system_design',
  'hiring',
];

async function testMatchmakingOperations(user, tracer, sharedState = {}) {
  const chosenMode = MATCH_MODES[Math.floor(Math.random() * MATCH_MODES.length)];
  const queue = sharedState.matchQueues = sharedState.matchQueues || {
    pair_debug: [],
    project_teammate: [],
    system_design: [],
    hiring: [],
  };

  // 1. Join Matchmaking Queue
  const startJoin = Date.now();
  const opJoinName = `matchmaking_queue_join_${chosenMode}`;
  try {
    const peerId = `peer_${user.id}_${crypto.randomBytes(4).toString('hex')}`;
    const userEntry = {
      userId: user.id,
      username: user.username,
      peerId,
      techStack: user.techStack,
      joinedAt: Date.now(),
    };

    queue[chosenMode].push(userEntry);

    tracer.recordOperation({
      userId: user.id,
      operation: opJoinName,
      category: 'matchmaking',
      durationMs: Date.now() - startJoin,
      success: true,
      metadata: { mode: chosenMode, peerId, queueLength: queue[chosenMode].length },
    });

    // 2. Immediate Partner Matching Check
    if (queue[chosenMode].length >= 2) {
      const startMatch = Date.now();
      const userA = queue[chosenMode].shift();
      const userB = queue[chosenMode].shift();
      const roomId = `room_${crypto.randomBytes(8).toString('hex')}`;

      // Simulate WebRTC Peer Handshake
      tracer.recordOperation({
        userId: userA.userId,
        operation: 'matchmaking_peer_handshake',
        category: 'matchmaking',
        durationMs: Date.now() - startMatch,
        success: true,
        metadata: { roomId, mode: chosenMode, partnerPeerId: userB.peerId, isInitiator: true },
      });

      tracer.recordOperation({
        userId: userB.userId,
        operation: 'matchmaking_peer_handshake',
        category: 'matchmaking',
        durationMs: Date.now() - startMatch,
        success: true,
        metadata: { roomId, mode: chosenMode, partnerPeerId: userA.peerId, isInitiator: false },
      });

      // 3. Collaborative Scratchpad Code Sync Simulation
      const startSync = Date.now();
      const codeSnippetDelta = `// Sync delta from ${userA.username}\nexport const solver = (arr: number[]) => arr.filter(x => x % 2 === 0);`;
      tracer.recordOperation({
        userId: userA.userId,
        operation: 'matchmaking_scratchpad_sync',
        category: 'matchmaking',
        durationMs: Date.now() - startSync,
        success: true,
        metadata: { roomId, deltaBytes: codeSnippetDelta.length, lang: 'typescript' },
      });
    }
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: opJoinName,
      category: 'matchmaking',
      durationMs: Date.now() - startJoin,
      success: false,
      error: err,
    });
  }

  // 4. Queue Leave / Session Disconnect (for remaining queue entries)
  if (Math.random() < 0.2 && queue[chosenMode].some((entry) => entry.userId === user.id)) {
    const startLeave = Date.now();
    try {
      queue[chosenMode] = queue[chosenMode].filter((entry) => entry.userId !== user.id);
      tracer.recordOperation({
        userId: user.id,
        operation: 'matchmaking_queue_leave',
        category: 'matchmaking',
        durationMs: Date.now() - startLeave,
        success: true,
        metadata: { mode: chosenMode },
      });
    } catch (err) {
      tracer.recordOperation({
        userId: user.id,
        operation: 'matchmaking_queue_leave',
        category: 'matchmaking',
        durationMs: Date.now() - startLeave,
        success: false,
        error: err,
      });
    }
  }
}

module.exports = { testMatchmakingOperations };
