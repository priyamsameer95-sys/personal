import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from './lib/auth';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Bypass checks for login endpoints
  if (path === '/minforyam/login' || path === '/api/admin/login') {
    return NextResponse.next();
  }

  const isAdminPage = path.startsWith('/minforyam');
  const isAdminApi = path.startsWith('/api/admin');

  if (isAdminPage || isAdminApi) {
    const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const isValid = await verifySessionToken(sessionCookie);

    if (!isValid) {
      if (isAdminApi) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      } else {
        const loginUrl = new URL('/minforyam/login', req.url);
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  return NextResponse.next();
}

// Configure routes where the middleware will be executed
export const config = {
  matcher: ['/minforyam/:path*', '/api/admin/:path*'],
};
