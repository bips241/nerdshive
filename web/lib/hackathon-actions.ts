'use server';

import connectDB from '@/lib/db';
import {
  HackathonEvent,
  HackathonRegistration,
  HackathonEvaluation,
  User,
  Post,
} from '@/models/User';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import {
  canCreateHackathon,
  canManageHackathon,
  canJudgeHackathon,
  canSubmitProject,
  canModeratePlatform,
  ROLES,
} from '@/lib/rbac';
import { softDeleteEntity, restoreEntity } from '@/lib/retention';

// Canonical Verified Seed Hackathons with Multi-Round & Page Studio Defaults
const CANONICAL_VERIFIED_HACKATHONS = [
  {
    name: 'HackMIT 2026',
    slug: 'hackmit-2026',
    tagline: 'The premier global student hackathon held at MIT',
    description:
      'HackMIT brings together over 1,000 undergraduate hackers from around the world for a 36-hour sprint. Build cutting-edge hardware, decentralized apps, and AI agents with mentorship from top tech companies and researchers.',
    organizerName: 'HackMIT Tech Board',
    organizationType: 'college',
    isVerified: true,
    websiteUrl: 'https://hackmit.org',
    devpostUrl: 'https://hackmit-2026.devpost.com',
    location: 'MIT Campus, Cambridge MA & Virtual Hybrid',
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
    submissionDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
    prizePool: '$50,000 in Prizes & Grants',
    applicationMode: 'open',
    registrationType: 'both',
    teamSize: { min: 1, max: 4 },
    isBlindJudging: false,
    status: 'live',
    currentRoundNumber: 1,
    pageDesign: {
      heroTheme: 'cyberpunk',
      customAccentColor: '#8b5cf6',
      bannerUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1600&q=80',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80',
      faqs: [
        {
          question: 'Who can participate?',
          answer: 'All enrolled undergraduate & graduate students worldwide as well as open community builders.',
        },
        {
          question: 'How does team formation work?',
          answer: 'You can participate solo or create/join a team of up to 4 members using our voluntary skill matchmaker.',
        },
      ],
      schedule: [
        { time: 'Day 1 - 09:00 AM', title: 'Opening Ceremony & Track Briefing' },
        { time: 'Day 1 - 11:00 AM', title: 'Hacking Begins & Speed Team Matchmaking' },
        { time: 'Day 2 - 12:00 PM', title: 'Round 1 Submission Lock' },
        { time: 'Day 2 - 04:00 PM', title: 'Grand Finale Live Broadcast' },
      ],
      sponsorTiers: [
        {
          tierName: 'Title Sponsors',
          sponsors: [
            {
              name: 'Google Cloud',
              logoUrl: 'https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=200&q=80',
              websiteUrl: 'https://cloud.google.com',
            },
            {
              name: 'AWS',
              logoUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=200&q=80',
              websiteUrl: 'https://aws.amazon.com',
            },
          ],
        },
      ],
    },
    rules: [
      'All code must be written during the hackathon period.',
      'Teams must consist of 1 to 4 members.',
      'Open-source libraries and APIs are permitted; pre-existing full codebases are disqualified.',
      'All teams must submit a working demo video and open-source repo before the deadline.',
    ],
    tracks: [
      {
        name: 'AI & Autonomous Swarms',
        prizePool: '$20,000',
        description: 'Agents that plan, reason, and autonomously execute complex multi-step workflows.',
        tags: ['AI/ML', 'Python', 'LLMs', 'Agents'],
      },
      {
        name: 'Decentralized Infra & Zero-Knowledge',
        prizePool: '$15,000',
        description: 'Trustless systems, zk-proofs, verifiable computation, and high-performance smart contracts.',
        tags: ['Solidity', 'Rust', 'Web3', 'ZK'],
      },
      {
        name: 'Hardware & Spatial Computing',
        prizePool: '$15,000',
        description: 'Physical computing, IoT, neural interfaces, and spatial computing interaction models.',
        tags: ['Embedded', 'C++', 'Computer Vision', 'WebXR'],
      },
    ],
    rounds: [
      {
        roundNumber: 1,
        name: 'Prototype & GitHub MVP',
        description: 'Submit your working MVP, GitHub repository, and architecture overview.',
        submissionType: 'prototype',
        requiredFields: ['projectTitle', 'repoUrl', 'demoUrl', 'description'],
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
        rubric: [
          { criterion: 'Technical Innovation', maxScore: 10, weight: 1, description: 'Novelty of approach' },
          { criterion: 'Code Quality & Execution', maxScore: 10, weight: 1, description: 'Clean architecture and working prototype' },
          { criterion: 'UI/UX Polish', maxScore: 10, weight: 1, description: 'Ease of use and visual finesse' },
        ],
        isElimination: true,
        advancingCount: 10,
        status: 'active',
      },
      {
        roundNumber: 2,
        name: 'Grand Stage Live Pitch',
        description: 'Top 10 finalists present live demo and video pitch before the executive jury.',
        submissionType: 'video_pitch',
        requiredFields: ['videoUrl', 'pitchDeckUrl'],
        startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
        rubric: [
          { criterion: 'Live Demo Stability', maxScore: 10, weight: 1, description: 'Live feature presentation' },
          { criterion: 'Market Impact & Viability', maxScore: 10, weight: 1, description: 'Commercial or open-source potential' },
        ],
        isElimination: false,
        status: 'upcoming',
      },
    ],
  },
  {
    name: 'ETHGlobal DevConnect',
    slug: 'ethglobal-devconnect',
    tagline: "The world's leading Ethereum ecosystem hackathon and summit",
    description:
      'Join 2,500+ Web3 engineers, researchers, and designers to build next-generation applications on Ethereum. Focus on layer 2 rollups, account abstraction, intent solvers, and real-world asset tokenization.',
    organizerName: 'ETHGlobal Engineering',
    organizationType: 'community',
    isVerified: true,
    websiteUrl: 'https://ethglobal.com',
    devpostUrl: 'https://devconnect-ethglobal.devpost.com',
    location: 'Bangkok, Thailand & Global Virtual',
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 12),
    submissionDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    prizePool: '$125,000 in Bounties',
    applicationMode: 'open',
    registrationType: 'both',
    teamSize: { min: 1, max: 5 },
    isBlindJudging: true,
    status: 'live',
    currentRoundNumber: 1,
    pageDesign: {
      heroTheme: 'modern_purple',
      customAccentColor: '#3b82f6',
      bannerUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1600&q=80',
      logoUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?auto=format&fit=crop&w=300&q=80',
    },
    rules: [
      'Must deploy a functional contract to an Ethereum testnet or L2.',
      'Max 5 members per team.',
      'Submissions must include verified contracts on Blockscout / Etherscan.',
    ],
    tracks: [
      {
        name: 'Account Abstraction & Intent Relayers',
        prizePool: '$45,000',
        description: 'ERC-4337 smart accounts, gas sponsorship, session keys, and intent-centric solvers.',
        tags: ['ERC-4337', 'TypeScript', 'Solidity', 'Account Abstraction'],
      },
      {
        name: 'DeFi & Real-World Assets (RWA)',
        prizePool: '$40,000',
        description: 'Decentralized liquidity protocols, compliant tokenization, and risk mitigation tools.',
        tags: ['DeFi', 'Foundry', 'Next.js', 'Oracles'],
      },
    ],
    rounds: [
      {
        roundNumber: 1,
        name: 'Smart Contract & DApp Submission',
        description: 'Submit contract addresses, ABI, and testnet deployment links.',
        submissionType: 'prototype',
        requiredFields: ['projectTitle', 'repoUrl', 'demoUrl', 'description'],
        startDate: new Date(Date.now() - 1000 * 60 * 60 * 12),
        deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        rubric: [
          { criterion: 'Smart Contract Architecture', maxScore: 10, weight: 1 },
          { criterion: 'User Experience & Gas Efficiency', maxScore: 10, weight: 1 },
        ],
        isElimination: false,
        status: 'active',
      },
    ],
  },
];

