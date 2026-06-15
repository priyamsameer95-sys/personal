import { NextRequest } from 'next/server';

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

// Generate session cookie value
export async function createSessionToken(): Promise<string> {
  const password = process.env.ADMIN_PASSWORD || 'SAMEER@11';

  
  const expiry = Date.now() + SESSION_DURATION;
  const payload = JSON.stringify({ expiry });
  const encoder = new TextEncoder();
  
  const key = await getHMACKey(password);
  const payloadBase64 = Buffer.from(payload).toString('base64url');
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payloadBase64)
  );
  
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${payloadBase64}.${signatureHex}`;
}

// Verify session token
export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  
  const password = process.env.ADMIN_PASSWORD || 'SAMEER@11';

  
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  
  const [payloadBase64, signatureHex] = parts;
  
  try {
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf8');
    const { expiry } = JSON.parse(payloadJson);
    
    if (Date.now() > expiry) {
      return false; // Expired
    }
    
    // Verify signature
    const key = await getHMACKey(password);
    const encoder = new TextEncoder();
    
    // Convert hex signature back to Uint8Array
    const sigBytes = new Uint8Array(signatureHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(payloadBase64)
    );
    
    return isValid;
  } catch {
    return false;
  }
}
