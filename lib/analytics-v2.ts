import { createHash, randomUUID } from 'node:crypto';
import type { VercelPoolClient } from '@vercel/postgres';
import db from '@/lib/db';
import registry from '@/content/work/case-studies.json';
import { analyticsDevice, analyticsVisitorHash, normalizeReferrer, recordAnalyticsEvent, resolveAnalyticsPath } from '@/lib/site-analytics';
import { normalizeAnalyticsAction } from '@/lib/analytics-events';

// Deliberately no email, contact ID, entered text or arbitrary URL properties.
export const ANALYTICS_V2_TYPES = [
  'page_view', 'engagement', 'navigation_clicked', 'outbound_clicked', 'cv_opened',
  'cv_request_rejected', 'cv_download_initiated', 'contact_opened',
  'contact_clicked', 'email_copied', 'media_opened', 'video_started', 'video_progress',
  'video_completed', 'filter_changed', 'menu_opened', 'cta_viewed', 'section_viewed',
  'scroll_depth_reached', 'demo_started',
] as const;
export type AnalyticsV2Type = typeof ANALYTICS_V2_TYPES[number];
export interface AnalyticsV2Event {
  version: 2; eventId: string; type: AnalyticsV2Type; path: string; referrer: string;
  pageViewId: string; tabId: string; sequence: number;
  target?: string; control?: string; value?: number; activeMs?: number; campaign?: string;
}
export interface AnalyticsV2Context { browserHash: string; ip: string; userAgent: string }
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const IDENTIFIER = /^[a-z0-9][a-z0-9_.:-]{0,95}$/;
const HASH = /^[a-f0-9]{64}$/;
const MAX_ACTIVE_MS = 8 * 60 * 60 * 1000;
const allowedKeys = new Set(['version', 'eventId', 'type', 'path', 'referrer', 'pageViewId', 'tabId', 'sequence', 'target', 'control', 'value', 'activeMs', 'campaign']);
const campaignSources = new Set(['linkedin', 'google', 'github', 'newsletter', 'email', 'whatsapp', 'portfolio']);
const campaignMedia = new Set(['social', 'organic', 'referral', 'email', 'profile', 'cpc']);
const campaignNames = new Set(['portfolio', 'featured', 'cv', 'job-search', 'product-leadership', 'linkedin-featured']);
const canonicalPaths = new Map<string, string>();
for (const study of registry.caseStudies) {
  if (study.status === 'draft') continue;
  for (const alias of [study.slug, ...(study.aliases || [])]) {
    canonicalPaths.set(`/product/${alias}`, `/product/${study.slug}`);
    canonicalPaths.set(`/product/${alias}/references`, `/product/${study.slug}/references`);
  }
}
export async function resolveAnalyticsV2Path(value: unknown): Promise<string | null> {
  const path = await resolveAnalyticsPath(value);
  return path ? canonicalPaths.get(path) || path : null;
}

/** Syntax validation precedes all database reads and cookie establishment. */
export function normalizeAnalyticsV2Event(body: unknown): AnalyticsV2Event | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const event = body as Record<string, unknown>;
  if (Object.keys(event).some(key => !allowedKeys.has(key)) || event.version !== 2 ||
    typeof event.type !== 'string' || !(ANALYTICS_V2_TYPES as readonly string[]).includes(event.type) ||
    ![event.eventId, event.pageViewId, event.tabId].every(value => typeof value === 'string' && UUID.test(value)) ||
    !Number.isSafeInteger(event.sequence) || Number(event.sequence) < 0 || Number(event.sequence) > 1_000_000 ||
    typeof event.path !== 'string' || event.path.length > 512 || !event.path.startsWith('/') ||
    typeof event.referrer !== 'string' || event.referrer.length > 512) return null;
  if (event.control !== undefined && (typeof event.control !== 'string' || !IDENTIFIER.test(event.control))) return null;
  if (event.campaign !== undefined) {
    if (event.type !== 'page_view' || typeof event.campaign !== 'string' || event.campaign.length > 80) return null;
    const parts = event.campaign.split(':');
    if (parts.length !== 3 || !campaignSources.has(parts[0]) || !campaignMedia.has(parts[1]) || !campaignNames.has(parts[2])) return null;
  }
  if (event.value !== undefined && (typeof event.value !== 'number' || !Number.isFinite(event.value) || event.value < 0 || event.value > 100)) return null;
  if (event.activeMs !== undefined && (event.type !== 'engagement' || !Number.isSafeInteger(event.activeMs) || Number(event.activeMs) < 0 || Number(event.activeMs) > MAX_ACTIVE_MS)) return null;
  if (event.type === 'engagement' && event.activeMs === undefined) return null;
  if (event.type === 'page_view' && (event.eventId !== event.pageViewId || event.target !== undefined || event.control !== undefined || event.value !== undefined)) return null;
  if (event.type !== 'page_view' && event.eventId === event.pageViewId) return null;
  if (event.type === 'engagement' && (event.target !== undefined || event.control !== undefined || event.value !== undefined)) return null;
  if (event.type === 'navigation_clicked' || (event.type === 'cta_viewed' && typeof event.target === 'string' && event.target.startsWith('/'))) {
    if (typeof event.target !== 'string' || event.target.length > 512 || !event.target.startsWith('/')) return null;
  } else if (event.target !== undefined && (typeof event.target !== 'string' || !IDENTIFIER.test(event.target))) return null;
  if (event.type === 'cv_request_rejected' && !['invalid', 'blocked_domain', 'domain_unavailable', 'rate_limited', 'storage_error'].includes(String(event.target))) return null;
  if (['contact_clicked', 'email_copied'].includes(event.type) && !['email', 'phone', 'whatsapp', 'linkedin'].includes(String(event.target))) return null;
  if (['cv_opened', 'cv_download_initiated'].includes(event.type) && event.target !== 'cv') return null;
  if (event.type === 'scroll_depth_reached' && ![25, 50, 75, 90].includes(Number(event.value))) return null;
  if (event.type === 'video_progress' && ![25, 50, 75, 90].includes(Number(event.value))) return null;
  return event as unknown as AnalyticsV2Event;
}