export async function ensureSeedHackathons() {
  await connectDB();
  const count = await HackathonEvent.countDocuments();
  if (count === 0) {
    let organizer = await User.findOne({});
    if (!organizer) {
      organizer = await User.create({
        user_name: 'nerdshive_official',
        email: 'organizer@nerdshive.com',
        name: 'NerdShive Hackathons Desk',
      });
    }

    for (const h of CANONICAL_VERIFIED_HACKATHONS) {
      await HackathonEvent.create({
        ...h,
        organizerId: organizer._id,
      });
    }
  }
}

/**
 * Fetch all verified hackathons with active team counts
 */
export async function getVerifiedHackathons() {
  await connectDB();
  await ensureSeedHackathons();

  const events = await HackathonEvent.find({ isVerified: true, isDeleted: { $ne: true } })
    .sort({ submissionDeadline: 1 })
    .lean();

  const enriched = await Promise.all(
    events.map(async (event: any) => {
      const activeTeamsCount = await HackathonRegistration.countDocuments({
        hackathonId: event._id,
        status: { $in: ['forming', 'applied', 'accepted'] },
        isDeleted: { $ne: true },
      });

      return {
        ...event,
        _id: event._id.toString(),
        organizerId: event.organizerId?.toString(),
        startDate: event.startDate ? new Date(event.startDate).toISOString() : null,
        submissionDeadline: event.submissionDeadline
          ? new Date(event.submissionDeadline).toISOString()
          : null,
        activeTeamsCount,
      };
    })
  );

  return JSON.parse(JSON.stringify(enriched));
}

/**
 * Fetch a single hackathon by slug with full rounds, pageDesign, and user registration state
 */
