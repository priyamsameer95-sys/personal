import { NextRequest, NextResponse } from 'next/server';
import { isAdminWriteAuthenticated, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (!(await isAdminWriteAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Clear cookie by setting maxAge to 0
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
  return response;
}
