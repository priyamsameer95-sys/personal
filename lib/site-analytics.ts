import { createHmac } from 'node:crypto';
import db from '@/lib/db';
import registry from '@/content/work/case-studies.json';
import { ensureCVLeadSchema, listCVInterests, type CVLead } from '@/lib/cv-leads';

export type AnalyticsRange = 7 | 30 | 90;
export type AnalyticsEvent = { eventId: string; path: string; referrer: string };
export type AnalyticsContext = { ip: string; userAgent: string; country?: string };
export interface SiteAnalytics {
  days: AnalyticsRange; startDate: string; endDate: string; trackingStartedAt: string | null;
  visitors: number; pageViews: number; cvRequests: number; cvContacts: number; cvRequestsAllTime: number;
  daily: { date: string; visitors: number; pageViews: number; cvRequests: number }[];
  topPages: { path: string; views: number; visitors: number }[];
  referrers: { source: string; visits: number }[];
  devices: { device: string; visits: number }[];
  countries: { country: string; visits: number }[];
  cvLeads: CVLead[]; cvLeadsTotal: number;
}
let schemaReady: Promise<void> | undefined;
let nextPruneAt = 0;
export class AnalyticsStorageError extends Error {
  constructor() { super('Website analytics are temporarily unavailable.'); }
}
const publicPaths = new Set(['/', '/product', '/cv', '/art', '/github', '/blog']);
for (const study of registry.caseStudies) {
  if (study.status === 'draft') continue;
  for (const slug of [study.slug, ...(study.aliases || [])]) {
    publicPaths.add(`/product/${slug}`);
    publicPaths.add(`/product/${slug}/references`);
  }
}
export function normalizeAnalyticsPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 512) return null;
  const path = value.split(/[?#]/, 1)[0].replace(/\/$/, '') || '/';
  return publicPaths.has(path) ? path : null;
}
export function normalizeReferrer(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 512) return 'Direct / internal';
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) return 'Direct / internal';
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host) || host === 'priyamsameer.com' || host.endsWith('.vercel.app')) return 'Direct / internal';
    return host;
  } catch { return 'Direct / internal'; }
}
export function analyticsDay(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function shiftDay(day: string, amount: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
export function analyticsDevice(userAgent: string): string {
  if (/ipad|tablet|kindle|silk|android(?!.*mobile)/i.test(userAgent)) return 'Tablet';
  return /mobi|iphone|ipod/i.test(userAgent) ? 'Phone' : 'Desktop';
}
function browserFamily(userAgent: string) {
  if (/edg\//i.test(userAgent)) return 'Edge';
  if (/firefox|fxios/i.test(userAgent)) return 'Firefox';
  if (/chrome|crios/i.test(userAgent)) return 'Chrome';
  return /safari/i.test(userAgent) ? 'Safari' : 'Other';
}
export function analyticsVisitorHash(ip: string, userAgent: string, date = new Date()): string {
  const secret = process.env.ANALYTICS_SECRET || process.env.ADMIN_PASSWORD || process.env.POSTGRES_URL;
  if (!secret?.trim()) throw new AnalyticsStorageError();
  return createHmac('sha256', secret).update(`${analyticsDay(date)}\0${ip.slice(0, 128)}\0${browserFamily(userAgent)}\0${analyticsDevice(userAgent)}`).digest('hex');
}
async function ensureSchema() {
  if (!process.env.POSTGRES_URL?.trim()) throw new AnalyticsStorageError();
  if (!schemaReady) schemaReady = (async () => {
    await db`CREATE TABLE IF NOT EXISTS site_page_views (
      event_id UUID PRIMARY KEY,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      path TEXT NOT NULL CHECK (char_length(path) <= 240),
      referrer TEXT NOT NULL CHECK (char_length(referrer) <= 253),
      visitor_hash CHAR(64) NOT NULL,
      device TEXT NOT NULL CHECK (device IN ('Desktop', 'Phone', 'Tablet'))
    )`;
    await db`CREATE INDEX IF NOT EXISTS site_page_views_time_idx ON site_page_views (occurred_at)`;
    await db`CREATE INDEX IF NOT EXISTS site_page_views_visitor_time_idx ON site_page_views (visitor_hash, occurred_at)`;
    await db`CREATE TABLE IF NOT EXISTS site_analytics_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1), enabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await db`INSERT INTO site_analytics_settings (id) VALUES (1) ON CONFLICT DO NOTHING`;
  })().catch(() => { schemaReady = undefined; throw new AnalyticsStorageError(); });
  await schemaReady;
}
export async function recordPageView(event: AnalyticsEvent, context: AnalyticsContext): Promise<void> {
  const path = normalizeAnalyticsPath(event.path);
  if (!path || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(event.eventId)) return;
  const visitor = analyticsVisitorHash(context.ip, context.userAgent);
  const day = analyticsDay();
  await ensureSchema();
  try {
    // A capped daily budget and idempotent event IDs limit duplicate/spam writes.
    await db`INSERT INTO site_page_views (event_id, path, referrer, visitor_hash, device)
      SELECT ${event.eventId}, ${path}, ${normalizeReferrer(event.referrer)}, ${visitor}, ${analyticsDevice(context.userAgent)}
      WHERE (SELECT COUNT(*) FROM site_page_views WHERE visitor_hash = ${visitor}
        AND occurred_at >= (${day}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata')) < 500
      ON CONFLICT (event_id) DO NOTHING`;
    if (Date.now() >= nextPruneAt) {
      nextPruneAt = Date.now() + 60 * 60 * 1000;
      await db`DELETE FROM site_page_views WHERE occurred_at < NOW() - INTERVAL '180 days'`;
    }
  } catch { throw new AnalyticsStorageError(); }
}
export function normalizeAnalyticsRange(value: unknown): AnalyticsRange {
  return value === '7' || value === 7 ? 7 : value === '90' || value === 90 ? 90 : 30;
}
export async function getSiteAnalytics(range: AnalyticsRange = 30): Promise<SiteAnalytics> {
  const days = normalizeAnalyticsRange(range);
  const endDate = analyticsDay(), startDate = shiftDay(endDate, 1 - days), until = shiftDay(endDate, 1);
  await ensureSchema();
  await ensureCVLeadSchema();
  try {
    const [started, totals, dailyViews, dailyRequests, pages, referrers, devices, interests, lifetime] = await Promise.all([
      db`SELECT enabled_at FROM site_analytics_settings WHERE id = 1`,
      db`SELECT COUNT(*)::INTEGER AS views, COUNT(DISTINCT visitor_hash)::INTEGER AS visitors FROM site_page_views
        WHERE occurred_at >= (${startDate}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') AND occurred_at < (${until}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata')`,
      db`SELECT TO_CHAR(occurred_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
        COUNT(*)::INTEGER AS views, COUNT(DISTINCT visitor_hash)::INTEGER AS visitors FROM site_page_views
        WHERE occurred_at >= (${startDate}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') AND occurred_at < (${until}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') GROUP BY day ORDER BY day`,
      db`SELECT TO_CHAR(requested_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day, COUNT(*)::INTEGER AS requests
        FROM cv_download_events WHERE requested_at >= (${startDate}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
        AND requested_at < (${until}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') GROUP BY day ORDER BY day`,
      db`SELECT path, COUNT(*)::INTEGER AS views, COUNT(DISTINCT visitor_hash)::INTEGER AS visitors FROM site_page_views
        WHERE occurred_at >= (${startDate}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') AND occurred_at < (${until}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') GROUP BY path ORDER BY views DESC, path LIMIT 20`,
      db`SELECT referrer AS source, COUNT(*)::INTEGER AS visits FROM site_page_views
        WHERE occurred_at >= (${startDate}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') AND occurred_at < (${until}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') GROUP BY referrer ORDER BY visits DESC LIMIT 12`,
      db`SELECT device, COUNT(*)::INTEGER AS visits FROM site_page_views
        WHERE occurred_at >= (${startDate}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') AND occurred_at < (${until}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') GROUP BY device ORDER BY visits DESC`,
      listCVInterests(200),
      db`SELECT COALESCE(SUM(download_count), 0)::INTEGER AS requests FROM cv_download_leads`,
    ]);
    const daily = Array.from({ length: days }, (_, index) => {
      const date = shiftDay(startDate, index);
      const view = dailyViews.rows.find(row => row.day === date), requests = dailyRequests.rows.find(row => row.day === date);
      return { date, visitors: Number(view?.visitors || 0), pageViews: Number(view?.views || 0), cvRequests: Number(requests?.requests || 0) };
    });
    return { days, startDate, endDate, trackingStartedAt: started.rows[0]?.enabled_at ? new Date(started.rows[0].enabled_at).toISOString() : null,
      visitors: Number(totals.rows[0]?.visitors || 0), pageViews: Number(totals.rows[0]?.views || 0), cvRequests: daily.reduce((sum, day) => sum + day.cvRequests, 0),
      cvContacts: interests.total, cvRequestsAllTime: Number(lifetime.rows[0]?.requests || 0), daily,
      topPages: pages.rows as SiteAnalytics['topPages'], referrers: referrers.rows as SiteAnalytics['referrers'], devices: devices.rows as SiteAnalytics['devices'], countries: [], cvLeads: interests.leads, cvLeadsTotal: interests.total };
  } catch { throw new AnalyticsStorageError(); }
}