export async function getHackathonBySlug(slug: string, options: { includeDeleted?: boolean } = {}) {
  await connectDB();
  await ensureSeedHackathons();

  const session = await auth();
  const currentUserId = session?.user?._id;

  const query: any = { slug: slug.toLowerCase() };
  if (!options.includeDeleted) {
    query.isDeleted = { $ne: true };
  }

  const event: any = await HackathonEvent.findOne(query)
    .populate({
      path: 'organizerId',
      select: 'user_name name image email role',
    })
    .populate({
      path: 'judges',
      select: 'user_name name image email role',
    })
    .lean();

  if (!event) return null;

  // Check if current user is registered in a team/solo
  let myRegistration: any = null;
  if (currentUserId) {
    myRegistration = await HackathonRegistration.findOne({
      hackathonId: event._id,
      'members.user': currentUserId,
    })
      .populate({
        path: 'members.user',
        select: 'user_name name image email bio',
      })
      .populate({
        path: 'leaderId',
        select: 'user_name name image email',
      })
      .lean();

    if (myRegistration) {
      myRegistration = {
        ...myRegistration,
        _id: myRegistration._id.toString(),
        hackathonId: myRegistration.hackathonId.toString(),
        leaderId: myRegistration.leaderId ? {
          ...myRegistration.leaderId,
          _id: myRegistration.leaderId._id?.toString() || myRegistration.leaderId.toString(),
        } : null,
        members: myRegistration.members.map((m: any) => ({
          ...m,
          user: m.user ? {
            ...m.user,
            _id: m.user._id?.toString() || m.user.toString(),
          } : null,
        })),
      };
    }
  }

  // Count registered teams
  const totalTeamsCount = await HackathonRegistration.countDocuments({
    hackathonId: event._id,
  });

  const acceptedTeamsCount = await HackathonRegistration.countDocuments({
    hackathonId: event._id,
    status: 'accepted',
  });

  const isOrganizer = currentUserId ? canManageHackathon(session?.user, event) : false;
  const isJudge = currentUserId ? canJudgeHackathon(session?.user, event) : false;

  const result = {
    ...event,
    _id: event._id.toString(),
    organizerId: event.organizerId ? {
      ...(event.organizerId as any),
      _id: (event.organizerId as any)._id?.toString(),
    } : null,
    judges: (event.judges || []).map((j: any) => ({
      ...j,
      _id: j._id?.toString() || j.toString(),
    })),
    startDate: event.startDate ? new Date(event.startDate).toISOString() : null,
    submissionDeadline: event.submissionDeadline
      ? new Date(event.submissionDeadline).toISOString()
      : null,
    totalTeamsCount,
    acceptedTeamsCount,
    myRegistration,
    isOrganizer,
    isJudge,
  };

  return JSON.parse(JSON.stringify(result));
}

/**
 * Register a new Hackathon Event (Non-Opinionated Multi-Round & Studio Support)
 */
export async function createHackathonEventAction(data: {
  name: string;
  tagline: string;
  description: string;
  organizationType?: 'college' | 'community' | 'enterprise' | 'individual';
  websiteUrl: string;
  devpostUrl?: string;
  location?: string;
  startDate?: string;
  submissionDeadline: string;
  prizePool?: string;
  applicationMode?: 'open' | 'curated';
  registrationType?: 'both' | 'team_only' | 'solo_only';
  teamSize?: { min: number; max: number };
  tracks?: Array<{ name: string; prizePool?: string; description?: string; tags?: string[] }>;
  rules?: string[];
  rounds?: Array<{
    roundNumber: number;
    name: string;
    description?: string;
    submissionType: 'ideation' | 'prototype' | 'video_pitch' | 'custom';
    requiredFields?: string[];
    deadline?: string;
    rubric?: Array<{ criterion: string; maxScore: number; weight?: number; description?: string }>;
    isElimination?: boolean;
    advancingCount?: number;
  }>;
  pageDesign?: {
    heroTheme?: 'cyberpunk' | 'dark_minimal' | 'modern_purple' | 'emerald_tech';
    bannerUrl?: string;
    logoUrl?: string;
    customCss?: string;
  };
  isBlindJudging?: boolean;
}) {
  const session = await auth();
  if (!session?.user?._id) {
    return { failure: '401 Unauthorized: You must be logged in to host a hackathon event.' };
  }

  // Strict Backend RBAC: Only verified Organizers and Platform Admins can host hackathons
  if (!canCreateHackathon(session.user)) {
    return { failure: '403 Forbidden: Insufficient permissions. Only verified Organizers and Platform Admins can host hackathons.' };
  }

  await connectDB();

  const slug = data.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  if (!slug) {
    return { failure: 'Invalid hackathon name.' };
  }

  const existing = await HackathonEvent.findOne({ slug });
  if (existing) {
    return {
      failure: `A hackathon with slug "${slug}" is already registered. Please choose a distinct official event name.`,
    };
  }

  try {
    const formattedRounds = (data.rounds || []).map((r, idx) => ({
      roundNumber: r.roundNumber || idx + 1,
      name: r.name || `Round ${idx + 1}`,
      description: r.description || '',
      submissionType: r.submissionType || 'prototype',
      requiredFields: r.requiredFields || ['projectTitle', 'repoUrl', 'demoUrl'],
      deadline: r.deadline ? new Date(r.deadline) : new Date(data.submissionDeadline),
      rubric: r.rubric || [
        { criterion: 'Innovation', maxScore: 10, weight: 1 },
        { criterion: 'Execution', maxScore: 10, weight: 1 },
      ],
      isElimination: !!r.isElimination,
      advancingCount: r.advancingCount,
      status: idx === 0 ? 'active' : 'upcoming',
    }));

    // If no rounds specified, generate 1 default open round
    if (formattedRounds.length === 0) {
      formattedRounds.push({
        roundNumber: 1,
        name: 'Project Submission',
        description: 'Submit your open-source repository, demo URL, and project overview.',
        submissionType: 'prototype',
        requiredFields: ['projectTitle', 'repoUrl', 'demoUrl', 'description'],
        deadline: new Date(data.submissionDeadline),
        rubric: [
          { criterion: 'Technical Merit', maxScore: 10, weight: 1 },
          { criterion: 'Product Design', maxScore: 10, weight: 1 },
        ],
        isElimination: false,
        advancingCount: undefined,
        status: 'active',
      });
    }

    const newEvent = await HackathonEvent.create({
      name: data.name.trim(),
      slug,
      tagline: data.tagline.trim(),
      description: data.description.trim(),
      organizerId: session.user._id,
      organizerName: (session.user as any).name || session.user.user_name || 'Official Organizer',
      organizationType: data.organizationType || 'community',
      isVerified: true, // Default verified for local/community organizers
      websiteUrl: data.websiteUrl.trim(),
      devpostUrl: data.devpostUrl?.trim() || '',
      bannerUrl: data.pageDesign?.bannerUrl || '',
      logoUrl: data.pageDesign?.logoUrl || '',
      location: data.location?.trim() || 'Virtual / Global',
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      submissionDeadline: new Date(data.submissionDeadline),
      prizePool: data.prizePool?.trim() || '$0',
      applicationMode: data.applicationMode || 'open',
      registrationType: data.registrationType || 'both',
      teamSize: data.teamSize || { min: 1, max: 4 },
      tracks: data.tracks || [],
      rules: data.rules || [],
      rounds: formattedRounds,
      currentRoundNumber: 1,
      pageDesign: {
        heroTheme: data.pageDesign?.heroTheme || 'dark_minimal',
        bannerUrl: data.pageDesign?.bannerUrl || '',
        logoUrl: data.pageDesign?.logoUrl || '',
        customCss: data.pageDesign?.customCss || '',
      },
      isBlindJudging: !!data.isBlindJudging,
      status: 'live',
    });

    revalidatePath('/dashboard/explore');
    return { success: true, slug: newEvent.slug };
  } catch (err: any) {
    console.error('Error creating hackathon event:', err);
    return { failure: err.message || 'Failed to register hackathon event.' };
  }
}

