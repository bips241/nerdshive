/**
 * Performance Baseline Benchmark Script
 * Measures database query latencies, serialization overhead,
 * and page fetch response times before optimization.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { performance } = require('perf_hooks');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not defined in environment or .env');
  process.exit(1);
}

async function runBenchmark() {
  console.log('====================================================');
  console.log('🔍 NERDSHIVE PERFORMANCE BASELINE BENCHMARK');
  console.log('====================================================');

  const connectStart = performance.now();
  await mongoose.connect(MONGODB_URI, { maxPoolSize: 10 });
  const connectDuration = (performance.now() - connectStart).toFixed(2);
  console.log(`[DB] Connected to MongoDB Atlas in ${connectDuration}ms`);

  const Post = mongoose.models.Post || mongoose.model('Post', new mongoose.Schema({}, { strict: false }));
  const Follows = mongoose.models.Follows || mongoose.model('Follows', new mongoose.Schema({}, { strict: false }), 'follows');

  // Benchmark 1: Unbounded Post Fetch with deep populates (Current fetchPosts implementation)
  console.log('\n--- Benchmark 1: Current Unbounded Post.find({}) ---');
  const t1 = performance.now();
  const rawPosts = await Post.find({})
    .sort({ createdAt: -1 })
    .lean();
  const d1 = (performance.now() - t1).toFixed(2);
  console.log(`[RAW POSTS] Fetched ${rawPosts.length} posts without limit in ${d1}ms`);

  // Benchmark 2: Bounded Post Fetch with .limit(10) and indexed sort
  console.log('\n--- Benchmark 2: Optimized Bounded Post.find({}).limit(10) ---');
  const t2 = performance.now();
  const boundedPosts = await Post.find({})
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  const d2 = (performance.now() - t2).toFixed(2);
  console.log(`[BOUNDED POSTS] Fetched 10 posts in ${d2}ms (Speedup: ${(d1 / d2).toFixed(1)}x)`);

  // Benchmark 3: Mutual Follows Aggregation (Current /api/chats implementation)
  console.log('\n--- Benchmark 3: Mutual Follows Aggregation ---');
  const t3 = performance.now();
  const sampleUserId = rawPosts[0]?.userId || new mongoose.Types.ObjectId();
  const mutuals = await Follows.aggregate([
    { $match: { followerId: sampleUserId } },
    {
      $lookup: {
        from: 'follows',
        localField: 'followingId',
        foreignField: 'followerId',
        as: 'reverseFollows',
      },
    },
    { $unwind: { path: '$reverseFollows', preserveNullAndEmptyArrays: false } },
    {
      $match: {
        $expr: {
          $eq: ['$followerId', '$reverseFollows.followingId'],
        },
      },
    },
  ]);
  const d3 = (performance.now() - t3).toFixed(2);
  console.log(`[CHATS AGGREGATION] Aggregated mutual follows in ${d3}ms`);

  // Benchmark 4: Check current collection indexes
  console.log('\n--- Benchmark 4: Collection Indexes ---');
  const postIndexes = await Post.collection.indexes();
  console.log('[POST INDEXES]:', postIndexes.map((idx) => Object.keys(idx.key).join(', ')));

  const followsIndexes = await Follows.collection.indexes();
  console.log('[FOLLOWS INDEXES]:', followsIndexes.map((idx) => Object.keys(idx.key).join(', ')));

  await mongoose.disconnect();
  console.log('\n====================================================');
  console.log('✅ BASELINE BENCHMARK COMPLETE');
  console.log('====================================================');
}

runBenchmark().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
