# Context.md — DevConnect Platform Rebuild & Scale-Out Brief

> **Read this whole file before touching code.** This is the operating brief for
> any AI coding agent (Claude Code, etc.) working on this repo. It defines the
> mission, the order of operations, and the acceptance bar for each phase.
> Update this file as you go — it is the living source of truth, not a one-time
> plan.

---

## 0. Mission

We run a Next.js social platform for developers/students to:
- Build profiles and showcase skills
- Discover people with **complementary skillsets** (hackathon teammate matching)
- Collaborate (projects, groups, messaging)
- Meet new people via a **random-match, swipe/scroll-style video chat**
  ("Omegle for devs")

The platform currently works but **breaks under load**, especially media
upload and chat/video. The end goal (Priority 1, see §5) is a full
re-architecture that can scale to **millions of users** while preserving
100% of existing functionality and the current design language / UI/UX.

**Non-negotiables for every phase:**
1. No feature regressions — anything live today must still work after any change.
2. No visual/UX drift unless explicitly asked — this is a re-platform, not a redesign.
3. Every phase ends with a written diff report (what changed, what was measured, what's next) appended to `/docs/agent-log/`.
4. Do not guess at scale numbers — instrument first, then optimize.

---

## 1. Phase 1 — Feature & Codebase Discovery (do this first, always)

Goal: produce `/docs/FEATURES.md` — a complete, honest inventory of what the
product actually does today, straight from the code (not from memory or
assumptions).

### 1.1 How to discover
- Crawl `app/` or `pages/` routes → list every page + API route with its purpose.
- Crawl `prisma/schema.prisma` or equivalent → list every model/table and infer
  the feature it backs (e.g. `Match`, `SwipeEvent`, `HackathonTeam`, `ChatRoom`,
  `MediaAsset`).
- Grep for third-party SDKs (WebRTC lib, socket.io, Pusher/Ably, S3/Cloudinary,
  Stripe, auth provider) — each one usually maps to a distinct feature/service.
- Check `middleware.ts`, auth config, and any rate-limiting code — note what's
  actually enforced vs. what's missing.
- List all environment variables in `.env.example` — each often reveals an
  integration/feature not obvious from routes alone.
- Check for feature flags / unused-but-scaffolded routes ("half-built"
  features) — note them separately as "in progress" not "shipped."

### 1.2 Output format for `/docs/FEATURES.md`
For each feature: **Name | User-facing description | Key files/routes |
Data models touched | External services used | Known issues/limitations
observed in code (TODOs, try/catch swallow-alls, missing indexes, etc.)**

Group into: Core (profile/auth/discovery), Collaboration (teams/projects/
messaging), Random-match video chat, Media/uploads, Notifications, Anything
gamification-adjacent already present, Admin/moderation tooling (or lack
thereof).

---

## 2. Phase 2 — Scalability Architecture Targets

Goal: define the non-functional bar every service must hit, *before* deciding
on NestJS/microservices vs. incremental hardening. This section is the
checklist Phase 5 must satisfy.

### 2.1 Baseline principles
- **Stateless app servers.** No in-memory session/socket state that isn't
  reconstructible from Redis/DB. This is what lets you run N replicas behind
  a load balancer.
- **Everything slow goes into a queue.** Media processing, notification
  fan-out, matchmaking computation — never block a request/socket thread on
  these.
- **Read/write separation early.** Read replicas for feed/discovery queries;
  primary only for writes.
- **Cache aggressively, invalidate deliberately.** Redis for hot profile
  data, match candidate pools, rate-limit counters, presence.
- **Idempotency everywhere writes can retry** (uploads, payment-like flows,
  swipe/match events) — use idempotency keys to survive client retries under
  load.
- **Backpressure over collapse.** Every queue/socket layer needs an explicit
  "shed load" behavior (429s, queue depth caps, circuit breakers) instead of
  falling over silently — this is almost certainly *why* uploads/chat "doom"
  today (see §3).

### 2.2 Concrete targets to design against
| Concern | Target |
|---|---|
| Concurrent WebSocket/video sessions per node | Must scale horizontally — no single node should be a hard ceiling |
| Media upload | Must never touch app-server disk/memory for the file body |
| Matchmaking latency | Sub-second candidate lookup at 100k+ concurrent "searching" users |
| DB writes | Partition-friendly schema (avoid hot single-row counters, avoid unbounded fan-out tables) |
| Deploys | Zero-downtime, per-service |
| Observability | Every service emits metrics + traces from day one (not bolted on later) |

Document the chosen numbers (QPS, concurrent users, p99 latency) once real
traffic/logs exist — don't invent them.

---

## 3. Phase 3 — Fix What's Actively Breaking (Media Upload + Chat)

This is urgent and can start in parallel with Phase 1/2 as a hardening pass on
the *current* Next.js app, independent of the eventual rewrite.

### 3.1 Diagnose first
Before fixing anything, the agent must instrument and answer:
- Does upload go **through the Next.js server** (API route buffering the file)
  or **direct-to-storage** (pre-signed URL)? — if it's the former, this is the
  #1 root cause of "dies after a few successful attempts" (server
  memory/file-descriptor exhaustion, no backpressure).
