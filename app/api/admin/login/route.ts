import { NextRequest, NextResponse } from 'next/server';
import {
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts,
  getClientIp,
  getAdminPassword,
  createSessionToken,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  const adminPassword = getAdminPassword();
  if (!adminPassword) {
    return NextResponse.json({ error: 'Admin access is not configured.' }, { status: 503 });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again in 15 minutes.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  }

  const password = body && typeof body === 'object' && !Array.isArray(body)
    ? (body as { password?: unknown }).password
    : undefined;
  if (typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'Password is required' }, { status: 400 });
  }

  if (password !== adminPassword) {
    recordFailedAttempt(ip);
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = await createSessionToken();
  clearFailedAttempts(ip);

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 24 * 60 * 60,
  });
  return response;
}
