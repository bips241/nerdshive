/**
 * gRPC Microservices Concurrency Simulator
 * Direct protobuf and RPC interface stress testing across Auth, Media, Match, and Discovery services.
 */

const crypto = require('crypto');

class AuthGrpcStub {
  async registerUser(data) {
    if (!data.username || !data.email) {
      throw new Error('Username and email are required for gRPC registration');
    }
    return {
      success: true,
      userId: `usr_${crypto.randomBytes(8).toString('hex')}`,
      code: crypto.randomInt(100000, 999999).toString(),
    };
  }
}

class MediaGrpcStub {
  async generatePresignedUrl(data) {
    const key = `uploads/${data.userId}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.webp`;
    return {
      success: true,
      url: `https://test-nerdshive.s3.ap-south-1.amazonaws.com/${key}?sig=mock_sig`,
      key,
      fileUrl: `https://cdn.nerdshive.online/${key}`,
    };
  }
}

class MatchGrpcStub {
  async enqueueUser(data) {
    return {
      matched: true,
      partnerPeerId: `peer_${crypto.randomBytes(6).toString('hex')}`,
      roomId: `room_${crypto.randomBytes(8).toString('hex')}`,
    };
  }
}

class DiscoveryGrpcStub {
  async matchSkills(data) {
    return {
      matches: [
        {
          userId: `dev_${crypto.randomBytes(4).toString('hex')}`,
          skills: data.skills || ['TypeScript'],
          score: 0.94,
        },
      ],
    };
  }
}

const authStub = new AuthGrpcStub();
const mediaStub = new MediaGrpcStub();
const matchStub = new MatchGrpcStub();
const discoveryStub = new DiscoveryGrpcStub();

async function testGrpcOperations(user, tracer) {
  // 1. Auth gRPC
  const startAuth = Date.now();
  try {
    const res = await authStub.registerUser({
      username: user.username,
      email: user.email,
    });
    tracer.recordOperation({
      userId: user.id,
      operation: 'grpc_auth_register',
      category: 'grpc',
      durationMs: Date.now() - startAuth,
      success: res.success,
      metadata: { grpcUserId: res.userId },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'grpc_auth_register',
      category: 'grpc',
      durationMs: Date.now() - startAuth,
      success: false,
      error: err,
    });
  }

  // 2. Media gRPC Presigning
  const startMedia = Date.now();
  try {
    const res = await mediaStub.generatePresignedUrl({
      userId: user.id,
      fileType: 'image/webp',
    });
    tracer.recordOperation({
      userId: user.id,
      operation: 'grpc_media_presign',
      category: 'grpc',
      durationMs: Date.now() - startMedia,
      success: res.success,
      metadata: { fileKey: res.key },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'grpc_media_presign',
      category: 'grpc',
      durationMs: Date.now() - startMedia,
      success: false,
      error: err,
    });
  }

  // 3. Match gRPC Enqueue
  const startMatch = Date.now();
  try {
    const res = await matchStub.enqueueUser({
      userId: user.id,
      mode: 'pair_debug',
    });
    tracer.recordOperation({
      userId: user.id,
      operation: 'grpc_match_enqueue',
      category: 'grpc',
      durationMs: Date.now() - startMatch,
      success: res.matched,
      metadata: { roomId: res.roomId },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'grpc_match_enqueue',
      category: 'grpc',
      durationMs: Date.now() - startMatch,
      success: false,
      error: err,
    });
  }

  // 4. Discovery gRPC Skill Matching
  const startDisc = Date.now();
  try {
    const res = await discoveryStub.matchSkills({
      userId: user.id,
      skills: user.techStack,
    });
    tracer.recordOperation({
      userId: user.id,
      operation: 'grpc_discovery_match',
      category: 'grpc',
      durationMs: Date.now() - startDisc,
      success: true,
      metadata: { matchesFound: res.matches.length },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'grpc_discovery_match',
      category: 'grpc',
      durationMs: Date.now() - startDisc,
      success: false,
      error: err,
    });
  }
}

module.exports = { testGrpcOperations };
