'use server';

import connectDB from '@/lib/db';
import {
  HackathonEvent,
  HackathonRegistration,
  User,
  Server,
  SquadRequest,
} from '@/models/User';
import { auth } from '@/auth';
import {
  getVerifiedHackathons,
  getHackathonFreeAgentsAction,
  createOrJoinHackathonTeamAction,
} from '@/lib/hackathon-actions';
import {
  getOrCreateDirectChatRoomAction,
  sendDirectMessageAction,
} from '@/lib/chat-actions';
import {
  getUserSocialGraph,
  computeCandidateAffinityScore,
  getPeopleYouMightKnow,
} from '@/lib/social-graph';
import { revalidatePath } from 'next/cache';
import mongoose from 'mongoose';

/**
 * Helper to get clean serialized user profile
 */
function serializeUser(user: any) {
  if (!user) return null;
  const org = user.organization || user.college || '';
  const orgType = user.organizationType || (user.college ? 'university' : 'independent');
  const karma = user.debugKarma || 0;
  const wonCount = user.hackathonsWonCount || 0;
  const attendedCount = user.hackathonsAttendedCount || 0;
  const repScore = user.reputationScore || (karma * 2 + wonCount * 100 + attendedCount * 20);

  return {
    _id: user._id?.toString(),
    name: user.name || 'Developer',
    user_name: user.user_name || 'hacker',
    image: user.image,
    bio: user.bio || '',
    college: user.college || user.organization || '',
    organization: org,
    organizationType: orgType,
    experienceLevel: user.experienceLevel || 'entry',
    yearsOfExperience: user.yearsOfExperience || 0,
    hackathonsAttendedCount: attendedCount,
    hackathonsWonCount: wonCount,
    hackathonPodiumsCount: user.hackathonPodiumsCount || 0,
    reputationScore: repScore,
    location: user.location || '',
    timezone: user.timezone || '',
    techStack: user.techStack || [],
    debugKarma: karma,
    bugsSolvedCount: user.bugsSolvedCount || 0,
    occupancyStatus: user.occupancyStatus || 'open',
    acceptingRequests: user.acceptingRequests !== false,
    preferredRole: user.preferredRole || 'Fullstack Developer',
  };
}

/**
 * 1. Load initial context for Radar
 */
export async function getRadarInitialContextAction(hackathonSlug?: string) {
  const session = await auth();
  await connectDB();

  try {
    const verifiedHackathons = await getVerifiedHackathons();

    let userSquads: any[] = [];
    let userSettings = {
      acceptingRequests: true,
      occupancyStatus: 'open' as 'open' | 'occupied',
      occupiedTeamId: undefined as string | undefined,
      college: '',
      organization: '',
      organizationType: 'independent',
      experienceLevel: 'entry',
      yearsOfExperience: 0,
      hackathonsWonCount: 0,
      location: '',
      preferredRole: 'Fullstack Developer',
    };

    if (session?.user?._id) {
      const dbUser: any = await User.findById(session.user._id).lean();
      if (dbUser) {
        userSettings = {
          acceptingRequests: dbUser.acceptingRequests !== false,
          occupancyStatus: dbUser.occupancyStatus || 'open',
          occupiedTeamId: dbUser.occupiedTeamId?.toString(),
          college: dbUser.college || dbUser.organization || '',
          organization: dbUser.organization || dbUser.college || '',
          organizationType: dbUser.organizationType || (dbUser.college ? 'university' : 'independent'),
          experienceLevel: dbUser.experienceLevel || 'entry',
          yearsOfExperience: dbUser.yearsOfExperience || 0,
          hackathonsWonCount: dbUser.hackathonsWonCount || 0,
          location: dbUser.location || '',
          preferredRole: dbUser.preferredRole || 'Fullstack Developer',
        };
      }

      const registrations = await HackathonRegistration.find({
        'members.user': new mongoose.Types.ObjectId(session.user._id),
        isDeleted: { $ne: true },
      })
        .populate('hackathonId', 'name slug tracks submissionDeadline')
        .populate('squadServerId', '_id name channels')
        .sort({ createdAt: -1 })
        .lean();

      userSquads = registrations.map((r: any) => ({
        _id: r._id.toString(),
        teamName: r.teamName,
        teamCode: r.code,
        status: r.status,
        isLeader: r.leaderId?.toString() === session.user._id.toString(),
        hackathonId: r.hackathonId?._id?.toString(),
        hackathonName: r.hackathonId?.name || 'Hackathon',
        hackathonSlug: r.hackathonId?.slug,
        squadServerId: r.squadServerId?._id?.toString(),
        membersCount: r.members?.length || 1,
        maxSquadSize: r.maxSquadSize || 4,
        isRecruiting: r.isRecruiting !== false,
      }));
    }

    const targetSlug = hackathonSlug || verifiedHackathons[0]?.slug || 'hackmit-2026';
    let freeAgentsData = { teams: [], soloHackers: [] };

    if (targetSlug) {
      try {
        freeAgentsData = await getHackathonFreeAgentsAction(targetSlug);
      } catch (err) {
        console.error('Failed to load free agents for slug:', targetSlug, err);
      }
    }

    return {
      success: true,
      verifiedHackathons,
      userSquads,
      selectedSlug: targetSlug,
      freeAgents: freeAgentsData,
      userSettings,
    };
  } catch (error: any) {
    console.error('Error fetching radar initial context:', error);
    return {
      success: false,
      error: error.message || 'Failed to load radar context',
      verifiedHackathons: [],
      userSquads: [],
      selectedSlug: 'hackmit-2026',
      freeAgents: { teams: [], soloHackers: [] },
      userSettings: {
        acceptingRequests: true,
        occupancyStatus: 'open' as const,
        occupiedTeamId: undefined,
        college: '',
        location: '',
        preferredRole: 'Fullstack Developer',
      },
    };
  }
}

