import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  isRateLimited,
  recordFailedAttempt,
  clearFailedAttempts,
  getClientIp,
  createSessionToken,
  SESSION_COOKIE_NAME,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // 1. Enforce rate limiting
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again in 15 minutes.' },
      { status: 429 }
    );
  }

  try {
    const { password } = await req.json();

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return NextResponse.json(
        { error: 'Server authentication is misconfigured' },
        { status: 500 }
      );
    }

    // 2. Verify password against env variable
    if (password !== adminPassword) {
      recordFailedAttempt(ip);
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // 3. Generate secure signed cookie on success
    const token = await createSessionToken();
    clearFailedAttempts(ip);

    cookies().set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  }
}
