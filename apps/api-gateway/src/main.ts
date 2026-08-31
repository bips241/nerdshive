/**
 * NestJS API Gateway — Main Entrypoint
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  const PORT = process.env.GATEWAY_PORT || 4000;
  await app.listen(PORT);
  console.log(`[API Gateway] NestJS Gateway listening on http://localhost:${PORT}`);
}

if (require.main === module) {
  bootstrap().catch(console.error);
}

export { bootstrap };