/**
 * Update Hackathon Parameters & Studio Design
 */
export async function updateHackathonEventAction(
  slug: string,
  data: {
    tagline?: string;
    description?: string;
    websiteUrl?: string;
    devpostUrl?: string;
    submissionDeadline?: string;
    prizePool?: string;
    applicationMode?: 'open' | 'curated';
    isBlindJudging?: boolean;
    tracks?: Array<{ name: string; prizePool?: string; description?: string; tags?: string[] }>;
    rules?: string[];
    rounds?: any[];
    pageDesign?: any;
  }
) {
  const session = await auth();
  if (!session?.user?._id) {
    return { failure: 'Unauthorized. Please sign in.' };
  }

  await connectDB();

  const event = await HackathonEvent.findOne({ slug: slug.toLowerCase() });
  if (!event) {
    return { failure: 'Hackathon event not found.' };
  }

  if (!canManageHackathon(session.user, event)) {
    return { failure: '403 Forbidden: Only the organizer or platform admin can modify hackathon parameters.' };
  }

  try {
    if (data.tagline) event.tagline = data.tagline.trim();
    if (data.description) event.description = data.description.trim();
    if (data.websiteUrl) event.websiteUrl = data.websiteUrl.trim();
    if (data.devpostUrl !== undefined) event.devpostUrl = data.devpostUrl.trim();
    if (data.submissionDeadline) event.submissionDeadline = new Date(data.submissionDeadline);
    if (data.prizePool) event.prizePool = data.prizePool.trim();
    if (data.applicationMode) event.applicationMode = data.applicationMode;
    if (data.isBlindJudging !== undefined) event.isBlindJudging = data.isBlindJudging;
    if (data.tracks) event.tracks = data.tracks as any;
    if (data.rules) event.rules = data.rules;
    if (data.rounds) event.rounds = data.rounds as any;
    if (data.pageDesign) {
      event.pageDesign = {
        ...event.pageDesign,
        ...data.pageDesign,
      };
    }

    await event.save();
    revalidatePath(`/dashboard/hackathons/${slug}`);
    revalidatePath(`/dashboard/hackathons/${slug}/manage`);
    return { success: true };
  } catch (err: any) {
    console.error('Error updating hackathon:', err);
    return { failure: err.message || 'Failed to update hackathon.' };
  }
}

/**
 * Team Creation & Voluntary Free-Agent Matching
 */
