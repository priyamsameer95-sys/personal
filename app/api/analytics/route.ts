import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, isAdminAuthenticated } from '@/lib/auth';
import { resolveAnalyticsPath, recordAnalyticsEvent } from '@/lib/site-analytics';
import { normalizeAnalyticsAction } from '@/lib/analytics-events';
import { analyticsBrowserIdentity, ANALYTICS_BROWSER_COOKIE, ANALYTICS_BROWSER_MAX_AGE } from '@/lib/analytics-identity';
import { normalizeAnalyticsV2Event, recordAnalyticsV2Event, resolveAnalyticsV2Path } from '@/lib/analytics-v2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' };
function reply(status: number) { return new NextResponse(null, { status, headers }); }
function sameOrigin(request: NextRequest) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.slice(0, -1);
  if (!host || !/^[a-z0-9.:[\]-]+$/i.test(host) || !/^https?$/.test(protocol)) return false;
  try { return request.headers.get('origin') === new URL(`${protocol}://${host}`).origin; } catch { return false; }
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return reply(403);
  const agent = (request.headers.get('user-agent') || '').slice(0, 1024);
  if (request.cookies.get('ps_analytics_disabled')?.value === '1' || request.headers.get('dnt') === '1' || request.headers.get('sec-gpc') === '1' || request.headers.has('next-router-prefetch') ||
    /prefetch/i.test(request.headers.get('purpose') || '') || /bot|spider|crawler|headless|preview|lighthouse|pagespeed|slurp|facebookexternalhit/i.test(agent) || await isAdminAuthenticated(request)) return reply(204);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return reply(415);
  const declaredSize = Number(request.headers.get('content-length'));
  if (declaredSize > 16384) return reply(413);
  let body: unknown;
  let size = 0;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply(400);
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 16384) { await reader.cancel(); return reply(413); }
        chunks.push(chunk.value);
      }
    } finally { reader.releaseLock(); }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return reply(size > 2048 || declaredSize > 2048 ? 413 : 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400);
  const event = body as Record<string, unknown>;
  if (event.version === 2) {
    // Development and deploy previews never enter the owner's production charts.
    const host = request.headers.get('host') || '';
    if (process.env.ANALYTICS_ALLOW_LOCAL !== '1' && (process.env.NODE_ENV !== 'production' ||
      process.env.VERCEL_ENV === 'preview' || /^(?:localhost|127\.0\.0\.1|\[::1\])(?::|$)|\.vercel\.app(?::|$)/i.test(host))) return reply(204);
    const parsed = normalizeAnalyticsV2Event(event);
    if (!parsed) return reply(400);
    const path = await resolveAnalyticsV2Path(parsed.path);
    if (!path) return reply(204);
    const pathTarget = parsed.type === 'navigation_clicked' || (parsed.type === 'cta_viewed' && parsed.target?.startsWith('/'));
    const target = pathTarget ? await resolveAnalyticsV2Path(parsed.target) : parsed.target;
    if (pathTarget && !target) return reply(400);
    try {
      const browser = analyticsBrowserIdentity(request.cookies.get(ANALYTICS_BROWSER_COOKIE)?.value);
      // Actions cannot mint identities. Their first page-view response must have
      // established the cookie before the queued action is delivered.
      if (browser.isNew && parsed.type !== 'page_view') return reply(204);
      const stored = await recordAnalyticsV2Event({ ...parsed, path, ...(target ? { target } : {}) }, {
        browserHash: browser.browserHash, ip: getClientIp(request), userAgent: agent,
      });
      const response = reply(204);
      if (stored.accepted && browser.isNew && parsed.type === 'page_view') response.cookies.set(ANALYTICS_BROWSER_COOKIE, browser.value, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
        maxAge: ANALYTICS_BROWSER_MAX_AGE, expires: browser.expires,
      });
      return response;
    } catch { return reply(503); }
  }
  if (size > 2048 || declaredSize > 2048) return reply(413);
  if (Object.keys(event).some(key => !['eventId', 'path', 'referrer', 'type', 'target'].includes(key)) || typeof event.eventId !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(event.eventId) ||
    typeof event.referrer !== 'string' || event.referrer.length > 512) return reply(400);
  const path = await resolveAnalyticsPath(event.path);
  if (!path) return reply(204);
  const targetPath = event.type === 'navigation_clicked' ? await resolveAnalyticsPath(event.target) : null;
  const action = normalizeAnalyticsAction(event.type, event.target, () => targetPath);
  if (!action) return reply(400);
  try {
    // Only page views establish a browser identity. Deliberate actions cannot
    // race the first page view or create identifiers for otherwise unseen pages.
    const browser = action.type === 'page_view' ? analyticsBrowserIdentity(request.cookies.get(ANALYTICS_BROWSER_COOKIE)?.value) : null;
    await recordAnalyticsEvent({ eventId: event.eventId, path, referrer: event.referrer, ...action }, {
      ip: getClientIp(request), userAgent: agent, ...(browser ? { browserHash: browser.browserHash } : {}),
    });
    const response = reply(204);
    if (browser?.isNew) response.cookies.set(ANALYTICS_BROWSER_COOKIE, browser.value, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
      maxAge: ANALYTICS_BROWSER_MAX_AGE, expires: browser.expires,
    });
    return response;
  } catch { return reply(503); }
}
