/**
 * Auth Microservice Core Domain (apps/auth-service)
 */

import crypto from 'crypto';
import { RedisEventBus } from '../../../libs/events';
import { createDomainEvent, DomainEventType } from '../../../libs/events';

export class AuthService {
  constructor(private readonly eventBus: RedisEventBus) {}

  public generateSecureOTP(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  public async onUserRegistered(userId: string, username: string, email: string) {
    await this.eventBus.publish(
      createDomainEvent(DomainEventType.USER_REGISTERED, 'auth-service', {
        userId,
        username,
        email,
      })
    );
  }

  public async onUserVerified(userId: string, username: string, email: string) {
    await this.eventBus.publish(
      createDomainEvent(DomainEventType.USER_VERIFIED, 'auth-service', {
        userId,
        username,
        email,
      })
    );
  }
}
