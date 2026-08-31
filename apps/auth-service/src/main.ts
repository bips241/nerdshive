/**
 * Auth Microservice Standalone gRPC / Service Entrypoint
 */

import { RedisEventBus } from '../../../libs/events';
import { AuthService } from './index';

async function bootstrap() {
  const eventBus = new RedisEventBus(process.env.REDIS_URL);
  await eventBus.connect();
  const authService = new AuthService(eventBus);

  const PORT = process.env.GRPC_AUTH_PORT || 50051;
  console.log(`[Auth Microservice] Initialized gRPC service on port ${PORT}`);
}

if (require.main === module) {
  bootstrap().catch(console.error);
}

export { bootstrap };
