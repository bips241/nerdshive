/**
 * Collaboration & Teammate Operations Simulator
 * Covers collaboration requests, acceptance/rejection workflows, and team membership.
 */

const crypto = require('crypto');

async function testCollabOperations(user, tracer, sharedState = {}) {
  const usersPool = sharedState.users || [];
  if (usersPool.length < 2) return;

  // Pick a random target user to collaborate with
  const partner = usersPool[Math.floor(Math.random() * usersPool.length)];
  if (partner.id === user.id) return;

  // 1. Send Collab Request
  const startSend = Date.now();
  let requestId = `req_${crypto.randomBytes(8).toString('hex')}`;
  try {
    const collabReq = {
      id: requestId,
      senderId: user.id,
      receiverId: partner.id,
      roleProposed: user.techStack[0] || 'Fullstack Dev',
      note: 'Hey! Loved your Ship Log. Interested in collaborating for the upcoming hackathon.',
      status: 'pending',
      createdAt: new Date(),
    };

    partner.collabRequests = partner.collabRequests || [];
    partner.collabRequests.push(collabReq);

    tracer.recordOperation({
      userId: user.id,
      operation: 'collab_send_request',
      category: 'collab',
      durationMs: Date.now() - startSend,
      success: true,
      metadata: { partnerId: partner.id, requestId, role: collabReq.roleProposed },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'collab_send_request',
      category: 'collab',
      durationMs: Date.now() - startSend,
      success: false,
      error: err,
    });
  }

  // 2. Accept / Decline Received Requests (if user has any pending)
  if (user.collabRequests && user.collabRequests.length > 0) {
    const startReview = Date.now();
    const reqToReview = user.collabRequests.shift();
    const accepted = Math.random() > 0.3; // 70% acceptance rate
    const opName = accepted ? 'collab_accept_request' : 'collab_decline_request';

    try {
      reqToReview.status = accepted ? 'accepted' : 'declined';
      if (accepted) {
        user.teamMembers = user.teamMembers || [];
        user.teamMembers.push(reqToReview.senderId);
      }

      tracer.recordOperation({
        userId: user.id,
        operation: opName,
        category: 'collab',
        durationMs: Date.now() - startReview,
        success: true,
        metadata: {
          requestId: reqToReview.id,
          senderId: reqToReview.senderId,
          outcome: reqToReview.status,
        },
      });
    } catch (err) {
      tracer.recordOperation({
        userId: user.id,
        operation: opName,
        category: 'collab',
        durationMs: Date.now() - startReview,
        success: false,
        error: err,
      });
    }
  }

  // 3. List Active Team Members & Radar Status
  const startList = Date.now();
  try {
    const activeTeam = user.teamMembers || [];
    tracer.recordOperation({
      userId: user.id,
      operation: 'collab_list_team_members',
      category: 'collab',
      durationMs: Date.now() - startList,
      success: true,
      metadata: { teamSize: activeTeam.length, radarStatus: user.radarStatus },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'collab_list_team_members',
      category: 'collab',
      durationMs: Date.now() - startList,
      success: false,
      error: err,
    });
  }
}

module.exports = { testCollabOperations };
