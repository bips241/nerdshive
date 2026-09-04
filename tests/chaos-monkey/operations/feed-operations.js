/**
 * Feed & Exploration Operations Simulator
 * Covers home feed retrieval, explore feed filtered by developer archetypes,
 * saved posts retrieval, and activity hub notifications.
 */

const FILTER_TYPES = [
  'all',
  'ship_log',
  'code_sos',
  'architecture_rfc',
  'hackathon_crew',
  'tech_showdown',
  'media',
];

async function testFeedOperations(user, tracer, sharedState = {}) {
  const postsPool = sharedState.posts || [];

  // 1. Home Feed Fetch (Infinite Scroll Simulation)
  const startHome = Date.now();
  try {
    const page = Math.floor(Math.random() * 5) + 1;
    const limit = 10;
    const startIndex = (page - 1) * limit;
    const homePosts = postsPool.slice(startIndex, startIndex + limit);

    tracer.recordOperation({
      userId: user.id,
      operation: 'feed_fetch_home',
      category: 'feed',
      durationMs: Date.now() - startHome,
      success: true,
      metadata: { page, limit, fetchedCount: homePosts.length },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'feed_fetch_home',
      category: 'feed',
      durationMs: Date.now() - startHome,
      success: false,
      error: err,
    });
  }

  // 2. Explore Feed Filtered by Archetype
  const chosenFilter = FILTER_TYPES[Math.floor(Math.random() * FILTER_TYPES.length)];
  const startExplore = Date.now();
  try {
    let filteredPosts = postsPool;
    if (chosenFilter !== 'all') {
      filteredPosts = postsPool.filter((p) => p.postType === chosenFilter);
    }

    tracer.recordOperation({
      userId: user.id,
      operation: `feed_fetch_explore_${chosenFilter}`,
      category: 'feed',
      durationMs: Date.now() - startExplore,
      success: true,
      metadata: { filter: chosenFilter, resultsCount: filteredPosts.length },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: `feed_fetch_explore_${chosenFilter}`,
      category: 'feed',
      durationMs: Date.now() - startExplore,
      success: false,
      error: err,
    });
  }

  // 3. Saved Posts Fetch
  const startSaved = Date.now();
  try {
    const savedIds = user.savedPosts || [];
    const savedPosts = postsPool.filter((p) => savedIds.includes(p._id));

    tracer.recordOperation({
      userId: user.id,
      operation: 'feed_fetch_saved',
      category: 'feed',
      durationMs: Date.now() - startSaved,
      success: true,
      metadata: { savedCount: savedPosts.length },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'feed_fetch_saved',
      category: 'feed',
      durationMs: Date.now() - startSaved,
      success: false,
      error: err,
    });
  }

  // 4. Activity Hub Notifications Fetch
  const startHub = Date.now();
  try {
    const notifications = (user.collabRequests || []).map((req) => ({
      type: 'collab_request',
      senderId: req.senderId,
      status: req.status,
      timestamp: req.createdAt,
    }));

    tracer.recordOperation({
      userId: user.id,
      operation: 'feed_fetch_activity_hub',
      category: 'feed',
      durationMs: Date.now() - startHub,
      success: true,
      metadata: { unreadCount: notifications.length },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'feed_fetch_activity_hub',
      category: 'feed',
      durationMs: Date.now() - startHub,
      success: false,
      error: err,
    });
  }
}

module.exports = { testFeedOperations };
