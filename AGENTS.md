# Nerd'sHive Agent Rules & Operating Guidelines

> **Notice**: This file defines mandatory guidelines for all AI agents working on the Nerd'sHive codebase.  
> It is mirrored from `.agents/rules/workspace-rules.md`.

---

## 1. Living Documentation & SSOT Currency
- **Never allow documentation to drift or go stale**.
- When any model, schema, route, component, or architecture changes, you **MUST** update all corresponding `.md` files immediately:
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
- Append a numbered entry to `docs/agent-log/` documenting major architectural or feature milestones.

---

## 2. Real-World Developer Journeys (Zero Toy Features)
- Every feature must represent an authentic developer workflow connected to business logic.
- Avoid toy roulette, unlinked video chats, or dead-end interactions.
- Radar (`/dashboard/radar`) connects to verified Hackathons, squad formation, private Discord server provisioning (`#general`, `voice:pair-hacking`), collaborative canvases, and persistent 1-on-1 direct messages.
- Always provide live fallbacks (e.g. registered Free Agents and recruiting Squads) when live queues are quiet.

---

## 3. Backend-Enforced Authorization (Zero Client-Only Trust)
- Client UI checks (`{isAdmin && ...}`) are only for display.
- Every Server Action, API Route, and WebSocket mutation must assert permissions via `web/lib/rbac.ts` (`canCreateHackathon`, `canManageHackathon`, `canJudgeHackathon`, `canSubmitProject`, `canManageSquad`, etc.) and return `403 Forbidden` on bypass.

---

## 4. Zero-Loss Soft Deletion & 180-Day Statutory Retention
- Never invoke `deleteOne()` or `deleteMany()` on core collections (`User`, `HackathonEvent`, `Post`, `HackathonRegistration`).
- Set `isDeleted: true` and `retentionExpiresAt = now + 180 days` (Rule 3(1)(h) of IT Rules 2021 & CERT-In Directions).

---

## 5. Post Schema Purity & Deprecation Invariants
- Active `postType` variants are strictly: `'media'`, `'hackathon_crew'`, and `'ship_log'`.
- Deprecated types (`'poll'`, `'project'`, `'goal'`, `'code_sos'`, `'architecture_rfc'`, `'tech_showdown'`) were retired in commit `003fc5e` and must **NEVER** be reintroduced.

---

## 6. Distributed State & Infrastructure Standards
- Never store matchmaking queues or active call partner state in single-process memory. Redis is the distributed state broker.
- Uploads must go direct-to-S3 via pre-signed URLs without buffering file bytes in server memory.

---

## 7. Build Integrity & Verification
- Verify all changes before completion:
  ```bash
  npm --prefix web run build
  npm run env:check
  npm run test:schema
  ```
- Ensure zero React hook violations and mark dynamic routes with `export const dynamic = 'force-dynamic'`.
