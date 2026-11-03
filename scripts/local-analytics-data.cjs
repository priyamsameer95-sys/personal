'use strict';

const { lstat, readFile } = require('node:fs/promises');
const path = require('node:path');

class LocalDataError extends Error {
  constructor() {
    super('The private website records could not be read. Please try again.');
    this.code = 'DATA_UNAVAILABLE';
  }
}

function validConnection(value) {
  if (typeof value !== 'string' || value.length > 8192) throw new LocalDataError();
  try {
    const parsed = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname || !parsed.username || !parsed.password) throw new Error();
  } catch { throw new LocalDataError(); }
  return value;
}

async function loadLocalConnection(filePath = path.join(__dirname, '..', 'data', 'local-analytics.connection.json')) {
  try {
    const stat = await lstat(filePath);
    if (!stat.isFile() || (stat.mode & 0o077) !== 0 || stat.size > 12288 ||
      (typeof process.getuid === 'function' && stat.uid !== process.getuid())) throw new Error();
    const config = JSON.parse(await readFile(filePath, 'utf8'));
    if (!config || typeof config !== 'object' || Array.isArray(config) || Object.keys(config).some(key => key !== 'connectionString')) throw new Error();
    return validConnection(config.connectionString);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw new LocalDataError();
  }
}

function localDay(value) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function shiftDay(day, count) {
  const value = new Date(`${day}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}
function count(value) {
  const result = Number(value ?? 0);
  if (!Number.isSafeInteger(result) || result < 0) throw new LocalDataError();
  return result;
}
function timestamp(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}
function normalizeLead(row) {
  return {
    email: String(row.email),
    first_requested_at: timestamp(row.first_requested_at),
    last_requested_at: timestamp(row.last_requested_at),
    download_count: count(row.download_count),
    last_source_path: String(row.last_source_path),
  };
}
function cvCSV(leads) {
  const cell = value => {
    const text = String(value ?? '');
    const safe = /^[\s\x00-\x1f]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  return [
    ['Email', 'First request (UTC)', 'Last request (UTC)', 'Recorded requests', 'Last page'],
    ...leads.map(lead => [lead.email, lead.first_requested_at, lead.last_requested_at, lead.download_count, lead.last_source_path]),
  ].map(row => row.map(cell).join(',')).join('\r\n');
}

// One connection and one read-only snapshot per report. No application schema,
// password, rate-limit or event data is modified by this local reader.
async function openConnection(connectionString) {
  const { createClient, createPool } = require('@vercel/postgres');
  const config = { connectionString, connectionTimeoutMillis: 15000, query_timeout: 20000 };
  if (new URL(connectionString).hostname.includes('-pooler.')) {
    const pool = createPool(config);
    try {
      const client = await pool.connect();
      return { query: (...args) => client.query(...args), async close() { client.release(); await pool.end(); } };
    } catch (error) { await pool.end().catch(() => {}); throw error; }
  }
  const client = createClient(config);
  try { await client.connect(); } catch (error) { await client.end().catch(() => {}); throw error; }
  return { query: (...args) => client.query(...args), close: () => client.end() };
}

const START = "($1::TIMESTAMP AT TIME ZONE 'Asia/Kolkata')";
const UNTIL = "($2::TIMESTAMP AT TIME ZONE 'Asia/Kolkata')";
const VIEW_RANGE = `occurred_at >= ${START} AND occurred_at < ${UNTIL}`;
const REQUEST_RANGE = `requested_at >= ${START} AND requested_at < ${UNTIL}`;
const LEADS = `SELECT LOWER(TRIM(email)) AS email,
  MIN(first_requested_at) AS first_requested_at, MAX(last_requested_at) AS last_requested_at,
  SUM(download_count) AS download_count,
  (ARRAY_AGG(last_source_path ORDER BY last_requested_at DESC, id DESC))[1] AS last_source_path
  FROM cv_download_leads GROUP BY LOWER(TRIM(email))
  ORDER BY MAX(last_requested_at) DESC, LOWER(TRIM(email)) LIMIT $1`;

function createLocalDataProvider({ connectionString, now = Date.now, createConnection = openConnection } = {}) {
  validConnection(connectionString);
  async function readSnapshot(work) {
    let connection;
    let started = false;
    try {
      connection = await createConnection(connectionString);
      await connection.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
      started = true;
      const result = await work(connection);
      await connection.query('COMMIT');
      started = false;
      return result;
    } catch {
      if (started) await connection.query('ROLLBACK').catch(() => {});
      throw new LocalDataError();
    } finally {
      if (connection) await connection.close().catch(() => {});
    }
  }
  return {
    async getReport(range = 30) {
      const days = [7, 30, 90].includes(range) ? range : 30;
      const endDate = localDay(now()), startDate = shiftDay(endDate, 1 - days), until = shiftDay(endDate, 1);
      return readSnapshot(async connection => {
        const bounded = async text => (await connection.query(text, [startDate, until])).rows;
        const raw = async (text, params = []) => (await connection.query(text, params)).rows;
        const [tables] = await raw(`SELECT
          to_regclass('cv_download_leads') IS NOT NULL AS cv_leads,
          to_regclass('cv_download_events') IS NOT NULL AS cv_events,
          to_regclass('site_page_views') IS NOT NULL AS page_views,
          to_regclass('site_interaction_events') IS NOT NULL AS interactions,
          to_regclass('site_analytics_settings') IS NOT NULL AS settings,
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema()
            AND table_name = 'site_page_views' AND column_name = 'browser_hash') AS browser_hash,
          EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema()
            AND table_name = 'site_analytics_settings' AND column_name = 'browser_tracking_started_at') AS browser_tracking`);
        if (!tables?.cv_leads) throw new LocalDataError();
        const availability = { pageViews: Boolean(tables.page_views), interactions: Boolean(tables.interactions), cvRequestHistory: Boolean(tables.cv_events),
          uniqueVisitors: Boolean(tables.page_views && tables.settings && tables.browser_hash && tables.browser_tracking) };
        const started = tables.settings ? await raw(`SELECT enabled_at${tables.browser_tracking ? ', browser_tracking_started_at' : ''} FROM site_analytics_settings WHERE id = 1`) : [];
        const uniqueColumns = availability.uniqueVisitors ? ', COUNT(DISTINCT browser_hash) AS unique_visitors, COUNT(browser_hash) AS unique_views' : '';
        const totals = availability.pageViews ? await bounded(`SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS visitors${uniqueColumns} FROM site_page_views WHERE ${VIEW_RANGE}`) : [];
        const dailyViews = availability.pageViews ? await bounded(`SELECT TO_CHAR(occurred_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
          COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS visitors FROM site_page_views WHERE ${VIEW_RANGE} GROUP BY day ORDER BY day`) : [];
        const dailyRequests = availability.cvRequestHistory ? await bounded(`SELECT TO_CHAR(requested_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
          COUNT(*) AS requests FROM cv_download_events WHERE ${REQUEST_RANGE} GROUP BY day ORDER BY day`) : [];
        const pages = availability.pageViews ? await bounded(`SELECT path, COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS visitors${uniqueColumns}
          FROM site_page_views WHERE ${VIEW_RANGE} GROUP BY path ORDER BY views DESC, path LIMIT 100`) : [];
        const referrers = availability.pageViews ? await bounded(`SELECT referrer AS source, COUNT(*) AS visits FROM site_page_views
          WHERE ${VIEW_RANGE} GROUP BY referrer ORDER BY visits DESC, referrer LIMIT 12`) : [];
        const devices = availability.pageViews ? await bounded(`SELECT device, COUNT(*) AS visits FROM site_page_views
          WHERE ${VIEW_RANGE} GROUP BY device ORDER BY visits DESC, device`) : [];
        const contacts = await bounded(`SELECT COUNT(DISTINCT LOWER(TRIM(email))) AS total, COALESCE(SUM(download_count), 0) AS requests,
          COUNT(DISTINCT LOWER(TRIM(email))) FILTER (WHERE last_requested_at >= ${START} AND last_requested_at < ${UNTIL}) AS period_contacts
          FROM cv_download_leads`);
        const leads = await raw(LEADS, [200]);
        const interactionTotals = availability.interactions ? await bounded(`SELECT COUNT(*) AS clicks FROM site_interaction_events WHERE ${VIEW_RANGE}`) : [];
        const dailyInteractions = availability.interactions ? await bounded(`SELECT TO_CHAR(occurred_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') AS day,
          COUNT(*) AS clicks FROM site_interaction_events WHERE ${VIEW_RANGE} GROUP BY day ORDER BY day`) : [];
        const interactions = availability.interactions ? await bounded(`SELECT event_type AS type, target, COUNT(*) AS count FROM site_interaction_events
          WHERE ${VIEW_RANGE} GROUP BY event_type, target ORDER BY count DESC, event_type, target`) : [];
        const pageInteractions = availability.interactions ? await bounded(`SELECT path, COUNT(*) AS count FROM site_interaction_events
          WHERE ${VIEW_RANGE} GROUP BY path ORDER BY count DESC, path LIMIT 100`) : [];
        const viewsByDay = new Map(dailyViews.map(row => [row.day, row]));
        const requestsByDay = new Map(dailyRequests.map(row => [row.day, row]));
        const clicksByDay = new Map(dailyInteractions.map(row => [row.day, row]));
        const daily = Array.from({ length: days }, (_, index) => {
          const date = shiftDay(startDate, index);
          return { date, visitors: availability.pageViews ? count(viewsByDay.get(date)?.visitors) : null,
            pageViews: availability.pageViews ? count(viewsByDay.get(date)?.views) : null,
            clicks: availability.interactions ? count(clicksByDay.get(date)?.clicks) : null,
            cvRequests: availability.cvRequestHistory ? count(requestsByDay.get(date)?.requests) : null };
        });
        const cvContacts = count(contacts[0]?.total);
        return {
          days, startDate, endDate, trackingStartedAt: timestamp(started[0]?.enabled_at),
          uniqueTrackingStartedAt: timestamp(started[0]?.browser_tracking_started_at),
          uniqueVisitors: availability.uniqueVisitors && started[0]?.browser_tracking_started_at ? count(totals[0]?.unique_visitors) : null,
          uniqueTrackedPageViews: availability.uniqueVisitors && started[0]?.browser_tracking_started_at ? count(totals[0]?.unique_views) : null,
          visitors: availability.pageViews ? count(totals[0]?.visitors) : null,
          pageViews: availability.pageViews ? count(totals[0]?.views) : null,
          clicks: availability.interactions ? count(interactionTotals[0]?.clicks) : null,
          cvRequests: availability.cvRequestHistory ? daily.reduce((sum, day) => sum + day.cvRequests, 0) : null, cvContacts,
          // A lead's latest timestamp proves at least one request in this period;
          // its cumulative download_count cannot reconstruct per-day history.
          cvContactsInPeriod: count(contacts[0]?.period_contacts), availability,
          cvRequestsAllTime: count(contacts[0]?.requests), daily,
          topPages: pages.map(row => ({ path: String(row.path), views: count(row.views), visitors: count(row.visitors),
            browserVisitors: availability.uniqueVisitors && count(row.unique_views) > 0 ? count(row.unique_visitors) : null })),
          referrers: referrers.map(row => ({ source: String(row.source), visits: count(row.visits) })),
          devices: devices.map(row => ({ device: String(row.device), visits: count(row.visits) })), countries: [],
          interactions: interactions.map(row => ({ type: String(row.type), target: String(row.target), count: count(row.count) })),
          pageInteractions: pageInteractions.map(row => ({ path: String(row.path), count: count(row.count) })),
          cvLeads: leads.map(normalizeLead), cvLeadsTotal: cvContacts,
        };
      });
    },
    async exportCSV() {
      return readSnapshot(async connection => cvCSV((await connection.query(LEADS, [10000])).rows.map(normalizeLead)));
    },
  };
}

module.exports = { createLocalDataProvider, loadLocalConnection, LocalDataError, cvCSV, localDay };
