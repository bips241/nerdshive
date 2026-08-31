/**
 * Notification Alert Worker Microservice (apps/notification-service)
 */

import { RedisEventBus } from '../../../libs/events';
import { DomainEventType, DomainEvent } from '../../../libs/events';

export class NotificationService {
  constructor(private readonly eventBus: RedisEventBus) {}

  public async startListening() {
    console.log('[Notification Service] Listening to domain events...');

    await this.eventBus.subscribe(DomainEventType.USER_REGISTERED, async (event: DomainEvent) => {
      console.log(`[Notification Service] Dispatching welcome email to ${event.payload?.email}`);
    });

    await this.eventBus.subscribe(DomainEventType.COLLAB_REQUESTED, async (event: DomainEvent) => {
      console.log(`[Notification Service] Creating in-app alert for collaboration request on post ${event.payload?.postId}`);
    });

    await this.eventBus.subscribe(DomainEventType.MATCH_FOUND, async (event: DomainEvent) => {
      console.log(`[Notification Service] Match notification for room ${event.payload?.roomId}`);
    });
  }
}
