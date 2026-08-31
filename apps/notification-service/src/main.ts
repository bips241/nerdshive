/**
 * Notification Microservice Standalone Entrypoint
 */

import { RedisEventBus } from '../../../libs/events';
import { NotificationService } from './index';

async function bootstrap() {
  const eventBus = new RedisEventBus(process.env.REDIS_URL);
  await eventBus.connect();
  const notificationService = new NotificationService(eventBus);
  await notificationService.startListening();
  console.log(`[Notification Microservice] Initialized and listening on event bus`);
}

if (require.main === module) {
  bootstrap().catch(console.error);
}

export { bootstrap };
