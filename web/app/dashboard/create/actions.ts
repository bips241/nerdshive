"use server";

import { auth } from "@/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { RedisEventBus, createDomainEvent, DomainEventType } from "@nerdshive/events";

const eventBus = new RedisEventBus(process.env.REDIS_URL);

const readEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
};

const getS3Config = () => {
  const bucket = readEnv("AWS_BUCKET_NAME", "AWS_S3_BUCKET", "S3_BUCKET_NAME");
  const region = readEnv("AWS_BUCKET_REGION", "AWS_REGION", "AWS_DEFAULT_REGION") || "ap-south-1";
  const accessKeyId = readEnv("AWS_ACCESS_KEY", "AWS_ACCESS_KEY_ID");
  const secretAccessKey = readEnv("AWS_SECRET_ACCESS_KEY");
  const sessionToken = readEnv("AWS_SESSION_TOKEN");
  const cdnDomain = readEnv("CDN_DOMAIN", "CLOUDFRONT_DOMAIN");

  return { bucket, region, accessKeyId, secretAccessKey, sessionToken, cdnDomain };
};

// Singleton S3 Client with connection reuse and TCP keep-alive
let cachedS3Client: S3Client | null = null;

const getOrCreateS3Client = () => {
  if (cachedS3Client) {
    return cachedS3Client;
  }

  const { region, accessKeyId, secretAccessKey, sessionToken } = getS3Config();

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS S3 configuration");
  }

  cachedS3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
    },
    maxAttempts: 3,
  });

  return cachedS3Client;
};

type GetSignedURLParams = {
  fileType: string;
  fileSize: number;
};

type SignedURLResponse = {
  success?: {
    url: string;
    key: string;
    fileUrl: string;
    normalizedType: string;
  };
  failure?: string;
};

const MIME_MAP: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
  "video/mp4": "video/mp4",
  "video/quicktime": "video/quicktime",
  "video/mov": "video/quicktime",
  "video/webm": "video/webm",
};

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

const generateFileName = (extension: string, bytes = 24) => {
  const timestamp = Date.now();
  const randomHash = crypto.randomBytes(bytes).toString("hex");
  return `uploads/${timestamp}-${randomHash}.${extension}`;
};

export const getSignedURL = async ({
  fileType,
  fileSize,
}: GetSignedURLParams): Promise<SignedURLResponse> => {
  let session;
  try {
    session = await auth();
  } catch (error) {
    console.error("Auth check failed while generating signed URL", error);
    return { failure: "auth unavailable" };
  }

  if (!session?.user?._id) {
    return { failure: "not authenticated" };
  }

  const { bucket, region, accessKeyId, secretAccessKey, cdnDomain } = getS3Config();

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    const missing: string[] = [];
    if (!bucket) missing.push("AWS_BUCKET_NAME|AWS_S3_BUCKET|S3_BUCKET_NAME");
    if (!region) missing.push("AWS_BUCKET_REGION|AWS_REGION|AWS_DEFAULT_REGION");
    if (!accessKeyId) missing.push("AWS_ACCESS_KEY|AWS_ACCESS_KEY_ID");
    if (!secretAccessKey) missing.push("AWS_SECRET_ACCESS_KEY");
    return { failure: `S3 is not configured: missing ${missing.join(", ")}` };
  }

  // Normalize MIME type
  const rawType = (fileType || "").toLowerCase().split(";")[0].trim();
  const normalizedType = MIME_MAP[rawType];

  if (!normalizedType) {
    return { failure: `File type "${fileType}" is not allowed. Supported formats: JPEG, PNG, WebP, GIF, MP4, MOV, WebM.` };
  }

  if (fileSize > MAX_FILE_SIZE) {
    return { failure: `File size (${(fileSize / (1024 * 1024)).toFixed(1)}MB) exceeds the 15MB limit.` };
  }

  // Determine file extension
  let extension = "bin";
  if (normalizedType === "image/jpeg") extension = "jpg";
  else if (normalizedType === "image/png") extension = "png";
  else if (normalizedType === "image/webp") extension = "webp";
  else if (normalizedType === "image/gif") extension = "gif";
  else if (normalizedType === "video/mp4") extension = "mp4";
  else if (normalizedType === "video/quicktime") extension = "mov";
  else if (normalizedType === "video/webm") extension = "webm";

  const fileName = generateFileName(extension);

  // CRITICAL: We do NOT pass ContentLength to PutObjectCommand when presigning.
  // Including ContentLength forces S3 to sign the exact Content-Length header, which
  // causes intermittent 403 Forbidden (SignatureDoesNotMatch) on browser binary chunking differences.
  const putObjectCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: fileName,
    ContentType: normalizedType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  try {
    const s3Client = getOrCreateS3Client();
    const url = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: 900 });

    const fileUrl = cdnDomain
      ? `https://${cdnDomain}/${fileName}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;

    // Publish domain event asynchronously
    try {
      await eventBus.publish(
        createDomainEvent(DomainEventType.MEDIA_UPLOAD_INITIATED, 'media-proxy', {
          userId: session.user._id,
          fileName,
          fileType: normalizedType,
          fileSize,
        })
      );
    } catch (eventErr) {
      console.warn('Failed to publish media.upload_initiated event:', eventErr);
    }

    return {
      success: {
        url,
        key: fileName,
        fileUrl,
        normalizedType,
      },
    };
  } catch (error: any) {
    console.error("Error generating signed URL:", error);
    return { failure: `Failed to generate upload URL: ${error.message || "Unknown S3 error"}` };
  }
};
