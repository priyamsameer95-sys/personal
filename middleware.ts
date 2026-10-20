import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isAdminAuthenticated } from './lib/auth';

function privateResponse(response: NextResponse) {
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Bypass checks for login endpoints
  if (path === '/minforyam/login' || path === '/api/admin/login') {
    return privateResponse(NextResponse.next());
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
        return privateResponse(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      } else {
        const loginUrl = new URL('/minforyam/login', req.url);
        // Next may normalize the internal hostname; preserve the browser's host.
        const host = req.headers.get('host');
        const protocol = req.headers.get('x-forwarded-proto');
        if (host && /^[a-z0-9.:[\]-]+$/i.test(host)) loginUrl.host = host;
        if (protocol === 'https' || protocol === 'http') loginUrl.protocol = `${protocol}:`;
        if (path === '/minforyam/analytics') loginUrl.searchParams.set('next', '/minforyam/analytics');
        return privateResponse(NextResponse.redirect(loginUrl));
      }
    }
  }

  return privateResponse(NextResponse.next());
}

// Configure routes where the middleware will be executed
export const config = {
  matcher: ['/minforyam/:path*', '/api/admin/:path*'],
};