- Is there a file size/type/rate limit enforced server-side, or only client-side
  (trivially bypassed, and the real cause of resource exhaustion)?
- For chat/video: is signaling handled by a single long-lived process with
  in-memory room state? That caps concurrency to one node and dies on
  restart/deploy.
- Is there any media processing (thumbnailing, transcoding, virus/NSFW scan)
  happening synchronously in the request path?
- Are sockets reconnect-safe, or does a dropped connection orphan
  matchmaking/room state forever (slow memory leak → crash after N sessions)?

### 3.2 Hardening checklist (apply regardless of eventual rewrite)
- [ ] **Direct-to-storage uploads.** Pre-signed URLs (S3/R2/GCS) or resumable
  protocol (tus.io) — app server only issues the URL, never touches bytes.
- [ ] **Chunked/resumable uploads** for large media so a flaky connection
  doesn't force a full re-upload or leave partial garbage.
- [ ] **Server-side validation on the object after upload** (via
  storage-trigger/webhook), not trust-the-client: real MIME sniffing, size
  cap, malware/NSFW scan queued asynchronously, reject+delete on fail.
- [ ] **All post-upload processing (thumbnails, transcode, moderation) goes
  through a queue** (BullMQ/SQS) with retry + dead-letter handling, not inline.
- [ ] **CDN in front of all served media** — never serve original files
  straight from app servers or unfronted storage.
- [ ] **Per-user + per-IP rate limits** on upload and match-search endpoints
  (Redis token bucket), returning explicit 429s instead of degrading.
- [ ] **WebRTC signaling servers must be stateless**, with room/presence state
  in Redis (pub/sub or Redis Streams) so any node can serve any room and a
  node restart doesn't kill live sessions.
- [ ] **SFU, not mesh, for group video** if any room has >2 participants
  (mediasoup / LiveKit / Janus) — peer-to-peer mesh is a common silent
  scalability killer past 3-4 participants.
- [ ] **TURN server capacity planned explicitly** — a large % of real-world
  users are behind NATs that require relay, and this is a classic
  "works in testing, dies in production" gap.
- [ ] **Cleanup jobs** for orphaned uploads, abandoned matchmaking sessions,
  and stale presence keys (TTLs everywhere, nothing lives forever by default).
- [ ] **Load test uploads and video-match flow specifically** before calling
  this phase done — "a few successful attempts then doom" is almost always
  reproducible with a simple concurrent-request script; don't ship a fix
  without reproducing the failure first and confirming it's gone after.

Apply this same audit lens to **any other feature that streams, fans out, or
holds long-lived connections** — direct messaging, live notifications,
presence indicators — the failure mode described for media/chat is a pattern,
not a one-off bug.

---

## 4. Phase 4 — Creative Feature Research

Goal: produce `/docs/FEATURE_IDEAS.md`, sourced from real research (GitHub
trending repos/topics, competitor products, dev-community discussion), not
invented from nothing. Roll features out **one at a time**, each behind a
flag, each measured before the next ships.

### 4.1 Research protocol
- Search GitHub topics like `hackathon-platform`, `developer-matching`,
  `random-video-chat`, `gamification`, `dev-community` for active/starred
  repos; note patterns worth stealing (not code to copy, just concepts).
- Look at how similar products (hackathon-team-finder tools, dev-social
  platforms, Duolingo/GitHub-style gamification) hook engagement.
- For each idea, capture: **what it is, why it'd help retention/growth for
  *this* audience specifically (devs/students/hackathon-goers), rough build
  cost, dependency on Phase 5 architecture or not.**

### 4.2 Starter idea categories to seed research (validate, don't assume)
- **Gamification:** contribution streaks, skill-verified badges (e.g. via
  connected GitHub stats), hackathon leaderboards, XP for helping others
  (answering, reviewing, teaming up).
