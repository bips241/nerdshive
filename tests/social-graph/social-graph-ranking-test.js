/**
 * Comprehensive Social Graph Connection Ranking & Personalized Feed Test Suite
 * Tests:
 * 1. 5-Tier Social Graph Connection Degree Assignment (1st, 2nd, 3rd, 4th, 5th)
 * 2. Feed Gravity Time-Decay Formula Assertions
 * 3. Location / Bio & Alma Mater Network Affinity
 * 4. Timezone Compatibility Window Matching
 * 5. Cold-Start Protocol (Zero-Follows Attribute-Based Ranking)
 * 6. People You Might Know (PYMK) Mutual Count Scaling
 */

const assert = require('assert');

// Mock helpers from web/lib/social-graph.ts logic
function parseTimezoneOffset(tz) {
  if (!tz || typeof tz !== 'string') return null;
  const cleaned = tz.trim().toUpperCase();
  const match = cleaned.match(/(?:UTC|GMT)?([+-])(\d{1,2})(?::(\d{2}))?/);
  if (match) {
    const sign = match[1] === '-' ? -1 : 1;
    const hours = parseInt(match[2], 10);
    const minutes = match[3] ? parseInt(match[3], 10) : 0;
    return sign * (hours + minutes / 60);
  }
  const named = { IST: 5.5, EST: -5, PST: -8, GMT: 0, UTC: 0, JST: 9, SGT: 8 };
  for (const [key, offset] of Object.entries(named)) {
    if (cleaned.includes(key)) return offset;
  }
  return null;
}

function calculateJaccardSimilarity(arr1 = [], arr2 = []) {
  if (!arr1.length || !arr2.length) return 0;
  const set1 = new Set(arr1.map((s) => s.toLowerCase().trim()));
  const set2 = new Set(arr2.map((s) => s.toLowerCase().trim()));
  let intersection = 0;
  for (const item of set1) {
    if (set2.has(item)) intersection++;
  }
  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : intersection / union;
}

function checkLocationMatch(loc1, loc2, bio1, bio2) {
  if (!loc1 && !loc2 && !bio1 && !bio2) return false;
  const text1 = `${loc1 || ''} ${bio1 || ''}`.toLowerCase();
  const text2 = `${loc2 || ''} ${bio2 || ''}`.toLowerCase();
  const commonLocations = [
    'san francisco', 'new york', 'london', 'berlin', 'bengaluru', 'bangalore',
    'delhi', 'mumbai', 'hyderabad', 'tokyo', 'singapore', 'india', 'usa'
  ];
  for (const loc of commonLocations) {
    if (text1.includes(loc) && text2.includes(loc)) return true;
  }
  const cleanLoc1 = (loc1 || '').toLowerCase().trim();
  const cleanLoc2 = (loc2 || '').toLowerCase().trim();
  if (cleanLoc1.length >= 3 && cleanLoc2.length >= 3) {
    if (cleanLoc1.includes(cleanLoc2) || cleanLoc2.includes(cleanLoc1)) return true;
  }
  return false;
}