export async function createOrJoinHackathonTeamAction(
  slug: string,
  data: {
    teamName?: string;
    joinCode?: string;
    trackId?: string;
    trackName?: string;
    lookingForSkills?: string[];
    lookingForDescription?: string;
    isSolo?: boolean;
  }
) {
  const session = await auth();
  if (!session?.user?._id) {
    return { failure: 'Please sign in to register or join a team.' };
  }

  await connectDB();
  const event = await HackathonEvent.findOne({ slug: slug.toLowerCase() });
  if (!event) {
    return { failure: 'Hackathon not found.' };
  }

  const userId = session.user._id;

  // Check if user is already in a team for this hackathon
  const existingReg = await HackathonRegistration.findOne({
    hackathonId: event._id,
    'members.user': userId,
  });

  if (existingReg) {
    return { failure: `You are already registered in team "${existingReg.teamName}" for this hackathon.` };
  }

  // 1. Join Existing Team via 6-digit Code
  if (data.joinCode) {
    const code = data.joinCode.toUpperCase().trim();
    const targetTeam = await HackathonRegistration.findOne({
      hackathonId: event._id,
      code,
    });

    if (!targetTeam) {
      return { failure: `No team found with invite code "${code}". Please verify the code.` };
    }

    if (targetTeam.members.length >= (event.teamSize?.max || 4)) {
      return { failure: `Team "${targetTeam.teamName}" is already full (max ${event.teamSize?.max || 4} members).` };
    }

    targetTeam.members.push({
      user: userId as any,
      role: 'Contributor',
      skills: (session.user as any).skills || [],
      joinedAt: new Date(),
    });

    await targetTeam.save();
    revalidatePath(`/dashboard/hackathons/${slug}`);
    return { success: true, teamName: targetTeam.teamName, code: targetTeam.code };
  }

  // 2. Create New Team or Solo Registration
  const isSolo = !!data.isSolo;
  const teamName = data.teamName?.trim() || `${session.user.user_name || 'Hacker'}'s Team`;

  // Generate unique 6-character alphanumeric code
  let code = '';
  let isUnique = false;
  while (!isUnique) {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const codeCheck = await HackathonRegistration.findOne({ hackathonId: event._id, code });
    if (!codeCheck) isUnique = true;
  }

  // Auto-accept if applicationMode is 'open'
  const initialStatus = event.applicationMode === 'open' ? 'accepted' : 'applied';

  try {
    const newReg = await HackathonRegistration.create({
      hackathonId: event._id,
      teamName,
      code,
      leaderId: userId,
      members: [
        {
          user: userId,
          role: 'Team Lead',
          skills: (session.user as any).skills || [],
          joinedAt: new Date(),
        },
      ],
      trackId: data.trackId || '',
      trackName: data.trackName || '',
      isSolo,
      status: initialStatus,
      currentRound: 1,
      lookingForSkills: data.lookingForSkills || [],
      lookingForDescription: data.lookingForDescription || '',
      isRecruiting: !isSolo && (data.lookingForSkills || []).length > 0,
      submissions: [],
    });

    revalidatePath(`/dashboard/hackathons/${slug}`);
    return { success: true, teamName: newReg.teamName, code: newReg.code };
  } catch (err: any) {
    console.error('Error creating hackathon registration:', err);
    return { failure: err.message || 'Failed to create team registration.' };
  }
}

/**
 * Organizer Application Management (Accept / Waitlist / Reject)
 */
export async function manageTeamApplicationStatusAction(
  slug: string,
  registrationId: string,
  newStatus: 'accepted' | 'waitlisted' | 'rejected'
) {
  const session = await auth();
  if (!session?.user?._id) {
    return { failure: 'Unauthorized.' };
  }

  await connectDB();
  const event = await HackathonEvent.findOne({ slug: slug.toLowerCase() });
  if (!event || !canManageHackathon(session.user, event)) {
    return { failure: '403 Forbidden: Only the organizer or platform admin can review team applications.' };
  }

  try {
    const reg = await HackathonRegistration.findByIdAndUpdate(
      registrationId,
      { status: newStatus },
      { new: true }
    );

    if (!reg) return { failure: 'Registration not found.' };

    revalidatePath(`/dashboard/hackathons/${slug}/manage`);
    revalidatePath(`/dashboard/hackathons/${slug}`);
    return { success: true, status: reg.status };
  } catch (err: any) {
    return { failure: err.message || 'Failed to update application status.' };
  }
}

/**
 * Multi-Round Project Submission (GitHub, Video, Live Demo, Pitch Deck)
 */
