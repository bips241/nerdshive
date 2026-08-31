/**
 * Chat Microservice Standalone Entrypoint
 */

import { RedisEventBus } from '../../../libs/events';
import { ChatService } from './index';

async function bootstrap() {
  const eventBus = new RedisEventBus(process.env.REDIS_URL);
  await eventBus.connect();
  const chatService = new ChatService(eventBus);

  const PORT = process.env.GRPC_CHAT_PORT || 50054;
  console.log(`[Chat Microservice] Initialized gRPC service on port ${PORT}`);
}

if (require.main === module) {
  bootstrap().catch(console.error);
}

export { bootstrap };
