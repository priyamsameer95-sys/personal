import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, isAdminAuthenticated } from '@/lib/auth';
import { resolveAnalyticsPath, recordAnalyticsEvent } from '@/lib/site-analytics';
import { normalizeAnalyticsAction } from '@/lib/analytics-events';

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
  if (request.headers.get('dnt') === '1' || request.headers.get('sec-gpc') === '1' || request.headers.has('next-router-prefetch') ||
    /prefetch/i.test(request.headers.get('purpose') || '') || /bot|spider|crawler|headless|preview|lighthouse|pagespeed|slurp|facebookexternalhit/i.test(agent) || await isAdminAuthenticated(request)) return reply(204);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return reply(415);
  if (Number(request.headers.get('content-length')) > 2048) return reply(413);
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply(400);
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const chunk = await reader.read(); if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 2048) { await reader.cancel(); return reply(413); }
        chunks.push(chunk.value);
      }
    } finally { reader.releaseLock(); }
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return reply(400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(400);
  const event = body as Record<string, unknown>;
  if (Object.keys(event).some(key => !['eventId', 'path', 'referrer', 'type', 'target'].includes(key)) || typeof event.eventId !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(event.eventId) ||
    typeof event.referrer !== 'string' || event.referrer.length > 512) return reply(400);
  const path = await resolveAnalyticsPath(event.path);
  if (!path) return reply(204);
  const targetPath = event.type === 'navigation_clicked' ? await resolveAnalyticsPath(event.target) : null;
  const action = normalizeAnalyticsAction(event.type, event.target, () => targetPath);
  if (!action) return reply(400);
  try {
    await recordAnalyticsEvent({ eventId: event.eventId, path, referrer: event.referrer, ...action }, { ip: getClientIp(request), userAgent: agent });
    return reply(204);
  } catch { return reply(503); }
}
