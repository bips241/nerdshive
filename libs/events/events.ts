/**
 * Standardized Cross-Service Domain Events for NerdShive / DevConnect
 */

export enum DomainEventType {
  // Auth Events
  USER_REGISTERED = 'user.registered',
  USER_VERIFIED = 'user.verified',
  USER_LOGGED_IN = 'user.logged_in',

  // Profile & Social Graph Events
  USER_FOLLOWED = 'user.followed',
  USER_UNFOLLOWED = 'user.unfollowed',
  PROFILE_UPDATED = 'user.profile_updated',

  // Media Events
  MEDIA_UPLOAD_INITIATED = 'media.upload_initiated',
  MEDIA_UPLOAD_COMPLETED = 'media.upload_completed',
  MEDIA_PROCESSING_FAILED = 'media.processing_failed',

  // Matchmaking & Video Chat Events
  MATCH_QUEUED = 'match.queued',
  MATCH_FOUND = 'match.found',
  MATCH_SKIPPED = 'match.skipped',
  MATCH_ENDED = 'match.ended',

  // Collaboration Events
  PROJECT_CREATED = 'project.created',
  COLLAB_REQUESTED = 'collab.requested',
  COLLAB_ACCEPTED = 'collab.accepted',
  COLLAB_REJECTED = 'collab.rejected',

  // Poll & Goal Events
  POLL_VOTED = 'poll.voted',
  GOAL_INTEREST_EXPRESSED = 'goal.interest_expressed',

  // Messaging Events
  MESSAGE_SENT = 'chat.message_sent',
}

export interface DomainEvent<T = any> {
  id: string;
  type: DomainEventType;
  timestamp: number;
  sourceService: string;
  payload: T;
}

export function createDomainEvent<T>(
  type: DomainEventType,
  sourceService: string,
  payload: T
): DomainEvent<T> {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    type,
    timestamp: Date.now(),
    sourceService,
    payload,
  };
}
