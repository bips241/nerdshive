/**
 * Enterprise Client-Side Media Upload Manager
 * Implements exponential backoff retry, progress reporting, and automatic server proxy fallback.
 */

import { getSignedURL } from "@/app/dashboard/create/actions";

export interface UploadOptions {
  file: File;
  onProgress?: (progress: number) => void;
  maxRetries?: number;
}

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  key?: string;
  error?: string;
}

/**
 * Uploads a file directly to S3 via pre-signed URL with XMLHttpRequest for fine-grained progress.
 */
function uploadToS3WithProgress(
  presignedUrl: string,
  file: File,
  contentType: string,
  onProgress?: (percent: number) => void
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl, true);
    xhr.setRequestHeader("Content-Type", contentType);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve(true);
      } else {
        reject(new Error(`S3 responded with status ${xhr.status}: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during S3 direct upload"));
    };

    xhr.ontimeout = () => {
      reject(new Error("S3 upload timed out"));
    };

    xhr.timeout = 60000; // 60s timeout
    xhr.send(file);
  });
}

/**
 * Fallback uploader that streams the file through the Next.js backend API if direct-to-S3 is blocked.
 */
async function uploadViaServerFallback(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  try {
    if (onProgress) onProgress(10);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload/direct", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.error || "Server fallback upload failed" };
    }

    const data = await res.json();
    if (onProgress) onProgress(100);
    return {
      success: true,
      fileUrl: data.fileUrl,
      key: data.key,
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Fallback upload error" };
  }
}

/**
 * Main rock-solid upload entrypoint.
 */
export async function uploadMediaFile({
  file,
  onProgress,
  maxRetries = 3,
}: UploadOptions): Promise<UploadResult> {
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      if (onProgress) onProgress(5);

      // 1. Request presigned URL from server action
      const presignResult = await getSignedURL({
        fileSize: file.size,
        fileType: file.type || "image/jpeg",
      });

      if (presignResult.failure || !presignResult.success) {
        throw new Error(presignResult.failure || "Failed to generate presigned upload URL");
      }

      const { url, fileUrl, normalizedType, key } = presignResult.success;

      // 2. Direct upload to S3 with progress tracking
      await uploadToS3WithProgress(url, file, normalizedType, onProgress);

      return {
        success: true,
        fileUrl,
        key,
      };
    } catch (err: any) {
      console.warn(`[UploadManager] Attempt ${attempt}/${maxRetries} failed:`, err.message);

      if (attempt < maxRetries) {
        // Exponential backoff with jitter: (2^attempt * 500ms) + random jitter
        const delay = Math.pow(2, attempt) * 500 + Math.random() * 300;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // 3. If direct S3 attempts fail, attempt seamless server fallback
  console.info("[UploadManager] Direct S3 attempts failed. Falling back to server streaming upload...");
  return await uploadViaServerFallback(file, onProgress);
}
