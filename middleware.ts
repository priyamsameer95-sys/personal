import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminAuthenticated } from './lib/auth';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Bypass checks for login endpoints
  if (path === '/minforyam/login' || path === '/api/admin/login') {
    return NextResponse.next();
  }

  // Vercel completion callbacks have no browser cookie. The upload route only
  // accepts them after handleUpload verifies their signature; token generation
  // still requires an authenticated admin inside the route.
  if (
    path === '/api/admin/blob-upload' &&
    req.method === 'POST' &&
    req.headers.has('x-vercel-signature')
  ) {
    return NextResponse.next();
  }

  const isAdminPage = path.startsWith('/minforyam');
  const isAdminApi = path.startsWith('/api/admin');

  if (isAdminPage || isAdminApi) {
    const isValid = await isAdminAuthenticated(req);

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
