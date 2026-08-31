import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const getS3Config = () => {
  const bucket = process.env.AWS_BUCKET_NAME || process.env.AWS_S3_BUCKET || process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_BUCKET_REGION || process.env.AWS_REGION || "ap-south-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;
  const cdnDomain = process.env.CDN_DOMAIN || process.env.CLOUDFRONT_DOMAIN;

  return { bucket, region, accessKeyId, secretAccessKey, sessionToken, cdnDomain };
};

let cachedS3: S3Client | null = null;
function getS3() {
  if (cachedS3) return cachedS3;
  const { region, accessKeyId, secretAccessKey, sessionToken } = getS3Config();
  if (!region || !accessKeyId || !secretAccessKey) return null;
  cachedS3 = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
    },
  });
  return cachedS3;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 15MB limit" }, { status: 400 });
    }

    const s3 = getS3();
    const { bucket, region, cdnDomain } = getS3Config();

    if (!s3 || !bucket) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const extension = file.name.split(".").pop() || "bin";
    const timestamp = Date.now();
    const hash = crypto.randomBytes(16).toString("hex");
    const key = `uploads/${timestamp}-${hash}.${extension}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type || "application/octet-stream",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    const fileUrl = cdnDomain
      ? `https://${cdnDomain}/${key}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

    return NextResponse.json({
      success: true,
      fileUrl,
      key,
    });
  } catch (err: any) {
    console.error("Direct upload fallback failed:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
