import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getSiteAnalytics, normalizeAnalyticsRange } from '@/lib/site-analytics';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' };
export async function GET(request: NextRequest) {
  if (!await isAdminAuthenticated(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  try {
    return NextResponse.json(await getSiteAnalytics(normalizeAnalyticsRange(request.nextUrl.searchParams.get('days'))), { headers });
  } catch { return NextResponse.json({ error: 'Analytics could not be loaded. Please try again.' }, { status: 503, headers }); }
}
