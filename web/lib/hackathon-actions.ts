'use server';

import connectDB from '@/lib/db';
import { HackathonEvent, User, Post } from '@/models/User';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

// Canonical Verified Seed Hackathons to ensure authentic data exists out of the box
const CANONICAL_VERIFIED_HACKATHONS = [
  {
    name: 'HackMIT 2026',
    slug: 'hackmit-2026',
    tagline: 'The premier global student hackathon held at MIT',
    description:
      'HackMIT brings together over 1,000 undergraduate hackers from around the world for a 36-hour sprint. Build cutting-edge hardware, decentralized apps, and AI agents with mentorship from top tech companies and researchers.',
    organizerName: 'HackMIT Tech Board',
    isVerified: true,
    websiteUrl: 'https://hackmit.org',
    devpostUrl: 'https://hackmit-2026.devpost.com',
    location: 'MIT Campus, Cambridge MA & Virtual Hybrid',
    // 4 days from current date
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
    submissionDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 4),
    prizePool: '$50,000 in Prizes & Grants',
    status: 'live',
    rules: [
      'All code must be written during the hackathon period.',
      'Teams must consist of 2 to 4 members.',
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
  },
  {
    name: 'ETHGlobal DevConnect',
    slug: 'ethglobal-devconnect',
    tagline: "The world's leading Ethereum ecosystem hackathon and summit",
    description:
      'Join 2,500+ Web3 engineers, researchers, and designers to build next-generation applications on Ethereum. Focus on layer 2 rollups, account abstraction, intent solvers, and real-world asset tokenization.',
    organizerName: 'ETHGlobal Engineering',
    isVerified: true,
    websiteUrl: 'https://ethglobal.com',
    devpostUrl: 'https://devconnect-ethglobal.devpost.com',
    location: 'Bangkok, Thailand & Global Virtual',
    // 7 days from now
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 12),
    submissionDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    prizePool: '$125,000 in Bounties',
    status: 'live',
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
      {
        name: 'ZK Privacy & Identity Verification',
        prizePool: '$40,000',
        description: 'Zero-knowledge proofs for Sybil resistance, private credentials, and voting protocols.',
        tags: ['Circom', 'Noir', 'ZK-Rollups', 'Cryptography'],
      },
    ],
  },
  {
    name: 'AI Agents World Cup',
    slug: 'ai-agents-hackathon',
    tagline: 'Build collaborative multi-agent swarms that replace complex engineering pipelines',
    description:
      'The definitive benchmark hackathon for autonomous agents. Teams build multi-agent architectures that debug codebases, coordinate research, benchmark models, or execute real-time market actions.',
    organizerName: 'Agentic AI Foundation',
    isVerified: true,
    websiteUrl: 'https://agentsworldcup.ai',
    devpostUrl: 'https://ai-agents-2026.devpost.com',
    location: 'San Francisco, CA & Global Online',
    // 10 days from now
    startDate: new Date(Date.now() - 1000 * 60 * 60 * 6),
    submissionDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
    prizePool: '$75,000 Compute Credits & Grants',
    status: 'live',
    rules: [
      'Solution must feature at least two interacting autonomous agents.',
      'Deterministic evaluation metrics must be provided in the README.',
      'All model weights, prompts, and server code must be transparently reproducible.',
    ],
    tracks: [
      {
        name: 'Autonomous Coding & Debugging Swarms',
        prizePool: '$30,000',
        description: 'Agents that ingest GitHub issues, write reproduction tests, edit code, and verify CI/CD.',
        tags: ['Python', 'TypeScript', 'FastAPI', 'Docker', 'SWE-bench'],
      },
      {
        name: 'Multi-Agent Enterprise Orchestration',
        prizePool: '$25,000',
        description: 'Collaborative swarms for regulatory compliance, security audits, and financial ops.',
        tags: ['LangChain', 'CrewAI', 'PostgreSQL', 'Redis'],
      },
      {
        name: 'Local LLM On-Device Edge Agents',
        prizePool: '$20,000',
        description: 'Small, quantized model agents running 100% locally with zero external API calls.',
        tags: ['Ollama', 'Llama.cpp', 'WebGPU', 'Rust'],
      },
    ],
  },
];

