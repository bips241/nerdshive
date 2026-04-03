"use server";

import { auth } from "@/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_BUCKET_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

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
  const session = await auth();
  console.log("SESSION:", session);
  if (!session) {
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
    const url = await getSignedUrl(s3Client, putObjectCommand, { expiresIn: 600 });
    const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fileName}`;
    return { success: { url, key: fileName, fileUrl } };
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return { failure: "Failed to generate signed URL" };
  }
};
