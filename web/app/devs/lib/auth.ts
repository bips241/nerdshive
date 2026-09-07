import crypto from 'crypto';
import { cookies } from 'next/headers';

export const DEV_SESSION_COOKIE = 'nerdshive_dev_token';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Configurable master password in .env with fallback
export function getDevMasterPassword(): string {
  return process.env.DEV_DOCS_PASSWORD || 'nerdshive_dev_2026_supersecret';
}

function getSecretKey(): string {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'nerdshive_secret_fallback_key_2026';
}

/**
 * Timing-safe password verification
 */
export function verifyDevPassword(inputPassword: string): boolean {
  if (!inputPassword || typeof inputPassword !== 'string') {
    return false;
  }

  const master = getDevMasterPassword();
  const inputBuffer = new Uint8Array(Buffer.from(inputPassword.trim()));
  const masterBuffer = new Uint8Array(Buffer.from(master.trim()));

  if (inputBuffer.length !== masterBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, masterBuffer);
}

/**
 * Generate a cryptographically signed HMAC token for the dev session
 */
export function createDevSessionToken(): string {
  const secret = getSecretKey();
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = JSON.stringify({ role: 'developer', exp: expiresAt });
  const payloadBase64 = Buffer.from(payload).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Cryptographically verify dev session token
 */
export function verifyDevSessionToken(token?: string | null): boolean {
  if (!token || typeof token !== 'string' || !token.includes('.')) {
    return false;
  }

  try {
    const [payloadBase64, providedSig] = token.split('.');
    if (!payloadBase64 || !providedSig) return false;

    const secret = getSecretKey();
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(payloadBase64)
      .digest('base64url');

    const providedBuf = new Uint8Array(Buffer.from(providedSig));
    const expectedBuf = new Uint8Array(Buffer.from(expectedSig));

    if (providedBuf.length !== expectedBuf.length) {
      return false;
    }

    if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) {
      return false;
    }

    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) {
      return false; // Expired
    }

    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Server Component helper to check if current request has a valid developer session
 */
export async function getDevSessionStatus(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(DEV_SESSION_COOKIE)?.value;
    return verifyDevSessionToken(token);
  } catch (_) {
    return false;
  }
}
