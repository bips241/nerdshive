/**
 * Discovery Microservice Standalone Entrypoint
 */

import { RedisEventBus } from '../../../libs/events';
import { DiscoveryService } from './index';

async function bootstrap() {
  const eventBus = new RedisEventBus(process.env.REDIS_URL);
  await eventBus.connect();
  const discoveryService = new DiscoveryService(eventBus);

  const PORT = process.env.GRPC_DISCOVERY_PORT || 50055;
  console.log(`[Discovery Microservice] Initialized gRPC service on port ${PORT}`);
}

if (require.main === module) {
  bootstrap().catch(console.error);
}

export { bootstrap };