export async function submitRoundProjectAction(
  slug: string,
  registrationId: string,
  roundNumber: number,
  data: {
    projectTitle: string;
    tagline?: string;
    description?: string;
    repoUrl?: string;
    demoUrl?: string;
    videoUrl?: string;
    pitchDeckUrl?: string;
    customFields?: Record<string, string>;
  }
) {
  const session = await auth();
  if (!session?.user?._id) {
    return { failure: 'Please sign in to submit your project.' };
  }

  await connectDB();
  const event = await HackathonEvent.findOne({ slug: slug.toLowerCase() });
  if (!event) return { failure: 'Hackathon not found.' };

  const reg = await HackathonRegistration.findOne({
    _id: registrationId,
    hackathonId: event._id,
  });

  if (!reg) {
    return { failure: 'Registered squad not found.' };
  }

  if (!canSubmitProject(session.user, reg)) {
    return { failure: '403 Forbidden: Only confirmed members of this squad can submit project deliverables.' };
  }

  if (!data.projectTitle?.trim()) {
    return { failure: 'Project title is required.' };
  }

  try {
    const existingSubIndex = reg.submissions.findIndex((s) => s.roundNumber === roundNumber);
    const subPayload = {
      roundNumber,
      projectTitle: data.projectTitle.trim(),
      tagline: data.tagline?.trim() || '',
      description: data.description?.trim() || '',
      repoUrl: data.repoUrl?.trim() || '',
      demoUrl: data.demoUrl?.trim() || '',
      videoUrl: data.videoUrl?.trim() || '',
      pitchDeckUrl: data.pitchDeckUrl?.trim() || '',
      customFields: data.customFields || {},
      submittedAt: new Date(),
    };

    if (existingSubIndex >= 0) {
      reg.submissions[existingSubIndex] = subPayload as any;
    } else {
      reg.submissions.push(subPayload as any);
    }

    await reg.save();
    revalidatePath(`/dashboard/hackathons/${slug}`);
    revalidatePath(`/dashboard/hackathons/${slug}/manage`);
    return { success: true };
  } catch (err: any) {
    console.error('Error submitting project:', err);
    return { failure: err.message || 'Failed to save submission.' };
  }
}

/**
 * Manage Hackathon Judges (Invite / Assign / Remove Judge)
 * Strictly restricted to Event Organizer or Platform Admin
 */
export async function manageHackathonJudgesAction(
  slug: string,
  data: {
    action: 'add' | 'remove';
    judgeIdentifier: string; // username or email
  }
) {
  const session = await auth();
  if (!session?.user?._id) {
    return { failure: '401 Unauthorized: Please sign in.' };
  }

  await connectDB();
  const event = await HackathonEvent.findOne({ slug: slug.toLowerCase() });
  if (!event) return { failure: 'Hackathon not found.' };

  if (!canManageHackathon(session.user, event)) {
    return { failure: '403 Forbidden: Only the event organizer or platform admin can assign judges.' };
  }

  const targetUser = await User.findOne({
    $or: [
      { email: data.judgeIdentifier.toLowerCase().trim() },
      { user_name: data.judgeIdentifier.trim() },
    ],
  });

  if (!targetUser) {
    return { failure: `User "${data.judgeIdentifier}" was not found on Nerd'sHive.` };
  }

  try {
    event.judges = event.judges || [];
    const judgeIdStr = targetUser._id.toString();

    if (data.action === 'add') {
      const alreadyJudge = event.judges.some((j: any) => j.toString() === judgeIdStr);
      if (alreadyJudge) {
        return { failure: `@${targetUser.user_name} is already assigned as a judge.` };
      }
      event.judges.push(targetUser._id);
      // Promote user role to 'judge' if currently 'developer' or 'user'
      if (!targetUser.role || targetUser.role === 'developer' || targetUser.role === 'user') {
        targetUser.role = 'judge';
        await targetUser.save();
      }
    } else {
      event.judges = event.judges.filter((j: any) => j.toString() !== judgeIdStr);
    }

    await event.save();
    revalidatePath(`/dashboard/hackathons/${slug}`);
    revalidatePath(`/dashboard/hackathons/${slug}/manage`);
    return {
      success: true,
      message: data.action === 'add'
        ? `Successfully assigned @${targetUser.user_name} as official Judge!`
        : `Removed @${targetUser.user_name} from judging panel.`,
      judge: {
        _id: targetUser._id.toString(),
        user_name: targetUser.user_name,
        name: targetUser.name,
        image: targetUser.image,
        email: targetUser.email,
        role: targetUser.role,
      },
    };
  } catch (err: any) {
    console.error('Error managing hackathon judges:', err);
    return { failure: err.message || 'Failed to update judges list.' };
  }
}

/**
 * Judge / Mentor Rubric Scoring Action (Supports Blind Evaluation)
 * Strictly restricted to assigned Judges, Organizer, or Platform Admin
 */
export async function submitJudgeEvaluationAction(
  slug: string,
  data: {
    registrationId: string;
    roundNumber: number;
    scores: Array<{ criterion: string; score: number; maxScore: number; feedback?: string }>;
    generalRemarks?: string;
  }
) {
  const session = await auth();
  if (!session?.user?._id) {
    return { failure: '401 Unauthorized: Please sign in to evaluate submissions.' };
  }

  await connectDB();
  const event = await HackathonEvent.findOne({ slug: slug.toLowerCase() });
  if (!event) return { failure: 'Hackathon not found.' };

  // Strict Backend RBAC: Only assigned Judges, Event Organizer, or Admin can evaluate teams
  if (!canJudgeHackathon(session.user, event)) {
    return { failure: '403 Forbidden: You are not an assigned judge or organizer for this hackathon.' };
  }

  const totalScore = (data.scores || []).reduce((acc, curr) => acc + Number(curr.score || 0), 0);
  const maxPossibleScore = (data.scores || []).reduce((acc, curr) => acc + Number(curr.maxScore || 10), 0);

  try {
    await HackathonEvaluation.findOneAndUpdate(
      {
        hackathonId: event._id,
        roundNumber: data.roundNumber,
        registrationId: data.registrationId,
        judgeId: session.user._id,
      },
      {
        hackathonId: event._id,
        roundNumber: data.roundNumber,
        registrationId: data.registrationId,
        judgeId: session.user._id,
        isBlind: !!event.isBlindJudging,
        scores: data.scores,
        totalScore,
        maxPossibleScore: maxPossibleScore || 100,
        generalRemarks: data.generalRemarks?.trim() || '',
        isPublished: false,
      },
      { upsert: true, new: true }
    );

    revalidatePath(`/dashboard/hackathons/${slug}/manage`);
    return { success: true };
  } catch (err: any) {
    console.error('Error submitting evaluation:', err);
    return { failure: err.message || 'Failed to submit evaluation.' };
  }
}

