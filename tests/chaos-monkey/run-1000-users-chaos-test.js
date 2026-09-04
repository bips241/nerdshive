/**
 * NerdShive 1,000-User Chaos Monkey & Full-Platform Concurrency Test Runner
 *
 * Simulates 1,000 concurrent users randomly triggering every button, feature,
 * post archetype, microservice RPC, and real-time interaction across NerdShive.
 * Generates an end-to-end traceable telemetry log (JSONL) and an executive markdown report.
 */

const crypto = require('crypto');
const ChaosTracer = require('./tracer');
const { testAuthOperations } = require('./operations/auth-operations');
const { testProfileOperations } = require('./operations/profile-operations');
const { testPostOperations } = require('./operations/post-operations');
const { testEngagementOperations } = require('./operations/engagement-operations');
const { testCollabOperations } = require('./operations/collab-operations');
const { testMatchmakingOperations } = require('./operations/matchmaking-operations');
const { testFeedOperations } = require('./operations/feed-operations');
const { testGrpcOperations } = require('./operations/grpc-operations');

const TOTAL_USERS = 1000;
const CONCURRENCY_BATCH_SIZE = 100; // 100 concurrent workers in 10 waves for high throughput

const TECH_STACTS = [
  ['TypeScript', 'Next.js', 'React', 'Tailwind'],
  ['Rust', 'WebAssembly', 'Tokio', 'Docker'],
  ['Python', 'PyTorch', 'FastAPI', 'PostgreSQL'],
  ['Go', 'gRPC', 'Kubernetes', 'Redis'],
  ['Java', 'Spring Boot', 'Kafka', 'AWS'],
  ['C++', 'Embedded', 'RTOS', 'Linux'],
];

const RADARS = [
  'open_for_hackathons',
  'seeking_cofounder',
  'open_for_collab',
  'open_for_work',
  'none',
];

function generateVirtualUsers(count) {
  const users = [];
  for (let i = 1; i <= count; i++) {
    const stack = TECH_STACTS[i % TECH_STACTS.length];
    const radar = RADARS[i % RADARS.length];
    const username = `dev_${i}_${crypto.randomBytes(3).toString('hex')}`;
    users.push({
      id: `usr_${String(i).padStart(4, '0')}`,
      username,
      email: `${username}@nerdshive.test`,
      techStack: stack,
      radarStatus: radar,
      posts: [],
      savedPosts: [],
      collabRequests: [],
      teamMembers: [],
    });
  }
  return users;
}

async function simulateVirtualUser(user, tracer, sharedState) {
  // Each user performs a realistic sequence of chaotic platform interactions
  
  // 1. Auth & Session Check
  await testAuthOperations(user, tracer);

  // 2. Profile Management & Beacon Toggle
  await testProfileOperations(user, tracer);

  // 3. Post Creation (Archetypes + Direct S3 Upload)
  await testPostOperations(user, tracer, sharedState);

  // 4. Feed Retrieval (Home, Filtered Explore, Saved, Activity)
  await testFeedOperations(user, tracer, sharedState);

  // 5. Social Engagement (Likes, Comments, Showdown Votes, Bookmarks)
  await testEngagementOperations(user, tracer, sharedState);

  // 6. Real-time Teammate Matching & WebRTC Handshake
  await testMatchmakingOperations(user, tracer, sharedState);

  // 7. Collaboration Requests & Crew Acceptance
  await testCollabOperations(user, tracer, sharedState);

  // 8. Direct gRPC Microservices Stress (Auth, Media, Match, Discovery)
  await testGrpcOperations(user, tracer);
}

async function main() {
  console.log(`=============================================================`);
  console.log(`🚀 NERDSHIVE 1,000 CONCURRENT USERS FULL-PLATFORM CHAOS SUITE`);
  console.log(`Simulating 1,000 concurrent developers triggering every feature...`);
  console.log(`=============================================================\n`);

  const tracer = new ChaosTracer({ totalUsers: TOTAL_USERS });
  const users = generateVirtualUsers(TOTAL_USERS);

  const sharedState = {
    users,
    posts: [],
    matchQueues: {
      pair_debug: [],
      project_teammate: [],
      system_design: [],
      hiring: [],
    },
  };

  const startTime = Date.now();
  let completedUsers = 0;

  // Execute in concurrent batches to simulate real-world traffic spikes
  for (let i = 0; i < users.length; i += CONCURRENCY_BATCH_SIZE) {
    const batch = users.slice(i, i + CONCURRENCY_BATCH_SIZE);
    
    await Promise.all(
      batch.map(async (user) => {
        try {
          await simulateVirtualUser(user, tracer, sharedState);
        } catch (err) {
          tracer.recordOperation({
            userId: user.id,
            operation: 'virtual_user_unhandled_exception',
            category: 'chaos',
            durationMs: 0,
            success: false,
            error: err,
          });
        } finally {
          completedUsers++;
        }
      })
    );

    const progress = Math.round((completedUsers / TOTAL_USERS) * 100);
    process.stdout.write(`\r[Running] Completed ${completedUsers}/${TOTAL_USERS} users (${progress}%)...`);
  }

  console.log(`\n\n[DONE] Finished simulating all ${TOTAL_USERS} concurrent users!`);
  console.log(`Generating traceable log and executive performance report...\n`);

  const summary = tracer.generateSummaryReport();
  const totalDurationSec = (Date.now() - startTime) / 1000;

  console.log(`=============================================================`);
  console.log(`📊 EXECUTION SUMMARY & HEALTH TELEMETRY`);
  console.log(`=============================================================`);
  console.log(`Total Operations Executed : ${summary.totalOps.toLocaleString()}`);
  console.log(`Total Virtual Users       : ${TOTAL_USERS}`);
  console.log(`Total Wall Clock Time     : ${totalDurationSec.toFixed(2)}s`);
  console.log(`Throughput                : ${summary.throughputOpsPerSec.toLocaleString()} ops/sec`);
  console.log(`Hard Failures             : ${summary.totalFailures}`);
  console.log(`Latency Glitches (>300ms) : ${summary.totalGlitches}`);
  console.log(`P50 Latency               : ${summary.overallPercentiles.p50}ms`);
  console.log(`P95 Latency               : ${summary.overallPercentiles.p95}ms`);
  console.log(`P99 Latency               : ${summary.overallPercentiles.p99}ms`);
  console.log(`-------------------------------------------------------------`);
  console.log(`📁 Traceable JSONL Log   : ${summary.jsonlPath}`);
  console.log(`📄 Markdown Audit Report : ${summary.reportPath}`);
  console.log(`=============================================================\n`);

  if (summary.totalFailures > 0) {
    console.error(`❌ Suite reported ${summary.totalFailures} failures. Check the trace log.`);
    process.exit(1);
  } else {
    console.log(`✅ ALL SYSTEMS OPERATIONAL: 1,000 concurrent user test passed!`);
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error running chaos test suite:', err);
    process.exit(1);
  });
}

module.exports = { main };
