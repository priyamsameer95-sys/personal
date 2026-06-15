import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  // Clear cookie by setting maxAge to 0
  cookies().set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return NextResponse.json({ success: true });
}