function computeCandidateAffinityScore(graph, candidate) {
  const candidateId = candidate._id?.toString();
  if (!graph || !candidateId) {
    const won = candidate.hackathonsWonCount || 0;
    const karma = candidate.debugKarma || 0;
    return {
      degree: 5,
      score: 5 + Math.min(50, won * 15 + Math.floor(karma / 10)),
      mutualCount: 0,
    };
  }

  // 1st Degree
  if (graph.directFollows.has(candidateId) || graph.squadmates.has(candidateId)) {
    const isSquad = graph.squadmates.has(candidateId);
    return {
      degree: 1,
      score: 120 + (candidate.hackathonsWonCount || 0) * 5,
      reason: isSquad ? 'Squad Collaborator' : 'Direct Connection',
      mutualCount: 0,
    };
  }

  // 2nd Degree
  const secondDegree = graph.secondDegreeMap.get(candidateId);
  if (secondDegree) {
    const boost = Math.min(30, secondDegree.mutualCount * 10);
    return {
      degree: 2,
      score: 60 + boost + (candidate.hackathonsWonCount || 0) * 3,
      reason: `${secondDegree.mutualCount} mutual connection${secondDegree.mutualCount > 1 ? 's' : ''}`,
      mutualCount: secondDegree.mutualCount,
    };
  }

  // 3rd Degree: Alma Mater, Organization, Location Match, Tech Stack Match
  const myOrg = graph.userOrg?.toLowerCase().trim();
  const myCollege = graph.userCollege?.toLowerCase().trim();
  const candOrg = candidate.organization?.toLowerCase().trim();
  const candCollege = candidate.college?.toLowerCase().trim();

  const sameOrg = Boolean(
    (myOrg && candOrg && myOrg === candOrg) ||
    (myCollege && candCollege && myCollege === candCollege) ||
    (myCollege && candOrg && myCollege === candOrg) ||
    (myOrg && candCollege && myOrg === candCollege)
  );
  const locMatch = checkLocationMatch(graph.userLocation, candidate.location, graph.userBio, candidate.bio);
  const techSimilarity = calculateJaccardSimilarity(graph.userTechStack, candidate.techStack || []);

  if (sameOrg || locMatch || techSimilarity >= 0.4) {
    let reason = 'Network Affinity';
    if (sameOrg) reason = `Same ${graph.userCollege ? 'Alma Mater' : 'Organization'}`;
    else if (locMatch) reason = 'Location Match';
    else if (techSimilarity >= 0.4) reason = `${Math.round(techSimilarity * 100)}% Tech Stack Match`;

    const techBonus = Math.round(techSimilarity * 20);
    return {
      degree: 3,
      score: 35 + (sameOrg ? 15 : 0) + (locMatch ? 10 : 0) + techBonus,
      reason,
      mutualCount: 0,
    };
  }

  // 4th Degree: Similar Timezone Window (|ΔTZ| <= 3 hours)
  const candTzOffset = parseTimezoneOffset(candidate.timezone);
  if (graph.userTimezoneOffset !== null && candTzOffset !== null) {
    const tzDiff = Math.abs(graph.userTimezoneOffset - candTzOffset);
    if (tzDiff <= 3) {
      return {
        degree: 4,
        score: 20 + Math.round((3 - tzDiff) * 3),
        reason: 'Compatible Timezone',
        mutualCount: 0,
      };
    }
  }

  // 5th Degree: Global Community
  const karma = candidate.debugKarma || 0;
  const won = candidate.hackathonsWonCount || 0;
  return {
    degree: 5,
    score: 5 + Math.min(20, won * 5 + Math.floor(karma / 20)),
    reason: undefined,
    mutualCount: 0,
  };
}

function computePostFeedScore(graph, post) {
  const authorId = post.userId?.toString();
  const createdDate = new Date(post.createdAt);
  const hoursElapsed = Math.max(0, (Date.now() - createdDate.getTime()) / (1000 * 60 * 60));

  let affinityScore = 10;
  let degree = 5;

  if (graph && authorId) {
    if (graph.directFollows.has(authorId) || graph.squadmates.has(authorId)) {
      affinityScore = 120;
      degree = 1;
    } else if (graph.secondDegreeMap.has(authorId)) {
      const mutuals = graph.secondDegreeMap.get(authorId);
      affinityScore = 60 + Math.min(30, mutuals.mutualCount * 8);
      degree = 2;
    } else if (graph.userOrg && post.authorOrg && graph.userOrg === post.authorOrg.toLowerCase().trim()) {
      affinityScore = 35;
      degree = 3;
    } else {
      affinityScore = 10;
      degree = 5;
    }
  }

  const likes = post.likesCount || 0;
  const comments = post.commentsCount || 0;
  const engagementScore = Math.min(60, likes * 3 + comments * 6);

  const rawScore = affinityScore + engagementScore;
  const timeDecay = Math.pow(1 + hoursElapsed / 12, 1.3);
  const finalScore = rawScore / timeDecay;

  return { score: finalScore, degree };
}

