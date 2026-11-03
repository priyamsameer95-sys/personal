import type { NextRequest } from 'next/server';

export const SESSION_COOKIE_NAME = 'admin_session';
export const ADMIN_SESSION_SECONDS = 8 * 60 * 60;
const SESSION_DURATION = ADMIN_SESSION_SECONDS * 1000;

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  return forwardedFor?.split(',')[0].trim() || 'unknown';
}

// Cookie authentication alone cannot distinguish an owner's click from a
// request triggered by another website. Require the exact deployed origin.
export function isTrustedAdminRequest(request: NextRequest): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  const source = request.headers.get('origin');
  if (!source || source === 'null') return false;
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') return false;
  try {
    const origin = new URL(source);
    if (source !== origin.origin || origin.username || origin.password) return false;
    const allowed = new Set(['https://www.priyamsameer.com', 'https://priyamsameer.com']);
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      const configured = new URL(process.env.NEXT_PUBLIC_SITE_URL);
      if (configured.protocol === 'https:') allowed.add(configured.origin);
    }
    if (process.env.VERCEL_URL && /^[a-z0-9.-]+\.vercel\.app$/i.test(process.env.VERCEL_URL)) {
      allowed.add(`https://${process.env.VERCEL_URL}`);
    }
    const target = new URL(request.url);
    const host = request.headers.get('host') || target.host;
    if (origin.host !== host) return false;
    if (process.env.NODE_ENV !== 'production' && ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)) {
      allowed.add(target.origin);
    }
    if (!allowed.has(origin.origin)) return false;
    const emptyOperation = request.method === 'DELETE' || target.pathname === '/api/admin/logout';
    const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    return emptyOperation ? (!contentType || contentType === 'application/json') : contentType === 'application/json';
  } catch {
    return false;
  }
}

// Bound JSON before parsing, including chunked requests with no Content-Length.
export async function readAdminJSON(request: NextRequest, maxBytes = 128 * 1024): Promise<unknown> {
  const declared = request.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) throw new Error('Invalid request payload');
  if (!request.body) throw new Error('Invalid request payload');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new Error('Request payload is too large');
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks, total).toString('utf8'));
  } catch {
    await reader.cancel().catch(() => {});
    throw new Error('Invalid request payload');
  } finally {
    reader.releaseLock();
  }
}

async function getHMACKey(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(`cms-admin-session:v2:${password}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

// A missing or short configuration disables editing; there is no default login.
export function getAdminPassword(): string | undefined {
  const password = process.env.ADMIN_PASSWORD;
  return password && password.trim().length >= 20 && password.length <= 256 ? password : undefined;
}

export async function matchesAdminPassword(candidate: string): Promise<boolean> {
  const password = getAdminPassword();
  if (!password || candidate.length > 256) return false;
  const encode = new TextEncoder();
  const [expected, actual] = await Promise.all([
    crypto.subtle.digest('SHA-256', encode.encode(password)),
    crypto.subtle.digest('SHA-256', encode.encode(candidate)),
  ]);
  const a = new Uint8Array(expected), b = new Uint8Array(actual);
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function createSessionToken(): Promise<string> {
  const password = getAdminPassword();
  if (!password) throw new Error('Admin access is not configured.');
  const issuedAt = Date.now();
  const payloadBase64 = Buffer.from(JSON.stringify({ version: 2, purpose: 'cms-admin', issuedAt, expiry: issuedAt + SESSION_DURATION, nonce: crypto.randomUUID() })).toString('base64url');
  const signature = await crypto.subtle.sign('HMAC', await getHMACKey(password), new TextEncoder().encode(payloadBase64));
  return `${payloadBase64}.${Buffer.from(signature).toString('hex')}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  const password = getAdminPassword();
  if (!password || !token || token.length > 1024) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payloadBase64, signatureHex] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(payloadBase64) || !/^[a-fA-F0-9]{64}$/.test(signatureHex)) return false;
  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    const now = Date.now();
    if (!payload || payload.version !== 2 || payload.purpose !== 'cms-admin'
      || !Number.isSafeInteger(payload.issuedAt) || payload.issuedAt > now
      || !Number.isSafeInteger(payload.expiry) || payload.expiry <= now
      || payload.expiry - payload.issuedAt !== SESSION_DURATION
      || typeof payload.nonce !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(payload.nonce)) return false;
    return crypto.subtle.verify('HMAC', await getHMACKey(password), Uint8Array.from(Buffer.from(signatureHex, 'hex')), new TextEncoder().encode(payloadBase64));
  } catch {
    return false;
  }
}

export async function isAdminAuthenticated(request: NextRequest): Promise<boolean> {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

// Enforce the same checks in each write handler, independent of middleware.
export async function isAdminWriteAuthenticated(request: NextRequest): Promise<boolean> {
  return isTrustedAdminRequest(request) && await isAdminAuthenticated(request);
}
