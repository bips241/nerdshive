# Nerd'sHive Workspace Rules & Architectural Invariants

> **Scope**: Applicable to all autonomous AI agents, contributors, and developers working within the `nerdshive` workspace.  
> **Loading Behavior**: Discovered automatically via `.agents/rules/` and repository root `AGENTS.md` / `GEMINI.md`.

---

## 1. Documentation Currency & Living Sync Invariant (SSOT)

1. **Zero Documentation Drift**:
   - Documentation is a live, executable contract—never allow `.md` files to become stale or drift from codebase reality.
   - Whenever any domain model, schema field, route, API endpoint, or architectural pattern is created, modified, or deprecated, **all corresponding Markdown documents MUST be updated immediately within the same task**:
     - `CONTEXT.md`
     - `README.md`
     - `docs/CORE_BUSINESS_LOGIC_SSOT.md`
     - `docs/FEATURES.md`
     - `docs/SYSTEM_ARCHITECTURE.md`
     - `docs/architecture/UML.md`
     - `docs/architecture/STRANGER_CHAT_PLAN.md`
     - `docs/INFRASTRUCTURE_ROLLOUT_AND_SCALING_BIBLE.md`
     - `docs/SCHEMA_EVOLUTION_AND_COMPATIBILITY_RULES.md`
     - `docs/DATA_STORAGE_AND_BACKUP_POLICY.md`
2. **Chronological Agent Logging**:
   - Every significant architectural milestone, refactoring cycle, or major feature integration must be accompanied by a dated, numbered entry appended to `docs/agent-log/` (e.g., `33-documentation-synchronization-and-workspace-rules.md`).

---

## 2. Real-World Developer User Journeys (Zero Toy Features)

1. **Purpose-Driven Development**:
   - Never build disconnected "toy features", generic roulette chats, or dead-end interactions that leave users stranded without a real-world developer journey.
2. **Real-World Alignment Invariants**:
   - **Radar Matchmaking (`/dashboard/radar`)**:
     - **Hackathon Scout**: Must connect directly with active `HackathonEvent` records, allow pitch canvas collaboration, team code generation, squad invites (`inviteCandidateToSquadAction`), and auto-provision private squad servers.
     - **Pair Hacker**: Must connect directly with code scratchpads, GitHub repository links, and direct messaging channels (`getOrCreateDirectChatRoomAction`).
     - **Fallback**: When the live video queue is idle, immediately surface verified Free Agents and recruiting Squads (`getHackathonFreeAgentsAction`) so developers are never blocked.
3. **Cockpit Integration**:
   - Ensure the stationary right cockpit rail (`DashboardCockpitRail.tsx`) cleanly switches between Pulse, Discord squad chat, and contextual post discussions.

---

## 3. Backend-Enforced Authorization (Zero Client-Only Trust)

1. **Security at the Gateway/Action Layer**:
   - UI conditional rendering (`{isAdmin && ...}`, `{isLeader && ...}`) is purely for UX cleanliness.
   - Every backend mutation (Server Action, Route Handler, WebSocket message) **must independently assert authorization** via `web/lib/rbac.ts`:
     - `canCreateHackathon(user)`
     - `canManageHackathon(user, event)`
     - `canJudgeHackathon(user, event)`
     - `canSubmitProject(user, registration)`
     - `canManageSquad(user, registration)`
     - `canModeratePlatform(user)`
   - Unauthorized mutations must return an explicit `403 Forbidden` error.

---

## 4. Zero-Loss Soft Deletion & Statutory 180-Day Retention

1. **No Raw Deletes on Core Records**:
   - Never call `deleteOne()`, `deleteMany()`, or `findByIdAndDelete()` on core collections (`User`, `HackathonEvent`, `Post`, `HackathonRegistration`).
2. **Soft Delete Protocol**:
   - Mark records with `isDeleted: true`, `deletedAt: new Date()`, `deletedBy: userId`, and set `retentionExpiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)`.
   - In accordance with **Rule 3(1)(h) of the IT Rules 2021** and **CERT-In Directions**, retain records securely for 180 days before compliance scrubbing.
   - Public queries must filter out tombstoned items using `{ isDeleted: { $ne: true } }`.

---

## 5. Post Schema Purity & Deprecation Invariants

1. **Strictly 3 Active Post Archetypes**:
   - The Mongoose `Post` schema supports exclusively 3 active `postType` variants:
     - `'media'`: Rich developer screenshots, diagrams, and video demos with code captions.
     - `'hackathon_crew'`: Squad recruitment calls with track, roles needed/have, commitment level, and private server auto-provisioning.
     - `'ship_log'`: Product launch and shipping updates with live demo URL, GitHub repo, tech stack, and changelog.
2. **No Resurrection of Deprecated Types**:
   - Deprecated post types (`'poll'`, `'project'`, `'goal'`, `'code_sos'`, `'architecture_rfc'`, `'tech_showdown'`) were retired in commit `003fc5e`.
   - **Never resurrect or reintroduce these deprecated types or their form tabs.**

---

## 6. Distributed State & Scalability Constraints

1. **Stateless App Nodes**:
   - Never store matchmaking queues, active call partner mappings, or room state exclusively in single-process Node.js memory.
   - Redis (`@socket.io/redis-adapter`, Redis Streams, Sorted Sets, and Hashes) is the distributed state broker.
2. **Direct-to-Storage Media Pipeline**:
   - Media uploads must never stream raw binary file bodies through Next.js server memory.
   - Use pre-signed PUT URLs direct to AWS S3 (`web/lib/s3-uploader.ts`).

---

## 7. Build Integrity & Verification Standards

1. **Pre-Commit / Pre-Flight Verification**:
   - Before completing any task, run:
     - `npm --prefix web run build`: Verify Next.js routes, TypeScript compilation, and React hook integrity.
     - `npm run env:check`: Verify environment secrets and variables.
     - `npm run test:schema`: Verify Mongoose schema backward compatibility.
2. **No Broken React Hooks or SSR Crashes**:
   - Never call React hooks dynamically inside loops or child mapping callbacks.
   - Pages requiring dynamic request headers or auth session verification must declare `export const dynamic = 'force-dynamic'` to prevent `DYNAMIC_SERVER_USAGE` build failures.