let schemaReady: Promise<void> | undefined;
let pruneAfter = 0;
export class AnalyticsV2StorageError extends Error {
  constructor() { super('Website measurement is temporarily unavailable.'); }
}
export async function ensureAnalyticsV2Schema(): Promise<void> {
  if (!process.env.POSTGRES_URL?.trim()) throw new AnalyticsV2StorageError();
  if (!schemaReady) schemaReady = (async () => {
    await db`CREATE TABLE IF NOT EXISTS site_analytics_v2_sessions (
      id UUID PRIMARY KEY, browser_hash CHAR(64) NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      source TEXT NOT NULL CHECK (char_length(source) <= 253),
      device TEXT NOT NULL CHECK (device IN ('Desktop', 'Phone', 'Tablet')),
      campaign TEXT CHECK (char_length(campaign) <= 80)
    )`;
    await db`CREATE INDEX IF NOT EXISTS analytics_v2_sessions_browser_idx ON site_analytics_v2_sessions(browser_hash, last_activity_at DESC)`;
    await db`CREATE INDEX IF NOT EXISTS analytics_v2_sessions_time_idx ON site_analytics_v2_sessions(started_at)`;
    await db`CREATE TABLE IF NOT EXISTS site_analytics_v2_views (
      id UUID PRIMARY KEY, session_id UUID NOT NULL REFERENCES site_analytics_v2_sessions(id) ON DELETE CASCADE,
      tab_id UUID NOT NULL, path TEXT NOT NULL CHECK (char_length(path) <= 240),
      sequence INTEGER NOT NULL CHECK (sequence BETWEEN 0 AND 1000000),
      occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), active_ms INTEGER CHECK (active_ms BETWEEN 0 AND 28800000),
      last_observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await db`CREATE INDEX IF NOT EXISTS analytics_v2_views_session_idx ON site_analytics_v2_views(session_id, tab_id, sequence)`;
    await db`CREATE INDEX IF NOT EXISTS analytics_v2_views_path_idx ON site_analytics_v2_views(path, occurred_at)`;
    await db`CREATE INDEX IF NOT EXISTS analytics_v2_views_time_idx ON site_analytics_v2_views(occurred_at)`;
    await db`CREATE TABLE IF NOT EXISTS site_analytics_v2_events (
      event_id UUID PRIMARY KEY, session_id UUID NOT NULL REFERENCES site_analytics_v2_sessions(id) ON DELETE CASCADE,
      page_view_id UUID NOT NULL REFERENCES site_analytics_v2_views(id) ON DELETE CASCADE, tab_id UUID NOT NULL,
      sequence INTEGER NOT NULL CHECK (sequence BETWEEN 0 AND 1000000),
      event_type TEXT NOT NULL CHECK (event_type IN ('navigation_clicked','outbound_clicked','cv_opened','cv_submitted',
        'cv_request_saved','cv_request_rejected','cv_download_initiated','contact_opened','contact_clicked','email_copied',
        'media_opened','video_started','video_progress','video_completed','filter_changed','menu_opened','cta_viewed',
        'section_viewed','scroll_depth_reached','demo_started')),
      target TEXT CHECK (char_length(target) <= 240), control TEXT CHECK (char_length(control) <= 96),
      value REAL CHECK (value BETWEEN 0 AND 100), occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
    await db`CREATE INDEX IF NOT EXISTS analytics_v2_events_session_idx ON site_analytics_v2_events(session_id, occurred_at, sequence)`;
    await db`CREATE INDEX IF NOT EXISTS analytics_v2_events_view_idx ON site_analytics_v2_events(page_view_id, sequence)`;
    await db`CREATE INDEX IF NOT EXISTS analytics_v2_events_type_idx ON site_analytics_v2_events(event_type, occurred_at)`;
    await db`CREATE TABLE IF NOT EXISTS site_analytics_v2_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1), journey_tracking_started_at TIMESTAMPTZ,
      engagement_tracking_started_at TIMESTAMPTZ
    )`;
    await db`INSERT INTO site_analytics_v2_settings(id) VALUES (1) ON CONFLICT DO NOTHING`;
    await db`CREATE TABLE IF NOT EXISTS site_analytics_v2_limits (
      bucket_key CHAR(64) PRIMARY KEY, request_count INTEGER NOT NULL DEFAULT 1,
      expires_at TIMESTAMPTZ NOT NULL
    )`;
  })().catch(() => { schemaReady = undefined; throw new AnalyticsV2StorageError(); });
  await schemaReady;
}

async function prune() {
  if (Date.now() < pruneAfter) return;
  // Trim the raw rows even if a browser keeps an unusually long session alive.
  // Session deletion also cascades; the local reader never performs this work.
  await db`DELETE FROM site_analytics_v2_events WHERE occurred_at < NOW() - INTERVAL '180 days'`;
  await db`DELETE FROM site_analytics_v2_views WHERE occurred_at < NOW() - INTERVAL '180 days'`;
  await db`DELETE FROM site_analytics_v2_sessions WHERE last_activity_at < NOW() - INTERVAL '180 days'`;
  await db`DELETE FROM site_analytics_v2_limits WHERE expires_at < NOW()`;
  pruneAfter = Date.now() + 60 * 60 * 1000;
}

type ParentView = { id: string; session_id: string; tab_id: string; path: string; sequence: number; active_ms: number | null; occurred_at: Date | string; last_activity_at: Date | string };

/** Store one browser-owned event. All session decisions use a single locked DB transaction. */
export async function recordAnalyticsV2Event(input: AnalyticsV2Event, context: AnalyticsV2Context): Promise<{ accepted: boolean; inserted: boolean }> {
  const event = normalizeAnalyticsV2Event(input);
  if (!event || !HASH.test(context.browserHash)) return { accepted: false, inserted: false };
  const path = await resolveAnalyticsV2Path(event.path);
  if (!path) return { accepted: false, inserted: false };
  const pathTarget = event.type === 'navigation_clicked' || (event.type === 'cta_viewed' && event.target?.startsWith('/'));
  const target = pathTarget ? await resolveAnalyticsV2Path(event.target) : event.target;
  if (pathTarget && !target) return { accepted: false, inserted: false };
  await ensureAnalyticsV2Schema();
  // A shared, expiring budget also bounds callers that repeatedly clear cookies.
  // Only a rotating HMAC-derived bucket is retained, never a raw network address.
  const bucket = Math.floor(Date.now() / (15 * 60 * 1000));
  const key = createHash('sha256').update(`analytics-v2\0${analyticsVisitorHash(context.ip, context.userAgent)}\0${bucket}`).digest('hex');
  const allowance = await db`INSERT INTO site_analytics_v2_limits(bucket_key, expires_at)
    VALUES (${key}, ${new Date((bucket + 1) * 15 * 60 * 1000).toISOString()})
    ON CONFLICT (bucket_key) DO UPDATE SET request_count = site_analytics_v2_limits.request_count + 1
    WHERE site_analytics_v2_limits.request_count < 3000 RETURNING request_count`;
  if (!allowance.rows.length) return { accepted: false, inserted: false };
  const client = await db.connect();
  let started = false;
  let result = { accepted: false, inserted: false };
  try {
    await client.query('BEGIN'); started = true;
    await client.query("SET LOCAL statement_timeout = '8000ms'");
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [context.browserHash]);
    const prior = await client.query<ParentView>(`SELECT v.*, s.last_activity_at FROM site_analytics_v2_views v
      JOIN site_analytics_v2_sessions s ON s.id = v.session_id
      WHERE v.id = $1 AND s.browser_hash = $2`, [event.pageViewId, context.browserHash]);
    const parent = prior.rows[0];
    if (event.type === 'page_view') {
      if (parent) {
        result.accepted = parent.path === path && parent.tab_id === event.tabId && parent.sequence === event.sequence;
      } else {
        const occupied = await client.query('SELECT id FROM site_analytics_v2_views WHERE id = $1', [event.pageViewId]);
        const budget = await client.query<{ count: number }>(`SELECT COUNT(*)::INTEGER AS count FROM site_analytics_v2_views v
          JOIN site_analytics_v2_sessions s ON s.id = v.session_id WHERE s.browser_hash = $1
          AND v.occurred_at >= NOW() - INTERVAL '24 hours'`, [context.browserHash]);
        if (!occupied.rows.length && Number(budget.rows[0]?.count || 0) < 500) {
          const session = await client.query<{ id: string }>(`SELECT id FROM site_analytics_v2_sessions
            WHERE browser_hash = $1 AND last_activity_at > NOW() - INTERVAL '30 minutes'
            ORDER BY last_activity_at DESC LIMIT 1`, [context.browserHash]);
          const sessionId = session.rows[0]?.id || randomUUID();
          if (!session.rows.length) {
            const referrer = normalizeReferrer(event.referrer);
            const source = event.campaign?.split(':')[0] || (referrer === 'Direct / internal' ? 'Direct' : referrer);
            await client.query(`INSERT INTO site_analytics_v2_sessions(id, browser_hash, source, device, campaign)
              VALUES ($1, $2, $3, $4, $5)`, [sessionId, context.browserHash, source,
              analyticsDevice(context.userAgent), event.campaign || null]);
          }
          const saved = await client.query(`INSERT INTO site_analytics_v2_views(id, session_id, tab_id, path, sequence)
            VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING id`, [event.pageViewId, sessionId, event.tabId, path, event.sequence]);
          result = { accepted: saved.rows.length > 0, inserted: saved.rows.length > 0 };
          if (result.inserted) {
            await client.query('UPDATE site_analytics_v2_sessions SET last_activity_at = NOW() WHERE id = $1', [sessionId]);
            await client.query('UPDATE site_analytics_v2_settings SET journey_tracking_started_at = COALESCE(journey_tracking_started_at, NOW()) WHERE id = 1');
          }
          // A colliding request from a different browser cannot leave an empty
          // session behind if its insert loses the global page-view UUID race.
          else if (!session.rows.length) await client.query('DELETE FROM site_analytics_v2_sessions WHERE id = $1', [sessionId]);
        }
      }
    } else if (parent && parent.path === path && parent.tab_id === event.tabId && event.sequence > parent.sequence) {
      // An expired parent never restarts an old session. The client must establish a fresh page view.
      const active = new Date(parent.last_activity_at).getTime() > Date.now() - 30 * 60 * 1000;
      if (event.type === 'engagement') {
        const elapsed = Math.max(0, Date.now() - new Date(parent.occurred_at).getTime());
        const total = Math.min(event.activeMs!, Math.floor(elapsed), MAX_ACTIVE_MS);
        await client.query(`UPDATE site_analytics_v2_views SET active_ms = GREATEST(COALESCE(active_ms, 0), $2),
          last_observed_at = GREATEST(last_observed_at, NOW()) WHERE id = $1`, [parent.id, total]);
        await client.query('UPDATE site_analytics_v2_settings SET engagement_tracking_started_at = COALESCE(engagement_tracking_started_at, NOW()) WHERE id = 1');
        if (active && total > Number(parent.active_ms || 0)) {
          await client.query('UPDATE site_analytics_v2_sessions SET last_activity_at = NOW() WHERE id = $1', [parent.session_id]);
        }
        result.accepted = true;
      } else if (active) {
        const budget = await client.query<{ count: number }>(`SELECT COUNT(*)::INTEGER AS count FROM site_analytics_v2_events e
          JOIN site_analytics_v2_sessions s ON s.id = e.session_id WHERE s.browser_hash = $1
          AND e.occurred_at >= NOW() - INTERVAL '24 hours'`, [context.browserHash]);
        if (Number(budget.rows[0]?.count || 0) < 5000) {
          const saved = await client.query(`INSERT INTO site_analytics_v2_events
            (event_id, session_id, page_view_id, tab_id, sequence, event_type, target, control, value)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING RETURNING event_id`,
          [event.eventId, parent.session_id, parent.id, event.tabId, event.sequence, event.type, target || null, event.control || null, event.value ?? null]);
          result = { accepted: true, inserted: saved.rows.length > 0 };
          // Observation events and duplicate retries cannot keep a dormant session alive.
          if (result.inserted && !['cta_viewed', 'section_viewed'].includes(event.type)) {
            await client.query('UPDATE site_analytics_v2_sessions SET last_activity_at = NOW() WHERE id = $1', [parent.session_id]);
          }
          if (result.inserted) await client.query('UPDATE site_analytics_v2_views SET last_observed_at = NOW() WHERE id = $1', [parent.id]);
        }
      }
    }
    await client.query('COMMIT'); started = false;
  } catch {
    if (started) await client.query('ROLLBACK').catch(() => {});
    throw new AnalyticsV2StorageError();
  } finally { client.release(); }
  if (result.accepted && event.type !== 'engagement') {
    const legacy = normalizeAnalyticsAction(event.type, target, value => typeof value === 'string' ? value : null);
    if (legacy) {
      // IDs make this compatibility projection retry-safe. Its failure cannot
      // revoke an already committed browser identity or duplicate the v2 event.
      await recordAnalyticsEvent({ eventId: event.eventId, path, referrer: event.referrer, ...legacy }, context).catch(() => {});
    }
  }
  await prune().catch(() => {});
  return result;
}