- **Trust/quality signals:** peer-endorsed skills, verified GitHub/LinkedIn,
  "good teammate" ratings post-hackathon.
- **Discovery improvements:** skill-complement matching (not just similarity —
  actively surfacing people who *fill gaps* in a team), hackathon-specific
  team-formation rooms with countdown urgency.
- **Random-chat differentiation from generic Omegle clones:** topic/skill-
  filtered matching instead of pure random, "pair programming roulette,"
  optional screen-share for live collab, post-chat "connect as teammates"
  CTA.
- **Community:** project showcases with upvoting, "looking for teammates"
  boards, integration with real hackathon calendars/APIs.

Ship order should be decided by: lowest build cost × highest expected
retention impact, and whichever features **don't require Phase 5 to be done
first** should go first so users see momentum during the rewrite.

---

## 5. Phase 5 (TOP PRIORITY) — Scalable Reimplementation

Goal: re-platform the app to comfortably handle millions of users, **reusing
all existing business logic**, preserving the current design language and
UI/UX pixel-for-pixel unless a change is explicitly requested.

### 5.1 Target architecture
**Recommendation: NestJS-based microservices for the backend, Next.js
retained as the frontend/BFF layer.** Rationale: Nest gives you
DI/modularity close to what a Node/TS team can actually operate reliably
(vs. hand-rolled microservices), has first-class support for gRPC, message
queues (Kafka/RabbitMQ/Redis), and WebSockets gateways — all of which this
product needs simultaneously.

**Proposed service boundaries** (adjust based on Phase 1 findings —
don't force a boundary the real feature set doesn't support):

| Service | Responsibility | Notes |
|---|---|---|
| `gateway` (Next.js) | SSR/UI, BFF, auth session handling, calls backend services | Keep existing design system/components untouched |
| `auth-service` | Signup/login, tokens, session, OAuth | |
| `profile-service` | Profiles, skills, portfolio/GitHub integration | |
| `discovery-service` | Skill-complement matching, hackathon team-finder, feed ranking | Heavy read + cache use |
| `match-service` (random chat) | Matchmaking queue, presence, pairing logic | Redis-backed queue, stateless nodes |
| `signaling-service` | WebRTC signaling/rooms | Stateless, Redis pub/sub for room state, SFU integration (mediasoup/LiveKit) |
| `chat-service` | Persistent DMs/group chat | WebSocket gateway + Redis adapter for multi-node fanout |
| `media-service` | Upload URL issuance, post-upload processing orchestration | Queue-driven, talks to S3/R2 + CDN |
| `notification-service` | Push/email/in-app notifications | Event-driven off a message bus |
| `gamification-service` | XP, badges, leaderboards | Split out once Phase 4 features land, not before |
| Shared: `event-bus` | Kafka or Redis Streams | Cross-service events (user.created, match.made, hackathon.started, etc.) |

### 5.2 Cross-cutting infra decisions to make explicit (research + document, don't assume defaults)
- API layer between gateway and services: REST vs gRPC (gRPC preferred for
  internal service-to-service calls; REST/GraphQL at the edge if needed).
- Database-per-service vs. shared DB with clear schema ownership — pick based
  on actual coupling found in Phase 1, don't default to "microservices always
  means separate DBs" if it creates painful cross-service joins for core
  discovery queries.
- Deployment target: Kubernetes (most flexible, most ops overhead) vs. a
  managed container platform — pick based on team size/ops capacity, not
  resume-driven development.
- Autoscaling policy per service (video/signaling and media will scale very
  differently from auth/profile).

### 5.3 Migration approach (strangler pattern, not big-bang)
1. Stand up the event bus + `auth-service` first; keep Next.js API routes as
   a thin proxy to it. Ship this with zero user-visible change.
2. Peel off `media-service` next — it's both the most broken (§3) and the
   most isolated, so it validates the new pattern cheaply.
3. Then `signaling-service`/`match-service` — highest scalability risk, so
   don't leave it for last.
4. Then `discovery-service`, `chat-service`, `notification-service`.
5. `gamification-service` only after Phase 4 features are validated and worth
   isolating.
6. At every step: existing Next.js pages/components call the new service
   through the same internal API shape they used before — **UI code changes
   should be near-zero**, only the data-fetching layer's target changes.
7. Each cutover ships behind a flag with an instant rollback path, and old
   code isn't deleted until the new path has run in production error-free for
   an agreed soak period.

