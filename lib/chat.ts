// lib/chat.ts

/**
 * Generate a consistent chat room ID between two user IDs.
 */
export function getRoomId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join("_");
  }
  