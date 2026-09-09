import connectDB from '@/lib/db';
import { User, Follows, HackathonRegistration } from '@/models/User';
import mongoose from 'mongoose';

/**
 * 5-Tier Social Graph Proximity Model:
 * Degree 1 (Direct): Followed by current user, or active/past hackathon squadmate (+120 pts)
 * Degree 2 (Mutual): Followed by someone current user follows (+60 pts + up to +30 for mutual count)
 * Degree 3 (Affinity): Same college/university, same company/organization, location/bio city match, or high tech stack match (+35 pts)
 * Degree 4 (Timezone): Similar timezone window (|ΔTZ| <= 3h) enabling real-time collaboration (+20 pts)
 * Degree 5 (Global): Rest of platform community (+5 pts base, scaled by karma/wins)
 */

export interface SocialGraphContext {
  userId: string;
  directFollows: Set<string>;
  squadmates: Set<string>;
  secondDegreeMap: Map<string, { mutualCount: number; mutualSampleIds: string[] }>;
  userOrg?: string;
  userCollege?: string;
  userLocation?: string;
  userBio?: string;
  userTimezone?: string;
  userTimezoneOffset: number | null;
  userTechStack: string[];
  userPreferredRole?: string;
}

export interface CandidateAffinityResult {
  degree: 1 | 2 | 3 | 4 | 5;
  score: number;
  reason?: string;
  mutualCount: number;
  mutualSampleNames?: string[];
}

export interface FeedPostScoringResult {
  score: number;
  degree: 1 | 2 | 3 | 4 | 5;
  recommendationReason?: string;
}

/**
 * Helper: Parse timezone string into UTC offset hours (e.g. "UTC+5:30" -> 5.5, "UTC-8" -> -8)
 */
export function parseTimezoneOffset(tz?: string): number | null {
  if (!tz || typeof tz !== 'string') return null;
  const cleaned = tz.trim().toUpperCase();

  // Match UTC+X / UTC-X or GMT+X / GMT-X or +05:30 / -08:00
  const match = cleaned.match(/(?:UTC|GMT)?([+-])(\d{1,2})(?::(\d{2}))?/);
  if (match) {
    const sign = match[1] === '-' ? -1 : 1;
    const hours = parseInt(match[2], 10);
    const minutes = match[3] ? parseInt(match[3], 10) : 0;
    return sign * (hours + minutes / 60);
  }

  // Common named timezones fallback
  const named: Record<string, number> = {
    IST: 5.5,
    EST: -5,
    EDT: -4,
    CST: -6,
    CDT: -5,
    PST: -8,
    PDT: -7,
    GMT: 0,
    UTC: 0,
    BST: 1,
    CET: 1,
    CEST: 2,
    JST: 9,
    KST: 9,
    AEST: 10,
    AEDT: 11,
    SGT: 8,
    HKT: 8,
  };

  for (const [key, offset] of Object.entries(named)) {
    if (cleaned.includes(key)) return offset;
  }

  return null;
}

/**
 * Helper: Calculate Jaccard similarity between two string arrays (e.g. tech stacks)
 */
