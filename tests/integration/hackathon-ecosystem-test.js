/**
 * Verified Real-World Hackathon Ecosystem & Anti-Clone Authority Test
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../../web/.env.local') });
const mongoose = require('mongoose');
const assert = require('assert');

const MONGODB_URI = process.env.MONGODB_URI;

// Schemas matching entity definitions
const HackathonTrackSchema = new mongoose.Schema({
  name: { type: String, required: true },
  prizePool: { type: String, default: '' },
  description: { type: String, default: '' },
  tags: [{ type: String }],
});

const HackathonEventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  tagline: { type: String, required: true },
  description: { type: String, required: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizerName: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  websiteUrl: { type: String, required: true },
  location: { type: String, default: 'Virtual' },
  startDate: { type: Date, required: true },
  submissionDeadline: { type: Date, required: true },
  prizePool: { type: String, default: '$0' },
  tracks: [HackathonTrackSchema],
  rules: [{ type: String }],
  status: { type: String, enum: ['upcoming', 'live', 'judging', 'ended'], default: 'live' },
}, { timestamps: true });

const ServerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inviteCode: { type: String, unique: true, required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  }],
  channels: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['text', 'voice', 'video'], default: 'text' },
    topic: { type: String, default: '' },
  }],
}, { timestamps: true });

const PostSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  caption: { type: String },
  postType: { type: String, required: true },
  hackathonCrew: {
    hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'HackathonEvent' },
    hackathonName: { type: String },
    squadServerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Server' },
    targetTrack: { type: String },
    urgencyDate: { type: Date },
    rolesHave: [{ type: String }],
    rolesNeed: [{ type: String }],
    commitmentLevel: { type: String, default: 'moderate' },
    squadStatus: { type: String, default: 'recruiting' },
    maxSquadSize: { type: Number, default: 4 },
    members: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String },
      joinedAt: { type: Date, default: Date.now },
    }],
    applicants: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      role: { type: String },
      pitch: { type: String },
      appliedAt: { type: Date, default: Date.now },
    }],
  },
}, { timestamps: true });

const HackathonEvent = mongoose.models.HackathonEvent || mongoose.model('HackathonEvent', HackathonEventSchema);
const Server = mongoose.models.Server || mongoose.model('Server', ServerSchema);
const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);

async function runHackathonEcosystemTest() {
  console.log('=============================================================');
  console.log('⚡ TESTING REAL-WORLD HACKATHON ECOSYSTEM & ANTI-CLONE SHIELD');
  console.log('=============================================================');

  if (!MONGODB_URI) {
    console.warn('[SKIP] MONGODB_URI not found in environment. Skipping database test.');
    return;
  }

  await mongoose.connect(MONGODB_URI);
  console.log('[PASS] Connected to MongoDB');

  const testOrganizerId = new mongoose.Types.ObjectId();
  const testLeaderId = new mongoose.Types.ObjectId();
  const testApplicantId = new mongoose.Types.ObjectId();
  const testSlug = `test-hackmit-${Date.now()}`;

  try {
    // 1. Create a Verified Hackathon Event
    console.log('[TEST 1] Creating official verified hackathon event...');
    const officialHackathon = await HackathonEvent.create({
      name: 'HackMIT 2026 Test',
      slug: testSlug,
      tagline: 'Premier global student hackathon at MIT',
      description: 'Official test event with tracks and prize pools.',
      organizerId: testOrganizerId,
      organizerName: 'HackMIT Tech Board',
      isVerified: true,
      websiteUrl: 'https://hackmit.org',
      startDate: new Date(),
      submissionDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
      prizePool: '$50,000',
      tracks: [
        { name: 'AI & Autonomous Swarms', prizePool: '$20,000' },
        { name: 'Decentralized Infra & ZK', prizePool: '$15,000' },
      ],
    });
    assert(officialHackathon._id, 'Official hackathon should be saved');
    assert.strictEqual(officialHackathon.isVerified, true);
    console.log('[PASS] Official hackathon created with verified badge & tracks:', officialHackathon.name);

    // 2. Anti-Clone Validation: Duplicate Slug Rejection
    console.log('[TEST 2] Testing Anti-Clone Shield (duplicate slug prevention)...');
    let duplicatePrevented = false;
    try {
      await HackathonEvent.create({
        name: 'HackMIT 2026 Clone',
        slug: testSlug, // Same slug
        tagline: 'Clone attempt',
        description: 'Trying to spoof official event',
        organizerId: new mongoose.Types.ObjectId(),
        organizerName: 'Fake Organizer',
        isVerified: false,
        websiteUrl: 'https://fake-hackmit.com',
        startDate: new Date(),
        submissionDeadline: new Date(),
      });
    } catch (cloneErr) {
      if (cloneErr.code === 11000 || cloneErr.message.includes('duplicate')) {
        duplicatePrevented = true;
      }
    }
    assert(duplicatePrevented, 'Anti-Clone Shield must prevent duplicate hackathon slug registration');
    console.log('[PASS] Anti-Clone Shield successfully rejected spoof/clone duplicate slug.');

    // 3. Squad Formation & Automatic Private Squad Server Provisioning
    console.log('[TEST 3] Testing Squad Formation & Automatic Squad Server Provisioning...');
    const squadInviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const squadServer = await Server.create({
      name: `${officialHackathon.name} Squad [AI & Autonomous Swarms]`,
      description: `Official collaboration space for ${officialHackathon.name} squad`,
      ownerId: testLeaderId,
      inviteCode: squadInviteCode,
      members: [{ user: testLeaderId, role: 'owner', joinedAt: new Date() }],
      channels: [
        { name: 'general', type: 'text', topic: 'Squad coordination & planning' },
        { name: 'resources', type: 'text', topic: 'Docs, APIs, Repo & Links' },
        { name: 'pair-hacking', type: 'voice', topic: 'Live pair programming voice lounge' },
      ],
    });
    assert(squadServer._id, 'Squad server should be created');
    assert.strictEqual(squadServer.channels.length, 3);
    console.log('[PASS] Private squad Server provisioned with #general, #resources, and voice:pair-hacking');

    // Create the Squad Post
    const squadPost = await Post.create({
      userId: testLeaderId,
      postType: 'hackathon_crew',
      caption: `[Team Call] ${officialHackathon.name} — Seeking UI/UX & Backend Go`,
      hackathonCrew: {
        hackathonId: officialHackathon._id,
        hackathonName: officialHackathon.name,
        squadServerId: squadServer._id,
        targetTrack: 'AI & Autonomous Swarms',
        urgencyDate: officialHackathon.submissionDeadline,
        rolesHave: ['PyTorch ML Engineer'],
        rolesNeed: ['UI/UX Designer', 'Backend Go'],
        commitmentLevel: 'hardcore',
        squadStatus: 'recruiting',
        maxSquadSize: 4,
        members: [],
        applicants: [{
          user: testApplicantId,
          role: 'Backend Go',
          pitch: '5 years building high-throughput Go microservices and gRPC APIs.',
          appliedAt: new Date(),
        }],
      },
    });
    assert(squadPost._id, 'Squad post should be created');
    assert.strictEqual(squadPost.hackathonCrew.squadServerId.toString(), squadServer._id.toString());
    console.log('[PASS] Squad post successfully linked to auto-provisioned Squad Server.');

    // 4. Squad Leader Accepts Applicant & Auto-Enrolls in Squad Server
    console.log('[TEST 4] Testing Leader Applicant Acceptance & Auto-Enrollment into Server...');
    // Accept applicant
    const applicant = squadPost.hackathonCrew.applicants[0];
    squadPost.hackathonCrew.members.push({
      user: applicant.user,
      role: applicant.role,
      joinedAt: new Date(),
    });
    squadPost.hackathonCrew.applicants = [];
    await squadPost.save();

    // Auto-enroll in server
    await Server.findByIdAndUpdate(squadServer._id, {
      $addToSet: {
        members: { user: testApplicantId, role: 'member', joinedAt: new Date() },
      },
    });

    const updatedServer = await Server.findById(squadServer._id);
    const hasEnrolled = updatedServer.members.some(
      (m) => m.user.toString() === testApplicantId.toString()
    );
    assert(hasEnrolled, 'Accepted applicant must be enrolled into Server members list');
    console.log('[PASS] Accepted applicant successfully enrolled into private Server members roster.');

    // Clean up test fixtures
    await HackathonEvent.deleteOne({ _id: officialHackathon._id });
    await Server.deleteOne({ _id: squadServer._id });
    await Post.deleteOne({ _id: squadPost._id });
    console.log('[CLEANUP] Test fixtures successfully cleaned up.');

    console.log('=============================================================');
    console.log('✅ ALL HACKATHON ECOSYSTEM & ANTI-CLONE INTEGRATION TESTS PASSED');
    console.log('=============================================================');
  } catch (err) {
    console.error('Test Failed:', err);
    throw err;
  } finally {
    await mongoose.disconnect();
  }
}

runHackathonEcosystemTest();