/**
 * 2. Granular Discovery Finder
 * Search candidates by College/Organization, Experience Level, Track Record, Location, and Role.
 */
export async function searchGranularCandidatesAction(filters: {
  hackathonSlug: string;
  registrationStatus?: 'registered_free_agents' | 'unregistered_community' | 'recruiting_squads' | 'all';
  college?: string;
  organization?: string;
  organizationType?: string;
  experienceLevel?: string;
  onlyWinners?: boolean;
  minKarma?: number;
  location?: string;
  role?: string;
  searchQuery?: string;
  page?: number;
  limit?: number;
}) {
  await connectDB();
  const session = await auth();
  const currentUserId = session?.user?._id?.toString();

  try {
    let event = await HackathonEvent.findOne({
      slug: (filters.hackathonSlug || '').toLowerCase(),
      isDeleted: { $ne: true },
    }).lean();

    if (!event) {
      event = await HackathonEvent.findOne({ isDeleted: { $ne: true } }).lean();
    }

    const statusFilter = filters.registrationStatus || 'all';

    let graph = null;
    if (currentUserId) {
      try {
        graph = await getUserSocialGraph(currentUserId);
      } catch (graphErr) {
        console.error('Failed to load social graph for candidate search:', graphErr);
      }
    }

    const targetOrg = filters.organization?.trim() || filters.college?.trim();
    const orgRegex = targetOrg ? new RegExp(targetOrg, 'i') : null;
    const orgType = filters.organizationType && filters.organizationType !== 'all' ? filters.organizationType : null;
    const expLevel = filters.experienceLevel && filters.experienceLevel !== 'all' ? filters.experienceLevel : null;
    const onlyWinners = !!filters.onlyWinners;
    const minKarma = filters.minKarma || 0;

    const locationRegex = filters.location?.trim()
      ? new RegExp(filters.location.trim(), 'i')
      : null;
    const roleRegex = filters.role?.trim()
      ? new RegExp(filters.role.trim(), 'i')
      : null;
    const queryRegex = filters.searchQuery?.trim()
      ? new RegExp(filters.searchQuery.trim(), 'i')
      : null;

    let candidates: any[] = [];
    let squads: any[] = [];

    // Find all users already registered in this hackathon
    const eventRegistrations = await HackathonRegistration.find({
      hackathonId: event._id,
      isDeleted: { $ne: true },
    })
      .populate('members.user')
      .populate('leaderId')
      .lean();

    const registeredUserIds = new Set<string>();
    const soloRegistrations: any[] = [];
    const recruitingSquads: any[] = [];

    for (const reg of eventRegistrations) {
      if (reg.isSolo) {
        soloRegistrations.push(reg);
      } else if (reg.isRecruiting) {
        recruitingSquads.push(reg);
      }
      for (const m of reg.members || []) {
        if (m.user?._id) {
          registeredUserIds.add(m.user._id.toString());
        }
      }
    }

    // A. Process Registered Free Agents
    if (statusFilter === 'registered_free_agents' || statusFilter === 'all') {
      for (const reg of soloRegistrations) {
        const member = reg.members?.[0];
        const user = member?.user;
        if (!user || user._id.toString() === currentUserId) continue;

        // Apply filters
        if (orgRegex && !orgRegex.test(user.organization || user.college || '')) continue;
        if (orgType && user.organizationType && user.organizationType !== orgType) continue;
        if (expLevel && user.experienceLevel && user.experienceLevel !== expLevel) continue;
        if (onlyWinners && (user.hackathonsWonCount || 0) < 1) continue;
        if (minKarma > 0 && (user.debugKarma || 0) < minKarma) continue;

        if (
          locationRegex &&
          !locationRegex.test(user.location || '') &&
          !locationRegex.test(user.timezone || '')
        ) {
          continue;
        }
        if (roleRegex) {
          const roleMatch =
            roleRegex.test(user.preferredRole || '') ||
            roleRegex.test(member.role || '') ||
            (user.techStack || []).some((s: string) => roleRegex.test(s));
          if (!roleMatch) continue;
        }
        if (queryRegex) {
          const textMatch =
            queryRegex.test(user.name || '') ||
            queryRegex.test(user.user_name || '') ||
            queryRegex.test(user.bio || '') ||
            queryRegex.test(user.organization || user.college || '') ||
            (user.techStack || []).some((s: string) => queryRegex.test(s));
          if (!textMatch) continue;
        }

        candidates.push({
          ...serializeUser(user),
          registrationStatus: 'registered_free_agent',
          hackathonName: event.name,
          registrationId: reg._id.toString(),
          squadRole: member.role || 'Developer',
          trackPreference: reg.trackName || 'General',
        });
      }
    }

    // B. Process Unregistered High-Karma Platform Community
    if (statusFilter === 'unregistered_community' || statusFilter === 'all') {
      const userQuery: any = {
        _id: { $nin: Array.from(registeredUserIds).map((id) => new mongoose.Types.ObjectId(id)) },
        isDeleted: { $ne: true },
        accountStatus: { $ne: 'deleted' },
      };

      if (currentUserId) {
        userQuery._id.$nin.push(new mongoose.Types.ObjectId(currentUserId));
      }

      if (orgRegex) {
        userQuery.$or = [
          { organization: orgRegex },
          { college: orgRegex },
        ];
      }
      if (orgType) userQuery.organizationType = orgType;
      if (expLevel) userQuery.experienceLevel = expLevel;
      if (onlyWinners) userQuery.hackathonsWonCount = { $gt: 0 };
      if (minKarma > 0) userQuery.debugKarma = { $gte: minKarma };

      if (locationRegex) {
        userQuery.$or = [{ location: locationRegex }, { timezone: locationRegex }];
      }
      if (queryRegex) {
        userQuery.$or = [
          { name: queryRegex },
          { user_name: queryRegex },
          { bio: queryRegex },
          { organization: queryRegex },
          { college: queryRegex },
          { techStack: queryRegex },
        ];
      }

      const communityUsers = await User.find(userQuery)
        .sort({ hackathonsWonCount: -1, debugKarma: -1, createdAt: -1 })
        .limit(30)
        .lean();

      for (const u of communityUsers) {
        if (roleRegex) {
          const roleMatch =
            roleRegex.test(u.preferredRole || '') ||
            (u.techStack || []).some((s: string) => roleRegex.test(s));
          if (!roleMatch) continue;
        }

        candidates.push({
          ...serializeUser(u),
          registrationStatus: 'unregistered_community',
          hackathonName: event.name,
        });
      }
    }

    // C. Process Recruiting Squads
    if (statusFilter === 'recruiting_squads' || statusFilter === 'all') {
      for (const squad of recruitingSquads) {
        const leader = squad.leaderId;
        if (leader?._id?.toString() === currentUserId) continue;

        if (orgRegex && !orgRegex.test(leader?.organization || leader?.college || '')) continue;
        if (roleRegex) {
          const hasRole = (squad.rolesNeeded || squad.lookingForSkills || []).some((r: string) =>
            roleRegex.test(r)
          );
          if (!hasRole) continue;
        }

        squads.push({
          _id: squad._id.toString(),
          teamName: squad.teamName,
          code: squad.code,
          trackName: squad.trackName || 'General',
          leader: serializeUser(leader),
          membersCount: squad.members?.length || 1,
          maxSquadSize: squad.maxSquadSize || 4,
          rolesNeeded: squad.rolesNeeded?.length ? squad.rolesNeeded : squad.lookingForSkills || [],
          lookingForDescription: squad.lookingForDescription || '',
          squadServerId: squad.squadServerId?.toString(),
        });
      }
    }

    // Score each candidate against the 5-Tier Social Graph Model
    for (const cand of candidates) {
      const affinity = computeCandidateAffinityScore(graph, cand);
      cand.connectionDegree = affinity.degree;
      cand.affinityScore = affinity.score;
      cand.affinityReason = affinity.reason;
      cand.mutualConnectionsCount = affinity.mutualCount;
    }

    // Rank candidates by connection affinity score first (1st -> 2nd -> 3rd -> 4th -> 5th degree)
    candidates.sort((a, b) => {
      if ((b.affinityScore || 0) !== (a.affinityScore || 0)) {
        return (b.affinityScore || 0) - (a.affinityScore || 0);
      }
      if ((b.hackathonsWonCount || 0) !== (a.hackathonsWonCount || 0)) {
        return (b.hackathonsWonCount || 0) - (a.hackathonsWonCount || 0);
      }
      return (b.debugKarma || 0) - (a.debugKarma || 0);
    });

    // Score and rank squads by squad leader affinity
    for (const squad of squads) {
      if (squad.leader) {
        const affinity = computeCandidateAffinityScore(graph, squad.leader);
        squad.connectionDegree = affinity.degree;
        squad.affinityScore = affinity.score;
        squad.affinityReason = affinity.reason;
      }
    }
    squads.sort((a, b) => (b.affinityScore || 0) - (a.affinityScore || 0));

    return {
      success: true,
      hackathon: {
        _id: event._id.toString(),
        name: event.name,
        slug: event.slug,
        tracks: event.tracks || [],
      },
      candidates,
      squads,
      totalCandidates: candidates.length,
      totalSquads: squads.length,
    };
  } catch (error: any) {
    console.error('Error searching granular candidates:', error);
    return { failure: error.message || 'Failed to search candidates' };
  }
}

