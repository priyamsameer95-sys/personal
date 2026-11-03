import { createHmac } from 'node:crypto';
import db from '@/lib/db';
import registry from '@/content/work/case-studies.json';
import { ensureCVLeadSchema, listCVInterests, type CVLead } from '@/lib/cv-leads';
import { normalizeAnalyticsAction, type AnalyticsEventType, type AnalyticsInteractionType } from '@/lib/analytics-events';
import { isRetiredWorkSlug } from '@/lib/work';

export type AnalyticsRange = 7 | 30 | 90;
export type AnalyticsEvent = { eventId: string; path: string; referrer: string; type?: AnalyticsEventType; target?: string };
export type AnalyticsContext = { ip: string; userAgent: string; country?: string; browserHash?: string };
export interface SiteAnalytics {
  days: AnalyticsRange; startDate: string; endDate: string; trackingStartedAt: string | null;
  visitors: number; pageViews: number; clicks: number; cvRequests: number; cvContacts: number; cvRequestsAllTime: number;
  uniqueVisitors: number | null; uniqueTrackingStartedAt: string | null; uniqueTrackedPageViews: number | null;
  daily: { date: string; visitors: number; pageViews: number; clicks: number; cvRequests: number }[];
  topPages: { path: string; views: number; visitors: number; browserVisitors: number | null }[];
  referrers: { source: string; visits: number }[];
  devices: { device: string; visits: number }[];
  countries: { country: string; visits: number }[];
  interactions: { type: AnalyticsInteractionType; target: string; count: number }[];
  pageInteractions: { path: string; count: number }[];
  cvLeads: CVLead[]; cvLeadsTotal: number;
}
let schemaReady: Promise<void> | undefined;
let nextPruneAt = 0;
export class AnalyticsStorageError extends Error {
  constructor() { super('Website analytics are temporarily unavailable.'); }
}
const publicPaths = new Set(['/', '/product', '/cv', '/art', '/github', '/blog']);
let publishedPaths: { expiresAt: number; paths: Map<string, string> } | undefined;
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
export async function resolveAnalyticsPath(value: unknown): Promise<string | null> {
  const known = normalizeAnalyticsPath(value);
  if (known) return known;
  if (typeof value !== 'string' || value.length > 512) return null;
  const path = value.split(/[?#]/, 1)[0].replace(/\/$/, '') || '/';
  if (!/^\/(?:art|blog|product)\/[a-z0-9][a-z0-9_-]{0,199}$/.test(path) || !process.env.POSTGRES_URL?.trim()) return null;
  try {
    if (!publishedPaths || publishedPaths.expiresAt <= Date.now()) {
      // Read only published identifiers; neither draft titles nor a visitor's
      // guessed slug becomes an analytics path.
      const { rows } = await db`SELECT type, id, slug FROM content_items
        WHERE status = 'published' AND type IN ('art', 'blog', 'work')`;
      const paths = new Map<string, string>();
      for (const item of rows) {
        const category = item.type === 'work' ? 'product' : item.type;
        if (category !== 'art' && category !== 'blog' && category !== 'product') continue;
        const canonicalIdentifier = item.slug || item.id;
        if (typeof canonicalIdentifier !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,199}$/.test(canonicalIdentifier)) continue;
        if (category === 'product' && isRetiredWorkSlug(canonicalIdentifier)) continue;
        const canonical = `/${category}/${canonicalIdentifier}`;
        if (canonical.length > 240) continue;
        for (const identifier of [item.slug, item.id]) {
          if (typeof identifier === 'string' && /^[a-z0-9][a-z0-9_-]{0,199}$/.test(identifier)) paths.set(`/${category}/${identifier}`, canonical);
        }
      }
      publishedPaths = { expiresAt: Date.now() + 60_000, paths };
    }
    return publishedPaths.paths.get(path) || null;
  } catch { return null; }
}
async function resolveAction(event: AnalyticsEvent) {
  const navigationTarget = event.type === 'navigation_clicked' ? await resolveAnalyticsPath(event.target) : null;
  return normalizeAnalyticsAction(event.type, event.target, value => navigationTarget || normalizeAnalyticsPath(value));
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
      browser_hash CHAR(64),
      device TEXT NOT NULL CHECK (device IN ('Desktop', 'Phone', 'Tablet'))
    )`;
    // Historical daily hashes cannot be converted to persistent browser IDs.
    // Nullable additions preserve those rows without inventing unique visitors.
    await db`ALTER TABLE site_page_views ADD COLUMN IF NOT EXISTS browser_hash CHAR(64)`;
    await db`CREATE INDEX IF NOT EXISTS site_page_views_time_idx ON site_page_views (occurred_at)`;
    await db`CREATE INDEX IF NOT EXISTS site_page_views_visitor_time_idx ON site_page_views (visitor_hash, occurred_at)`;
    await db`CREATE INDEX IF NOT EXISTS site_page_views_browser_time_idx ON site_page_views (browser_hash, occurred_at) WHERE browser_hash IS NOT NULL`;
    await db`CREATE TABLE IF NOT EXISTS site_interaction_events (
      event_id UUID PRIMARY KEY,
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      path TEXT NOT NULL CHECK (char_length(path) <= 240),
      event_type TEXT NOT NULL CHECK (event_type IN ('navigation_clicked', 'outbound_clicked', 'cv_opened',
        'cv_download_clicked', 'contact_opened', 'contact_clicked', 'email_copied', 'media_opened',
        'video_started', 'filter_changed', 'menu_opened')),
      target TEXT NOT NULL CHECK (char_length(target) BETWEEN 1 AND 240),
      visitor_hash CHAR(64) NOT NULL
    )`;
    await db`CREATE INDEX IF NOT EXISTS site_interaction_events_time_idx ON site_interaction_events (occurred_at)`;
    await db`CREATE INDEX IF NOT EXISTS site_interaction_events_visitor_time_idx ON site_interaction_events (visitor_hash, occurred_at)`;
    await db`CREATE TABLE IF NOT EXISTS site_analytics_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1), enabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await db`ALTER TABLE site_analytics_settings ADD COLUMN IF NOT EXISTS browser_tracking_started_at TIMESTAMPTZ`;
    await db`INSERT INTO site_analytics_settings (id) VALUES (1) ON CONFLICT DO NOTHING`;
  })().catch(() => { schemaReady = undefined; throw new AnalyticsStorageError(); });
  await schemaReady;
}
async function pruneExpiredEvents() {
  if (Date.now() < nextPruneAt) return;
  await db`DELETE FROM site_page_views WHERE occurred_at < NOW() - INTERVAL '180 days'`;
  await db`DELETE FROM site_interaction_events WHERE occurred_at < NOW() - INTERVAL '180 days'`;
  nextPruneAt = Date.now() + 60 * 60 * 1000;
}
export async function recordPageView(event: AnalyticsEvent, context: AnalyticsContext): Promise<void> {
  const path = await resolveAnalyticsPath(event.path);
  const action = normalizeAnalyticsAction(event.type, event.target, normalizeAnalyticsPath);
  if (!path || action?.type !== 'page_view' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(event.eventId)) return;
  const visitor = analyticsVisitorHash(context.ip, context.userAgent);
  const browser = typeof context.browserHash === 'string' && /^[a-f0-9]{64}$/.test(context.browserHash) ? context.browserHash : null;
  const day = analyticsDay();
  await ensureSchema();
  try {
    await pruneExpiredEvents();
    // A capped daily budget and idempotent event IDs limit duplicate/spam writes.
    // The first browser view and its coverage marker succeed together. No
    // later database operation can fail before the route returns its cookie.
    await db`WITH inserted AS (
      INSERT INTO site_page_views (event_id, path, referrer, visitor_hash, device, browser_hash)
        SELECT ${event.eventId}, ${path}, ${normalizeReferrer(event.referrer)}, ${visitor}, ${analyticsDevice(context.userAgent)}, ${browser}
        WHERE (SELECT COUNT(*) FROM site_page_views WHERE visitor_hash = ${visitor}
          AND occurred_at >= (${day}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata')) < 500
        ON CONFLICT (event_id) DO NOTHING RETURNING occurred_at, browser_hash
    ) UPDATE site_analytics_settings
      SET browser_tracking_started_at = (SELECT MIN(occurred_at) FROM inserted WHERE browser_hash IS NOT NULL)
      WHERE id = 1 AND browser_tracking_started_at IS NULL AND EXISTS (SELECT 1 FROM inserted WHERE browser_hash IS NOT NULL)`;
  } catch { throw new AnalyticsStorageError(); }
}
export async function recordAnalyticsEvent(event: AnalyticsEvent, context: AnalyticsContext): Promise<void> {
  const path = await resolveAnalyticsPath(event.path);
  const action = await resolveAction(event);
  if (!path || !action || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(event.eventId)) return;
  if (action.type === 'page_view') return recordPageView({ ...event, path, type: 'page_view' }, context);
  const visitor = analyticsVisitorHash(context.ip, context.userAgent);
  const day = analyticsDay();
  await ensureSchema();
  try {
    await db`INSERT INTO site_interaction_events (event_id, path, event_type, target, visitor_hash)
      SELECT ${event.eventId}, ${path}, ${action.type}, ${action.target}, ${visitor}
      WHERE (SELECT COUNT(*) FROM site_interaction_events WHERE visitor_hash = ${visitor}
        AND occurred_at >= (${day}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata')) < 1000
      ON CONFLICT (event_id) DO NOTHING`;
    await pruneExpiredEvents();
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
    const [started, totals, dailyViews, dailyRequests, pages, referrers, devices, interests, lifetime,
      interactionTotals, dailyInteractions, interactions, pageInteractions] = await Promise.all([
      db`SELECT enabled_at, browser_tracking_started_at FROM site_analytics_settings WHERE id = 1`,
      db`SELECT COUNT(*)::INTEGER AS views, COUNT(DISTINCT visitor_hash)::INTEGER AS visitors,
        COUNT(DISTINCT browser_hash)::INTEGER AS unique_visitors, COUNT(browser_hash)::INTEGER AS unique_tracked_views FROM site_page_views
        WHERE occurred_at >= (${startDate}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') AND occurred_at < (${until}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata')`,
      db`SELECT TO_CHAR(occurred_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
        COUNT(*)::INTEGER AS views, COUNT(DISTINCT visitor_hash)::INTEGER AS visitors FROM site_page_views
        WHERE occurred_at >= (${startDate}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') AND occurred_at < (${until}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') GROUP BY day ORDER BY day`,
      db`SELECT TO_CHAR(requested_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day, COUNT(*)::INTEGER AS requests
        FROM cv_download_events WHERE requested_at >= (${startDate}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
        AND requested_at < (${until}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') GROUP BY day ORDER BY day`,
      db`SELECT path, COUNT(*)::INTEGER AS views, COUNT(DISTINCT visitor_hash)::INTEGER AS visitors,
        COUNT(DISTINCT browser_hash)::INTEGER AS browser_visitors, COUNT(browser_hash)::INTEGER AS browser_tracked_views FROM site_page_views
        WHERE occurred_at >= (${startDate}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') AND occurred_at < (${until}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') GROUP BY path ORDER BY views DESC, path LIMIT 100`,
      db`SELECT referrer AS source, COUNT(*)::INTEGER AS visits FROM site_page_views
        WHERE occurred_at >= (${startDate}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') AND occurred_at < (${until}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') GROUP BY referrer ORDER BY visits DESC LIMIT 12`,
      db`SELECT device, COUNT(*)::INTEGER AS visits FROM site_page_views
        WHERE occurred_at >= (${startDate}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') AND occurred_at < (${until}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') GROUP BY device ORDER BY visits DESC`,
      listCVInterests(200),
      db`SELECT COALESCE(SUM(download_count), 0)::INTEGER AS requests FROM cv_download_leads`,
      db`SELECT COUNT(*)::INTEGER AS clicks FROM site_interaction_events
        WHERE occurred_at >= (${startDate}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') AND occurred_at < (${until}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata')`,
      db`SELECT TO_CHAR(occurred_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day, COUNT(*)::INTEGER AS clicks
        FROM site_interaction_events WHERE occurred_at >= (${startDate}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
        AND occurred_at < (${until}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') GROUP BY day ORDER BY day`,
      db`SELECT event_type AS type, target, COUNT(*)::INTEGER AS count FROM site_interaction_events
        WHERE occurred_at >= (${startDate}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') AND occurred_at < (${until}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
        GROUP BY event_type, target ORDER BY count DESC, event_type, target`,
      db`SELECT path, COUNT(*)::INTEGER AS count FROM site_interaction_events
        WHERE occurred_at >= (${startDate}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata') AND occurred_at < (${until}::TIMESTAMP AT TIME ZONE 'Asia/Kolkata')
        GROUP BY path ORDER BY count DESC, path LIMIT 100`,
    ]);
    const daily = Array.from({ length: days }, (_, index) => {
      const date = shiftDay(startDate, index);
      const view = dailyViews.rows.find(row => row.day === date), requests = dailyRequests.rows.find(row => row.day === date);
      const interaction = dailyInteractions.rows.find(row => row.day === date);
      return { date, visitors: Number(view?.visitors || 0), pageViews: Number(view?.views || 0), clicks: Number(interaction?.clicks || 0), cvRequests: Number(requests?.requests || 0) };
    });
    const uniqueTrackingStartedAt = started.rows[0]?.browser_tracking_started_at ? new Date(started.rows[0].browser_tracking_started_at).toISOString() : null;
    return { days, startDate, endDate, trackingStartedAt: started.rows[0]?.enabled_at ? new Date(started.rows[0].enabled_at).toISOString() : null,
      uniqueTrackingStartedAt, uniqueVisitors: uniqueTrackingStartedAt ? Number(totals.rows[0]?.unique_visitors || 0) : null,
      uniqueTrackedPageViews: uniqueTrackingStartedAt ? Number(totals.rows[0]?.unique_tracked_views || 0) : null,
      visitors: Number(totals.rows[0]?.visitors || 0), pageViews: Number(totals.rows[0]?.views || 0), clicks: Number(interactionTotals.rows[0]?.clicks || 0), cvRequests: daily.reduce((sum, day) => sum + day.cvRequests, 0),
      cvContacts: interests.total, cvRequestsAllTime: Number(lifetime.rows[0]?.requests || 0), daily,
      topPages: pages.rows.map(row => ({ path: String(row.path), views: Number(row.views), visitors: Number(row.visitors),
        browserVisitors: uniqueTrackingStartedAt && Number(row.browser_tracked_views) > 0 ? Number(row.browser_visitors || 0) : null })),
      referrers: referrers.rows as SiteAnalytics['referrers'], devices: devices.rows as SiteAnalytics['devices'], countries: [],
      interactions: interactions.rows as SiteAnalytics['interactions'], pageInteractions: pageInteractions.rows as SiteAnalytics['pageInteractions'], cvLeads: interests.leads, cvLeadsTotal: interests.total };
  } catch { throw new AnalyticsStorageError(); }
}
