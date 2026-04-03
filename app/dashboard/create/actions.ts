"use server";

import { auth } from "@/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const readEnv = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return undefined;
};

const getS3Config = () => {
  const bucket = readEnv("AWS_BUCKET_NAME", "AWS_S3_BUCKET", "S3_BUCKET_NAME");
  const region = readEnv("AWS_BUCKET_REGION", "AWS_REGION", "AWS_DEFAULT_REGION");
  const accessKeyId = readEnv("AWS_ACCESS_KEY", "AWS_ACCESS_KEY_ID");
  const secretAccessKey = readEnv("AWS_SECRET_ACCESS_KEY");
  const sessionToken = readEnv("AWS_SESSION_TOKEN");

  return { bucket, region, accessKeyId, secretAccessKey, sessionToken };
};

const createS3Client = () => {
  const { region, accessKeyId, secretAccessKey, sessionToken } = getS3Config();

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing AWS S3 configuration");
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
    },
  });
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
  };
  failure?: string;
};

const allowedFileTypes = [
  "image/jpeg",
  "image/png",
  "video/mp4",
  "video/quicktime",
];

const maxFileSize = 1024 * 1024 * 15; // 15 MB

const generateFileName = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");

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

  const { bucket, region, accessKeyId, secretAccessKey } = getS3Config();

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    const missing: string[] = [];
    if (!bucket) missing.push("AWS_BUCKET_NAME|AWS_S3_BUCKET|S3_BUCKET_NAME");
    if (!region) missing.push("AWS_BUCKET_REGION|AWS_REGION|AWS_DEFAULT_REGION");
    if (!accessKeyId) missing.push("AWS_ACCESS_KEY|AWS_ACCESS_KEY_ID");
    if (!secretAccessKey) missing.push("AWS_SECRET_ACCESS_KEY");
    return { failure: `S3 is not configured: missing ${missing.join(", ")}` };
  }

  if (!allowedFileTypes.includes(fileType)) {
    return { failure: "File type not allowed" };
  }

  if (fileSize > maxFileSize) {
    return { failure: "File size too large" };
  }

  const fileName = generateFileName();

  const putObjectCommand = new PutObjectCommand({
    Bucket: bucket,
    Key: fileName,
    ContentType: fileType,
    ContentLength: fileSize,
  });

  try {
    const s3Client = createS3Client();
    const url = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: 900 });
    const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;
    return { success: { url, key: fileName, fileUrl } };
  } catch (error) {
    console.error("Error generating signed URL (attempt 1):", error);
    try {
      const retryClient = createS3Client();
      const retryUrl = await getSignedUrl(retryClient, putObjectCommand, { expiresIn: 900 });
      const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;
      return { success: { url: retryUrl, key: fileName, fileUrl } };
    } catch (retryError) {
      console.error("Error generating signed URL (attempt 2):", retryError);
      return { failure: "Failed to generate signed URL" };
    }
  }
};
