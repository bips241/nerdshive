# DevConnect / NerdShive — Features Inventory & Codebase Audit

> **Document Status**: Living source of truth for all existing features, data models, external dependencies, and technical limitations discovered during Phase 1 of the platform scale-out brief ([CONTEXT.md](file:///Users/biplabmal/Documents/projects/nerdshive/CONTEXT.md)).

---

## 1. Executive Summary & Tech Stack Audit

- **Web Framework**: Next.js 14.2.30 (App Router, Server Actions, API Route Handlers)
- **UI & Styling**: React 18, Tailwind CSS, Radix UI primitives (`@radix-ui/*`), Lucide React Icons, Sonner toast notifications, `next-themes` (Dark/Light mode).
- **Authentication**: NextAuth.js v5 (`5.0.0-beta.19`), supporting:
  - Credentials provider (`bcryptjs` password hashing)
  - Google OAuth (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
  - GitHub OAuth (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`)
  - Custom 6-digit email OTP verification via Resend
- **Database**: MongoDB with Mongoose (`mongoose` 8.4.4). All 11 schema definitions are centralized in [`models/User.ts`](file:///Users/biplabmal/Documents/projects/nerdshive/models/User.ts).
- **File & Media Storage**: AWS S3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) with pre-signed client PUT uploads and client-side image cropping (`react-easy-crop`) / video preview (`react-player`).
- **Direct Messaging (DMs)**: Firebase Firestore (`firebase` 11.7.1, Web SDK) for real-time room messaging, gated by MongoDB mutual-follow lookup.
- **Random-Match Video Chat ("Omegle for Devs")**:
  - Signaling & Matchmaking Server: Standalone Node/Express + Socket.IO server ([`nerdshive-socket-server`](file:///Users/biplabmal/Documents/projects/nerdshive/nerdshive-socket-server/index.js)).
  - WebRTC Peer Server: Standalone Express + PeerJS server ([`peer-server`](file:///Users/biplabmal/Documents/projects/nerdshive/peer-server/index.js)).
  - STUN/TURN Relay: Metered.ca TURN & STUN servers configured via client environment variables.
- **Email Delivery**: Resend API (`resend` 3.4.0) with React Email templates ([`emails/VerificationEmail.tsx`](file:///Users/biplabmal/Documents/projects/nerdshive/emails/VerificationEmail.tsx)).

---

## 2. Comprehensive Features Inventory

### 2.1 Core (Profile, Auth & Social Graph)

| Feature Name | User-Facing Description | Key Files & Routes | Data Models Touched | External Services Used | Known Issues & Codebase Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **User Registration & Email OTP Verification** | User creates an account with username, email, and password. An unverified user record is created in MongoDB with a 6-digit OTP (1h expiry). An HTML email is dispatched via Resend. User enters the OTP on `/verify/[username]` to activate account. | - `app/register/page.tsx`<br>- `app/verify/[username]/page.tsx`<br>- `app/api/sign-up/route.ts`<br>- `app/api/verify-code/route.ts`<br>- `helpers/sendVerificationEmail.ts`<br>- `emails/VerificationEmail.tsx` | - `User` (`isVerified`, `verifyCode`, `verifyCodeExpiry`) | - Resend Email API | - No rate limiting on `/api/sign-up` or `/api/verify-code` (vulnerable to OTP brute-force and email flooding).<br>- OTP generation uses `Math.random()` instead of cryptographically secure `crypto.randomInt`.<br>- In `sign-up/route.ts`, if an unverified user exists, their password is overwritten without checking whether the requester owns the email. |
| **Username Uniqueness Validation** | Real-time / debounced validation on registration to prevent duplicate usernames among verified accounts. | - `app/api/check-username-unique/route.ts`<br>- `schemas/signUpSchema.ts` | - `User` | *None* | - Unindexed queries; only checks `isVerified: true`, allowing username collisions for pending registrations. |
| **Authentication & Session Management** | Login via credentials or OAuth (Google, GitHub). Session stored in JWT and exposed via NextAuth cookies. Middleware guards protected routes. | - `auth.ts`<br>- `middleware.ts`<br>- `app/login/page.tsx`<br>- `app/api/auth/[...nextauth]/route.ts`<br>- `lib/getSession.ts` | - `User`<br>- `Account`<br>- `Session` (declared in Schema, unused) | - Google OAuth<br>- GitHub OAuth | - `auth.ts` uses NextAuth beta 19, with manual `$or` queries for email/username lookup.<br>- `middleware.ts` inspects raw cookie string `authjs.session-token` instead of verifying session cryptographic signature.<br>- Passwords returned in error logs (`console.error('Authorize error:', error)`). |
| **User Profile Page** | View user details, avatar, follower/following count, and grid of uploaded media posts (images & videos). | - `app/dashboard/user/[name]/page.tsx`<br>- `lib/data.ts` (`fetchProfile`, `fetchProfilePosts`) | - `User`<br>- `Post`<br>- `Follows` | *None* | - Hardcoded statistics on profile header (`120 posts`, `4.2k followers`, `380 following`) instead of aggregating live counts from DB.<br>- Hardcoded bio string (`SDE I at Amazon`, `Frontend dev • Coffee addict ☕ • React nerd`) ignoring DB `bio` field.<br>- N+1 HTTP HEAD requests in `ProfilePage` (`fetchContentType` for every media file on every SSR page render) causing severe page latency. |
| **Edit User Profile** | Modal dialog allowing users to update username, bio, gender, website, and GitHub repository URL. | - `components/editBtn.tsx`<br>- `lib/actions.ts` (`updateProfile`) | - `User` (`bio`, `gender`, `website`, `repo`, `name`, `user_name`, `image`) | *None* | - **Half-built / Broken**: `editBtn.tsx` `handleSubmit` only does `console.log("Form Data:", formData)` and does not invoke `updateProfile` server action. Form is purely client-side mock today. |
| **Follow / Unfollow System** | Toggle follow state on another developer profile. Prevents self-follows and establishes social connections. | - `components/followBtn.tsx`<br>- `app/api/follow/[name]/route.ts`<br>- `app/api/follow/status/[name]/route.ts`<br>- `lib/actions.ts` (`followUser`) | - `Follows`<br>- `User` | *None* | - Duplicated implementation: Both Server Action (`followUser`) and API Routes (`/api/follow/[name]`) exist with conflicting semantics.<br>- Lacks activity feed indexing or mutual follow caching. |
| **Home Feed (Main Feed)** | Paginated/scrollable feed of community posts: media posts, polls, goals, and project collaboration cards. | - `app/dashboard/(home)/page.tsx`<br>- `components/Posts.tsx`<br>- `lib/data.ts` (`fetchPosts`) | - `Post`<br>- `User`<br>- `Like`<br>- `Comment` | *None* | - `fetchPosts()` performs heavy multi-level `populate` across `comments`, `likes`, `userId` with unbounded query (`Post.find({})`), no cursor pagination or limit, converting all Mongoose docs to serialized JSON strings. Will crash with large post counts. |
| **Post Engagement (Likes & Bookmarks)** | Like/unlike posts with live counter update; save/bookmark posts for later reference. | - `components/Like.tsx`<br>- `components/BookmarkButton.tsx`<br>- `lib/actions.ts` (`likePost`, `bookmarkPost`) | - `Post`<br>- `Like`<br>- `SavedPost`<br>- `User` | *None* | - Race conditions: Dual updates on `Post.likes` array AND `Like` collection without transactions or atomic operations. High concurrency will cause like count desynchronization. |
| **Post Comments** | Add and delete comments under any community post. | - `components/Comments.tsx`<br>- `components/CommentForm.tsx`<br>- `components/CommentOptions.tsx`<br>- `lib/actions.ts` (`createComment`, `deleteComment`) | - `Comment`<br>- `Post`<br>- `User` | *None* | - In `deleteComment`, array cleanup in `User` and `Post` is commented out (`// await User.findByIdAndUpdate...`), creating orphan references in `post.comments`. |

---

### 2.2 Collaboration (Projects, Teams & Goals)

| Feature Name | User-Facing Description | Key Files & Routes | Data Models Touched | External Services Used | Known Issues & Codebase Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Project Collaboration Posts** | Create and showcase developer projects, specify tech stack tags, link GitHub repositories, and invite teammates to join. | - `app/dashboard/create/create-post-form.tsx`<br>- `components/ProjectPostUI.tsx`<br>- `lib/actions.ts` (`submitProjectPost`) | - `Post` (subdocument `project`: `title`, `description`, `techStack`, `repoUrl`, `members`, `lookingFor`) | - GitHub (External link) | - In `create-post-form.tsx`, `handleCreateProject` accesses raw DOM elements via `document.querySelector` instead of controlled React form state.<br>- Dialog does not close on submit, does not reset form, and gives no visual confirmation. |
| **Collaboration Request & Teammate Management** | Developers can submit a request to join a project ("Request to Collab"). Project owner can view requests and accept or reject candidates. Accepted members are added to `project.members`. | - `components/collabReq.tsx`<br>- `components/ProReqClient.tsx`<br>- `components/viewProjectReq.tsx`<br>- `app/api/project-requests/[postId]/route.ts`<br>- `app/api/project-requests/update/[requestId]/route.ts`<br>- `lib/actions.ts` (`createCollabRequest`, `checkExistingRequest`) | - `ProjectRequest` (`projectId`, `requesterId`, `status`)<br>- `Post` (`project.members`) | *None* | - Duplicate route handling between `/api/project-requests/update/[requestId]` and `/api/project-requests/[postId]`.<br>- No notification emitted to project owner when someone requests to join. |
| **Goal & Accountability Posts** | Post learning goals, target deadlines, and project milestones. Other developers can click "Interested" to connect. | - `app/dashboard/create/create-post-form.tsx`<br>- `components/GoalPostUI.tsx`<br>- `components/interestedButton.tsx`<br>- `lib/actions.ts` (`submitGoalPost`, `handleInterest`) | - `Post` (subdocument `goal`: `description`, `goalTargetDate`, `interestedUsers`) | *None* | - `handleCreateGoal` in `create-post-form.tsx` uses raw DOM query selectors.<br>- Date input has no client timezone normalization. |
| **Community Polls & Voting** | Create multi-option tech polls. Users vote on options and view live vote percentage breakdowns. | - `app/dashboard/create/create-post-form.tsx`<br>- `components/PollPostUI.tsx`<br>- `components/pollStats.tsx`<br>- `app/api/poll-votes/[pollId]/route.ts`<br>- `app/api/update-result/route.ts`<br>- `lib/actions.ts` (`submitPollPost`) | - `Post` (subdocument `poll`: `question`, `options`)<br>- `PollVote` (`pollId`, `userId`, `selectedOptionIndex`) | *None* | - In `create-post-form.tsx`, "+ Add another option" button has no click handler (locked to 2 options).<br>- `app/api/update-result/route.ts` is named misleadingly (it updates poll votes).<br>- Client polls `/api/poll-votes/[pollId]` without WebSocket/SSE or optimistic UI updates. |

---

### 2.3 Random-Match Video Chat ("Omegle for Devs")

| Feature Name | User-Facing Description | Key Files & Routes | Data Models Touched | External Services Used | Known Issues & Codebase Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Intent-Based Queue Matchmaking** | Users select an intent (`hiring`, `looking_for_job`, `project_teammate`) and enter a matchmaking queue. The server pairs two active users with the same intent in FIFO order. | - `app/dashboard/stranger-chat/page.tsx`<br>- `components/VideoMatch.tsx`<br>- `nerdshive-socket-server/index.js`<br>- `types/socketType.ts` | *None* (In-memory state) | - Socket.IO (Signaling)<br>- Metered.ca (STUN/TURN) | - **Critical Scalability Bottleneck**: Queues (`intentQueues`), active matches (`activeMatches`), and socket states (`queuedState`) are stored in **local Node.js process RAM**.<br>- Horizontal scaling of the socket server breaks matchmaking across instances because queues are isolated in each process's memory.<br>- No queue timeout or TTL for abandoned sockets. |
| **P2P WebRTC Video & Audio Calling** | Upon match, users exchange PeerJS IDs and establish direct peer-to-peer audio/video streaming with ICE/TURN relay support. | - `app/dashboard/stranger-chat/page.tsx`<br>- `components/VideoMatch.tsx`<br>- `peer-server/index.js` | *None* | - PeerJS (`peerjs` client + `peer` Express server)<br>- WebRTC MediaStream API | - Mesh P2P model: Works for 1-on-1, but no SFU (Selective Forwarding Unit) capability for multi-party calls.<br>- Fallback timer race condition (1500ms timeout for non-initiator) causes duplicate calls if latency is high. |
| **Swipe & Skip Next Action** | Clicking "Skip" disconnects current peer call, animates video transition, and automatically re-queues user for the next available partner. | - `app/dashboard/stranger-chat/page.tsx`<br>- `components/VideoMatch.tsx`<br>- `nerdshive-socket-server/index.js` | *None* | - Socket.IO | - `VideoMatch.tsx` uses `window.location.reload()` on skip instead of cleanly resetting WebRTC peer connections in memory.<br>- `page.tsx` uses a 500ms CSS animation timeout before rejoining queue, which can drop if user clicks rapidly. |

---

### 2.4 Media & Upload Pipeline

| Feature Name | User-Facing Description | Key Files & Routes | Data Models Touched | External Services Used | Known Issues & Codebase Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Direct-to-S3 Pre-Signed Uploads** | Client requests pre-signed PUT URL from Next.js server action, then uploads file directly to AWS S3 bucket. | - `app/dashboard/create/actions.ts` (`getSignedURL`)<br>- `app/dashboard/create/create-post-form.tsx` (`UploadToS3`) | - `Post` (`fileUrl`) | - AWS S3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) | - **Vulnerability & Bottleneck**: No server-side post-upload validation (file MIME sniffing, virus/NSFW scan).<br>- No asynchronous processing queue (BullMQ/SQS) for video transcoding, HLS segmentation, or thumbnail generation.<br>- Discrepancy between client file size cap (10MB in `create-post-form.tsx`) and server cap (15MB in `actions.ts`).<br>- No CDN (CloudFront) configured in front of S3 bucket; raw S3 URLs stored in database (`https://${bucket}.s3.${region}.amazonaws.com/${fileName}`). |
| **Client-Side Image Cropping** | Square (1:1) cropping tool using canvas before uploading image to S3. | - `lib/cropImage.ts`<br>- `app/dashboard/create/create-post-form.tsx` | *None* | - HTML5 Canvas API | - High-resolution images cropped purely on client CPU, causing browser tab freezing on mobile devices. |
| **Video Playback Preview** | Video file selection preview with aspect ratio detection. | - `app/dashboard/create/create-post-form.tsx`<br>- `components/Media.tsx` | *None* | - `react-player` | - Raw video files streamed without adaptive bitrate (ABR), buffering excessively for slow mobile connections. |

---

### 2.5 Direct Messaging (DMs) & Real-Time Chat

| Feature Name | User-Facing Description | Key Files & Routes | Data Models Touched | External Services Used | Known Issues & Codebase Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mutual-Follow Chat Discovery** | Fetches list of mutual connections (users who follow each other) to open private direct message rooms. | - `app/api/chats/route.ts`<br>- `components/chatList.tsx`<br>- `components/chatListWrapper.tsx`<br>- `app/dashboard/messages/page.tsx` | - `Follows`<br>- `User` | *None* | - MongoDB aggregation in `/api/chats` runs an unindexed `$lookup` and `$unwind` on every fetch.<br>- Polling on mount with no live socket/presence updates when mutual follow status changes. |
| **Real-Time 1-on-1 DMs (Firestore)** | Real-time chat between mutual follows with auto-scrolling message history. | - `components/fireChat.tsx`<br>- `lib/firebase.ts`<br>- `lib/chat.ts` (`getRoomId`) | - `ChatRoom` (in schema, unused)<br>- `Message` (in schema, unused) | - Google Firebase Firestore | - **Architectural Mismatch**: Backend has `ChatRoom` and `Message` Mongoose models in `models/User.ts`, but the app bypasses them entirely and connects the browser directly to Firebase Firestore.<br>- Firebase security rules are client-dependent; messages are not archived in primary database.<br>- Firebase credentials exposed in client bundle (`NEXT_PUBLIC_FIREBASE_*`). |

---

### 2.6 Notifications & Activity

| Feature Name | User-Facing Description | Key Files & Routes | Data Models Touched | External Services Used | Known Issues & Codebase Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Notifications & Activity Feed** | Navigation link exists for Notifications, but route is missing. | - `components/NavLinks.tsx` (`/dashboard/notifications`) | *None* | *None* | - **Unimplemented / Scaffolded Route**: Returns 404 if clicked. No notification model or dispatch service exists. |

---

### 2.7 Scaffolded / In-Progress ("Half-Built") Features

| Feature Name | Intended Purpose | Current Code State | Blocking Dependencies |
| :--- | :--- | :--- | :--- |
| **Explore Feed** | Global discovery feed for trending dev projects & media. | Route `/dashboard/explore` linked in `NavLinks.tsx` but file does not exist (404). | Needs discovery service ranking query. |
| **Global Search** | Search users by username, skills, tech stack, or projects. | Route `/dashboard/search` linked in `NavLinks.tsx` but file does not exist (404). | Needs MongoDB text index / search endpoint. |
| **Dev Reels** | Short-form vertical developer video feed. | Route `/dashboard/reels` linked in `NavLinks.tsx` but file does not exist (404). | Needs video transcoding & vertical player component. |
| **Profile Settings & Activity** | Account settings, dark mode toggle, saved posts drawer. | Menu items exist in `components/MoreDropdown.tsx`, but `Settings`, `Your activity`, and `Saved` items are static buttons with no actions. | Needs user settings schema and actions. |

---

### 2.8 Admin & Moderation Tooling

| Capability | Current Status in Codebase |
| :--- | :--- |
| **Admin Dashboard** | **Completely Missing**. User schema has a `role: { type: String, default: "user" }` field, but no admin routes or RBAC checks exist anywhere in the application. |
| **Content & Media Moderation** | **Completely Missing**. No automated NSFW, malware, profanity, or spam detection on media posts, comments, or chat messages. |
| **User Ban / Report Tooling** | **Completely Missing**. No reporting mechanism for inappropriate stranger video chat sessions or abusive project requests. |

---

## 3. Database Schema Map (`models/User.ts`)

All Mongoose models and indexes analyzed:

1. **`User`** (`users` collection)
   - Fields: `user_name` (unique), `email` (unique), `password`, `bio`, `gender`, `website`, `repo`, `role`, `image`, `isVerified`, `verifyCode`, `verifyCodeExpiry`, `authProviderId`, `posts`, `saved`, `likes`, `comments`, `followedBy`, `following`, `accounts`, `sessions`.
   - Index: Automatic unique indexes on `user_name` and `email`. Missing compound indexes for search.
2. **`VerificationToken`** (`verificationtokens` collection)
   - Compound unique index: `{ identifier: 1, token: 1 }`.
3. **`Account`** (`accounts` collection)
   - Compound unique index: `{ provider: 1, providerAccountId: 1 }`, index on `userId: 1`.
4. **`Follows`** (`follows` collection)
   - Compound unique index: `{ followerId: 1, followingId: 1 }`.
5. **`Post`** (`posts` collection)
   - Fields: `postType` (`media`, `poll`, `goal`, `project`), `project` (subdoc), `poll` (subdoc), `goal` (subdoc), `caption`, `fileUrl`, `likes`, `savedBy`, `comments`, `userId`.
   - Index: `{ userId: 1 }`. Missing index on `{ createdAt: -1 }` causing slow feed sorting.
6. **`ProjectRequest`** (`projectrequests` collection)
   - Fields: `projectId`, `requesterId`, `status` (`pending`, `accepted`, `rejected`).
   - Missing unique compound index `{ projectId: 1, requesterId: 1 }` to enforce single request per user.
7. **`PollVote`** (`pollvotes` collection)
   - Fields: `pollId`, `userId`, `selectedOptionIndex`.
   - Missing unique index `{ pollId: 1, userId: 1 }`.
8. **`SavedPost`** (`savedposts` collection)
   - Compound unique index: `{ postId: 1, userId: 1 }`, index on `userId: 1`.
9. **`Like`** (`likes` collection)
   - Compound unique index: `{ postId: 1, userId: 1 }`, index on `userId: 1`.
10. **`Comment`** (`comments` collection)
    - Indexes: `{ postId: 1 }`, `{ userId: 1 }`.
11. **`ChatRoom`** & **`Message`** (Dormant schemas, superseded by Firebase in active UI).

---

## 4. Environment Variables Audit

| Variable | Scope | Purpose | Status / Risk |
| :--- | :--- | :--- | :--- |
| `MONGODB_URI` | Server | MongoDB Atlas connection string | Configured |
| `NEXTAUTH_SECRET` | Server | NextAuth encryption secret | Configured |
| `AUTH_TRUST_HOST` | Server | NextAuth trust proxy flag | Configured |
| `GOOGLE_CLIENT_ID` / `_SECRET` | Server | Google OAuth | Configured |
| `GITHUB_CLIENT_ID` / `_SECRET` | Server | GitHub OAuth | Configured |
| `RESEND_API_KEY` | Server | Email delivery | Configured |
| `AWS_ACCESS_KEY` / `_SECRET_ACCESS_KEY` | Server | AWS S3 programmatic access | Configured |
| `AWS_BUCKET_NAME` / `AWS_BUCKET_REGION` | Server | S3 bucket destination | Configured (`nerdshive-v11`, `ap-south-1`) |
| `NEXT_PUBLIC_SOCKET_SERVER_URL` | Client | Random-match socket signaling server | Configured |
| `NEXT_PUBLIC_PEER_SERVER_HOST` / `PORT` | Client | PeerJS signaling server host & port | Configured |
| `NEXT_PUBLIC_METERED_*` (7 vars) | Client | STUN/TURN server URLs and credentials | Configured |
| `NEXT_PUBLIC_FIREBASE_*` (6 vars) | Client | Firebase app & Firestore credentials | Configured |
| `REDIS_URL` | Socket Server | Redis pub/sub adapter | Optional in socket server |

---

## 5. Summary of Key Failure Points to Address in Phases 2–5

1. **Stateful Socket Matchmaking**: In-memory `intentQueues` and `activeMatches` must be externalized to Redis with atomic operations to allow multi-replica scaling.
2. **Media Pipeline Lack of Backpressure & Asynchrony**: Replace direct synchronous client S3 PUT + immediate post creation with an asynchronous pipeline (S3 trigger &rarr; BullMQ job &rarr; transcode / optimize / thumbnail &rarr; update DB).
3. **Database Indexing & Pagination**: Introduce cursor-based pagination and missing indexes on `Post`, `ProjectRequest`, `PollVote`, and `Follows`.
4. **Unified Backend Architecture (Phase 5)**: Consolidate fragmented external dependencies (Firebase Firestore, standalone socket script, standalone peer server) into structured, scalable **NestJS microservices** behind a **Next.js BFF** with zero UI/UX drift.
