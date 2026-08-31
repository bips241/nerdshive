/**
 * Media Microservice Core Domain (apps/media-service)
 */

import crypto from 'crypto';
import { RedisEventBus } from '../../../libs/events';
import { createDomainEvent, DomainEventType } from '../../../libs/events';

export interface S3StorageConfig {
  bucket: string;
  region: string;
  cdnDomain?: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/mov',
  'video/webm',
]);

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export class MediaService {
  constructor(
    private readonly eventBus: RedisEventBus,
    private readonly config: S3StorageConfig
  ) {}

  public validateUploadParams(fileType: string, fileSize: number): { valid: boolean; error?: string } {
    const cleanType = (fileType || '').toLowerCase().split(';')[0].trim();
    if (!ALLOWED_MIME_TYPES.has(cleanType)) {
      return { valid: false, error: `Unsupported file type: "${fileType}".` };
    }
    if (fileSize > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size exceeds maximum limit of 15MB.' };
    }
    return { valid: true };
  }

  public generateObjectKey(userId: string, extension = 'bin'): string {
    const timestamp = Date.now();
    const randomHash = crypto.randomBytes(16).toString('hex');
    return `uploads/${userId}/${timestamp}-${randomHash}.${extension}`;
  }

  public getPublicMediaUrl(key: string): string {
    if (this.config.cdnDomain) {
      return `https://${this.config.cdnDomain}/${key}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }

  public async onUploadInitiated(userId: string, fileName: string, fileType: string, fileSize: number) {
    await this.eventBus.publish(
      createDomainEvent(DomainEventType.MEDIA_UPLOAD_INITIATED, 'media-service', {
        userId,
        fileName,
        fileType,
        fileSize,
      })
    );
  }
}