/**
 * People You Might Know (PYMK) Action
 * Predicts high-affinity connection recommendations.
 */
export async function getPeopleYouMightKnowAction(limit = 6) {
  const session = await auth();
  if (!session?.user?._id) return { success: false, developers: [] };
  try {
    const developers = await getPeopleYouMightKnow(session.user._id.toString(), limit);
    return { success: true, developers };
  } catch (err: any) {
    console.error('Error fetching people you might know:', err);
    return { success: false, developers: [] };
  }
}

/**
 * 3. Send Squad Request (Leader Offer or Candidate Application)
 * With customizable acceptance deadline (e.g. 24h, 48h, 72h) and meeting scheduling.
 */
export async function sendSquadRequestAction(data: {
  type: 'leader_offer' | 'candidate_application';
  hackathonSlug: string;
  registrationId: string;
  targetUserId: string;
  role: string;
  personalNote?: string;
  deadlineHours?: number;
  meetingProposal?: {
    scheduledAt: string;
    durationMinutes?: number;
    notes?: string;
  };
}) {
  const session = await auth();
  if (!session?.user?._id) {
    return { failure: '401 Unauthorized: Please sign in' };
  }

  const senderId = session.user._id.toString();
  const receiverId = data.targetUserId;

  if (senderId === receiverId) {
    return { failure: 'Cannot send recruitment request to yourself' };
  }

  await connectDB();

  try {
    const event = await HackathonEvent.findOne({
      slug: data.hackathonSlug.toLowerCase(),
      isDeleted: { $ne: true },
    }).lean();

    if (!event) return { failure: 'Hackathon not found' };

    const registration: any = await HackathonRegistration.findById(data.registrationId)
      .populate('leaderId')
      .lean();

    if (!registration) return { failure: 'Squad registration not found' };

    // Check Receiver Availability
    const targetUser: any = await User.findById(receiverId).lean();
    if (!targetUser) return { failure: 'Target developer not found' };

    if (targetUser.acceptingRequests === false) {
      return { failure: `${targetUser.name || 'Developer'} has paused receiving new teammate requests.` };
    }

    if (targetUser.occupancyStatus === 'occupied' && data.type === 'leader_offer') {
      return { failure: `${targetUser.name || 'Developer'} is already occupied with a squad.` };
    }

    // Check Squad Capacity
    const maxCapacity = registration.maxSquadSize || 4;
    if ((registration.members || []).length >= maxCapacity) {
      return { failure: `Squad "${registration.teamName}" is already at maximum capacity (${maxCapacity} members).` };
    }

    // Check duplicate pending request
    const existingRequest = await SquadRequest.findOne({
      registrationId: registration._id,
      senderId: new mongoose.Types.ObjectId(senderId),
      receiverId: new mongoose.Types.ObjectId(receiverId),
      status: 'pending',
      isDeleted: { $ne: true },
    });

    if (existingRequest) {
      return { failure: 'A pending recruitment request is already active between you and this developer for this squad.' };
    }

    const deadlineHours = data.deadlineHours && data.deadlineHours > 0 ? data.deadlineHours : 48;
    const expiresAt = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

    const meetingRoomId = `vetting_${new mongoose.Types.ObjectId().toString()}`;

    const newRequest = await SquadRequest.create({
      type: data.type,
      hackathonId: event._id,
      hackathonSlug: event.slug,
      hackathonName: event.name,
      registrationId: registration._id,
      teamName: registration.teamName,
      senderId: new mongoose.Types.ObjectId(senderId),
      receiverId: new mongoose.Types.ObjectId(receiverId),
      roleOfferedOrSought: data.role.trim() || 'Developer',
      personalNote: data.personalNote?.trim() || '',
      status: 'pending',
      deadlineHours,
      expiresAt,
      meetingSchedule: data.meetingProposal
        ? {
            scheduledAt: new Date(data.meetingProposal.scheduledAt),
            durationMinutes: data.meetingProposal.durationMinutes || 15,
            status: 'proposed',
            proposedBy: new mongoose.Types.ObjectId(senderId),
            meetingRoomId,
            notes: data.meetingProposal.notes || '',
          }
        : {
            status: 'none',
            meetingRoomId,
            durationMinutes: 15,
          },
    });

    // Send direct message notification to receiver
    const actionLabel =
      data.type === 'leader_offer'
        ? `⚡ Official Squad Offer from "${registration.teamName}"`
        : `🤝 New Squad Application for "${registration.teamName}"`;

    const noteSnippet = data.personalNote ? `\n\n"${data.personalNote}"` : '';
    const meetingSnippet = data.meetingProposal
      ? `\n\n📅 Proposed Vetting Call: ${new Date(data.meetingProposal.scheduledAt).toLocaleString()}`
      : '';

    const notificationMessage = `${actionLabel} (${event.name})\n` +
      `Role: **${data.role}**\n` +
      `Deadline: **${deadlineHours} hours** (Expires: ${expiresAt.toLocaleDateString()})${noteSnippet}${meetingSnippet}\n\n` +
      `Review and respond in your Radar Control Panel (/dashboard/radar).`;

    await connectDevelopersAction(receiverId, notificationMessage);

    revalidatePath(`/dashboard/radar`);
    return {
      success: true,
      requestId: newRequest._id.toString(),
      message: 'Recruitment request dispatched with deadline countdown!',
    };
  } catch (error: any) {
    console.error('Error sending squad request:', error);
    return { failure: error.message || 'Failed to send request' };
  }
}

