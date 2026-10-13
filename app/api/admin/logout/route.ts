import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isAdminAuthenticated, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Clear cookie by setting maxAge to 0
  cookies().set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return NextResponse.json({ success: true });
}