/**
 * Advance Teams to Next Round & Publish Results
 * Strictly restricted to Organizer or Admin
 */
export async function publishRoundResultsAction(
  slug: string,
  roundNumber: number,
  advancingRegistrationIds?: string[]
) {
  const session = await auth();
  if (!session?.user?._id) return { failure: '401 Unauthorized.' };

  await connectDB();
  const event = await HackathonEvent.findOne({ slug: slug.toLowerCase() });
  if (!event || !canManageHackathon(session.user, event)) {
    return { failure: '403 Forbidden: Only the organizer or platform admin can broadcast round results.' };
  }

  try {
    // 1. Mark evaluations as published for radical transparency
    await HackathonEvaluation.updateMany(
      { hackathonId: event._id, roundNumber },
      { isPublished: true }
    );

    // 2. If advancing teams specified, advance them to roundNumber + 1
    if (advancingRegistrationIds && advancingRegistrationIds.length > 0) {
      await HackathonRegistration.updateMany(
        { _id: { $in: advancingRegistrationIds }, hackathonId: event._id },
        { currentRound: roundNumber + 1, isAdvancedToNextRound: true }
      );

      // If final round, update performance track record (Hackathon Winners)
      const totalRounds = event.rounds?.length || 1;
      if (roundNumber >= totalRounds) {
        const winningTeams = await HackathonRegistration.find({
          _id: { $in: advancingRegistrationIds },
        }).lean();

        const winnerUserIds = winningTeams.flatMap((t: any) =>
          (t.members || []).map((m: any) => m.user)
        );

        if (winnerUserIds.length > 0) {
          await User.updateMany(
            { _id: { $in: winnerUserIds } },
            { $inc: { hackathonsWonCount: 1, hackathonPodiumsCount: 1, debugKarma: 100 } }
          );
        }
      }
    }

    // 3. Increment current round of hackathon if next round exists
    if (event.rounds && event.rounds.length > roundNumber) {
      event.currentRoundNumber = roundNumber + 1;
      event.rounds[roundNumber - 1].status = 'completed';
      event.rounds[roundNumber].status = 'active';
      await event.save();
    }

    revalidatePath(`/dashboard/hackathons/${slug}`);
    revalidatePath(`/dashboard/hackathons/${slug}/manage`);
    revalidatePath(`/dashboard/hackathons/${slug}/broadcast`);
    return { success: true };
  } catch (err: any) {
    return { failure: err.message || 'Failed to publish round results.' };
  }
}

/**
 * Fetch Live Leaderboard & Broadcast Arena State
 */
export async function getHackathonBroadcastState(slug: string) {
  await connectDB();
  const event: any = await HackathonEvent.findOne({ slug: slug.toLowerCase() }).lean();
  if (!event) return null;

  // Fetch all registrations with their latest submissions
  const registrations = await HackathonRegistration.find({
    hackathonId: event._id,
    status: 'accepted',
  })
    .populate({
      path: 'members.user',
      select: 'user_name name image',
    })
    .lean();

  // Fetch all published evaluations
  const evaluations = await HackathonEvaluation.find({
    hackathonId: event._id,
    isPublished: true,
  }).lean();

  // Compute average score per team for each round
  const leaderboard = registrations.map((reg: any) => {
    const teamEvals = evaluations.filter((e) => e.registrationId.toString() === reg._id.toString());
    const roundScores: Record<number, number> = {};

    teamEvals.forEach((ev) => {
      roundScores[ev.roundNumber] = (roundScores[ev.roundNumber] || 0) + ev.totalScore;
    });

    const averageTotal = teamEvals.length > 0
      ? teamEvals.reduce((acc, curr) => acc + curr.totalScore, 0) / teamEvals.length
      : 0;

    return {
      _id: reg._id.toString(),
      teamName: reg.teamName,
      isSolo: reg.isSolo,
      trackName: reg.trackName,
      currentRound: reg.currentRound,
      isAdvanced: !!reg.isAdvancedToNextRound,
      members: reg.members.map((m: any) => ({
        user_name: m.user?.user_name,
        name: m.user?.name,
        image: m.user?.image,
      })),
      submissions: reg.submissions,
      averageScore: Number(averageTotal.toFixed(1)),
      evaluationCount: teamEvals.length,
      feedback: teamEvals.map((e) => e.generalRemarks).filter(Boolean),
    };
  });

  // Sort descending by average score
  leaderboard.sort((a, b) => b.averageScore - a.averageScore);

  return JSON.parse(
    JSON.stringify({
      hackathon: {
        _id: event._id.toString(),
        name: event.name,
        slug: event.slug,
        tagline: event.tagline,
        prizePool: event.prizePool,
        tracks: event.tracks,
        rounds: event.rounds,
        currentRoundNumber: event.currentRoundNumber || 1,
        pageDesign: event.pageDesign,
        status: event.status,
      },
      leaderboard,
      totalTeams: registrations.length,
    })
  );
}