/**
 * 4. Respond to Squad Request (Accept / Reject)
 * - Auto-joins member to HackathonRegistration.members
 * - Auto-provisions and adds to private squad Discord Server (channels: #general, #resources, voice:pair-hacking)
 * - Auto-updates occupancyStatus to 'occupied'
 * - Auto-removes candidate from evaluation queue on rejection
 */
export async function respondToSquadRequestAction(
  requestId: string,
  action: 'accept' | 'reject',
  decisionNote?: string
) {
  const session = await auth();
  if (!session?.user?._id) {
    return { failure: '401 Unauthorized: Please sign in' };
  }

  const userId = session.user._id.toString();
  await connectDB();

  try {
    const request = await SquadRequest.findById(requestId)
      .populate('registrationId')
      .populate('hackathonId');

    if (!request || request.isDeleted) {
      return { failure: 'Squad request not found' };
    }

    if (request.status !== 'pending') {
      return { failure: `This request is already marked as ${request.status}.` };
    }

    // Check expiration
    if (new Date() > new Date(request.expiresAt)) {
      request.status = 'expired';
      await request.save();
      return { failure: 'This request has expired.' };
    }

    // Verify authorized responder
    const isReceiver = request.receiverId.toString() === userId;
    const isSender = request.senderId.toString() === userId;
    const registration: any = request.registrationId;

    if (!isReceiver) {
      // Squad leader can respond to candidate_applications
      const isLeader = registration?.leaderId?.toString() === userId;
      if (!isLeader) {
        return { failure: '403 Forbidden: You are not authorized to respond to this request.' };
      }
    }

    const candidateUserId =
      request.type === 'leader_offer'
        ? request.receiverId.toString()
        : request.senderId.toString();

    // -------------------------------------------------------------
    // ACTION: ACCEPT
    // -------------------------------------------------------------
    if (action === 'accept') {
      const maxCapacity = registration.maxSquadSize || 4;

      if ((registration.members || []).length >= maxCapacity) {
        return { failure: `Squad "${registration.teamName}" is already at capacity (${maxCapacity} members).` };
      }

      // Check if candidate is already in this team
      const alreadyMember = (registration.members || []).some(
        (m: any) => (m.user?._id || m.user)?.toString() === candidateUserId
      );

      if (!alreadyMember) {
        // 1. Atomically add to HackathonRegistration members
        registration.members.push({
          user: new mongoose.Types.ObjectId(candidateUserId),
          role: request.roleOfferedOrSought || 'Developer',
          joinedAt: new Date(),
        });

        if (registration.members.length >= maxCapacity) {
          registration.isRecruiting = false;
        }

        // 2. Auto-provision or join private squad Discord Server
        if (registration.squadServerId) {
          await Server.findByIdAndUpdate(registration.squadServerId, {
            $addToSet: {
              members: {
                user: new mongoose.Types.ObjectId(candidateUserId),
                role: 'member',
                joinedAt: new Date(),
              },
            },
          });
        } else {
          const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
          const newServer = await Server.create({
            name: `${registration.teamName} [${request.hackathonName}]`,
            description: `Official private collaboration lounge for ${registration.teamName}`,
            ownerId: registration.leaderId,
            inviteCode,
            members: [
              { user: registration.leaderId, role: 'owner', joinedAt: new Date() },
              { user: new mongoose.Types.ObjectId(candidateUserId), role: 'member', joinedAt: new Date() },
            ],
            channels: [
              { name: 'general', type: 'text', topic: 'Squad planning & tactical coordination' },
              { name: 'resources', type: 'text', topic: 'Repository, API keys, docs, and submission specs' },
              { name: 'pair-hacking', type: 'voice', topic: 'WebRTC pair programming & audio lounge' },
            ],
          });
          registration.squadServerId = newServer._id;
        }

        await registration.save();

        // 3. Mark candidate as occupied
        await User.findByIdAndUpdate(candidateUserId, {
          occupancyStatus: 'occupied',
          occupiedTeamId: registration._id,
        });

        // 4. Clean up any solo registration candidate had for this hackathon
        await HackathonRegistration.updateMany(
          {
            hackathonId: request.hackathonId,
            'members.user': new mongoose.Types.ObjectId(candidateUserId),
            isSolo: true,
            _id: { $ne: registration._id },
          },
          {
            $set: { isDeleted: true, status: 'accepted' },
          }
        );
      }

      request.status = 'accepted';
      request.decisionNote = decisionNote?.trim() || 'Recruitment approved and member enrolled into squad';
      request.decisionAt = new Date();
      await request.save();

      // Courteous confirmation DM
      const serverUrl = `/dashboard/servers/${registration.squadServerId || ''}`;
      const confirmMessage = `🎉 Welcome aboard! You are now an official core member of squad "${registration.teamName}" for ${request.hackathonName}.\n\n` +
        `Your 6-digit Join Code: **${registration.code}**\n` +
        `Private Squad Server: You now have full access to #general, #resources, and voice:pair-hacking lounge.\n` +
        `Open Squad Lounge: ${serverUrl}`;

      await connectDevelopersAction(candidateUserId, confirmMessage);

      revalidatePath(`/dashboard/radar`);
      revalidatePath(`/dashboard/hackathons/${request.hackathonSlug}`);

      return {
        success: true,
        message: `Successfully joined "${registration.teamName}"! Private squad server & voice channel unlocked.`,
        squadServerId: registration.squadServerId?.toString(),
      };
    }

    // -------------------------------------------------------------
    // ACTION: REJECT
    // -------------------------------------------------------------
    if (action === 'reject') {
      request.status = 'rejected';
      request.decisionNote = decisionNote?.trim() || 'Candidate not selected for this position';
      request.decisionAt = new Date();
      await request.save();

      // Courteous notification DM
      const rejectMessage = `Update regarding squad "${registration.teamName}" for ${request.hackathonName}:\n` +
        `The squad evaluation has concluded and the position for "${request.roleOfferedOrSought}" has been filled.\n` +
        `Thank you for your interest and keep crushing it on Nerd'sHive!`;

      await connectDevelopersAction(candidateUserId, rejectMessage);

      revalidatePath(`/dashboard/radar`);
      return {
        success: true,
        message: `Request declined. Candidate removed from active evaluation queue.`,
      };
    }

    return { failure: 'Invalid action specified' };
  } catch (error: any) {
    console.error('Error responding to squad request:', error);
    return { failure: error.message || 'Failed to process response' };
  }
}