### 5.4 Definition of done for Phase 5
- Load test proving horizontal scaling actually works (add a node, capacity
  goes up proportionally) for match-service, signaling-service, and
  media-service specifically — these were the original failure points.
- No feature from `/docs/FEATURES.md` (Phase 1) is missing or behaviorally
  different post-migration.
- Visual regression check against current UI (screenshot diff or manual
  pass) shows no unintended changes.
- `/docs/agent-log/` has a dated entry per service cutover with before/after
  metrics.

---

## 6. Working Agreement for the Agent

- Always update `/docs/FEATURES.md` and `/docs/FEATURE_IDEAS.md` as living
  documents — don't let this context.md go stale either.
- Prefer measuring over guessing at every phase — instrument before you
  optimize, reproduce a bug before you claim to have fixed it.
- Flag any point where a decision needs human input (e.g. hosting budget,
  team size, expected launch traffic) rather than silently picking a default.
- Ship in the smallest safe increments possible, especially in Phase 5 —
  this is a live product, not a greenfield rewrite.

---

## 7. Current Platform State, Infrastructure Bible & Enterprise CI/CD Pipeline (2026-09-07)

The platform is fully specified, hardened, and equipped with a complete infrastructure and CI/CD operations standard:

1. **Infrastructure Rollout & Scaling Bible**:
   - Living standard documented in [`docs/INFRASTRUCTURE_ROLLOUT_AND_SCALING_BIBLE.md`](docs/INFRASTRUCTURE_ROLLOUT_AND_SCALING_BIBLE.md).
   - 10 comprehensive chapters covering: Hybrid Edge Topology (Cloudflare -> Oracle Ampere A1 -> Atlas M0 -> S3 Mumbai), solving Render free-tier cold starts, OCI turnkey setup, edge CDN caching rules, microservices scaling triggers, 4-phase scale-up roadmap (0 to 10M MAU), operational maintenance runbooks, `package.json` scripts manual, and master credentials guide.

2. **Enterprise GitHub Actions CI/CD Pipeline**:
   - Implemented in [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml).
   - 10 minute pre-flight validation gates running against ephemeral Redis 7 and Mongo 7 containers:
     - Gate 1: ESLint syntax & quality (`npm run lint`).
     - Gate 2: Strict Monorepo TypeScript (`tsc --noEmit`).
     - Gate 3: Secrets & Environment Integrity Audit (`npm run env:check`).
     - Gate 4: Ephemeral Database Seeding (`npm run db:seed`).
     - Gate 5: Entity Backward Compatibility & Collision Invariance (`npm run test:schema`).
     - Gate 6: Statutory 180-Day Data Retention Drill (`npm run test:retention`).
     - Gate 7: Backend-Enforced RBAC Bypass-Proof Suite (`npm run test:rbac`).
     - Gate 8: Hackathon Anti-Clone Shield & Squad Isolation (`npm run test:hackathon`).
     - Gate 9: Real-Time WebRTC Room Segregation (`npm run test:rooms`).
     - Gate 10: Next.js Production Build Optimization (`npm run build`).
   - Container Image Verification (Docker Buildx).
   - Zero-Downtime Rolling Deployment via SSH (`appleboy/ssh-action`) to Oracle Always Free VM with atomic git sync, rolling container restart, graceful Nginx reload, automated HTTP smoke probing, and automated rollback if probes fail.

3. **Composite Developer Verification**:
   - Single command runs all 10 gates locally before pushing: `npm run ci:validate`.

---

## 8. Living Platform Architecture & Recent Milestones (2026-09-08)

### 8.1 Simplified Developer Post Model
- In commit `003fc5e`, the post model was refactored and consolidated from 7 experimental types into **3 focused, production-grade archetypes**:
  1. `media`: High-resolution developer screenshots, system architecture diagrams, and video demos with code captions.
  2. `hackathon_crew`: Squad recruitment calls with target track, roles needed/have, commitment level, and private server auto-provisioning.
  3. `ship_log`: Dev product launch logs with demo URL, repo URL, tech stack badges, and version changelogs.
- Deprecated types (`poll`, `project`, `goal`, `code_sos`, `architecture_rfc`, `tech_showdown`) were completely excised from UI creation forms and active schemas.

