/**
 * Matchmaking Microservice Core Domain (apps/match-service)
 */

import { RedisEventBus } from '../../../libs/events';
import { createDomainEvent, DomainEventType } from '../../../libs/events';

export interface MatchCandidate {
  peerId: string;
  socketId: string;
  enqueuedAt: number;
}

export interface MatchResult {
  matched: boolean;
  partner?: MatchCandidate;
  roomId?: string;
  isInitiator?: boolean;
  queuePosition?: number;
}

export class MatchService {
  private inMemoryQueues: Map<string, MatchCandidate[]> = new Map();

  constructor(private readonly eventBus: RedisEventBus) {
    this.inMemoryQueues.set('pair_debug', []);
    this.inMemoryQueues.set('project_teammate', []);
    this.inMemoryQueues.set('system_design', []);
    this.inMemoryQueues.set('hiring', []);
    this.inMemoryQueues.set('looking_for_job', []);
  }

  public async joinQueue(intent: string, peerId: string, socketId: string): Promise<MatchResult> {
    if (!this.inMemoryQueues.has(intent)) {
      this.inMemoryQueues.set(intent, []);
    }
    const queue = this.inMemoryQueues.get(intent) || [];

    const existingIndex = queue.findIndex((c) => c.socketId === socketId || c.peerId === peerId);
    if (existingIndex !== -1) {
      queue.splice(existingIndex, 1);
    }

    if (queue.length > 0) {
      const partner = queue.shift()!;
      const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      await this.eventBus.publish(
        createDomainEvent(DomainEventType.MATCH_FOUND, 'match-service', {
          intent,
          roomId,
          userA: { socketId, peerId },
          userB: { socketId: partner.socketId, peerId: partner.peerId },
        })
      );

      return {
        matched: true,
        partner,
        roomId,
        isInitiator: true,
      };
    } else {
      const candidate: MatchCandidate = {
        peerId,
        socketId,
        enqueuedAt: Date.now(),
      };
      queue.push(candidate);
      this.inMemoryQueues.set(intent, queue);

      return {
        matched: false,
        queuePosition: queue.length,
      };
    }
  }

  public async leaveQueue(socketId: string, intent?: string): Promise<void> {
    const cleanIntent = (qIntent: string) => {
      const q = this.inMemoryQueues.get(qIntent);
      if (q) {
        const filtered = q.filter((c) => c.socketId !== socketId);
        this.inMemoryQueues.set(qIntent, filtered);
      }
    };

    if (intent) {
      cleanIntent(intent);
    } else {
      ['pair_debug', 'project_teammate', 'system_design', 'hiring', 'looking_for_job'].forEach(cleanIntent);
    }
  }

  public async getQueueDepth(): Promise<Record<string, number>> {
    return {
      pair_debug: this.inMemoryQueues.get('pair_debug')?.length || 0,
      project_teammate: this.inMemoryQueues.get('project_teammate')?.length || 0,
      system_design: this.inMemoryQueues.get('system_design')?.length || 0,
      hiring: this.inMemoryQueues.get('hiring')?.length || 0,
      looking_for_job: this.inMemoryQueues.get('looking_for_job')?.length || 0,
    };
  }
}