/**
 * Fetch Free-Agents & Recruiting Teams for Voluntary Matchmaking
 */
export async function getHackathonFreeAgentsAction(slug: string) {
  await connectDB();
  const event = await HackathonEvent.findOne({ slug: slug.toLowerCase() });
  if (!event) return { teams: [], soloHackers: [] };

  const teams = await HackathonRegistration.find({
    hackathonId: event._id,
    isRecruiting: true,
  })
    .populate({
      path: 'members.user',
      select: 'user_name name image skills bio',
    })
    .lean();

  const soloHackers = await HackathonRegistration.find({
    hackathonId: event._id,
    isSolo: true,
  })
    .populate({
      path: 'members.user',
      select: 'user_name name image skills bio website repo',
    })
    .lean();

  return JSON.parse(
    JSON.stringify({
      teams: teams.map((t: any) => ({
        ...t,
        _id: t._id.toString(),
        hackathonId: t.hackathonId.toString(),
        members: t.members.map((m: any) => ({
          ...m,
          user: m.user ? {
            ...m.user,
            _id: m.user._id?.toString() || m.user.toString(),
          } : null,
        })),
      })),
      soloHackers: soloHackers.map((s: any) => ({
        ...s,
        _id: s._id.toString(),
        hackathonId: s.hackathonId.toString(),
        user: s.members[0]?.user ? {
          ...s.members[0].user,
          _id: s.members[0].user._id?.toString() || s.members[0].user.toString(),
        } : null,
      })),
    })
  );
}

/**
 * Soft-delete a hackathon event with statutory 180-day retention and audit logging.
 * Enforces Zero-Loss Invariant: the event is never hard-deleted; status transitions to 'deleted'.
 */
export async function deleteHackathonAction(slug: string, reason?: string) {
  await connectDB();
  const session = await auth();
  if (!session?.user?._id) {
    return { success: false, message: 'Authentication required' };
  }

  const event = await HackathonEvent.findOne({ slug: slug.toLowerCase() });
  if (!event) {
    return { success: false, message: 'Hackathon not found' };
  }

  const userRole = (session.user as any).role || ROLES.DEVELOPER;
  const isOrganizer = event.organizerId?.toString() === session.user._id.toString();
  const isPlatformAdmin = canModeratePlatform(userRole);

  if (!isOrganizer && !isPlatformAdmin) {
    return { success: false, message: 'Unauthorized: Only event organizer or platform admin can delete' };
  }

  try {
    const result = await softDeleteEntity(HackathonEvent, (event as any)._id.toString(), session.user._id as string, {
      reason: reason || 'Organizer requested event cancellation',
      previousStatus: event.status,
    });

    await HackathonRegistration.updateMany(
      { hackathonId: event._id },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    revalidatePath('/dashboard/explore');
    revalidatePath(`/dashboard/hackathons/${slug}`);
    return {
      success: true,
      message: 'Hackathon safely soft-deleted. Retained under statutory 180-day compliance hold.',
      retentionExpiresAt: result.retentionExpiresAt,
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to soft-delete hackathon' };
  }
}

/**
 * Instantly restores a soft-deleted hackathon within the grace window or via admin action.
 */
export async function restoreHackathonAction(slug: string) {
  await connectDB();
  const session = await auth();
  if (!session?.user?._id) {
    return { success: false, message: 'Authentication required' };
  }

  const event = await HackathonEvent.findOne({ slug: slug.toLowerCase() });
  if (!event) {
    return { success: false, message: 'Hackathon not found' };
  }

  const userRole = (session.user as any).role || ROLES.DEVELOPER;
  const isOrganizer = event.organizerId?.toString() === session.user._id.toString();
  const isPlatformAdmin = canModeratePlatform(userRole);

  if (!isOrganizer && !isPlatformAdmin) {
    return { success: false, message: 'Unauthorized: Only event organizer or platform admin can restore' };
  }

  try {
    await restoreEntity(HackathonEvent, (event as any)._id.toString(), session.user._id as string);

    await HackathonRegistration.updateMany(
      { hackathonId: event._id },
      { $set: { isDeleted: false }, $unset: { deletedAt: 1 } }
    );

    revalidatePath('/dashboard/explore');
    revalidatePath(`/dashboard/hackathons/${slug}`);
    return {
      success: true,
      message: 'Hackathon restored successfully to active status.',
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to restore hackathon' };
  }
}

