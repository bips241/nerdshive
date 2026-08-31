/**
 * Media Microservice Standalone Entrypoint
 */

import { RedisEventBus } from '../../../libs/events';
import { MediaService } from './index';

async function bootstrap() {
  const eventBus = new RedisEventBus(process.env.REDIS_URL);
  await eventBus.connect();
  const mediaService = new MediaService(eventBus, {
    bucket: process.env.AWS_BUCKET_NAME || 'nerdshive-bucket',
    region: process.env.AWS_BUCKET_REGION || 'ap-south-1',
    cdnDomain: process.env.CDN_DOMAIN || 'cdn.nerdshive.online',
  });

  const PORT = process.env.GRPC_MEDIA_PORT || 50052;
  console.log(`[Media Microservice] Initialized gRPC service on port ${PORT}`);
}

if (require.main === module) {
  bootstrap().catch(console.error);
}

export { bootstrap };
