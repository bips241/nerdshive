/**
 * NerdShive Production-Grade Database Seeder & Purge
 * Wipes legacy collections and freshly reseeds with current accepted post types:
 * 1. 'hackathon_crew' (⚡ Squad Recruitment with auto-provisioned Squad Servers)
 * 2. 'ship_log' (🚀 Project Showcase & Launchpad with alpha testers & changelogs)
 * 3. 'media' (🎬 Demo Reels & Visual Media)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined in .env');
  process.exit(1);
}

// Schemas
const UserSchema = new mongoose.Schema({
  user_name: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, select: false },
  name: { type: String },
  bio: { type: String, default: '' },
  website: { type: String, default: '' },
  gender: { type: String, default: 'prefer-not-to-say' },
  image: { type: String, default: '/avatar.png' },
  repo: { type: String, default: '' },
  role: { type: String, default: 'developer' },
  isVerified: { type: Boolean, default: true },
  verifyCode: { type: String },
  verifyCodeExpiry: { type: Date },
  authProviderId: { type: String },
  radarStatus: { type: String, default: 'none' },
  debugKarma: { type: Number, default: 100 },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  saved: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Like' }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
}, { timestamps: true });

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caption: { type: String },
  fileUrl: { type: String },
  postType: {
    type: String,
    enum: ['media', 'hackathon_crew', 'ship_log'],
    default: 'media',
    required: true,
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  shipLog: {
    title: { type: String },
    pitch: { type: String },
    version: { type: String, default: 'v0.1.0' },
    demoUrl: { type: String },
    repoUrl: { type: String },
    techStack: [{ type: String }],
    feedbackWanted: [{ type: String }],
    alphaTesters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    changelog: [
      {
        version: { type: String },
        note: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  hackathonCrew: {
    hackathonId: { type: mongoose.Schema.Types.ObjectId },
    hackathonName: { type: String },
    squadServerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Server' },
    targetTrack: { type: String },
    urgencyDate: { type: Date },
    rolesHave: [{ type: String }],
    rolesNeed: [{ type: String }],
    commitmentLevel: {
      type: String,
      enum: ['hardcore', 'moderate', 'casual'],
      default: 'moderate',
    },
    squadStatus: {
      type: String,
      enum: ['recruiting', 'full', 'building'],
      default: 'recruiting',
    },
    maxSquadSize: { type: Number, default: 4 },
    members: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    applicants: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: { type: String },
        pitch: { type: String },
        appliedAt: { type: Date, default: Date.now },
      },
    ],
  },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  retentionExpiresAt: { type: Date, index: true },
}, { timestamps: true });

const ServerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  icon: { type: String },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inviteCode: { type: String, unique: true },
  members: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
      joinedAt: { type: Date, default: Date.now },
    },
  ],
  channels: [
    {
      name: { type: String, required: true },
      type: { type: String, enum: ['text', 'voice'], default: 'text' },
      topic: { type: String },
    },
  ],
}, { timestamps: true });

const FollowsSchema = new mongoose.Schema({
  followerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  followingId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const LikeSchema = new mongoose.Schema({
  postId: { type: String, required: true },
  userId: { type: String, required: true },
}, { timestamps: true });

const CommentSchema = new mongoose.Schema({
  body: { type: String, required: true },
  postId: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const SavedPostSchema = new mongoose.Schema({
  postId: { type: String, required: true },
  userId: { type: String, required: true },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
const Server = mongoose.models.Server || mongoose.model('Server', ServerSchema);
const Follows = mongoose.models.Follows || mongoose.model('Follows', FollowsSchema);
const Like = mongoose.models.Like || mongoose.model('Like', LikeSchema);
const Comment = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);
const SavedPost = mongoose.models.SavedPost || mongoose.model('SavedPost', SavedPostSchema);

async function seedDatabase() {
  console.log('Connecting to MongoDB Atlas cluster...');
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log(' Connected to MongoDB!');

  const db = mongoose.connection.db;

  // 1. Wipe all legacy & outdated collections completely
  console.log('\n--- Purging Legacy Data Collections ---');
  const collectionsToClean = ['posts', 'comments', 'likes', 'savedposts', 'pollvotes', 'projectrequests', 'servers'];
  for (const collName of collectionsToClean) {
    try {
      const result = await db.collection(collName).deleteMany({});
      console.log(`✓ Cleared collection "${collName}" (${result.deletedCount} documents deleted)`);
    } catch (err) {
      console.log(`- Collection "${collName}" does not exist or already empty`);
    }
  }

  const hashedPassword = await bcrypt.hash('dev-guest', 10);

  // 2. Seed Developer Accounts
  const developers = [
    {
      user_name: 'dev_guest',
      email: 'guest@nerdshive.local',
      password: hashedPassword,
      name: 'Dev Guest',
      bio: '🚀 Senior Fullstack Engineer | TypeScript, Next.js 14, NestJS, WebRTC & Rust | Building high-scale developer tools.',
      website: 'https://nerdshive.online',
      repo: 'https://github.com/nerdshive/nerdshive',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      role: 'developer',
      radarStatus: 'project_teammate',
      isVerified: true,
      debugKarma: 150,
    },
    {
      user_name: 'sarah_dev',
      email: 'sarah@nerdshive.local',
      password: hashedPassword,
      name: 'Sarah Chen',
      bio: '⚛️ Frontend Architect & UI/UX Geek | React 19, TailwindCSS, WebGL & Canvas | Ex-Stripe.',
      website: 'https://sarahchen.dev',
      repo: 'https://github.com/sarahchen/ui-toolkit',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      role: 'developer',
      radarStatus: 'hackathon_squad',
      isVerified: true,
      debugKarma: 240,
    },
    {
      user_name: 'alex_cloud',
      email: 'alex@nerdshive.local',
      password: hashedPassword,
      name: 'Alex Rivera',
      bio: '☁️ Distributed Systems & Backend Wizard | Go, gRPC, Redis Streams & Kubernetes.',
      website: 'https://alexrivera.io',
      repo: 'https://github.com/alexrivera/distributed-cache',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      role: 'developer',
      radarStatus: 'hackathon_squad',
      isVerified: true,
      debugKarma: 190,
    },
    {
      user_name: 'elena_ai',
      email: 'elena@nerdshive.local',
      password: hashedPassword,
      name: 'Elena Rostova',
      bio: '🧠 AI/ML Research Engineer | PyTorch, Vector Search, LLM Fine-Tuning & Quantization.',
      website: 'https://elenarostova.ai',
      repo: 'https://github.com/elenarostova/rag-pipeline',
      image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      role: 'developer',
      radarStatus: 'project_teammate',
      isVerified: true,
      debugKarma: 310,
    },
    {
      user_name: 'marcus_ops',
      email: 'marcus@nerdshive.local',
      password: hashedPassword,
      name: 'Marcus Brody',
      bio: '⚙️ Cloud Infrastructure & DevOps Lead | Terraform, ArgoCD, Prometheus & 99.999% SLA.',
      website: 'https://marcusbrody.tech',
      repo: 'https://github.com/marcusbrody/k8s-manifests',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      role: 'developer',
      radarStatus: 'none',
      isVerified: true,
      debugKarma: 175,
    },
  ];

  console.log('\n--- Upserting Developer Users ---');
  const userMap = new Map();

  for (const dev of developers) {
    let user = await User.findOne({
      $or: [{ email: dev.email }, { user_name: dev.user_name }],
    });
    if (!user) {
      user = await User.create(dev);
      console.log(`+ Created user: @${user.user_name} (${user._id})`);
    } else {
      user.user_name = dev.user_name;
      user.email = dev.email;
      user.name = dev.name;
      user.bio = dev.bio;
      user.image = dev.image;
      user.website = dev.website;
      user.repo = dev.repo;
      user.isVerified = true;
      user.password = hashedPassword;
      user.radarStatus = dev.radarStatus;
      user.debugKarma = dev.debugKarma;
      user.posts = [];
      await user.save();
      console.log(`✓ Updated user: @${user.user_name} (${user._id})`);
    }
    userMap.set(dev.user_name, user);
  }

  const devGuest = userMap.get('dev_guest');
  const sarah = userMap.get('sarah_dev');
  const alex = userMap.get('alex_cloud');
  const elena = userMap.get('elena_ai');
  const marcus = userMap.get('marcus_ops');

  // 3. Mutual Follows
  console.log('\n--- Creating Mutual Follow Connections ---');
  const followPairs = [
    [devGuest._id, sarah._id],
    [sarah._id, devGuest._id],
    [devGuest._id, alex._id],
    [alex._id, devGuest._id],
    [devGuest._id, elena._id],
    [elena._id, devGuest._id],
    [sarah._id, alex._id],
    [alex._id, sarah._id],
    [elena._id, marcus._id],
    [marcus._id, devGuest._id],
  ];

  for (const [followerId, followingId] of followPairs) {
    await Follows.findOneAndUpdate(
      { followerId, followingId },
      { followerId, followingId },
      { upsert: true, new: true }
    );
  }
  console.log(`✓ Seeded ${followPairs.length} follow graph relations.`);

  // 4. Provision Dedicated Squad Servers
  console.log('\n--- Provisioning Hackathon Squad Servers ---');
  const ethServer = await Server.create({
    name: 'ETHGlobal Bangkok Squad',
    description: 'Official private war-room for ETHGlobal Bangkok Hackathon Squad',
    ownerId: sarah._id,
    inviteCode: 'ETHBANGKOK',
    members: [
      { user: sarah._id, role: 'owner', joinedAt: new Date() },
      { user: devGuest._id, role: 'member', joinedAt: new Date() },
      { user: alex._id, role: 'member', joinedAt: new Date() },
    ],
    channels: [
      { name: 'general', type: 'text', topic: 'Architecture & sprint updates' },
      { name: 'resources', type: 'text', topic: 'Smart contracts, RPC endpoints & Figma' },
      { name: 'pair-hacking', type: 'voice', topic: 'Voice & WebRTC screen sharing lounge' },
    ],
  });

  const solanaServer = await Server.create({
    name: 'Solana Radar Squad',
    description: 'High-frequency Solana radar hackathon squad lounge',
    ownerId: alex._id,
    inviteCode: 'SOLRADAR26',
    members: [
      { user: alex._id, role: 'owner', joinedAt: new Date() },
      { user: elena._id, role: 'member', joinedAt: new Date() },
    ],
    channels: [
      { name: 'general', type: 'text', topic: 'Tactical planning' },
      { name: 'resources', type: 'text', topic: 'Anchor IDL, devnet faucets & benchmark stats' },
      { name: 'pair-hacking', type: 'voice', topic: 'Live pair programming' },
    ],
  });

  // 5. Seed Fresh Accepted Posts
  console.log('\n--- Seeding Fresh Accepted Posts ---');

  // A. Hackathon Crew 1
  const crewPost1 = await Post.create({
    userId: sarah._id,
    postType: 'hackathon_crew',
    caption: '⚡ [Team Call] ETHGlobal Bangkok 2026 — Seeking Smart Contract Engineer & Next.js Frontend Builder',
    hackathonCrew: {
      hackathonName: 'ETHGlobal Bangkok 2026',
      squadServerId: ethServer._id,
      targetTrack: 'DeFi & Account Abstraction',
      urgencyDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
      rolesHave: ['Solidity', 'Protocol Architect', 'Figma UI/UX'],
      rolesNeed: ['Next.js Frontend', 'Wagmi / Viem Dev', 'Substreams Indexer'],
      commitmentLevel: 'hardcore',
      squadStatus: 'recruiting',
      maxSquadSize: 4,
      members: [
        { user: sarah._id, role: 'Protocol Architect', joinedAt: new Date() },
        { user: alex._id, role: 'Backend & RPC Indexing', joinedAt: new Date() },
      ],
      applicants: [
        { user: marcus._id, role: 'DevOps & Cloud Infra', pitch: 'Can run automated CI/CD for contract verification and deploy RPC nodes.', appliedAt: new Date() },
      ],
    },
    likes: [devGuest._id, alex._id, elena._id],
    savedBy: [devGuest._id],
  });
  await User.findByIdAndUpdate(sarah._id, { $push: { posts: crewPost1._id } });
  console.log(`+ Seeded Hackathon Crew Post: "${crewPost1.hackathonCrew.hackathonName}"`);

  // B. Hackathon Crew 2
  const crewPost2 = await Post.create({
    userId: alex._id,
    postType: 'hackathon_crew',
    caption: '⚡ [Team Call] Solana Radar Hackathon — Building high-frequency on-chain orderbook with zero-copy Rust',
    hackathonCrew: {
      hackathonName: 'Solana Radar Hackathon',
      squadServerId: solanaServer._id,
      targetTrack: 'Infrastructure & DePIN',
      urgencyDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      rolesHave: ['Rust Core', 'Anchor Framework'],
      rolesNeed: ['Vector DB ML Engineer', 'React Trading UI Specialist'],
      commitmentLevel: 'hardcore',
      squadStatus: 'recruiting',
      maxSquadSize: 3,
      members: [
        { user: alex._id, role: 'Rust Core Engineer', joinedAt: new Date() },
      ],
      applicants: [
        { user: elena._id, role: 'Vector DB ML Engineer', pitch: 'Extensive PyTorch and zero-latency inference pipeline experience.', appliedAt: new Date() },
      ],
    },
    likes: [sarah._id, devGuest._id],
  });
  await User.findByIdAndUpdate(alex._id, { $push: { posts: crewPost2._id } });
  console.log(`+ Seeded Hackathon Crew Post: "${crewPost2.hackathonCrew.hackathonName}"`);

  // C. Ship Log 1
  const shipPost1 = await Post.create({
    userId: devGuest._id,
    postType: 'ship_log',
    caption: '🚀 FastKV v0.3.0 Launched: Embedded Microsecond Key-Value Store in Rust with Zero GC Overhead',
    shipLog: {
      title: 'FastKV — Embedded In-Memory Key-Value Store in Rust',
      pitch: 'Designed for ultra-low latency workloads requiring sub-microsecond P99 reads with zero GC pause interruptions.',
      version: 'v0.3.0',
      demoUrl: 'https://fastkv.dev',
      repoUrl: 'https://github.com/nerdshive/fastkv',
      techStack: ['Rust', 'WebAssembly', 'Tokio', 'SIMD', 'Next.js'],
      feedbackWanted: ['Benchmark Testing', 'Code Review', 'Alpha Testers'],
      alphaTesters: [sarah._id, alex._id, elena._id],
      changelog: [
        { version: 'v0.1.0', note: 'Initial LSM-tree storage engine prototype in pure Rust', date: new Date(Date.now() - 86400000 * 14) },
        { version: 'v0.2.0', note: 'Added AVX2 SIMD acceleration for key hashing & bloom filters', date: new Date(Date.now() - 86400000 * 7) },
        { version: 'v0.3.0', note: 'WebAssembly browser runtime & interactive playground launch', date: new Date() },
      ],
    },
    likes: [sarah._id, alex._id, elena._id, marcus._id],
    savedBy: [sarah._id, alex._id],
  });
  await User.findByIdAndUpdate(devGuest._id, { $push: { posts: shipPost1._id } });
  console.log(`+ Seeded Ship Log Post: "${shipPost1.shipLog.title}"`);

  // D. Ship Log 2
  const shipPost2 = await Post.create({
    userId: elena._id,
    postType: 'ship_log',
    caption: '🚀 DeepReview v1.0.0: Context-Aware Autonomous AI Code Reviewer for GitHub Pull Requests',
    shipLog: {
      title: 'DeepReview — Autonomous AI Code Reviewer for Pull Requests',
      pitch: 'An open-source GitHub bot powered by Claude 3.5 Sonnet & DeepSeek-R1 that analyzes whole-repo ASTs to catch regressions before merge.',
      version: 'v1.0.0',
      demoUrl: 'https://deepreview.ai',
      repoUrl: 'https://github.com/nerdshive/deepreview',
      techStack: ['Python', 'FastAPI', 'PyTorch', 'Next.js', 'Docker', 'Tree-Sitter'],
      feedbackWanted: ['UI/UX Design', 'Security Audit', 'Early Adopters'],
      alphaTesters: [devGuest._id, marcus._id],
      changelog: [
        { version: 'v0.5.0', note: 'Tree-sitter AST parser integration for 12 languages', date: new Date(Date.now() - 86400000 * 10) },
        { version: 'v1.0.0', note: 'Public release with GitHub App marketplace integration', date: new Date() },
      ],
    },
    likes: [devGuest._id, sarah._id, alex._id],
    savedBy: [devGuest._id],
  });
  await User.findByIdAndUpdate(elena._id, { $push: { posts: shipPost2._id } });
  console.log(`+ Seeded Ship Log Post: "${shipPost2.shipLog.title}"`);

  // E. Media Post 1 (Image Architecture Diagram)
  const mediaPost1 = await Post.create({
    userId: devGuest._id,
    postType: 'media',
    caption: '🖥️ Production Architecture Blueprint: Dual-Tier Next.js 14 App Router + NestJS Microservices Cluster + Socket.IO Relay Bus',
    fileUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80',
    likes: [sarah._id, alex._id, marcus._id],
  });
  await User.findByIdAndUpdate(devGuest._id, { $push: { posts: mediaPost1._id } });
  console.log(`+ Seeded Media Post: Architecture Snapshot`);

  // F. Media Post 2 (Video Reel Demo)
  const mediaPost2 = await Post.create({
    userId: sarah._id,
    postType: 'media',
    caption: '🎬 WebGL Shader UI Reel: Real-time particle field rendering at 120 FPS on React 19',
    fileUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    likes: [devGuest._id, elena._id],
    savedBy: [devGuest._id],
  });
  await User.findByIdAndUpdate(sarah._id, { $push: { posts: mediaPost2._id } });
  console.log(`+ Seeded Media Post: Video Reel`);

  // 6. Seed Realistic Comments on Posts
  console.log('\n--- Seeding Discussions & Peer Comments ---');
  const commentsToSeed = [
    {
      postId: shipPost1._id.toString(),
      userId: sarah._id,
      body: 'Tested the WebAssembly playground! Query latency is consistently sub-microsecond. What hashing algorithm did you use for the bloom filter?',
    },
    {
      postId: shipPost1._id.toString(),
      userId: devGuest._id,
      body: 'Thanks Sarah! We implemented HighwayHash with SIMD AVX2 intrinsics. Yields ~4x speedup over standard Murmur3 on x86_64.',
    },
    {
      postId: crewPost1._id.toString(),
      userId: devGuest._id,
      body: 'Count me in for the Web3 frontend! I can wire up Wagmi v2 and Viem with sub-100ms optimistic state updates.',
    },
    {
      postId: shipPost2._id.toString(),
      userId: alex._id,
      body: 'The AST tree-sitter integration is clean! Does this handle monorepos with multiple language workspaces gracefully?',
    },
    {
      postId: shipPost2._id.toString(),
      userId: elena._id,
      body: 'Yes! It builds a cross-package dependency graph so changing a shared TypeScript interface flags downstream impact across packages.',
    },
    {
      postId: mediaPost1._id.toString(),
      userId: marcus._id,
      body: 'Clean architecture separation! The 180-day statutory retention policy with the soft-delete middleware keeps compliance seamless.',
    },
  ];

  for (const c of commentsToSeed) {
    const newComment = await Comment.create(c);
    await Post.findByIdAndUpdate(c.postId, { $push: { comments: newComment._id } });
  }
  console.log(`✓ Seeded ${commentsToSeed.length} peer comments.`);

  // 7. Seed Likes & Saved Posts
  const allPosts = [crewPost1, crewPost2, shipPost1, shipPost2, mediaPost1, mediaPost2];
  for (const p of allPosts) {
    if (p.likes && p.likes.length > 0) {
      for (const uId of p.likes) {
        await Like.create({ postId: p._id.toString(), userId: uId.toString() });
      }
    }
  }

  // dev_guest saved posts
  await SavedPost.create({ postId: crewPost1._id.toString(), userId: devGuest._id.toString() });
  await SavedPost.create({ postId: shipPost2._id.toString(), userId: devGuest._id.toString() });
  await SavedPost.create({ postId: mediaPost2._id.toString(), userId: devGuest._id.toString() });
  await User.findByIdAndUpdate(devGuest._id, {
    $set: { saved: [crewPost1._id, shipPost2._id, mediaPost2._id] },
  });

  console.log('\n=======================================================');
  console.log('  Database Seeding & Clean Reseed Completed Successfully!');
  console.log('=======================================================');
  console.log(`Dev Guest Account:`);
  console.log(`- Username: dev_guest`);
  console.log(`- Email:    guest@nerdshive.local`);
  console.log(`- Password: dev-guest`);
  console.log(`- Total Posts Seeded: ${allPosts.length}`);
  console.log(`  ⚡ Hackathon Crew: 2`);
  console.log(`  🚀 Project Ship Logs: 2`);
  console.log(`  🎬 Visual Media & Video Reels: 2`);
  console.log('=======================================================');

  await mongoose.disconnect();
}

seedDatabase().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
