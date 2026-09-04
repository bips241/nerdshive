/**
 * Profile & Settings Operations Simulator
 */

const RADAR_STATUSES = [
  'open_for_hackathons',
  'seeking_cofounder',
  'open_for_collab',
  'open_for_work',
  'none',
];

const TECH_CHOICES = [
  ['TypeScript', 'Next.js', 'React'],
  ['Python', 'PyTorch', 'FastAPI'],
  ['Rust', 'WebAssembly', 'Tokio'],
  ['Go', 'gRPC', 'Kubernetes'],
  ['Docker', 'PostgreSQL', 'Redis'],
];

async function testProfileOperations(user, tracer) {
  // 1. Fetch Profile
  const startFetch = Date.now();
  try {
    const profile = {
      username: user.username,
      bio: `Software Engineer specializing in ${user.techStack[0]}`,
      radarStatus: user.radarStatus,
      techStack: user.techStack,
      postsCount: user.posts.length,
      followersCount: 12,
      followingCount: 8,
    };
    tracer.recordOperation({
      userId: user.id,
      operation: 'profile_fetch',
      category: 'profile',
      durationMs: Date.now() - startFetch,
      success: true,
      metadata: { username: profile.username, radar: profile.radarStatus },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'profile_fetch',
      category: 'profile',
      durationMs: Date.now() - startFetch,
      success: false,
      error: err,
    });
  }

  // 2. Update Bio & Portfolio
  const startBio = Date.now();
  try {
    user.bio = `Building high-throughput systems. Working on open source.`;
    user.website = `https://${user.username}.dev`;
    tracer.recordOperation({
      userId: user.id,
      operation: 'profile_update_bio',
      category: 'profile',
      durationMs: Date.now() - startBio,
      success: true,
      metadata: { newBioLength: user.bio.length, website: user.website },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'profile_update_bio',
      category: 'profile',
      durationMs: Date.now() - startBio,
      success: false,
      error: err,
    });
  }

  // 3. Toggle Teammate Radar Beacon
  const startRadar = Date.now();
  try {
    const randomStatus = RADAR_STATUSES[Math.floor(Math.random() * RADAR_STATUSES.length)];
    user.radarStatus = randomStatus;
    tracer.recordOperation({
      userId: user.id,
      operation: 'profile_toggle_radar',
      category: 'profile',
      durationMs: Date.now() - startRadar,
      success: true,
      metadata: { newRadarStatus: user.radarStatus },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'profile_toggle_radar',
      category: 'profile',
      durationMs: Date.now() - startRadar,
      success: false,
      error: err,
    });
  }

  // 4. Update Tech Stack
  const startTech = Date.now();
  try {
    const randomStack = TECH_CHOICES[Math.floor(Math.random() * TECH_CHOICES.length)];
    user.techStack = randomStack;
    tracer.recordOperation({
      userId: user.id,
      operation: 'profile_update_tech',
      category: 'profile',
      durationMs: Date.now() - startTech,
      success: true,
      metadata: { updatedStack: user.techStack },
    });
  } catch (err) {
    tracer.recordOperation({
      userId: user.id,
      operation: 'profile_update_tech',
      category: 'profile',
      durationMs: Date.now() - startTech,
      success: false,
      error: err,
    });
  }
}

module.exports = { testProfileOperations };
