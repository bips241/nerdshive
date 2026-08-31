/**
 * NerdShive Production-Grade Database Seeder
 * Populates real MongoDB cluster with dev guest account, teammates, posts, and interactions.
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
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  saved: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Like' }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
}, { timestamps: true });

const PostSchema = new mongoose.Schema({
  caption: { type: String },
  fileUrl: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  postType: { type: String, enum: ['media', 'poll', 'goal', 'project'], default: 'media' },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Like' }],
  savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  poll: {
    question: { type: String },
    options: [{ text: { type: String }, votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] }],
  },
  goal: {
    description: { type: String },
    goalTargetDate: { type: Date },
    interestedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  project: {
    title: { type: String },
    description: { type: String },
    techStack: [{ type: String }],
    repoUrl: { type: String },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
}, { timestamps: true });

const FollowsSchema = new mongoose.Schema({
  followerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  followingId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const LikeSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const CommentSchema = new mongoose.Schema({
  body: { type: String, required: true },
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

const ProjectRequestSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true });

const PollVoteSchema = new mongoose.Schema({
  pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  selectedOptionIndex: { type: Number, required: true },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
const Follows = mongoose.models.Follows || mongoose.model('Follows', FollowsSchema);
const Like = mongoose.models.Like || mongoose.model('Like', LikeSchema);
const Comment = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);
const ProjectRequest = mongoose.models.ProjectRequest || mongoose.model('ProjectRequest', ProjectRequestSchema);
const PollVote = mongoose.models.PollVote || mongoose.model('PollVote', PollVoteSchema);

async function seedDatabase() {
  console.log('Connecting to MongoDB Atlas cluster...');
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log(' Connected to MongoDB!');

  const hashedPassword = await bcrypt.hash('dev-guest', 10);

  // 1. Seed Developer Accounts
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
      isVerified: true,
    },
    {
      user_name: 'sarah_dev',
      email: 'sarah@nerdshive.local',
      password: hashedPassword,
      name: 'Sarah Chen',
      bio: '⚛️ Frontend Architect & UI/UX Geek | React 19, TailwindCSS, Motion Systems | Ex-Stripe.',
      website: 'https://sarahchen.dev',
      repo: 'https://github.com/sarahchen/ui-toolkit',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
      role: 'developer',
      isVerified: true,
    },
    {
      user_name: 'alex_cloud',
      email: 'alex@nerdshive.local',
      password: hashedPassword,
      name: 'Alex Rivera',
      bio: '☁️ Distributed Systems & Backend Wizard | Go, gRPC, Redis Streams & NestJS microservices.',
      website: 'https://alexrivera.io',
      repo: 'https://github.com/alexrivera/distributed-cache',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      role: 'developer',
      isVerified: true,
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
      isVerified: true,
    },
    {
      user_name: 'marcus_ops',
      email: 'marcus@nerdshive.local',
      password: hashedPassword,
      name: 'Marcus Brody',
      bio: '⚙️ Cloud Infrastructure & DevOps Lead | Kubernetes, Terraform, ArgoCD & 99.999% SLA.',
      website: 'https://marcusbrody.tech',
      repo: 'https://github.com/marcusbrody/k8s-manifests',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      role: 'developer',
      isVerified: true,
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

  // 2. Mutual Follows (ensures Messages page shows active chat partners!)
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
  ];

  for (const [followerId, followingId] of followPairs) {
    await Follows.findOneAndUpdate(
      { followerId, followingId },
      { followerId, followingId },
      { upsert: true, new: true }
    );
  }
  console.log(`✓ Seeded ${followPairs.length} follow graph relations.`);

  // 3. Seed Realistic Posts (Project, Poll, Goal, Media)
  console.log('\n--- Seeding Community Posts & Collaboration Feeds ---');
  
  // Project 1
  let proj1 = await Post.findOne({ 'project.title': 'Distributed WebRTC Mesh Signaling Engine' });
  if (!proj1) {
    proj1 = await Post.create({
      postType: 'project',
      userId: alex._id,
      caption: 'Looking for 2 engineers experienced in Socket.IO and WebRTC TURN/STUN relay routing.',
      project: {
        title: 'Distributed WebRTC Mesh Signaling Engine',
        description: 'Building an ultra-low latency mesh routing relay for real-time video pairing and code collaboration roulette.',
        techStack: ['Node.js', 'Socket.IO', 'Redis', 'WebRTC', 'TypeScript'],
        repoUrl: 'https://github.com/nerdshive/signaling-server',
        members: [alex._id],
      },
    });
    await User.findByIdAndUpdate(alex._id, { $push: { posts: proj1._id } });
    console.log(`+ Created Project: "${proj1.project.title}"`);
  }

  // Project 2
  let proj2 = await Post.findOne({ 'project.title': 'AI Automated Code Review & PR Assistant' });
  if (!proj2) {
    proj2 = await Post.create({
      postType: 'project',
      userId: elena._id,
      caption: 'Building an autonomous agent that catches architectural regressions before merging.',
      project: {
        title: 'AI Automated Code Review & PR Assistant',
        description: 'Context-aware GitHub bot powered by Deepseek / Claude 3.5 Sonnet to benchmark PR performance and schema consistency.',
        techStack: ['Python', 'FastAPI', 'Next.js', 'PyTorch', 'Docker'],
        repoUrl: 'https://github.com/nerdshive/ai-code-reviewer',
        members: [elena._id],
      },
    });
    await User.findByIdAndUpdate(elena._id, { $push: { posts: proj2._id } });
    console.log(`+ Created Project: "${proj2.project.title}"`);
  }

  // Poll Post
  let poll1 = await Post.findOne({ 'poll.question': 'Which backend runtime is your primary choice in 2026?' });
  if (!poll1) {
    poll1 = await Post.create({
      postType: 'poll',
      userId: sarah._id,
      caption: 'Curious what the developer community is adopting for high-throughput microservices.',
      poll: {
        question: 'Which backend runtime is your primary choice in 2026?',
        options: [
          { text: 'Node.js 22 LTS / NestJS', votes: [devGuest._id, alex._id] },
          { text: 'Go / gRPC Microservices', votes: [marcus._id] },
          { text: 'Rust (Actix / Axum)', votes: [elena._id] },
          { text: 'Bun / ElysiaJS', votes: [] },
        ],
      },
    });
    await User.findByIdAndUpdate(sarah._id, { $push: { posts: poll1._id } });
    console.log(`+ Created Poll: "${poll1.poll.question}"`);
  }

  // Goal Post
  let goal1 = await Post.findOne({ 'goal.description': 'Deploy NerdShive to 20,000+ developers with 99.99% uptime' });
  if (!goal1) {
    goal1 = await Post.create({
      postType: 'goal',
      userId: devGuest._id,
      caption: 'Platform milestone goal for our global launch!',
      goal: {
        description: 'Deploy NerdShive to 20,000+ developers with 99.99% uptime',
        goalTargetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        interestedUsers: [sarah._id, alex._id, elena._id, marcus._id],
      },
    });
    await User.findByIdAndUpdate(devGuest._id, { $push: { posts: goal1._id } });
    console.log(`+ Created Goal: "${goal1.goal.description}"`);
  }

  // Media Post / Reel
  let media1 = await Post.findOne({ caption: '🚀 System Architecture Preview: NestJS gRPC Microservices Cluster & Redis Event Bus' });
  if (!media1) {
    media1 = await Post.create({
      postType: 'media',
      userId: devGuest._id,
      caption: '🚀 System Architecture Preview: NestJS gRPC Microservices Cluster & Redis Event Bus',
      fileUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
    });
    await User.findByIdAndUpdate(devGuest._id, { $push: { posts: media1._id } });
    console.log(`+ Created Media Post: "${media1.caption}"`);
  }

  // 4. Project Collaboration Request
  if (proj1) {
    await ProjectRequest.findOneAndUpdate(
      { projectId: proj1._id, requesterId: devGuest._id },
      { projectId: proj1._id, requesterId: devGuest._id, status: 'accepted' },
      { upsert: true, new: true }
    );
    console.log(`✓ Seeded Collaboration Request on Project "${proj1.project.title}"`);
  }

  // 5. Poll Votes
  if (poll1) {
    await PollVote.findOneAndUpdate(
      { pollId: poll1._id, userId: devGuest._id },
      { pollId: poll1._id, userId: devGuest._id, selectedOptionIndex: 0 },
      { upsert: true, new: true }
    );
    console.log(`✓ Seeded Poll Vote by @dev_guest`);
  }

  console.log('\n=======================================================');
  console.log('  Database Seeding Completed Successfully!');
  console.log('=======================================================');
  console.log(`Dev Guest Account:`);
  console.log(`- Username: dev_guest`);
  console.log(`- Email:    guest@nerdshive.local`);
  console.log(`- Password: dev-guest`);
  console.log(`- MongoDB ObjectId: ${devGuest._id}`);
  console.log('=======================================================');

  await mongoose.disconnect();
}

seedDatabase().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