export async function ensureSeedHackathons() {
  await connectDB();
  const count = await HackathonEvent.countDocuments();
  if (count === 0) {
    // Find or create default system organizer
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
 * Fetch all verified hackathons with active squad counts
 */
export async function getVerifiedHackathons() {
  await connectDB();
  await ensureSeedHackathons();

  const events = await HackathonEvent.find({ isVerified: true })
    .sort({ submissionDeadline: 1 })
    .lean();

  // For each event, count active squads targeting it
  const enriched = await Promise.all(
    events.map(async (event: any) => {
      const activeSquadsCount = await Post.countDocuments({
        postType: 'hackathon_crew',
        $or: [
          { 'hackathonCrew.hackathonId': event._id },
          { 'hackathonCrew.hackathonName': { $regex: new RegExp(event.name, 'i') } },
        ],
      });

      return {
        ...event,
        _id: event._id.toString(),
        organizerId: event.organizerId?.toString(),
        startDate: event.startDate ? new Date(event.startDate).toISOString() : null,
        submissionDeadline: event.submissionDeadline
          ? new Date(event.submissionDeadline).toISOString()
          : null,
        activeSquadsCount,
      };
    })
  );

  return enriched;
}

/**
 * Fetch a single hackathon by slug with active squads and organizer details
 */
export async function getHackathonBySlug(slug: string) {
  await connectDB();
  await ensureSeedHackathons();

  const event = await HackathonEvent.findOne({ slug: slug.toLowerCase() })
    .populate({
      path: 'organizerId',
      select: 'user_name name image email',
    })
    .lean();

  if (!event) return null;

  // Find all active recruiting squads targeting this hackathon
  const squads = await Post.find({
    postType: 'hackathon_crew',
    $or: [
      { 'hackathonCrew.hackathonId': event._id },
      { 'hackathonCrew.hackathonName': { $regex: new RegExp(event.name, 'i') } },
    ],
  })
    .populate({
      path: 'userId',
      select: 'user_name image name email',
    })
    .populate({
      path: 'hackathonCrew.members.user',
      select: 'user_name image name',
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const serializedSquads = squads.map((s: any) => ({
    ...s,
    _id: s._id.toString(),
    userId: s.userId
      ? {
          ...s.userId,
          _id: s.userId._id?.toString() || s.userId.toString(),
        }
      : null,
    hackathonCrew: {
      ...s.hackathonCrew,
      hackathonId: s.hackathonCrew?.hackathonId?.toString(),
      squadServerId: s.hackathonCrew?.squadServerId?.toString(),
      urgencyDate: s.hackathonCrew?.urgencyDate
        ? new Date(s.hackathonCrew.urgencyDate).toISOString()
        : null,
      members: (s.hackathonCrew?.members || []).map((m: any) => ({
        ...m,
        user: m.user
          ? {
              ...m.user,
              _id: m.user._id?.toString() || m.user.toString(),
            }
          : null,
      })),
    },
  }));

  return {
    ...event,
    _id: event._id.toString(),
    organizerId: event.organizerId
      ? {
          ...(event.organizerId as any),
          _id: (event.organizerId as any)._id?.toString(),
        }
      : null,
    startDate: event.startDate ? new Date(event.startDate).toISOString() : null,
    submissionDeadline: event.submissionDeadline
      ? new Date(event.submissionDeadline).toISOString()
      : null,
    squads: serializedSquads,
  };
}

/**
 * Register a new Hackathon Event (Anti-Clone Protection & Authority Assignment)
 */
export async function createHackathonEventAction(data: {
  name: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  devpostUrl?: string;
  location?: string;
  submissionDeadline: string;
  prizePool?: string;
  tracks?: Array<{ name: string; prizePool?: string; description?: string }>;
  rules?: string[];
}) {
  const session = await auth();
  if (!session?.user?._id) {
    return { failure: 'You must be logged in to register a hackathon event.' };
  }

  await connectDB();

  // Generate clean slug
  const slug = data.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

  if (!slug) {
    return { failure: 'Invalid hackathon name.' };
  }

  // Anti-Clone Shield: Disallow duplicate slugs
  const existing = await HackathonEvent.findOne({ slug });
  if (existing) {
    return {
      failure: `A hackathon with slug "${slug}" is already registered. Duplicate clone events are prohibited. Please choose a distinct official event name.`,
    };
  }

  try {
    const newEvent = await HackathonEvent.create({
      name: data.name.trim(),
      slug,
      tagline: data.tagline.trim(),
      description: data.description.trim(),
      organizerId: session.user._id,
      organizerName: (session.user as any).name || session.user.user_name || 'Official Organizer',
      isVerified: false, // Must be verified by platform review to earn official verified badge
      websiteUrl: data.websiteUrl.trim(),
      devpostUrl: data.devpostUrl?.trim() || '',
      location: data.location?.trim() || 'Virtual / Global',
      startDate: new Date(),
      submissionDeadline: new Date(data.submissionDeadline),
      prizePool: data.prizePool?.trim() || '$0',
      tracks: data.tracks || [],
      rules: data.rules || [],
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
 * Update Hackathon Parameters (Strict Authority: Only organizer can modify)
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
    tracks?: Array<{ name: string; prizePool?: string; description?: string }>;
    rules?: string[];
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

  // Authority Enforcement: Only organizerId can edit event parameters
  if (event.organizerId.toString() !== session.user._id.toString()) {
    return {
      failure:
        'Unauthorized: Only the verified organizer of this hackathon has authority to modify dates, tracks, and official rules.',
    };
  }

  try {
    if (data.tagline) event.tagline = data.tagline.trim();
    if (data.description) event.description = data.description.trim();
    if (data.websiteUrl) event.websiteUrl = data.websiteUrl.trim();
    if (data.devpostUrl !== undefined) event.devpostUrl = data.devpostUrl.trim();
    if (data.submissionDeadline) event.submissionDeadline = new Date(data.submissionDeadline);
    if (data.prizePool) event.prizePool = data.prizePool.trim();
    if (data.tracks) event.tracks = data.tracks as any;
    if (data.rules) event.rules = data.rules;

    await event.save();
    revalidatePath(`/dashboard/hackathons/${slug}`);
    revalidatePath('/dashboard/explore');
    return { success: true };
  } catch (err: any) {
    console.error('Error updating hackathon event:', err);
    return { failure: err.message || 'Failed to update hackathon.' };
  }
}
