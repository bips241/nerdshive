/**
 * Chat Microservice Core Domain (apps/chat-service)
 */

import { RedisEventBus } from '../../../libs/events';
import { createDomainEvent, DomainEventType } from '../../../libs/events';

export class ChatService {
  constructor(private readonly eventBus: RedisEventBus) {}

  public async onMessageDispatched(senderId: string, recipientId: string, content: string, roomId?: string) {
    const payload = {
      senderId,
      recipientId,
      content,
      roomId: roomId || `dm:${[senderId, recipientId].sort().join('-')}`,
      timestamp: new Date().toISOString(),
    };

    await this.eventBus.publish(
      createDomainEvent(DomainEventType.MESSAGE_SENT, 'chat-service', payload)
    );

    return payload;
  }
}
