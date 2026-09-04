/**
 * Engagement Operations Simulator
 * Covers post likes/unlikes, commenting/replies, bookmarks, tech showdown voting,
 * and reposting across the platform.
 */

const crypto = require('crypto');

const TECH_COMMENTS = [
  'Have you checked the garbage collection logs? Might be unclosed stream listeners.',
  'Great launch! What did you use for the real-time sync layer?',
  'I vote option A. Option B introduces too much state synchronization overhead.',
  'Bookmarked this RFC. The architecture tradeoff table is very insightful.',
  'Joined your hackathon crew! Let us connect on Discord/Matrix.',
  'LGTM! Impressive benchmarks.',
];

async function testEngagementOperations(user, tracer, sharedState = {}) {
  const postsPool = sharedState.posts || [];
  if (postsPool.length === 0) return;

  // Pick 1 to 3 random posts to interact with
  const targetPost = postsPool[Math.floor(Math.random() * postsPool.length)];

  // 1. Like / Unlike Post
  const startLike = Date.now();
  try {
    const alreadyLiked = targetPost.likes.includes(user.id);
    if (alreadyLiked) {
      targetPost.likes = targetPost.likes.filter((id) => id !== user.id);
    } else {
      targetPost.likes.push(user.id);
    }

    tracer.recordOperation({
      userId: user.id,
      operation: alreadyLiked ? 'engagement_unlike_post' : 'engagement_like_post',
      category: 'engagement',
      durationMs: Date.now() - startLike,
      success: true,
      metadata: {
        postId: targetPost._id,
        action: alreadyLiked ? 'unliked' : 'liked',
        totalLikes: targetPost.likes.length,
      },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'engagement_like_post',
      category: 'engagement',
      durationMs: Date.now() - startLike,
      success: false,
      error: err,
    });
  }

  // 2. Comment on Post
  const startComment = Date.now();
  try {
    const commentText = TECH_COMMENTS[Math.floor(Math.random() * TECH_COMMENTS.length)];
    const commentId = `cmt_${crypto.randomBytes(8).toString('hex')}`;
    const commentObj = {
      id: commentId,
      userId: user.id,
      username: user.username,
      text: commentText,
      createdAt: new Date(),
    };
    targetPost.comments.push(commentObj);

    tracer.recordOperation({
      userId: user.id,
      operation: 'engagement_comment_create',
      category: 'engagement',
      durationMs: Date.now() - startComment,
      success: true,
      metadata: {
        postId: targetPost._id,
        commentId,
        commentLength: commentText.length,
      },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'engagement_comment_create',
      category: 'engagement',
      durationMs: Date.now() - startComment,
      success: false,
      error: err,
    });
  }

  // 3. Bookmark / Save Post
  const startBookmark = Date.now();
  try {
    const isSaved = targetPost.savedBy.includes(user.id);
    if (isSaved) {
      targetPost.savedBy = targetPost.savedBy.filter((id) => id !== user.id);
      user.savedPosts = (user.savedPosts || []).filter((id) => id !== targetPost._id);
    } else {
      targetPost.savedBy.push(user.id);
      user.savedPosts = user.savedPosts || [];
      user.savedPosts.push(targetPost._id);
    }

    tracer.recordOperation({
      userId: user.id,
      operation: 'engagement_bookmark_toggle',
      category: 'engagement',
      durationMs: Date.now() - startBookmark,
      success: true,
      metadata: {
        postId: targetPost._id,
        status: isSaved ? 'unsaved' : 'saved',
      },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'engagement_bookmark_toggle',
      category: 'engagement',
      durationMs: Date.now() - startBookmark,
      success: false,
      error: err,
    });
  }

  // 4. Tech Showdown Vote (if target is a tech_showdown post)
  if (targetPost.postType === 'tech_showdown' && targetPost.techShowdown) {
    const startVote = Date.now();
    try {
      const voteOption = Math.random() > 0.5 ? 'optionA' : 'optionB';
      targetPost.techShowdown[voteOption].votes = (targetPost.techShowdown[voteOption].votes || 0) + 1;
      
      const totalVotes = targetPost.techShowdown.optionA.votes + targetPost.techShowdown.optionB.votes;
      const pctA = Math.round((targetPost.techShowdown.optionA.votes / totalVotes) * 100);
      const pctB = 100 - pctA;

      tracer.recordOperation({
        userId: user.id,
        operation: 'engagement_tech_showdown_vote',
        category: 'engagement',
        durationMs: Date.now() - startVote,
        success: true,
        metadata: {
          postId: targetPost._id,
          votedFor: voteOption,
          percentA: pctA,
          percentB: pctB,
          totalVotes,
        },
      });
    } catch (err) {
      tracer.recordOperation({
        userId: user.id,
        operation: 'engagement_tech_showdown_vote',
        category: 'engagement',
        durationMs: Date.now() - startVote,
        success: false,
        error: err,
      });
    }
  }

  // 5. Repost / Share Post Simulation
  if (Math.random() < 0.25) {
    const startRepost = Date.now();
    try {
      tracer.recordOperation({
        userId: user.id,
        operation: 'engagement_repost',
        category: 'engagement',
        durationMs: Date.now() - startRepost,
        success: true,
        metadata: {
          originalPostId: targetPost._id,
          repostedBy: user.username,
        },
      });
    } catch (err) {
      tracer.recordOperation({
        userId: user.id,
        operation: 'engagement_repost',
        category: 'engagement',
        durationMs: Date.now() - startRepost,
        success: false,
        error: err,
      });
    }
  }
}

module.exports = { testEngagementOperations };