### 8.2 Complete Retirement of Legacy Firebase
- In commit `711504a`, all legacy Firebase Firestore dependencies, listeners, and mock wrappers (`fireChat.tsx`, `chatList.tsx`, `firebase.ts`) were permanently purged.
- Direct messaging and squad chat are 100% powered by native **Socket.IO + MongoDB Atlas (`ChatRoom`, `Message`) + Redis pub/sub adapter**.

### 8.3 Stationary Cockpit Rail & 0ms Feed Navigation
- **Stationary Cockpit Rail (`DashboardCockpitRail.tsx`)**: The main feed scrolls independently while the right rail remains stationary, offering switchable modes: ⚡ Pulse, 💬 Discord & Squad Chat, and 💭 Active Post Discussion.
- **0ms Instant Feed Switching**: Powered by `FeedTabContext` and `FeedItemWrapper` in `FeedContainer.tsx`, guaranteeing zero React hook execution errors and instant category filtering.

### 8.4 Verified Hackathon Ecosystem & Squad Server Provisioning
- **Anti-Clone Shield**: Unique slug indexing and backend validation on `HackathonEvent`.
- **Private Squad Server Auto-Provisioning**: Creating or joining a hackathon squad automatically provisions a private Discord server with `#general`, `#resources`, and `voice:pair-hacking`.
- **Official Judging Desk & Multi-Round Advancement**: Appointed judges score deliverables (0–10) across custom rubric criteria, with organizers broadcasting qualifying teams stage by stage.

### 8.5 Nerd'sHive Radar: Teammate Discovery & Recruitment Command Center
- **Enterprise Organization & Universal Discovery**:
  - Filter across all organization types: **Companies** (`company`), **Universities** (`university`), **DAOs / Web3 Collectives** (`dao`), and **Independent Developers** (`independent`).
  - Search by specific tech firm (Google, Meta, Microsoft, Amazon), university (MIT, Stanford, IIT Bombay), or Web3 foundation.
  - Granular **Career Experience Level**: `student`, `entry` (0-2y), `mid` (2-5y), `senior` (5+y), `lead` (Tech Lead / Architect), `founder`.
  - Filter by **Years of Experience** and **Location / Timezone**.
- **Verified Competitive Performance Track Record (Proprietary MOAT)**:
  - Hardened database tracking of competitive milestones:
    - `hackathonsAttendedCount`: Total verified platform events entered.
    - `hackathonsWonCount`: Hackathon championship 1st place wins.
    - `hackathonPodiumsCount`: Top 3 podium finishes.
    - `reputationScore`: Proprietary competitive score aggregating hackathon victories, debug karma, and accepted problem solutions.
  - Dedicated **"🏆 Winners Track Record"** filter toggle to instantly surface battle-tested tournament champions.
- **Registration Status Segmentation**:
  - `registered_free_agents`: Signed up as solo hackers looking for a squad for the selected hackathon.
  - `unregistered_community`: High-karma and verified champion platform developers not yet registered, to discover and invite.
  - `recruiting_squads`: Active squads looking for specific roles and skills.
- **Dual-Sided Recruitment Control Panel**:
  - Availability & Occupancy toggles: `acceptingRequests` (ON/OFF) and `occupancyStatus` ('open' vs 'occupied').
  - Received Requests cockpit with real-time deadline countdowns (24h, 48h, 72h), Accept / Decline / Schedule Meeting buttons.
  - Sent Requests cockpit with status tracking (`pending`, `accepted`, `rejected`, `expired`, `withdrawn`).
  - Scheduled Meetings calendar with 1-click launch into isolated Radar Vetting Rooms.
- **Automated Lifecycle State Machine**:
  - **On Approval / Acceptance**: Candidate is automatically added to `HackathonRegistration.members` AND enrolled into the private squad Discord server (`Server.members` with `#general`, `#resources`, and `voice:pair-hacking`). Marked `occupancyStatus = 'occupied'`. Auto-closes squad recruitment if capacity reached.
  - **On Rejection**: Automatically sets `status = 'rejected'`, notifies candidate, and clears candidate from the active review queue.
- **Live Radar Vetting Room**: Isolated P2P WebRTC audio/video call with side-by-side Candidate Proof-of-Work Matrix vs Squad Dossier, and 1-click **"⚡ Approve & Add to Core Squad"** action.

### 8.6 Workspace Rules & Living Documentation Contract
- Non-negotiable workspace rules established in `.agents/rules/workspace-rules.md`, `AGENTS.md`, and `GEMINI.md`.
- Living sync invariant: All `.md` documents must be updated in tandem with any code or schema evolution.