/**
 * 5. Schedule Radar Vetting Call
 * Propose, confirm, reschedule, or decline 15-minute alignment calls.
 */
export async function scheduleRadarMeetingAction(data: {
  requestId: string;
  action: 'propose' | 'confirm' | 'reschedule' | 'decline';
  scheduledAt?: string;
  durationMinutes?: number;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?._id) {
    return { failure: '401 Unauthorized: Please sign in' };
  }

  const userId = session.user._id.toString();
  await connectDB();

  try {
    const request = await SquadRequest.findById(data.requestId);
    if (!request || request.isDeleted) {
      return { failure: 'Request not found' };
    }

    const isSender = request.senderId.toString() === userId;
    const isReceiver = request.receiverId.toString() === userId;

    if (!isSender && !isReceiver) {
      return { failure: '403 Forbidden: You are not a participant in this request' };
    }

    const counterpartyId = isSender ? request.receiverId.toString() : request.senderId.toString();
    const meetingRoomId = request.meetingSchedule?.meetingRoomId || `vetting_${request._id.toString()}`;

    if (data.action === 'propose' || data.action === 'reschedule') {
      if (!data.scheduledAt) {
        return { failure: 'Scheduled date and time required' };
      }

      const scheduledDate = new Date(data.scheduledAt);
      request.meetingSchedule = {
        scheduledAt: scheduledDate,
        durationMinutes: data.durationMinutes || 15,
        status: data.action === 'propose' ? 'proposed' : 'rescheduled',
        proposedBy: new mongoose.Types.ObjectId(userId),
        meetingRoomId,
        notes: data.notes?.trim() || '',
      };

      await request.save();

      const notifMsg = `📅 Radar Vetting Call ${data.action === 'propose' ? 'Proposed' : 'Rescheduled'}!\n` +
        `Squad: "${request.teamName}" (${request.hackathonName})\n` +
        `Time: **${scheduledDate.toLocaleString()}** (${data.durationMinutes || 15} mins)\n` +
        (data.notes ? `Agenda: "${data.notes}"\n\n` : '\n') +
        `Please confirm in your Radar Control Panel.`;

      await connectDevelopersAction(counterpartyId, notifMsg);
    } else if (data.action === 'confirm') {
      if (!request.meetingSchedule?.scheduledAt) {
        return { failure: 'No proposed meeting time to confirm' };
      }

      request.meetingSchedule.status = 'confirmed';
      await request.save();

      const vettingRoomUrl = `/dashboard/radar?room=${meetingRoomId}&mode=vetting&request=${request._id.toString()}`;
      const notifMsg = `✅ Radar Vetting Call Confirmed!\n` +
        `Time: **${new Date(request.meetingSchedule.scheduledAt).toLocaleString()}**\n` +
        `Direct 1-Click Launch Room: ${vettingRoomUrl}\n\n` +
        `Be prepared to align on architecture, role division, and hackathon milestones!`;

      await connectDevelopersAction(counterpartyId, notifMsg);
    } else if (data.action === 'decline') {
      if (request.meetingSchedule) {
        request.meetingSchedule.status = 'declined';
        await request.save();
      }

      await connectDevelopersAction(counterpartyId, `The proposed meeting time was declined.`);
    }

    revalidatePath(`/dashboard/radar`);
    return {
      success: true,
      meetingSchedule: {
        scheduledAt: request.meetingSchedule?.scheduledAt?.toISOString(),
        durationMinutes: request.meetingSchedule?.durationMinutes || 15,
        status: request.meetingSchedule?.status || 'none',
        meetingRoomId,
        notes: request.meetingSchedule?.notes,
      },
      message: `Meeting schedule updated: ${data.action}`,
    };
  } catch (error: any) {
    console.error('Error updating meeting schedule:', error);
    return { failure: error.message || 'Failed to update meeting' };
  }
}

