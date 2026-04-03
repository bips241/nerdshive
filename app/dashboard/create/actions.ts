"use server";

import { auth } from "@/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

const createS3Client = () => {
  const region = process.env.AWS_BUCKET_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;

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
  checksum: string;
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
  checksum,
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

  const bucket = process.env.AWS_BUCKET_NAME;
  const region = process.env.AWS_BUCKET_REGION;

  if (!bucket || !region || !process.env.AWS_ACCESS_KEY || !process.env.AWS_SECRET_ACCESS_KEY) {
    return { failure: "S3 is not configured" };
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
    ChecksumSHA256: checksum,
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