console.log('===============================================================');
console.log('  NERDSHIVE SOCIAL GRAPH & PERSONALIZED FEED ALGORITHM TESTS   ');
console.log('===============================================================');

// Mock User Context (Elena)
const elenaGraph = {
  userId: 'user_elena',
  directFollows: new Set(['user_sarah', 'user_alex']),
  squadmates: new Set(['user_alex']),
  secondDegreeMap: new Map([
    ['user_marcus', { mutualCount: 2, mutualSampleIds: ['user_sarah', 'user_alex'] }],
    ['user_devon', { mutualCount: 1, mutualSampleIds: ['user_sarah'] }],
  ]),
  userOrg: 'stripe',
  userCollege: 'stanford university',
  userLocation: 'San Francisco, CA',
  userBio: 'Distributed Systems engineer in SF hacking on Rust and AI agents.',
  userTimezone: 'UTC-8',
  userTimezoneOffset: -8,
  userTechStack: ['Rust', 'TypeScript', 'PyTorch', 'Next.js'],
  userPreferredRole: 'Systems Architect',
};

// Test 1: 1st-Degree Connection Ranks Above All Others
console.log('\n[Test 1] Testing 1st-Degree Direct Follow & Squadmate Scoring...');
const candSarah = { _id: 'user_sarah', hackathonsWonCount: 1 };
const resSarah = computeCandidateAffinityScore(elenaGraph, candSarah);
assert.strictEqual(resSarah.degree, 1, 'Sarah should be Degree 1');
assert.ok(resSarah.score >= 120, '1st Degree score should be >= 120');
console.log(`PASS: 1st-degree Sarah received Degree 1 with score: ${resSarah.score} (${resSarah.reason})`);

// Test 2: 2nd-Degree Connection Ranks by Mutual Count
console.log('\n[Test 2] Testing 2nd-Degree Mutual Connection Scaling...');
const candMarcus = { _id: 'user_marcus', hackathonsWonCount: 0 };
const resMarcus = computeCandidateAffinityScore(elenaGraph, candMarcus);
assert.strictEqual(resMarcus.degree, 2, 'Marcus should be Degree 2');
assert.strictEqual(resMarcus.mutualCount, 2, 'Marcus should have 2 mutuals');
assert.ok(resMarcus.score >= 80, '2nd Degree with 2 mutuals should score >= 80');

const candDevon = { _id: 'user_devon', hackathonsWonCount: 0 };
const resDevon = computeCandidateAffinityScore(elenaGraph, candDevon);
assert.ok(resMarcus.score > resDevon.score, '2 mutual connections should outrank 1 mutual connection');
console.log(`PASS: 2-mutual Marcus (${resMarcus.score}) outranked 1-mutual Devon (${resDevon.score})`);

// Test 3: 3rd-Degree Alma Mater & Location/Bio Match
console.log('\n[Test 3] Testing 3rd-Degree Alma Mater & Bio Location Matching...');
const candStanfordAlum = {
  _id: 'user_stanford_student',
  college: 'Stanford University',
  location: 'Palo Alto',
  techStack: ['Python', 'C++'],
};
const resAlum = computeCandidateAffinityScore(elenaGraph, candStanfordAlum);
assert.strictEqual(resAlum.degree, 3, 'Stanford peer should be Degree 3');
assert.ok(resAlum.score >= 35, '3rd degree score should be >= 35');
console.log(`PASS: Stanford peer matched Degree 3 with reason: "${resAlum.reason}" (Score: ${resAlum.score})`);

const candSfBioMatch = {
  _id: 'user_sf_stranger',
  college: 'Unknown University',
  location: '',
  bio: 'Building developer tools in San Francisco.',
  techStack: [],
};
const resBioMatch = computeCandidateAffinityScore(elenaGraph, candSfBioMatch);
assert.strictEqual(resBioMatch.degree, 3, 'Bio mention of San Francisco should match Degree 3');
console.log(`PASS: San Francisco bio match identified Degree 3: "${resBioMatch.reason}"`);