/**
 * 6. Dual-Sided Control Panel Aggregator
 * Retrieves Sent, Received, Deadlines, Scheduled Meetings, and Occupancy Settings.
 */
export async function getUserSquadControlPanelAction(hackathonSlug?: string) {
  const session = await auth();
  if (!session?.user?._id) {
    return { failure: '401 Unauthorized' };
  }

  const userId = session.user._id.toString();
  await connectDB();

  try {
    const dbUser: any = await User.findById(userId).lean();

    // Auto-expire any outdated pending requests
    const now = new Date();
    await SquadRequest.updateMany(
      {
        status: 'pending',
        expiresAt: { $lt: now },
      },
      {
        $set: { status: 'expired' },
      }
    );

    // Fetch Sent Requests
    const sent = await SquadRequest.find({
      senderId: new mongoose.Types.ObjectId(userId),
      isDeleted: { $ne: true },
    })
      .populate('receiverId')
      .populate('registrationId')
      .sort({ createdAt: -1 })
      .lean();

    // Fetch Received Requests
    const received = await SquadRequest.find({
      receiverId: new mongoose.Types.ObjectId(userId),
      isDeleted: { $ne: true },
    })
      .populate('senderId')
      .populate('registrationId')
      .sort({ createdAt: -1 })
      .lean();

    // Format Sent
    const formattedSent = sent.map((req: any) => ({
      _id: req._id.toString(),
      type: req.type,
      hackathonSlug: req.hackathonSlug,
      hackathonName: req.hackathonName,
      teamName: req.teamName,
      role: req.roleOfferedOrSought,
      personalNote: req.personalNote,
      status: req.status,
      expiresAt: req.expiresAt ? req.expiresAt.toISOString() : null,
      createdAt: req.createdAt ? req.createdAt.toISOString() : null,
      partner: serializeUser(req.receiverId),
      meetingSchedule: req.meetingSchedule
        ? {
            ...req.meetingSchedule,
            scheduledAt: req.meetingSchedule.scheduledAt
              ? req.meetingSchedule.scheduledAt.toISOString()
              : null,
            proposedBy: req.meetingSchedule.proposedBy?.toString(),
          }
        : null,
    }));

    // Format Received
    const formattedReceived = received.map((req: any) => ({
      _id: req._id.toString(),
      type: req.type,
      hackathonSlug: req.hackathonSlug,
      hackathonName: req.hackathonName,
      teamName: req.teamName,
      registrationId: req.registrationId?._id?.toString(),
      role: req.roleOfferedOrSought,
      personalNote: req.personalNote,
      status: req.status,
      expiresAt: req.expiresAt ? req.expiresAt.toISOString() : null,
      createdAt: req.createdAt ? req.createdAt.toISOString() : null,
      partner: serializeUser(req.senderId),
      meetingSchedule: req.meetingSchedule
        ? {
            ...req.meetingSchedule,
            scheduledAt: req.meetingSchedule.scheduledAt
              ? req.meetingSchedule.scheduledAt.toISOString()
              : null,
            proposedBy: req.meetingSchedule.proposedBy?.toString(),
          }
        : null,
    }));

    // Extract all scheduled meetings
    const allRequests = [...sent, ...received];
    const scheduledMeetings = allRequests
      .filter(
        (r: any) =>
          r.meetingSchedule &&
          ['proposed', 'confirmed', 'rescheduled'].includes(r.meetingSchedule.status)
      )
      .map((r: any) => {
        const isSender = r.senderId?._id?.toString() === userId || r.senderId?.toString() === userId;
        const partner = isSender ? r.receiverId : r.senderId;
        return {
          requestId: r._id.toString(),
          hackathonName: r.hackathonName,
          teamName: r.teamName,
          role: r.roleOfferedOrSought,
          scheduledAt: r.meetingSchedule.scheduledAt
            ? r.meetingSchedule.scheduledAt.toISOString()
            : null,
          durationMinutes: r.meetingSchedule.durationMinutes || 15,
          status: r.meetingSchedule.status,
          meetingRoomId: r.meetingSchedule.meetingRoomId,
          notes: r.meetingSchedule.notes,
          partner: serializeUser(partner),
          isProposedByMe: r.meetingSchedule.proposedBy?.toString() === userId,
        };
      })
      .sort((a, b) => {
        const timeA = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
        const timeB = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
        return timeA - timeB;
      });

    return {
      success: true,
      sentRequests: formattedSent,
      receivedRequests: formattedReceived,
      scheduledMeetings,
      userSettings: {
        acceptingRequests: dbUser?.acceptingRequests !== false,
        occupancyStatus: dbUser?.occupancyStatus || 'open',
        occupiedTeamId: dbUser?.occupiedTeamId?.toString(),
        college: dbUser?.college || dbUser?.organization || '',
        organization: dbUser?.organization || dbUser?.college || '',
        organizationType: dbUser?.organizationType || (dbUser?.college ? 'university' : 'independent'),
        experienceLevel: dbUser?.experienceLevel || 'entry',
        yearsOfExperience: dbUser?.yearsOfExperience || 0,
        hackathonsWonCount: dbUser?.hackathonsWonCount || 0,
        hackathonsAttendedCount: dbUser?.hackathonsAttendedCount || 0,
        location: dbUser?.location || '',
        timezone: dbUser?.timezone || '',
        preferredRole: dbUser?.preferredRole || 'Fullstack Developer',
      },
    };
  } catch (error: any) {
    console.error('Error fetching user squad control panel:', error);
    return { failure: error.message || 'Failed to fetch control panel' };
  }
}

