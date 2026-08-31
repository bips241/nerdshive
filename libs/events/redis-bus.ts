/**
 * Redis-Backed Event Bus for Cross-Service Messaging & PubSub
 */

import { DomainEvent, DomainEventType } from './events';
import Redis from 'ioredis';

export type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void> | void;

export class RedisEventBus {
  private publisher: Redis | null = null;
  private subscriber: Redis | null = null;
  private handlers: Map<DomainEventType, Set<EventHandler>> = new Map();
  private isConnected = false;

  constructor(private redisUrl?: string) {}

  public async connect(): Promise<void> {
    if (!this.redisUrl) {
      console.log('[EventBus] No REDIS_URL provided. Running in local in-memory event mode.');
      this.isConnected = true;
      return;
    }

    try {
      const tls = this.redisUrl.startsWith('rediss://') || this.redisUrl.includes('upstash.io');

      this.publisher = new Redis(this.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: null,
        ...(tls ? { tls: {} } : {}),
      });

      this.subscriber = this.publisher.duplicate();

      await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
      this.isConnected = true;

      this.subscriber.on('message', (channel: string, message: string) => {
        try {
          const event: DomainEvent = JSON.parse(message);
          this.dispatchLocally(event);
        } catch (err) {
          console.error('[EventBus] Failed to parse incoming event:', err);
        }
      });

      console.log('[EventBus] Connected to Redis cluster/instance successfully.');
    } catch (err: any) {
      console.warn('[EventBus] Redis connection failed, falling back to in-memory event bus:', err.message);
      this.isConnected = false;
    }
  }

  public async publish<T>(event: DomainEvent<T>): Promise<void> {
    const channel = `events:${event.type}`;
    const payloadStr = JSON.stringify(event);

    if (this.publisher && this.isConnected) {
      try {
        await this.publisher.publish(channel, payloadStr);
      } catch (err) {
        console.error(`[EventBus] Publish error on ${channel}:`, err);
        this.dispatchLocally(event);
      }
    } else {
      this.dispatchLocally(event);
    }
  }

  public async subscribe<T>(type: DomainEventType, handler: EventHandler<T>): Promise<void> {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
      if (this.subscriber && this.isConnected) {
        const channel = `events:${type}`;
        await this.subscriber.subscribe(channel);
      }
    }
    this.handlers.get(type)!.add(handler);
  }

  private dispatchLocally(event: DomainEvent): void {
    const registeredHandlers = this.handlers.get(event.type);
    if (registeredHandlers) {
      registeredHandlers.forEach((handler) => {
        try {
          handler(event);
        } catch (err) {
          console.error(`[EventBus] Error executing local handler for ${event.type}:`, err);
        }
      });
    }
  }

  public async disconnect(): Promise<void> {
    if (this.publisher) await this.publisher.quit();
    if (this.subscriber) await this.subscriber.quit();
    this.isConnected = false;
  }
}