async function recordAnalyticsServerEvent(input: { pageViewId: string; eventId: string }, browserHash: string, type: 'cv_submitted' | 'cv_request_saved'): Promise<boolean> {
  if (!UUID.test(input.pageViewId) || !UUID.test(input.eventId) || !HASH.test(browserHash)) return false;
  let client: VercelPoolClient | undefined;
  try {
    await ensureAnalyticsV2Schema();
    client = await db.connect();
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout = '8s'");
    // Share the ingestion lock: concurrent CV requests cannot all read the
    // same remaining budget before inserting their submitted/saved events.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [browserHash]);
    const saved = await client.query(`WITH inserted AS (INSERT INTO site_analytics_v2_events
      (event_id, session_id, page_view_id, tab_id, sequence, event_type, target)
      SELECT $1::UUID, v.session_id, v.id, v.tab_id,
        GREATEST(v.sequence + 1, COALESCE((SELECT MAX(e.sequence) + 1 FROM site_analytics_v2_events e WHERE e.page_view_id = v.id), v.sequence + 1)),
        $2::TEXT, 'cv'
      FROM site_analytics_v2_views v JOIN site_analytics_v2_sessions s ON s.id = v.session_id
      WHERE v.id = $3::UUID AND s.browser_hash = $4
        AND s.last_activity_at > NOW() - INTERVAL '30 minutes'
        AND (SELECT COUNT(*) FROM site_analytics_v2_events budget
          JOIN site_analytics_v2_sessions owner ON owner.id = budget.session_id
          WHERE owner.browser_hash = $4 AND budget.occurred_at >= NOW() - INTERVAL '24 hours') < 5000
        AND ($2::TEXT <> 'cv_submitted' OR (SELECT COUNT(*) FROM site_analytics_v2_events submitted
          JOIN site_analytics_v2_sessions owner ON owner.id = submitted.session_id
          WHERE owner.browser_hash = $4 AND submitted.event_type = 'cv_submitted'
            AND submitted.occurred_at >= NOW() - INTERVAL '15 minutes') < 30)
      ON CONFLICT DO NOTHING RETURNING event_id, page_view_id, session_id, occurred_at),
      observed_view AS (
        UPDATE site_analytics_v2_views v SET last_observed_at = GREATEST(v.last_observed_at, i.occurred_at)
        FROM inserted i WHERE v.id = i.page_view_id RETURNING v.id
      ), observed_session AS (
        UPDATE site_analytics_v2_sessions s SET last_activity_at = GREATEST(s.last_activity_at, i.occurred_at)
        FROM inserted i WHERE s.id = i.session_id RETURNING s.id
      ) SELECT event_id FROM inserted`, [input.eventId, type, input.pageViewId, browserHash]);
    await client.query('COMMIT');
    return saved.rows.length > 0;
  } catch {
    if (client) await client.query('ROLLBACK').catch(() => {});
    return false;
  } finally { client?.release(); }
}

/** The actual CV POST is observed before validation/storage, without copying its email. */
export async function recordAnalyticsSubmission(input: { pageViewId: string; eventId: string }, browserHash: string): Promise<boolean> {
  return recordAnalyticsServerEvent(input, browserHash, 'cv_submitted');
}

/** Trusted CV handler only: no public event can claim a successfully saved CV request. */
export async function recordAnalyticsConversion(input: { pageViewId: string; eventId: string }, browserHash: string): Promise<boolean> {
  return recordAnalyticsServerEvent(input, browserHash, 'cv_request_saved');
}