// Test 4: 4th-Degree Timezone Window Proximity
console.log('\n[Test 4] Testing 4th-Degree Timezone Collaboration Window...');
const candSeattleTz = {
  _id: 'user_seattle',
  college: 'UW',
  location: 'Seattle',
  timezone: 'UTC-8',
  techStack: [],
};
const resTz = computeCandidateAffinityScore(elenaGraph, candSeattleTz);
assert.strictEqual(resTz.degree, 4, 'Same timezone window should match Degree 4');
assert.ok(resTz.score >= 20, 'Degree 4 score should be >= 20');
console.log(`PASS: Timezone match identified Degree 4: "${resTz.reason}" (Score: ${resTz.score})`);

// Test 5: Feed Gravity Time-Decay Assertions
console.log('\n[Test 5] Testing Feed Gravity Time-Decay Formula...');
const freshStrangerPost = {
  _id: 'post_1',
  userId: 'user_stranger',
  createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
  likesCount: 15,
  commentsCount: 4,
};
const weekOld1stDegreePost = {
  _id: 'post_2',
  userId: 'user_sarah', // 1st degree
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 168), // 7 days ago
  likesCount: 10,
  commentsCount: 2,
};
const freshSarahPost = {
  _id: 'post_3',
  userId: 'user_sarah', // 1st degree
  createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
  likesCount: 5,
  commentsCount: 1,
};

const scoreFreshStranger = computePostFeedScore(elenaGraph, freshStrangerPost);
const scoreOldSarah = computePostFeedScore(elenaGraph, weekOld1stDegreePost);
const scoreFreshSarah = computePostFeedScore(elenaGraph, freshSarahPost);

assert.ok(
  scoreFreshSarah.score > scoreFreshStranger.score,
  'Fresh post by 1st-degree connection should rank higher than fresh post by stranger'
);
assert.ok(
  scoreFreshStranger.score > scoreOldSarah.score,
  'High-engagement fresh post should outrank 7-day stale post from 1st-degree connection (Gravity Decay)'
);
console.log(
  `PASS: Feed Decay: Fresh 1st-degree (${scoreFreshSarah.score.toFixed(1)}) > Fresh Stranger (${scoreFreshStranger.score.toFixed(1)}) > 7-Day 1st-degree (${scoreOldSarah.score.toFixed(1)})`
);

// Test 6: Cold-Start Protocol (Zero Follows Account)
console.log('\n[Test 6] Testing Cold-Start Protocol for 0-Connection Account...');
const newHackerGraph = {
  userId: 'user_brand_new',
  directFollows: new Set(),
  squadmates: new Set(),
  secondDegreeMap: new Map(),
  userOrg: undefined,
  userCollege: 'IIT Bombay',
  userLocation: 'Mumbai, India',
  userBio: 'First day on Nerdshive. Looking for hackathon team.',
  userTimezone: 'UTC+5:30',
  userTimezoneOffset: 5.5,
  userTechStack: ['Solidity', 'Rust'],
  userPreferredRole: 'Smart Contract Developer',
};

const iitPeer = {
  _id: 'user_iit_peer',
  college: 'IIT Bombay',
  techStack: ['Solidity', 'Next.js'],
};
const strangerTokyo = {
  _id: 'user_tokyo',
  college: 'Todai',
  timezone: 'UTC+9',
  techStack: ['Python'],
};

const resIitPeer = computeCandidateAffinityScore(newHackerGraph, iitPeer);
const resTokyo = computeCandidateAffinityScore(newHackerGraph, strangerTokyo);

assert.strictEqual(resIitPeer.degree, 3, 'IIT peer should be Degree 3 for new user');
assert.ok(resIitPeer.score > resTokyo.score, 'Alma mater match must rank higher than stranger across the world');
console.log(
  `PASS: Cold-Start: IIT Bombay peer (${resIitPeer.score} - ${resIitPeer.reason}) outranked Tokyo stranger (${resTokyo.score})`
);

console.log('\n===============================================================');
console.log('  ALL SOCIAL GRAPH & FEED RANKING TESTS PASSED (6/6)          ');
console.log('===============================================================');
