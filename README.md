# NerdShive / DevConnect — Enterprise Developer Social & Matchmaking Platform

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2.30-black?logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-Microservices-E0234E?logo=nestjs)](https://nestjs.com/)
[![gRPC](https://img.shields.io/badge/gRPC-HTTP%2F2%20Protobuf-244c5a?logo=grpc)](https://grpc.io/)
[![Redis 7](https://img.shields.io/badge/Redis-7%20Streams%20%26%20Queues-DC382D?logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker)](https://www.docker.com/)

An enterprise-grade developer platform featuring **5-Tier Social Graph Affinity Ranking & Single-Stream Personalized Feed (Meta/LinkedIn Parity)**, **Real-Time Developer Radar (`/dashboard/radar`)**, **People You Might Know (PYMK) Discovery Engine**, **Verified Hackathon Management**, **Private Discord-Style Squad Servers (`voice:pair-hacking`)**, **Stationary Cockpit Rail with Pulse & Chat**, **Simplified Developer Post Archetypes (`media`, `hackathon_crew`, `ship_log`)**, and **Direct-to-S3 Resilient Media Streaming**.

---

## 🏛️ System Architecture

NerdShive is architected with a clean separation between the **Frontend Edge BFF (`web/`)** and the **Microservices & Real-Time Signaling Cluster (`apps/`)**:

```
                              ┌───────────────────────────────────┐
                              │     Browser / Mobile Client       │
                              └───────────────┬───────────────────┘
                                              │ HTTP / WebSockets
                                              ▼
                              ┌───────────────────────────────────┐
                              │  Next.js 14 App Router (web/)     │
                              │  - 38+ App Router Pages & Actions │
                              │  - Central RBAC Gate (rbac.ts)    │
                              │  - Stationary Cockpit Rail        │
                              └───────────────┬───────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │ Internal REST / gRPC                          │ WebSockets
                      ▼                                               ▼
      ┌───────────────────────────────┐               ┌───────────────────────────────┐
      │ NestJS Gateway (apps/gateway) │               │ Signaling (apps/signaling)    │
      └───────────────┬───────────────┘               │ Peer Relay (apps/peer-server) │
                      │                               └───────────────┬───────────────┘
      ┌───────────────┼───────────────┐                               │
      ▼               ▼               ▼                               │
┌──────────────┐┌──────────────┐┌──────────────┐                      │
│ auth-service ││media-service ││discovery-svc │                      │
└───────┬──────┘└───────┬──────┘└───────┬──────┘                      │
        │               │               │                             │
        └───────────────┼───────────────┴─────────────────────────────┘
                        │
                        ▼
         ┌───────────────────────────────┐
         │  Redis 7 Cluster & Event Bus  │
         └───────────────────────────────┘
```

---

## 📂 Enterprise Monorepo Topography

```
nerdshive/
├── nest-cli.json                    # NestJS Monorepo CLI Config (tracks apps/*)
├── package.json                     # Monorepo Workspace Config ("web", "apps/*", "libs/*")
├── tsconfig.json                    # Root Monorepo TypeScript Base Config
├── .agents/rules/workspace-rules.md # Non-Negotiable Agent & Workspace Rules
├── AGENTS.md                        # Agent Guidelines Mirror
├── GEMINI.md                        # Antigravity Rules Mirror
├── .env                             # Root Environment Variables
├── .env.example                     # Environment Blueprint
├── Dockerfile                       # Web Frontend Container (web/)
├── Dockerfile.services              # NestJS Microservices Container (apps/)
├── docker-compose.yml               # Development Orchestration Stack
├── docker-compose.prod.yml          # Production Orchestration Stack
├── README.md                        # Monorepo Documentation
├── CONTEXT.md                       # Platform Constraints & Architecture Blueprint
│
├── web/                             # 🌐 Next.js 14 Frontend & Edge BFF
│   ├── app/                         # 38+ App Router Pages & API Routes
│   │   ├── dashboard/               # Main Dashboard, Feed, Radar, Messages, Hackathons
│   │   ├── devs/docs/               # Interactive Developer Documentation
│   │   ├── register/, login/        # Authentication & OTP Verification
│   │   └── api/                     # Backend Server Handlers
│   ├── components/                  # UI Components & Design System Barrel
│   │   ├── radar/                   # RadarMatchClient, GranularFinder, ControlPanel, VettingRoom, Modals
│   │   ├── hackathons/              # HubClient, JudgingPortalModal, TeamRoomModal
│   │   ├── chat/                    # DiscordLayout, VoiceVideoStage, RealtimeChatView
│   │   └── FeedContainer.tsx        # 0ms Instant Navigation with FeedTabContext
│   ├── lib/                         # Server Actions, RBAC, WebRTC & S3 Utilities
│   ├── models/entities/             # Mongoose Domain Entities
│   └── schemas/                     # Zod Validation Schemas
│
├── apps/                            # 🚀 Backend Microservices & Gateways
│   ├── signaling-server/            # 📡 Socket.IO & Redis Matchmaker Server (:10000)
│   ├── peer-server/                 # 📹 PeerJS WebRTC Relay Server (:9000)
│   ├── api-gateway/                 # 🚪 NestJS API Gateway (:4000)
│   ├── auth-service/                # 🔐 Auth Microservice (:4001)
│   ├── media-service/               # 📦 Media & Pre-signing Service (:4002)
│   ├── match-service/               # 🎲 Matchmaking Queue Microservice (:4003)
│   └── discovery-service/           # 🔍 Skill Complement Engine (:4005)
│
├── libs/                            # 📚 Shared Backend Packages
│   ├── database/                    # Mongoose Domain Entities & Dual-Tier Models
│   ├── events/                      # Shared Redis Event Bus & Domain Events
│   ├── common/                      # Shared Utilities & Helpers
│   └── proto/                       # Protocol Buffer (gRPC) Schema Definitions
│
└── docs/                            # 📖 Authoritative Living Documentation
    ├── CORE_BUSINESS_LOGIC_SSOT.md  # Single Source of Truth & Non-Negotiable Invariants
    ├── FEATURES.md                  # Comprehensive feature & schema inventory
    ├── SYSTEM_ARCHITECTURE.md       # Production microservices & topology blueprint
    ├── INFRASTRUCTURE_ROLLOUT_AND_SCALING_BIBLE.md # Complete DevOps rollout runbook
    ├── SCHEMA_EVOLUTION_AND_COMPATIBILITY_RULES.md # Backward compatibility standard
    ├── DATA_STORAGE_AND_BACKUP_POLICY.md           # 180-Day retention & DPDP compliance
    ├── FEATURE_IDEAS.md             # Shipped catalog & next-generation roadmap
    ├── architecture/                # UML diagrams and Radar matchmaking specs
    └── agent-log/                   # Step-by-step engineering trajectory (01 - 36)
```

---

## ⚡ Quick Start & Development

```bash
# 1. Install all monorepo dependencies
npm install

# 2. Run environment secrets & integrity check
npm run env:check

# 3. Start Next.js Frontend Development Server
npm run dev

# 4. Start Signaling Server (Socket.IO + Redis Adapter)
npm run start:signaling

# 5. Start WebRTC PeerJS Relay Server
npm run start:peer
```

---

## 🧪 Enterprise CI/CD Pre-Flight Validation

NerdShive executes a 10-gate validation pipeline locally and in GitHub Actions before any deployment:

```bash
# Run composite validation pipeline (all 10 pre-flight gates)
npm run ci:validate

# Or run individual verification gates:
npm run lint           # Gate 1: ESLint syntax & code quality
npm run build          # Gate 2 & 10: Next.js production build & type checks
npm run env:check      # Gate 3: Secrets integrity audit
npm run db:seed        # Gate 4: Ephemeral database seeding
npm run test:schema    # Gate 5: Backward compatibility & collision invariance
npm run test:retention # Gate 6: Statutory 180-day retention drill
npm run test:rbac      # Gate 7: Backend-enforced RBAC bypass-proof suite
npm run test:hackathon # Gate 8: Hackathon anti-clone shield & squad isolation
npm run test:rooms     # Gate 9: Real-time WebRTC room segregation
```
