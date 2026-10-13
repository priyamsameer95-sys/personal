import type { NextRequest } from 'next/server';

export const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Rate limit store: IP -> timestamps of failed attempts
const loginAttempts = new Map<string, number[]>();

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 15 * 60 * 1000; // 15 mins ago
  
  let attempts = loginAttempts.get(ip) || [];
  // Keep only attempts in the last 15 minutes
  attempts = attempts.filter(t => t > windowStart);
  loginAttempts.set(ip, attempts);
  
  return attempts.length >= 5;
}

export function recordFailedAttempt(ip: string) {
  const attempts = loginAttempts.get(ip) || [];
  attempts.push(Date.now());
  loginAttempts.set(ip, attempts);
}

export function clearFailedAttempts(ip: string) {
  loginAttempts.delete(ip);
}

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || '127.0.0.1';
}

// Derive a cryptographic HMAC Key from password using Web Crypto API
async function getHMACKey(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyData = enc.encode(password);
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

// Admin access is disabled until the deployment supplies its own password.
export function getAdminPassword(): string | undefined {
  const password = process.env.ADMIN_PASSWORD;
  return password && password.trim() ? password : undefined;
}

// Generate a session with the same 24-hour lifetime and signed-cookie format.
export async function createSessionToken(): Promise<string> {
  const password = getAdminPassword();
  if (!password) {
    throw new Error('Admin access is not configured.');
  }

  const expiry = Date.now() + SESSION_DURATION;
  const payloadBase64 = Buffer.from(JSON.stringify({ expiry })).toString('base64url');
  const key = await getHMACKey(password);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payloadBase64)
  );
  const signatureHex = Buffer.from(signatureBuffer).toString('hex');

  return `${payloadBase64}.${signatureHex}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const password = getAdminPassword();
  if (!password || !token || token.length > 1024) return false;

  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadBase64, signatureHex] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(payloadBase64) || !/^[a-fA-F0-9]{64}$/.test(signatureHex)) {
    return false;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (
      !payload ||
      typeof payload !== 'object' ||
      !Number.isSafeInteger(payload.expiry) ||
      payload.expiry <= Date.now()
    ) {
      return false;
    }

    const key = await getHMACKey(password);
    return await crypto.subtle.verify(
      'HMAC',
      key,
      Uint8Array.from(Buffer.from(signatureHex, 'hex')),
      new TextEncoder().encode(payloadBase64)
    );
  } catch {
    return false;
  }
}

// Check again inside API handlers so authorization does not rely only on middleware.
export async function isAdminAuthenticated(request: NextRequest): Promise<boolean> {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}
