# NerdShive / DevConnect — Enterprise Developer Social & Matchmaking Platform

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2.30-black?logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-Microservices-E0234E?logo=nestjs)](https://nestjs.com/)
[![gRPC](https://img.shields.io/badge/gRPC-HTTP%2F2%20Protobuf-244c5a?logo=grpc)](https://grpc.io/)
[![Redis 7](https://img.shields.io/badge/Redis-7%20Streams%20%26%20Queues-DC382D?logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?logo=docker)](https://www.docker.com/)

An enterprise-grade developer platform featuring **Intent-Based Random Video Chat**, **Pair Programming Roulette**, **Skill-Complement Teammate Matching**, **Project Collaboration Feeds**, and **Direct-to-S3 Resilient Media Streaming**.

---

## 🏛️ System Architecture

NerdShive is architected with a strict separation between the **Frontend & Edge BFF (`web/`)** and the **NestJS Backend Microservices Cluster (`apps/`)**:

```
                              ┌───────────────────────────────────┐
                              │     Browser / Mobile Client       │
                              └───────────────┬───────────────────┘
                                              │ HTTP / WebSockets
                                              ▼
                              ┌───────────────────────────────────┐
                              │  Next.js 14 App Router (web/)     │
                              └───────────────┬───────────────────┘
                                              │ REST / Internal gRPC
                                              ▼
                              ┌───────────────────────────────────┐
                              │ NestJS API Gateway (apps/gateway) │
                              └───────────────┬───────────────────┘
                                              │ Binary gRPC (Protobuf)
        ┌───────────────────┬─────────────────┼───────────────────┬───────────────────┐
        ▼                   ▼                 ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ auth-service │    │media-service │   │match-service │   │ chat-service │   │discovery-svc │
│   (:50051)   │    │   (:50052)   │   │   (:50053)   │   │   (:50054)   │   │   (:50055)   │
└───────┬──────┘    └───────┬──────┘   └───────┬──────┘   └───────┬──────┘   └───────┬──────┘
        │                   │                  │                  │                  │
        └───────────────────┴────────┬─────────┴──────────────────┴──────────────────┘
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
├── .env                             # Root Environment Variables
├── .env.example                     # Environment Blueprint
├── Dockerfile                       # Web Frontend Container (web/)
├── Dockerfile.services              # NestJS Microservices Container (apps/)
├── docker-compose.yml               # Development Orchestration Stack
├── docker-compose.prod.yml          # Production Orchestration Stack
├── README.md                        # Monorepo Documentation
├── CONTEXT.md                       # Project Constraints & Directive
│
├── web/                             # 🌐 Next.js 14 Frontend & Edge BFF
│   ├── app/                         # 19 App Router Pages & API Routes
│   ├── components/                  # UI Components & Design System Barrel
│   ├── lib/                         # Client Utilities (db, uploader, crop)
│   ├── public/                      # Static Media Assets
│   ├── hooks/                       # React Hooks
│   ├── context/                     # Context Providers
│   ├── emails/                      # React Email Templates
│   ├── helpers/                     # Helper Functions
│   ├── models/                      # Local Entity Facade
│   ├── schemas/                     # Zod Schemas
│   ├── types/                       # TypeScript Types
│   ├── auth.ts                      # NextAuth Configuration
│   ├── middleware.ts                # Route Protection Middleware
│   ├── next.config.mjs              # Next.js Config
│   ├── tailwind.config.ts           # Tailwind CSS Config
│   ├── postcss.config.mjs           # PostCSS Config
│   ├── package.json                 # Web App Package Config (@nerdshive/web)
│   └── tsconfig.json                # Web App TypeScript Config
│
├── apps/                            # 🚀 NestJS Backend Microservices & Gateways
│   ├── api-gateway/                 # 🚪 NestJS API Gateway (:4000)
│   ├── auth-service/                # 🔐 Auth Microservice (:50051)
│   ├── media-service/               # 📦 Media & BullMQ Worker (:50052)
│   ├── match-service/               # 🎲 Matchmaking Queue Microservice (:50053)
│   ├── chat-service/                # 💬 Real-Time Messaging Gateway (:50054)
│   ├── discovery-service/           # 🔍 Skill Complement Engine (:50055)
│   ├── notification-service/        # 🔔 Event-Driven Alert Processor
│   ├── signaling-server/            # 📡 Socket.IO & Redis Matchmaker Server
│   └── peer-server/                 # 📹 PeerJS WebRTC Relay Server
│
├── libs/                            # 📚 Shared Backend Packages
│   ├── database/                    # Mongoose Domain Entities & Repositories
│   ├── events/                      # Shared Redis Event Bus & Domain Events
│   ├── common/                      # Shared Utilities & gRPC Client Stubs
│   └── proto/                       # Protocol Buffer (gRPC) Schema Definitions
│
├── docs/                            # 📖 Comprehensive Living Documentation
│   ├── architecture/                # Architecture plans & UML diagrams
│   ├── agent-log/                   # Step-by-step engineering logs (01 - 15)
│   ├── FEATURES.md                  # Comprehensive feature & schema inventory
│   ├── SCALABILITY_TARGETS.md       # Non-functional scaling targets (50k+ sockets)
│   ├── FEATURE_IDEAS.md             # Growth & retention feature roadmap
│   └── SYSTEM_ARCHITECTURE.md       # Enterprise microservices blueprint
│
└── tests/                           # 🧪 Monorepo Test & Benchmark Suites
    ├── load-tests/                  # S3 upload resilience & matchmaking concurrency
    └── grpc/                        # gRPC serialization & RPC benchmarks
```

---

## ⚡ Quick Start

```bash
# 1. Install all monorepo dependencies
npm install

# 2. Start Next.js Frontend Development Server
npm run dev

# 3. Start NestJS Microservices Cluster
npm run start:gateway
```

---

## 🧪 Benchmark & Stress Test Suite

```bash
# Run S3 Upload Resilience Benchmark (50 consecutive & concurrent cycles)
node tests/load-tests/s3-resilience-test.js

# Run gRPC Microservices Integration & Throughput Benchmark (10,000 RPCs)
node tests/grpc/grpc-integration-test.js

# Run Media Upload Concurrency Benchmark (>500k ops/sec)
node tests/load-tests/upload-concurrency-test.js
```