export function calculateJaccardSimilarity(arr1: string[] = [], arr2: string[] = []): number {
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

/**
 * Helper: Check if two locations share a common geographic token (City, Country, Region)
 */
export function checkLocationMatch(loc1?: string, loc2?: string, bio1?: string, bio2?: string): boolean {
  if (!loc1 && !loc2 && !bio1 && !bio2) return false;
  const text1 = `${loc1 || ''} ${bio1 || ''}`.toLowerCase();
  const text2 = `${loc2 || ''} ${bio2 || ''}`.toLowerCase();

  const commonLocations = [
    'san francisco',
    'new york',
    'london',
    'berlin',
    'bengaluru',
    'bangalore',
    'delhi',
    'mumbai',
    'hyderabad',
    'tokyo',
    'singapore',
    'toronto',
    'seattle',
    'austin',
    'boston',
    'sydney',
    'paris',
    'amsterdam',
    'india',
    'usa',
    'united states',
    'canada',
    'uk',
    'germany',
    'japan',
  ];

  for (const loc of commonLocations) {
    if (text1.includes(loc) && text2.includes(loc)) {
      return true;
    }
  }

  // Direct normalized substring check if location is specific (length >= 3)
  const cleanLoc1 = (loc1 || '').toLowerCase().trim();
  const cleanLoc2 = (loc2 || '').toLowerCase().trim();
  if (cleanLoc1.length >= 3 && cleanLoc2.length >= 3) {
    if (cleanLoc1.includes(cleanLoc2) || cleanLoc2.includes(cleanLoc1)) {
      return true;
    }
  }

  return false;
}

/**
 * 1. Fetch User Social Graph Context
 * Two-phase indexed query pipeline to resolve 1st & 2nd degree connections without N+1 query storms.
 */
export async function getUserSocialGraph(userId: string): Promise<SocialGraphContext> {
  await connectDB();

  const directFollows = new Set<string>();
  const squadmates = new Set<string>();
  const secondDegreeMap = new Map<string, { mutualCount: number; mutualSampleIds: string[] }>();

  // Fetch current user details
  const dbUser = await User.findById(userId)
    .select('college organization location bio timezone techStack preferredRole')
    .lean();

  const userOrg = dbUser?.organization?.toLowerCase().trim() || undefined;
  const userCollege = dbUser?.college?.toLowerCase().trim() || undefined;
  const userLocation = dbUser?.location || undefined;
  const userBio = dbUser?.bio || undefined;
  const userTimezone = dbUser?.timezone || undefined;
  const userTimezoneOffset = parseTimezoneOffset(userTimezone);
  const userTechStack = (dbUser?.techStack || []).map((t: string) => t.trim());
  const userPreferredRole = dbUser?.preferredRole || undefined;

  // Phase 1A: Fetch direct follows (1st-degree)
  const follows = await Follows.find({ followerId: userId })
    .select('followingId')
    .lean();

  for (const f of follows) {
    if (f.followingId) directFollows.add(f.followingId.toString());
  }

  // Phase 1B: Fetch hackathon squadmates (1st-degree collaborators)
  const mySquadRegistrations = await HackathonRegistration.find({
    'members.user': new mongoose.Types.ObjectId(userId),
    isDeleted: { $ne: true },
  })
    .select('members.user')
    .lean();

  for (const reg of mySquadRegistrations) {
    for (const m of reg.members || []) {
      const memberId = m.user?.toString();
      if (memberId && memberId !== userId) {
        squadmates.add(memberId);
      }
    }
  }

  // Combine direct 1st-degree connections
  const firstDegreeIds = Array.from(new Set([...Array.from(directFollows), ...Array.from(squadmates)]));

  // Phase 2: Compute 2nd-degree connections (Follows of 1st-degree connections)
  if (firstDegreeIds.length > 0) {
    const secondDegreeAgg = await Follows.aggregate([
      {
        $match: {
          followerId: { $in: firstDegreeIds },
          followingId: { $nin: [userId, ...firstDegreeIds] },
        },
      },
      {
        $group: {
          _id: '$followingId',
          mutualCount: { $sum: 1 },
          mutualSampleIds: { $push: '$followerId' },
        },
      },
      { $sort: { mutualCount: -1 } },
      { $limit: 200 },
    ]);

    for (const item of secondDegreeAgg) {
      if (item._id) {
        secondDegreeMap.set(item._id.toString(), {
          mutualCount: item.mutualCount,
          mutualSampleIds: (item.mutualSampleIds || []).slice(0, 3),
        });
      }
    }
  }

  return {
    userId,
    directFollows,
    squadmates,
    secondDegreeMap,
    userOrg,
    userCollege,
    userLocation,
    userBio,
    userTimezone,
    userTimezoneOffset,
    userTechStack,
    userPreferredRole,
  };
}

/**
 * 2. Compute Candidate Affinity Score (Radar & Teammate Search)
 * Evaluates candidate against the 5-Tier hierarchy.
 */
export function computeCandidateAffinityScore(
  graph: SocialGraphContext | null,
  candidate: {
    _id: string;
    college?: string;
    organization?: string;
    location?: string;
    bio?: string;
    timezone?: string;
    techStack?: string[];
    preferredRole?: string;
    hackathonsWonCount?: number;
    hackathonPodiumsCount?: number;
    debugKarma?: number;
    reputationScore?: number;
  }
): CandidateAffinityResult {
  const candidateId = candidate._id?.toString();

  // If unauthenticated, fallback to platform performance
  if (!graph || !candidateId) {
    const won = candidate.hackathonsWonCount || 0;
    const karma = candidate.debugKarma || 0;
    return {
      degree: 5,
      score: 5 + Math.min(50, won * 15 + Math.floor(karma / 10)),
      mutualCount: 0,
    };
  }

  // 1st Degree: Direct Follow or Squadmate
  if (graph.directFollows.has(candidateId) || graph.squadmates.has(candidateId)) {
    const isSquad = graph.squadmates.has(candidateId);
    return {
      degree: 1,
      score: 120 + (candidate.hackathonsWonCount || 0) * 5,
      reason: isSquad ? 'Squad Collaborator' : 'Direct Connection',
      mutualCount: 0,
    };
  }

  // 2nd Degree: Follows of Follows (Mutuals)
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

  // 3rd Degree: Alma Mater, Organization, Location / Bio Match, or Tech Stack Match
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

  // 5th Degree: Global Platform Community
  const karma = candidate.debugKarma || 0;
  const won = candidate.hackathonsWonCount || 0;
  return {
    degree: 5,
    score: 5 + Math.min(20, won * 5 + Math.floor(karma / 20)),
    reason: undefined,
    mutualCount: 0,
  };
}

/**
 * 3. Compute Post Feed Score (Personalized Feed Ranking)
 * Gravity Time-Decay Formula: Score = (Affinity + Interest + Engagement) / (1 + HoursElapsed)^1.3
 */
export function computePostFeedScore(
  graph: SocialGraphContext | null,
  post: {
    _id: string;
    createdAt: string | Date;
    postType?: string;
    userId?: any;
    likes?: any[];
    comments?: any[];
    shipLog?: { techStack?: string[]; alphaTesters?: any[] };
    hackathonCrew?: { techStack?: string[]; rolesNeeded?: string[] };
  }
): FeedPostScoringResult {
  const authorId = (post.userId?._id || post.userId)?.toString();
  const createdDate = new Date(post.createdAt);
  const hoursElapsed = Math.max(0, (Date.now() - createdDate.getTime()) / (1000 * 60 * 60));

  // A. Affinity Score
  let affinityScore = 10;
  let degree: 1 | 2 | 3 | 4 | 5 = 5;
  let recommendationReason: string | undefined = undefined;

  if (graph && authorId) {
    if (authorId === graph.userId) {
      // Author is self
      affinityScore = 140;
      degree = 1;
      recommendationReason = 'Your post';
    } else if (graph.directFollows.has(authorId) || graph.squadmates.has(authorId)) {
      affinityScore = 120;
      degree = 1;
      recommendationReason = graph.squadmates.has(authorId) ? 'From your squad' : 'Following';
    } else if (graph.secondDegreeMap.has(authorId)) {
      const mutuals = graph.secondDegreeMap.get(authorId)!;
      affinityScore = 60 + Math.min(30, mutuals.mutualCount * 8);
      degree = 2;
      recommendationReason = `Followed by ${mutuals.mutualCount} mutual${mutuals.mutualCount > 1 ? 's' : ''}`;
    } else {
      // Check author org / location match
      const authorOrg = post.userId?.organization?.toLowerCase()?.trim() || post.userId?.college?.toLowerCase()?.trim();
      const sameOrg = (graph.userOrg && authorOrg && graph.userOrg === authorOrg) ||
                      (graph.userCollege && authorOrg && graph.userCollege === authorOrg);
      const locMatch = checkLocationMatch(graph.userLocation, post.userId?.location, graph.userBio, post.userId?.bio);

      if (sameOrg || locMatch) {
        affinityScore = 35;
        degree = 3;
        recommendationReason = sameOrg ? 'From your campus / organization' : 'From your area';
      } else {
        const authorTzOffset = parseTimezoneOffset(post.userId?.timezone);
        if (graph.userTimezoneOffset !== null && authorTzOffset !== null && Math.abs(graph.userTimezoneOffset - authorTzOffset) <= 3) {
          affinityScore = 20;
          degree = 4;
        } else {
          affinityScore = 10;
          degree = 5;
        }
      }
    }
  }

  // B. Content & Interest Alignment
  let interestScore = 0;
  if (graph) {
    const postStack: string[] = post.shipLog?.techStack || post.hackathonCrew?.techStack || [];
    const techSimilarity = calculateJaccardSimilarity(graph.userTechStack, postStack);
    interestScore += Math.round(techSimilarity * 35);

    // If Hackathon Crew post needs user's role
    if (graph.userPreferredRole && post.hackathonCrew?.rolesNeeded?.length) {
      const needsMyRole = post.hackathonCrew.rolesNeeded.some((r) =>
        r.toLowerCase().includes(graph.userPreferredRole!.toLowerCase()) ||
        graph.userPreferredRole!.toLowerCase().includes(r.toLowerCase())
      );
      if (needsMyRole) {
        interestScore += 30;
        if (!recommendationReason) recommendationReason = 'Looking for your role';
      }
    }
  }

  // C. Engagement Velocity Score
  const likesCount = post.likes?.length || 0;
  const commentsCount = post.comments?.length || 0;
  const testersCount = post.shipLog?.alphaTesters?.length || 0;
  const engagementScore = Math.min(60, likesCount * 3 + commentsCount * 6 + testersCount * 10);

  // D. Gravity Decay Function with 12-hour half-life: (Affinity + Interest + Engagement) / (1 + hoursElapsed / 12)^1.3
  const rawScore = affinityScore + interestScore + engagementScore;
  const timeDecay = Math.pow(1 + hoursElapsed / 12, 1.3);
  const finalScore = rawScore / timeDecay;

  return {
    score: finalScore,
    degree,
    recommendationReason,
  };
}

/**
 * 4. People You Might Know (PYMK) Predictor
 * Identifies high-affinity candidates (2nd-degree mutuals, alumni, location matches, tech soulmates).
 */
export async function getPeopleYouMightKnow(
  currentUserId: string,
  limit = 5
): Promise<any[]> {
  await connectDB();

  const graph = await getUserSocialGraph(currentUserId);
  const excludedIds = new Set<string>([
    currentUserId,
    ...Array.from(graph.directFollows),
    ...Array.from(graph.squadmates),
  ]);

  const candidateUsers = await User.find({
    _id: { $nin: Array.from(excludedIds).map((id) => new mongoose.Types.ObjectId(id)) },
    isDeleted: { $ne: true },
    accountStatus: { $ne: 'deleted' },
  })
    .select('name user_name image college organization location bio timezone techStack preferredRole hackathonsWonCount reputationScore debugKarma')
    .limit(60)
    .lean();

  const scored = candidateUsers.map((user: any) => {
    const affinity = computeCandidateAffinityScore(graph, user);
    return {
      _id: user._id.toString(),
      name: user.name || 'Developer',
      user_name: user.user_name || 'developer',
      image: user.image,
      college: user.college,
      organization: user.organization,
      location: user.location,
      preferredRole: user.preferredRole,
      techStack: user.techStack || [],
      hackathonsWonCount: user.hackathonsWonCount || 0,
      debugKarma: user.debugKarma || 0,
      degree: affinity.degree,
      affinityScore: affinity.score,
      reason: affinity.reason || (affinity.degree === 2 ? `${affinity.mutualCount} mutual connections` : 'Recommended for you'),
      mutualCount: affinity.mutualCount,
    };
  });

  // Sort by affinityScore descending
  scored.sort((a, b) => b.affinityScore - a.affinityScore);

  return scored.slice(0, limit);
}
