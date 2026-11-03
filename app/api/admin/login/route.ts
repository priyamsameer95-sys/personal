import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminPassword, matchesAdminPassword, createSessionToken, isTrustedAdminRequest,
  readAdminJSON, SESSION_COOKIE_NAME, ADMIN_SESSION_SECONDS,
} from '@/lib/auth';
import { reserveAdminLoginAttempt, AdminLoginRateLimitError } from '@/lib/admin-login-rate-limit';

export async function POST(req: NextRequest) {
  if (!isTrustedAdminRequest(req)) return NextResponse.json({ error: 'This sign-in request is not allowed.' }, { status: 403 });
  if (!getAdminPassword()) return NextResponse.json({ error: 'Admin access is not configured securely.' }, { status: 503 });

  let body: unknown;
  try { body = await readAdminJSON(req, 2048); }
  catch { return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 }); }
  const password = body && typeof body === 'object' && !Array.isArray(body)
    ? (body as { password?: unknown }).password : undefined;
  if (typeof password !== 'string' || !password || password.length > 256) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }
  try {
    await reserveAdminLoginAttempt(req);
  } catch (error) {
    if (error instanceof AdminLoginRateLimitError) {
      return NextResponse.json({ error: 'Too many login attempts. Please try again later.' }, { status: 429, headers: { 'Retry-After': String(error.retryAfter) } });
    }
    return NextResponse.json({ error: 'Secure sign-in is temporarily unavailable. Please try again later.' }, { status: 503 });
  }
  if (!(await matchesAdminPassword(password))) return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, await createSessionToken(), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict',
    path: '/', maxAge: ADMIN_SESSION_SECONDS,
  });
  return response;
}