/**
 * 7. Toggle User Availability & Occupancy Settings
 */
export async function toggleUserAvailabilityAction(data: {
  acceptingRequests?: boolean;
  occupancyStatus?: 'open' | 'occupied';
  college?: string;
  organization?: string;
  organizationType?: 'company' | 'university' | 'dao' | 'independent' | 'other';
  experienceLevel?: 'student' | 'entry' | 'mid' | 'senior' | 'lead' | 'founder';
  yearsOfExperience?: number;
  location?: string;
  timezone?: string;
  preferredRole?: string;
}) {
  const session = await auth();
  if (!session?.user?._id) {
    return { failure: '401 Unauthorized' };
  }

  await connectDB();
  try {
    const updateFields: any = {};
    if (typeof data.acceptingRequests === 'boolean') {
      updateFields.acceptingRequests = data.acceptingRequests;
    }
    if (data.occupancyStatus) {
      updateFields.occupancyStatus = data.occupancyStatus;
    }
    if (typeof data.organization === 'string') {
      updateFields.organization = data.organization.trim();
      if (data.organizationType === 'university' || (!data.organizationType && !data.college)) {
        updateFields.college = data.organization.trim();
      }
    }
    if (typeof data.college === 'string') {
      updateFields.college = data.college.trim();
      if (!updateFields.organization) {
        updateFields.organization = data.college.trim();
        updateFields.organizationType = 'university';
      }
    }
    if (data.organizationType) {
      updateFields.organizationType = data.organizationType;
    }
    if (data.experienceLevel) {
      updateFields.experienceLevel = data.experienceLevel;
    }
    if (typeof data.yearsOfExperience === 'number') {
      updateFields.yearsOfExperience = data.yearsOfExperience;
    }
    if (typeof data.location === 'string') {
      updateFields.location = data.location.trim();
    }
    if (typeof data.timezone === 'string') {
      updateFields.timezone = data.timezone.trim();
    }
    if (typeof data.preferredRole === 'string') {
      updateFields.preferredRole = data.preferredRole.trim();
    }

    const updated = await User.findByIdAndUpdate(session.user._id, updateFields, {
      new: true,
    }).lean();

    revalidatePath(`/dashboard/radar`);
    return {
      success: true,
      userSettings: {
        acceptingRequests: updated?.acceptingRequests !== false,
        occupancyStatus: updated?.occupancyStatus || 'open',
        college: updated?.college || updated?.organization || '',
        organization: updated?.organization || updated?.college || '',
        organizationType: updated?.organizationType || 'independent',
        experienceLevel: updated?.experienceLevel || 'entry',
        yearsOfExperience: updated?.yearsOfExperience || 0,
        hackathonsWonCount: updated?.hackathonsWonCount || 0,
        location: updated?.location || '',
        timezone: updated?.timezone || '',
        preferredRole: updated?.preferredRole || 'Fullstack Developer',
      },
    };
  } catch (error: any) {
    console.error('Error toggling availability:', error);
    return { failure: error.message || 'Failed to update settings' };
  }
}

