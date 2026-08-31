# NerdShive Stranger Chat: Implementation + Future Scaling Plan

## 1) What we built

We implemented an Omegle-style random video chat for NerdShive with intent-based matching.

Users choose one of:
- `hiring`
- `looking_for_job`
- `project_teammate`

Then they are queued by intent, matched with another user in the same intent, and connected over WebRTC video/audio.

---

## 2) Current architecture

### Frontend (Next.js)
- Main UI route/component:
  - `app/dashboard/stranger-chat/page.tsx`
- Reusable component variant:
  - `components/VideoMatch.tsx`

### Signaling + matchmaking server
- Socket server:
  - `nerdshive-socket-server/index.js`
- Responsibilities:
  - Keep per-intent queues
  - Match users in FIFO style
  - Emit `queued`, `match_found`, `left`
  - Handle `skip` and `disconnect` cleanup

### WebRTC peer signaling server
- Peer server:
  - `peer-server/index.js`
- Deployed route behavior:
  - Effective ID endpoint: `/peerjs/peerjs/id`

---

## 3) End-to-end flow

1. User selects intent.
2. Client initializes Socket.IO + PeerJS.
3. Client creates a `peerId` and emits `join_queue`.
4. Socket server tries to pop a valid partner from the same intent queue.
5. If no partner:
   - user is enqueued
   - server emits `queued`
6. If partner exists:
   - server creates active match state for both sockets
   - emits `match_found` to both sides with peer IDs
7. Initiator calls peer; receiver answers.
8. On `skip` / `disconnect`, server removes from queue and match state, and informs partner via `left`.

---

## 4) Key implementation details and fixes applied

### A) ICE/TURN config moved to env vars
We replaced hardcoded credentials with env-based Metered TURN/STUN values.

Used env variables:
- `NEXT_PUBLIC_METERED_STUN_URL`
- `NEXT_PUBLIC_METERED_TURN_URL`
- `NEXT_PUBLIC_METERED_TURN_TCP_URL`
- `NEXT_PUBLIC_METERED_TURN_443_URL`
- `NEXT_PUBLIC_METERED_TURNS_443_TCP_URL`
- `NEXT_PUBLIC_METERED_TURN_USERNAME`
- `NEXT_PUBLIC_METERED_TURN_CREDENTIAL`

### B) PeerJS route alignment
PeerJS path mismatches were resolved by aligning client/server route behavior to deployed endpoint conventions.

### C) Queue reliability on client
- Added guarded `joinQueueIfReady()` (requires intent + connected socket + ready peerId).
- Added retry loop only while queue is not acknowledged.
- Prevented missed `queued` events by registering socket handlers early (before media setup race windows).

### D) Match connection robustness
- Added fallback outbound call logic for non-initiator when needed.
- Added peer reconnect handling on signaling disconnection.

### E) Socket matching robustness
- Used room/socket emits that are safe for distributed adapters (`io.to(...)`, `io.in(...).socketsJoin(...)`).
- Added idempotent queue handling with `queuedState` to avoid duplicate queue spam.

### F) Critical queue bug fix (important)
A stale-array-reference bug caused queue entries to disappear logically:
- `removeFromQueues` replaced arrays (`filter` + reassignment)
- `join_queue` still held old array references
- subsequent `push` went into stale arrays

Fix:
- changed queue removal to in-place mutation (`splice`) so references remain valid.

---

## 5) Current deployment assumptions

Current setup is stable under:
- single socket-server instance
- clients connecting to same socket server URL
- PeerJS server reachable at configured path

---

## 6) Future plan for multiple socket server instances

When scaling Socket.IO horizontally, in-memory queues alone are not sufficient.

## Phase 1 (Immediate multi-instance safety)
1. Enable shared Socket.IO adapter with Redis:
   - `@socket.io/redis-adapter`
   - `ioredis`
2. Keep queue/match state in Redis-backed structures (not process memory only).
3. Keep sticky sessions at load balancer if possible (recommended, not mandatory with proper shared state).

## Phase 2 (Queue/state externalization)
1. Move queue operations to Redis primitives:
   - per-intent list/sorted-set for queue
   - hash/set for queued socket metadata
2. Implement atomic match operation with Lua script or transaction pattern to avoid race conditions.
3. Add TTLs for stale socket cleanup.

## Phase 3 (Reliability + observability)
1. Add structured logs with match lifecycle IDs.
2. Add metrics:
   - queue depth by intent
   - median wait time
   - match success rate
   - call setup success/failure
3. Add dead-letter/recovery logic for partial match failures.

## Phase 4 (Operational hardening)
1. Add health/readiness endpoints for socket + peer servers.
2. Add autoscaling policies based on connection count and CPU.
3. Add alerting thresholds for:
   - no-match spikes
   - disconnect spikes
   - high queue age

---

## 7) Recommended production target architecture

- Next.js app (Vercel)
- Socket cluster (N instances) behind LB
- Redis (shared adapter + shared queue state)
- PeerJS signaling service (independent autoscaled service)
- TURN/STUN provider via env-managed secrets
- Observability stack (logs + metrics + alerts)

---

## 8) Suggested implementation checklist for scale-up

- [ ] Add Redis URL and adapter in socket service
- [ ] Move queue and match state out of process memory
- [ ] Add atomic dequeue/match operation
- [ ] Implement stale-socket TTL cleanup
- [ ] Add structured correlation IDs in logs
- [ ] Add queue/match metrics dashboard
- [ ] Run load test with 100+ concurrent users
- [ ] Validate cross-instance skip/disconnect behavior

---

## 9) Notes for maintainers

If matching ever regresses to repeated `queueSize=0` with active users:
1. Check whether queue arrays are being reassigned anywhere.
2. Verify duplicate joins are deduped idempotently.
3. Confirm `queued` handler registration order on client.
4. Confirm all instances share the same queue state backend.

This document should be updated whenever matchmaking semantics or deployment topology changes.
