/**
 * NestJS API Gateway Application Module
 */

import { Module, Controller, Get, Post, Body, Query, HttpStatus, HttpException } from '@nestjs/common';
import { AuthService } from '../../auth-service/src';
import { MediaService } from '../../media-service/src';
import { MatchService } from '../../match-service/src';
import { DiscoveryService } from '../../discovery-service/src';
import { RedisEventBus } from '../../../libs/events';

const eventBus = new RedisEventBus(process.env.REDIS_URL);
const authService = new AuthService(eventBus);
const mediaService = new MediaService(eventBus, {
  bucket: process.env.AWS_BUCKET_NAME || 'nerdshive-bucket',
  region: process.env.AWS_BUCKET_REGION || 'ap-south-1',
  cdnDomain: process.env.CDN_DOMAIN || 'cdn.nerdshive.online',
});
const matchService = new MatchService(eventBus);
const discoveryService = new DiscoveryService(eventBus);

@Controller('api/v1')
export class GatewayController {
  @Get('health')
  getHealth() {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      topology: 'NestJS Microservices Monorepo',
      services: {
        'api-gateway': 'online',
        'auth-service': 'online',
        'media-service': 'online',
        'match-service': 'online',
        'chat-service': 'online',
        'discovery-service': 'online',
        'notification-service': 'online',
      },
    };
  }

  @Post('auth/otp')
  generateOTP(@Body() body: { email: string; username: string }) {
    if (!body.email || !body.username) {
      throw new HttpException('Email and username required', HttpStatus.BAD_REQUEST);
    }
    const code = authService.generateSecureOTP();
    return { success: true, codeExpiryMinutes: 60 };
  }

  @Post('media/presign')
  getPresignedUrl(@Body() body: { fileType: string; fileSize: number; userId: string }) {
    const validation = mediaService.validateUploadParams(body.fileType, body.fileSize);
    if (!validation.valid) {
      throw new HttpException(validation.error || 'Invalid file', HttpStatus.BAD_REQUEST);
    }
    const key = mediaService.generateObjectKey(body.userId);
    const publicUrl = mediaService.getPublicMediaUrl(key);
    return { success: true, key, publicUrl };
  }

  @Post('match/queue')
  async joinMatchQueue(@Body() body: { intent: string; peerId: string; socketId: string }) {
    if (!body.intent || !body.peerId || !body.socketId) {
      throw new HttpException('Missing queue parameters', HttpStatus.BAD_REQUEST);
    }
    const result = await matchService.joinQueue(body.intent, body.peerId, body.socketId);
    return result;
  }

  @Get('discovery/match')
  async findSkillMatches(@Query('skills') skills: string, @Query('target') target: string) {
    const userSkills = skills ? skills.split(',') : [];
    const targetSkills = target ? target.split(',') : [];
    const matches = await discoveryService.findComplementaryTeammates(userSkills, targetSkills);
    return { success: true, matches };
  }
}

@Module({
  controllers: [GatewayController],
})
export class AppModule {}