/**
 * 8. Withdraw Squad Request (Sender Cancels Pending Offer/Application)
 */
export async function withdrawSquadRequestAction(requestId: string) {
  const session = await auth();
  if (!session?.user?._id) {
    return { failure: '401 Unauthorized' };
  }

  await connectDB();
  try {
    const request = await SquadRequest.findById(requestId);
    if (!request) return { failure: 'Request not found' };

    if (request.senderId.toString() !== session.user._id.toString()) {
      return { failure: '403 Forbidden: Only the sender can withdraw this request' };
    }

    if (request.status !== 'pending') {
      return { failure: `Cannot withdraw request with status "${request.status}"` };
    }

    request.status = 'withdrawn';
    await request.save();

    revalidatePath(`/dashboard/radar`);
    return { success: true, message: 'Request withdrawn successfully' };
  } catch (error: any) {
    console.error('Error withdrawing request:', error);
    return { failure: error.message || 'Failed to withdraw request' };
  }
}

/**
 * 9. Direct Developer Connection (Persistent DM)
 */
export async function connectDevelopersAction(partnerUserId: string, notes?: string) {
  const session = await auth();
  if (!session?.user?._id) {
    return { failure: '401 Unauthorized: Please sign in' };
  }

  if (session.user._id.toString() === partnerUserId) {
    return { failure: 'Cannot create connection with yourself' };
  }

  try {
    const roomResult = await getOrCreateDirectChatRoomAction(partnerUserId);
    if (roomResult.error || !roomResult.room) {
      return { failure: roomResult.error || 'Failed to initialize direct chat room' };
    }

    const chatRoomId = roomResult.room._id;
    const initialGreeting = notes
      ? `⚡ Connected via Nerd'sHive Radar!\n\n${notes}`
      : `⚡ Hey! Connected via Nerd'sHive Radar. Let's keep in touch here.`;

    await sendDirectMessageAction({
      chatRoomId,
      receiverId: partnerUserId,
      message: initialGreeting,
    });

    return {
      success: true,
      chatRoomId,
      message: 'Direct chat connection established',
    };
  } catch (error: any) {
    console.error('Error connecting developers:', error);
    return { failure: error.message || 'Failed to connect developers' };
  }
}

/**
 * 10. 1-Click invite candidate to active squad (Legacy direct helper)
 */
export async function inviteCandidateToSquadAction(
  registrationId: string,
  candidateUserId: string,
  personalNote?: string
) {
  return sendSquadRequestAction({
    type: 'leader_offer',
    hackathonSlug: 'hackmit-2026',
    registrationId,
    targetUserId: candidateUserId,
    role: 'Core Squad Member',
    personalNote,
    deadlineHours: 48,
  });
}

/**
 * 11. Form a brand new squad together directly
 */
export async function formSquadTogetherAction(data: {
  hackathonSlug: string;
  teamName: string;
  partnerUserId: string;
  targetTrack?: string;
  pitchSynopsis?: string;
}) {
  const session = await auth();
  if (!session?.user?._id) {
    return { failure: '401 Unauthorized: Please sign in' };
  }

  try {
    const createRes = await createOrJoinHackathonTeamAction(data.hackathonSlug, {
      teamName: data.teamName,
      trackName: data.targetTrack,
      lookingForDescription: data.pitchSynopsis,
    });

    if (createRes.failure || !createRes.success) {
      return { failure: createRes.failure || 'Failed to create squad' };
    }

    const teamCode = createRes.code;

    const inviteMessage = `🎉 We just formed squad "${data.teamName}" for ${data.hackathonSlug}!\n\n` +
      `Your 6-digit Join Code: **${teamCode}**\n` +
      (data.pitchSynopsis ? `Project Concept: "${data.pitchSynopsis}"\n\n` : '') +
      `Enter this code in the Hackathon Hub to join our squad and access our private Discord server (#general and voice:pair-hacking). Let's ship!`;

    await connectDevelopersAction(data.partnerUserId, inviteMessage);

    return {
      success: true,
      teamCode,
      message: `Squad "${data.teamName}" created! Partner invited with team code ${teamCode}.`,
    };
  } catch (error: any) {
    console.error('Error forming squad together:', error);
    return { failure: error.message || 'Failed to form squad' };
  }
}
