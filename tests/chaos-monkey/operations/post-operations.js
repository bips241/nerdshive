/**
 * Post Operations Simulator
 * Covers all developer post archetypes (Ship Log, Code SOS, Architecture RFC,
 * Hackathon Crew, Tech Showdown, Media), S3 media upload simulation, and post deletion.
 */

const crypto = require('crypto');

const ARCHETYPES = [
  'ship_log',
  'code_sos',
  'architecture_rfc',
  'hackathon_crew',
  'tech_showdown',
  'media',
];

const SHOWDOWN_PAIRS = [
  { topic: 'GraphQL vs REST in 2026', a: 'GraphQL', b: 'REST / RPC' },
  { topic: 'Tailwind CSS vs Vanilla CSS Modules', a: 'Tailwind CSS', b: 'Vanilla CSS Modules' },
  { topic: 'Bun vs Node.js vs Deno', a: 'Bun', b: 'Node.js LTS' },
  { topic: 'PostgreSQL vs MongoDB for Rapid MVPs', a: 'PostgreSQL', b: 'MongoDB' },
  { topic: 'Rust vs Go for Microservices', a: 'Rust', b: 'Go' },
];

async function testPostOperations(user, tracer, sharedState = {}) {
  const chosenType = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
  const startCreate = Date.now();

  try {
    const postId = `post_${crypto.randomBytes(8).toString('hex')}`;
    let postPayload = {
      _id: postId,
      userId: user.id,
      postType: chosenType,
      caption: `Telemetry simulation post from ${user.username}`,
      likes: [],
      comments: [],
      savedBy: [],
      createdAt: new Date(),
    };

    if (chosenType === 'ship_log') {
      postPayload.shipLog = {
        title: `Launching v${crypto.randomInt(1, 10)}.0 of my Open Source Engine`,
        pitch: `A fast and lightweight toolkit built in ${user.techStack[0] || 'TypeScript'}.`,
        demoUrl: `https://${user.username}.dev/demo`,
        repoUrl: `https://github.com/${user.username}/project-${crypto.randomInt(10, 99)}`,
        techStack: user.techStack,
        feedbackWanted: ['API design', 'Load performance', 'UX feedback'],
      };
    } else if (chosenType === 'code_sos') {
      postPayload.codeSos = {
        title: `Memory leak when processing concurrent streams in ${user.techStack[0] || 'Node.js'}`,
        snippet: `const stream = fs.createReadStream(path);\nstream.on('data', chunk => buffer.push(chunk));`,
        language: 'typescript',
        errorLog: `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory`,
        environment: 'Node 20.x, Linux x64',
        triedSteps: 'Tried increasing max-old-space-size to 4096MB, still spikes after 20 minutes',
        isResolved: false,
      };
    } else if (chosenType === 'architecture_rfc') {
      postPayload.architectureRfc = {
        title: `RFC: Migrating from Monolith to Event-Driven Microservices`,
        challenge: `High latency on order processing under 10k RPS burst traffic`,
        diagramMarkdown: `graph LR\n  Client --> Gateway\n  Gateway --> Kafka\n  Kafka --> WorkerPool`,
        tradeOffs: [
          { option: 'Apache Kafka', pros: 'High throughput, partition ordering', cons: 'Operational complexity' },
          { option: 'RabbitMQ', pros: 'Simple routing keys, easy setup', cons: 'Lower sustained multi-GB throughput' },
        ],
        targetAudience: 'Distributed systems & backend architects',
      };
    } else if (chosenType === 'hackathon_crew') {
      postPayload.hackathonCrew = {
        hackathonName: `Global AI & Infra Hackathon 2026`,
        urgencyDate: new Date(Date.now() + 86400000 * 3),
        rolesHave: ['Frontend Lead', 'UI/UX Designer'],
        rolesNeed: ['Backend/gRPC Engineer', 'ML/Embeddings Specialist'],
        commitmentLevel: 'hardcore',
      };
    } else if (chosenType === 'tech_showdown') {
      const showdown = SHOWDOWN_PAIRS[Math.floor(Math.random() * SHOWDOWN_PAIRS.length)];
      postPayload.techShowdown = {
        topic: showdown.topic,
        optionA: { name: showdown.a, description: 'High developer ergonomics', votes: 1 },
        optionB: { name: showdown.b, description: 'Proven stability at scale', votes: 0 },
        benchmark: 'P99 Latency & Developer Velocity',
      };
    } else {
      // media post
      postPayload.fileUrl = `https://cdn.nerdshive.online/uploads/${crypto.randomBytes(12).toString('hex')}.png`;
    }

    user.posts.push(postPayload);

    // Register in global shared pool so other concurrent users can like, comment, and vote
    if (sharedState.posts) {
      sharedState.posts.push(postPayload);
    }

    tracer.recordOperation({
      userId: user.id,
      operation: `post_create_${chosenType}`,
      category: 'post',
      durationMs: Date.now() - startCreate,
      success: true,
      metadata: { postId, postType: chosenType },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: `post_create_${chosenType}`,
      category: 'post',
      durationMs: Date.now() - startCreate,
      success: false,
      error: err,
    });
  }

  // 2. Simulate Direct S3 Media Presigning & Upload
  const startUpload = Date.now();
  try {
    const fileKey = `uploads/user_${user.id}/${Date.now()}-mock-asset.webp`;
    const presignedUrl = `https://nerdshive-media.s3.ap-south-1.amazonaws.com/${fileKey}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=mock`;
    
    // Simulate upload payload validation
    const fileSize = crypto.randomInt(100 * 1024, 8 * 1024 * 1024); // 100KB to 8MB
    if (fileSize > 50 * 1024 * 1024) {
      throw new Error('File exceeds 50MB maximum limit');
    }

    tracer.recordOperation({
      userId: user.id,
      operation: 'post_upload_s3_media',
      category: 'media',
      durationMs: Date.now() - startUpload,
      success: true,
      metadata: { key: fileKey, sizeBytes: fileSize, presignedUrlGenerated: !!presignedUrl },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'post_upload_s3_media',
      category: 'media',
      durationMs: Date.now() - startUpload,
      success: false,
      error: err,
    });
  }

  // 3. Post Deletion Simulation (for ~10% of users)
  if (Math.random() < 0.1 && user.posts.length > 1) {
    const startDelete = Date.now();
    try {
      const deletedPost = user.posts.pop();
      tracer.recordOperation({
        userId: user.id,
        operation: 'post_delete',
        category: 'post',
        durationMs: Date.now() - startDelete,
        success: true,
        metadata: { deletedPostId: deletedPost._id, type: deletedPost.postType },
      });
    } catch (err) {
      tracer.recordOperation({
        userId: user.id,
        operation: 'post_delete',
        category: 'post',
        durationMs: Date.now() - startDelete,
        success: false,
        error: err,
      });
    }
  }
}

module.exports = { testPostOperations };
