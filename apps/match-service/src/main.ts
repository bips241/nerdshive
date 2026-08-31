/**
 * Matchmaking Microservice Standalone Entrypoint
 */

import { RedisEventBus } from '../../../libs/events';
import { MatchService } from './index';

async function bootstrap() {
  const eventBus = new RedisEventBus(process.env.REDIS_URL);
  await eventBus.connect();
  const matchService = new MatchService(eventBus);

  const PORT = process.env.GRPC_MATCH_PORT || 50053;
  console.log(`[Matchmaking Microservice] Initialized gRPC service on port ${PORT}`);
}

if (require.main === module) {
  bootstrap().catch(console.error);
}

export { bootstrap };
