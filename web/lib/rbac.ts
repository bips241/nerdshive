/**
 * Centralized Role-Based Access Control (RBAC) Engine for Nerd'sHive
 * Provides strict, bypass-proof authorization guards for server actions,
 * API routes, and Server Components.
 */

export type PlatformRole = 'admin' | 'organizer' | 'judge' | 'developer' | 'user';

export const ROLES = {
  ADMIN: 'admin' as PlatformRole,
  ORGANIZER: 'organizer' as PlatformRole,
  JUDGE: 'judge' as PlatformRole,
  DEVELOPER: 'developer' as PlatformRole,
  USER: 'user' as PlatformRole,
};

export interface RBACUser {
  _id?: string;
  id?: string;
  role?: string;
  user_name?: string;
  email?: string;
}

/**
 * Checks if user has one of the required platform roles
 */
export function hasRole(user: RBACUser | null | undefined, allowedRoles: PlatformRole[]): boolean {
  if (!user || !user.role) return false;
  const userRole = user.role.toLowerCase() as PlatformRole;
  return allowedRoles.includes(userRole) || userRole === 'admin';
}

/**
 * Assert authorization or throw a 403 Forbidden error
 */
export function assertAuthorized(
  condition: boolean,
  failureMessage = '403 Forbidden: Insufficient permissions to perform this operation.'
): void {
  if (!condition) {
    const error: any = new Error(failureMessage);
    error.status = 403;
    error.statusCode = 403;
    throw error;
  }
}

/**
 * 1. Hackathon Creation Permission
 * Only Platform Admins and Verified Organizers can create hackathons.
 */
export function canCreateHackathon(user: RBACUser | null | undefined): boolean {
  return hasRole(user, [ROLES.ADMIN, ROLES.ORGANIZER]);
}

/**
 * 2. Hackathon Management Permission (Rounds, Rubrics, Page Design, Winners)
 * Only the Event Organizer or Platform Admin can manage the hackathon.
 */
export function canManageHackathon(
  user: RBACUser | null | undefined,
  event: { organizerId?: any } | null | undefined
): boolean {
  if (!user || !user._id || !event || !event.organizerId) return false;
  if (user.role === ROLES.ADMIN) return true;

  const currentUserId = user._id.toString();
  const organizerId = (event.organizerId._id || event.organizerId).toString();
  return currentUserId === organizerId;
}

/**
 * 3. Hackathon Judging Permission
 * Only officially assigned Judges, the Event Organizer, or Platform Admin can evaluate teams.
 */
export function canJudgeHackathon(
  user: RBACUser | null | undefined,
  event: { organizerId?: any; judges?: any[] } | null | undefined
): boolean {
  if (!user || !user._id || !event) return false;
  if (user.role === ROLES.ADMIN) return true;

  const currentUserId = user._id.toString();
  const organizerId = (event.organizerId?._id || event.organizerId)?.toString();
  if (currentUserId === organizerId) return true;

  const judgeIds = (event.judges || []).map((j: any) => (j._id || j).toString());
  return judgeIds.includes(currentUserId);
}

/**
 * 4. Project Submission Permission
 * Only confirmed members or the squad leader of a registered team can submit projects.
 */
export function canSubmitProject(
  user: RBACUser | null | undefined,
  registration: { leaderId?: any; members?: Array<{ user: any }> } | null | undefined
): boolean {
  if (!user || !user._id || !registration) return false;
  if (user.role === ROLES.ADMIN) return true;

  const currentUserId = user._id.toString();
  const leaderId = (registration.leaderId?._id || registration.leaderId)?.toString();
  if (currentUserId === leaderId) return true;

  return (registration.members || []).some((m: any) => {
    const memberId = (m.user?._id || m.user)?.toString();
    return memberId === currentUserId;
  });
}

/**
 * 5. Squad Applicant Management Permission (Accept / Decline)
 * Only the Squad Leader (post creator) can accept or decline squad applicants.
 */
export function canManageSquad(
  user: RBACUser | null | undefined,
  post: { userId?: any } | null | undefined
): boolean {
  if (!user || !user._id || !post || !post.userId) return false;
  if (user.role === ROLES.ADMIN) return true;

  const currentUserId = user._id.toString();
  const authorId = (post.userId._id || post.userId).toString();
  return currentUserId === authorId;
}

/**
 * 6. Platform Moderation Permission (Verify Hackathons, Ban Content)
 */
export function canModeratePlatform(user: RBACUser | null | undefined): boolean {
  return hasRole(user, [ROLES.ADMIN]);
}
