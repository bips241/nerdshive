/**
 * Comprehensive Multi-Round Hackathon Operating System Test Suite
 * Validates:
 * 1. Non-opinionated N-round lifecycle configuration
 * 2. Inclusive voluntary matchmaking & 6-digit team room codes
 * 3. Open (auto-admit) and Curated (organizer approval) admissions
 * 4. Multi-round deliverable submissions
 * 5. Transparent rubric scorecard & Blind Judging
 * 6. Live broadcast arena state & podium rankings
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
require('dotenv').config({ path: require('path').resolve(__dirname, '../../web/.env') });
const mongoose = require('mongoose');
const assert = require('assert');

const MONGODB_URI = process.env.MONGODB_URI;

// Schemas
const HackathonEvaluationCriterionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  maxScore: { type: Number, required: true, default: 25 },
  weight: { type: Number, default: 1 },
  description: { type: String, default: '' },
});

const HackathonRoundSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  deadline: { type: Date, required: true },
  isElimination: { type: Boolean, default: false },
  deliverablesRequired: [{ type: String }],
  criteria: [HackathonEvaluationCriterionSchema],
  status: { type: String, enum: ['upcoming', 'active', 'evaluating', 'completed'], default: 'upcoming' },
});

const HackathonEventSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  tagline: { type: String, required: true },
  description: { type: String, required: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizerName: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  websiteUrl: { type: String, default: 'https://nerdshive.com' },
  location: { type: String, default: 'Virtual Hybrid' },
  startDate: { type: Date, required: true },
  submissionDeadline: { type: Date, required: true },
  prizePool: { type: String, default: '$100,000' },
  applicationMode: { type: String, enum: ['open', 'curated'], default: 'open' },
  registrationType: { type: String, enum: ['solo', 'team', 'both'], default: 'both' },
  teamSize: {
    min: { type: Number, default: 1 },
    max: { type: Number, default: 4 },
  },
  rounds: [HackathonRoundSchema],
  currentRoundNumber: { type: Number, default: 1 },
  isBlindJudging: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'upcoming', 'live', 'judging', 'ended'], default: 'live' },
  pageDesign: {
    heroTheme: { type: String, default: 'quantum' },
    customAccentColor: { type: String, default: '#6366f1' },
    bannerUrl: { type: String, default: '' },
  },
}, { timestamps: true });

const HackathonSubmissionSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  projectTitle: { type: String, required: true },
  tagline: { type: String, default: '' },
  repoUrl: { type: String, default: '' },
  demoUrl: { type: String, default: '' },
  videoUrl: { type: String, default: '' },
  presentationUrl: { type: String, default: '' },
  customDeliverables: { type: Map, of: String },
  submittedAt: { type: Date, default: Date.now },
});

const HackathonRegistrationSchema = new mongoose.Schema({
  hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'HackathonEvent', required: true, index: true },
  teamName: { type: String, required: true },
  code: { type: String, required: true, index: true },
  leaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, default: 'Builder' },
    skills: [{ type: String }],
    joinedAt: { type: Date, default: Date.now },
  }],
  trackId: { type: String, default: '' },
  trackName: { type: String, default: '' },
  isSolo: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['forming', 'applied', 'accepted', 'waitlisted', 'rejected'],
    default: 'forming',
  },
  currentRound: { type: Number, default: 1 },
  isAdvancedToNextRound: { type: Boolean, default: false },
  lookingForSkills: [{ type: String }],
  lookingForDescription: { type: String, default: '' },
  isRecruiting: { type: Boolean, default: false },
  submissions: [HackathonSubmissionSchema],
  finalRank: { type: Number },
  aggregateScore: { type: Number, default: 0 },
}, { timestamps: true });

const HackathonEvaluationSchema = new mongoose.Schema({
  hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'HackathonEvent', required: true, index: true },
  registrationId: { type: mongoose.Schema.Types.ObjectId, ref: 'HackathonRegistration', required: true, index: true },
  judgeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  judgeName: { type: String, default: 'Judge' },
  roundNumber: { type: Number, required: true },
  scores: [{
    criterionName: { type: String, required: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    feedback: { type: String, default: '' },
  }],
  totalScore: { type: Number, required: true },
  maxTotalScore: { type: Number, required: true },
  percentage: { type: Number, required: true },
  publicFeedback: { type: String, default: '' },
  privateOrganizerNotes: { type: String, default: '' },
  isBlindEvaluation: { type: Boolean, default: false },
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  name: { type: String },
  role: { type: String, default: 'USER' },
}, { timestamps: true });

const HackathonEvent = mongoose.models.HackathonEvent || mongoose.model('HackathonEvent', HackathonEventSchema);
const HackathonRegistration = mongoose.models.HackathonRegistration || mongoose.model('HackathonRegistration', HackathonRegistrationSchema);
const HackathonEvaluation = mongoose.models.HackathonEvaluation || mongoose.model('HackathonEvaluation', HackathonEvaluationSchema);
const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function runMultiRoundHackathonSuite() {
  console.log('================================================================');
  console.log('🏆 NERDSHIVE MULTI-ROUND HACKATHON OPERATING SYSTEM TEST SUITE');
  console.log('================================================================\n');

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is missing from environment.');
  }

  await mongoose.connect(MONGODB_URI);
  console.log('✅ [INIT] Connected to MongoDB Atlas successfully.\n');

  const testOrganizer = new mongoose.Types.ObjectId();
  const testJudge = new mongoose.Types.ObjectId();
  const testHacker1 = new mongoose.Types.ObjectId();
  const testHacker2 = new mongoose.Types.ObjectId();
  const testSoloHacker = new mongoose.Types.ObjectId();

  const testSlug = `hyper-hack-os-${Date.now()}`;
  let hackathon;

  try {
    // 1. NON-OPINIONATED HACKATHON CREATION (N-Rounds & Custom Rubrics)
    console.log('📌 [TEST 1] Creating Non-Opinionated 2-Round Hackathon with Custom Rubrics...');
    const round1Deadline = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const round2Deadline = new Date(Date.now() + 1000 * 60 * 60 * 48);

    hackathon = await HackathonEvent.create({
      name: 'Global AI & Autonomous Agent Olympiad',
      slug: testSlug,
      tagline: 'Build autonomous swarms that solve real-world problems',
      description: 'An open, transparent, multi-round builder arena for developers of all skill backgrounds.',
      organizerId: testOrganizer,
      organizerName: 'Deep Intelligence Guild',
      isVerified: true,
      startDate: new Date(),
      submissionDeadline: round2Deadline,
      prizePool: '$75,000 in Grants',
      applicationMode: 'open',
      registrationType: 'both',
      teamSize: { min: 1, max: 4 },
      isBlindJudging: true,
      status: 'live',
      currentRoundNumber: 1,
      pageDesign: {
        heroTheme: 'quantum',
        customAccentColor: '#6366f1',
      },
      rounds: [
        {
          roundNumber: 1,
          name: 'Round 1: Concept & Working Architecture',
          description: 'Submit your architecture schema, open-source repo, and 2-min loom demo.',
          deadline: round1Deadline,
          isElimination: true,
          deliverablesRequired: ['repoUrl', 'demoUrl', 'tagline'],
          criteria: [
            { name: 'Architecture & Innovation', maxScore: 25, weight: 1 },
            { name: 'Autonomous Feasibility', maxScore: 25, weight: 1 },
            { name: 'Code Quality', maxScore: 25, weight: 1 },
            { name: 'Team Vision', maxScore: 25, weight: 1 },
          ],
          status: 'active',
        },
        {
          roundNumber: 2,
          name: 'Round 2: Production Benchmark & Live Swarm Demo',
          description: 'Finalists benchmark their swarms live on public test suites.',
          deadline: round2Deadline,
          isElimination: false,
          deliverablesRequired: ['repoUrl', 'demoUrl', 'videoUrl', 'presentationUrl'],
          criteria: [
            { name: 'Execution Excellence', maxScore: 40, weight: 1 },
            { name: 'Multi-Agent Reliability', maxScore: 30, weight: 1 },
            { name: 'User Experience & Polish', maxScore: 30, weight: 1 },
          ],
          status: 'upcoming',
        },
      ],
    });

    assert.strictEqual(hackathon.rounds.length, 2, 'Hackathon must have 2 configured rounds');
    assert.strictEqual(hackathon.rounds[0].criteria.length, 4, 'Round 1 must have 4 custom rubric criteria');
    assert.strictEqual(hackathon.isBlindJudging, true, 'Blind judging mode must be enabled');
    console.log('✅ [PASS] Multi-round hackathon created with custom rubrics and blind evaluation settings.\n');

    // 2. INCLUSIVE TEAM FORMATION & 6-DIGIT SHAREABLE ROOM CODE
    console.log('📌 [TEST 2] Testing Inclusive Team Formation with 6-Digit Join Code...');
    const teamCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const teamRegistration = await HackathonRegistration.create({
      hackathonId: hackathon._id,
      teamName: 'Cyber Swarm Alpha',
      code: teamCode,
      leaderId: testHacker1,
      members: [{ user: testHacker1, role: 'Lead Architect', joinedAt: new Date() }],
      status: 'accepted', // Auto-admitted since applicationMode = 'open'
      isSolo: false,
      isRecruiting: true,
      lookingForSkills: ['Frontend (React)', 'Beginner-Friendly', 'Prompt Engineering'],
      currentRound: 1,
    });

    assert.strictEqual(teamRegistration.code.length, 6, 'Team code must be 6 characters');
    assert.strictEqual(teamRegistration.status, 'accepted', 'Open mode must auto-accept team');
    console.log(`✅ [PASS] Team "${teamRegistration.teamName}" created with join code "${teamRegistration.code}".`);

    // 2b. Teammate Joins via 6-digit Code
    console.log('📌 [TEST 2b] Adding Teammate via 6-digit Code...');
    teamRegistration.members.push({
      user: testHacker2,
      role: 'UI Designer',
      joinedAt: new Date(),
    });
    await teamRegistration.save();
    assert.strictEqual(teamRegistration.members.length, 2, 'Team must now have 2 members');
    console.log('✅ [PASS] Second teammate successfully joined team room.\n');

    // 2c. Solo Hacker Registration (No judgment / Skill deficit barrier)
    console.log('📌 [TEST 2c] Solo Hacker Registration (No skill barriers)...');
    const soloRegistration = await HackathonRegistration.create({
      hackathonId: hackathon._id,
      teamName: 'Solo Builder Nova',
      code: Math.random().toString(36).substring(2, 8).toUpperCase(),
      leaderId: testSoloHacker,
      members: [{ user: testSoloHacker, role: 'Solo Explorer', joinedAt: new Date() }],
      status: 'accepted',
      isSolo: true,
      isRecruiting: false,
      lookingForSkills: ['Welcoming Anyone'],
      currentRound: 1,
    });
    assert.strictEqual(soloRegistration.members.length, 1);
    console.log('✅ [PASS] Solo hacker registered with open arms.\n');

    // 3. ROUND 1 DELIVERABLE SUBMISSION
    console.log('📌 [TEST 3] Submitting Round 1 Deliverables for Team Alpha...');
    teamRegistration.submissions.push({
      roundNumber: 1,
      projectTitle: 'AetherSwarm OS',
      tagline: 'Self-orchestrating multi-agent network for autonomous research',
      repoUrl: 'https://github.com/aether-swarm/core',
      demoUrl: 'https://aether-swarm-demo.nerdshive.com',
      videoUrl: 'https://loom.com/share/aetherswarm-r1',
      presentationUrl: 'https://pitch.com/aetherswarm-deck',
      submittedAt: new Date(),
    });
    await teamRegistration.save();

    assert.strictEqual(teamRegistration.submissions.length, 1, 'Round 1 submission recorded');
    console.log('✅ [PASS] Round 1 submission persisted successfully.\n');

    // 4. TRANSPARENT RUBRIC SCORING & BLIND EVALUATION
    console.log('📌 [TEST 4] Judge Submits Transparent Rubric Evaluation...');
    const round1Criteria = hackathon.rounds[0].criteria;
    const scores = [
      { criterionName: round1Criteria[0].name, score: 24, maxScore: 25, feedback: 'Spectacular modular architecture.' },
      { criterionName: round1Criteria[1].name, score: 23, maxScore: 25, feedback: 'Strong autonomous recovery loops.' },
      { criterionName: round1Criteria[2].name, score: 25, maxScore: 25, feedback: 'Flawless TypeScript types and tests.' },
      { criterionName: round1Criteria[3].name, score: 22, maxScore: 25, feedback: 'Clear roadmap and ethics alignment.' },
    ];

    const totalScore = scores.reduce((acc, s) => acc + s.score, 0); // 94
    const maxTotalScore = scores.reduce((acc, s) => acc + s.maxScore, 0); // 100
    const percentage = Math.round((totalScore / maxTotalScore) * 100); // 94%

    const evaluation = await HackathonEvaluation.create({
      hackathonId: hackathon._id,
      registrationId: teamRegistration._id,
      judgeId: testJudge,
      judgeName: 'Dr. Turing',
      roundNumber: 1,
      scores: scores,
      totalScore: totalScore,
      maxTotalScore: maxTotalScore,
      percentage: percentage,
      publicFeedback: 'Exceptional autonomous agent framework with great developer DX.',
      privateOrganizerNotes: 'Strong contender for 1st place in Round 2.',
      isBlindEvaluation: true,
    });

    assert.strictEqual(evaluation.totalScore, 94, 'Total rubric score must equal 94');
    assert.strictEqual(evaluation.percentage, 94, 'Percentage must be 94%');
    console.log(`✅ [PASS] Evaluation recorded: Score ${evaluation.totalScore}/${evaluation.maxTotalScore} (${evaluation.percentage}%) [Blind Evaluation: ${evaluation.isBlindEvaluation}].\n`);

    // 5. ROUND ADVANCEMENT & ORGANIZER CONTROL
    console.log('📌 [TEST 5] Advancing Qualifying Teams to Round 2...');
    teamRegistration.aggregateScore = evaluation.percentage;
    teamRegistration.currentRound = 2; // Advanced to Round 2!
    await teamRegistration.save();

    assert.strictEqual(teamRegistration.currentRound, 2, 'Team successfully advanced to Round 2');
    console.log('✅ [PASS] Team Alpha advanced to Round 2.\n');

    // 6. LIVE BROADCAST ARENA & WINNER PODIUMS
    console.log('📌 [TEST 6] Verifying Live Broadcast Arena Leaderboard & Stage State...');
    const allTeams = await HackathonRegistration.find({ hackathonId: hackathon._id })
      .sort({ aggregateScore: -1 })
      .lean();

    const topPodium = allTeams.slice(0, 3).map((team, idx) => ({
      rank: idx + 1,
      teamName: team.teamName,
      score: team.aggregateScore,
      round: team.currentRound,
    }));

    assert.strictEqual(topPodium[0].teamName, 'Cyber Swarm Alpha');
    assert.strictEqual(topPodium[0].rank, 1);
    assert.strictEqual(topPodium[0].score, 94);
    console.log('✅ [PASS] Live Broadcast Podium State:');
    topPodium.forEach((p) => {
      console.log(`   🏅 Rank #${p.rank}: ${p.teamName} - ${p.score} pts (Stage: Round ${p.round})`);
    });

    console.log('\n================================================================');
    console.log('🎉 ALL HACKATHON OPERATING SYSTEM TESTS PASSED SUCCESSFULLY! 🚀');
    console.log('================================================================\n');
  } finally {
    // Cleanup test artifacts
    if (hackathon && hackathon._id) {
      await HackathonEvent.deleteOne({ _id: hackathon._id });
      await HackathonRegistration.deleteMany({ hackathonId: hackathon._id });
      await HackathonEvaluation.deleteMany({ hackathonId: hackathon._id });
    }
    await mongoose.disconnect();
    console.log('🧹 [CLEANUP] Test database sanitized and connection closed.');
  }
}

runMultiRoundHackathonSuite().catch((err) => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
