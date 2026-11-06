const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID, createHash } = require('node:crypto');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const root = path.join(__dirname, '..');
const start = Date.parse('2026-11-06T06:00:00Z');
const browser = 'a'.repeat(64), otherBrowser = 'b'.repeat(64);

function fixture({ fail = false, env = {} } = {}) {
  let now = start;
  const sessions = new Map(), views = new Map(), events = new Map(), calls = [], mirrored = [];
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  async function tagged(strings, ...values) {
    const sql = strings.join('?').replace(/\s+/g, ' ').trim(); calls.push({ sql, values });
    if (fail) throw Error('postgres://do-not-leak-private-credential');
    if (/^CREATE|^INSERT INTO site_analytics_v2_settings|^DELETE/.test(sql)) return { rows: [] };
    if (sql.startsWith('INSERT INTO site_analytics_v2_limits')) return { rows: [{ request_count: 1 }] };
    throw Error(`Unmodelled tagged query: ${sql}`);
  }
  tagged.connect = async () => ({
    async query(text, values = []) {
      const sql = text.replace(/\s+/g, ' ').trim(); calls.push({ sql, values });
      if (/^(BEGIN|COMMIT|ROLLBACK|SET LOCAL|SELECT pg_advisory_xact_lock)/.test(sql)) return { rows: [] };
      if (sql.startsWith('WITH inserted AS (INSERT INTO site_analytics_v2_events')) {
        const [eventId, type, pageId, owner] = values;
        const parent = views.get(pageId), session = parent && sessions.get(parent.session_id);
        if (!session || session.browser_hash !== owner || session.last_activity_at <= now - 1800000 || events.has(eventId)) return { rows: [] };
        const ownedEvents = [...events.values()].filter(event => sessions.get(event.session_id)?.browser_hash === owner);
        if (ownedEvents.filter(event => new Date(event.occurred_at).getTime() >= now - 86400000).length >= 5000) return { rows: [] };
        if (type === 'cv_submitted' && ownedEvents.filter(event => event.event_type === 'cv_submitted' && new Date(event.occurred_at).getTime() >= now - 900000).length >= 30) return { rows: [] };
        events.set(eventId, { event_id: eventId, page_view_id: pageId, event_type: type, session_id: session.id, target: 'cv', occurred_at: new Date(now) });
        parent.last_observed_at = new Date(now);
        session.last_activity_at = now;
        return { rows: [{ event_id: eventId }] };
      }
      if (sql.startsWith('SELECT v.*, s.last_activity_at')) {
        const parent = views.get(values[0]), session = parent && sessions.get(parent.session_id);
        return { rows: session?.browser_hash === values[1] ? [{ ...parent, last_activity_at: new Date(session.last_activity_at) }] : [] };
      }
      if (sql.startsWith('SELECT id FROM site_analytics_v2_views')) return { rows: views.has(values[0]) ? [{ id: values[0] }] : [] };
      if (sql.startsWith('SELECT COUNT(*)::INTEGER AS count FROM site_analytics_v2_views')) return { rows: [{ count: [...views.values()].filter(v => sessions.get(v.session_id)?.browser_hash === values[0]).length }] };
      if (sql.startsWith('SELECT COUNT(*)::INTEGER AS count FROM site_analytics_v2_events')) return { rows: [{ count: [...events.values()].filter(v => sessions.get(v.session_id)?.browser_hash === values[0]).length }] };
      if (sql.startsWith('SELECT id FROM site_analytics_v2_sessions')) {
        return { rows: [...sessions.values()].filter(s => s.browser_hash === values[0] && s.last_activity_at > now - 1800000).sort((a,b) => b.last_activity_at - a.last_activity_at).slice(0,1) };
      }
      if (sql.startsWith('INSERT INTO site_analytics_v2_sessions')) {
        const [id, browser_hash, source, device, campaign] = values;
        sessions.set(id, { id, browser_hash, source, device, campaign, started_at: now, last_activity_at: now }); return { rows: [] };
      }
      if (sql.startsWith('INSERT INTO site_analytics_v2_views')) {
        const [id, session_id, tab_id, path, sequence] = values;
        if (views.has(id)) return { rows: [] };
        views.set(id, { id, session_id, tab_id, path, sequence, occurred_at: new Date(now), last_observed_at: new Date(now), active_ms: null });
        return { rows: [{ id }] };
      }
      if (sql.startsWith('INSERT INTO site_analytics_v2_events')) {
        const [event_id, session_id, page_view_id, tab_id, sequence, event_type, target, control, value] = values;
        if (events.has(event_id)) return { rows: [] };
        events.set(event_id, { event_id, session_id, page_view_id, tab_id, sequence, event_type, target, control, value, occurred_at: new Date(now) });
        return { rows: [{ event_id }] };
      }
      if (sql.startsWith('UPDATE site_analytics_v2_sessions')) { sessions.get(values[0]).last_activity_at = now; return { rows: [] }; }
      if (sql.startsWith('UPDATE site_analytics_v2_views SET active_ms')) { views.get(values[0]).active_ms = Math.max(views.get(values[0]).active_ms || 0, values[1]); return { rows: [] }; }
      if (sql.startsWith('UPDATE site_analytics_v2_views SET last_observed_at')) { views.get(values[0]).last_observed_at = new Date(now); return { rows: [] }; }
      if (sql.startsWith('UPDATE site_analytics_v2_settings')) return { rows: [] };
      if (sql.startsWith('DELETE FROM site_analytics_v2_sessions')) { sessions.delete(values[0]); return { rows: [] }; }
      throw Error(`Unmodelled transaction query: ${sql}`);
    },
    release() { calls.push({ sql: 'RELEASE', values: [] }); },
  });
  const cache = new Map();
  const environment = { NODE_ENV: 'production', POSTGRES_URL: 'postgres://test-fixture', ANALYTICS_SECRET: 'unit-test-signing-only', ...env };
  const resolvePath = async value => {
    if (typeof value !== 'string') return null;
    const plain = value.split(/[?#]/)[0];
    return ['/', '/cv', '/product', '/product/absolute-silkroute-marketplace'].includes(plain) ? plain : null;
  };
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    const module = { exports: {} };
    const source = ts.transpileModule(readFileSync(path.join(root, filename), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    function localRequire(id) {
      if (id === '@/lib/db') return tagged;
      if (id === '@/lib/auth') return { isAdminAuthenticated: async () => false, getClientIp: () => '192.0.2.10' };
      if (id === '@/lib/site-analytics') return {
        resolveAnalyticsPath: resolvePath,
        normalizeReferrer: value => value ? new URL(value.includes('://') ? value : `https://${value}`).hostname : 'Direct / internal',
        analyticsDevice: () => 'Desktop',
        analyticsVisitorHash: ip => createHash('sha256').update(ip).digest('hex'),
        recordAnalyticsEvent: async (event, context) => { mirrored.push({ event, context }); },
      };
      if (id.startsWith('@/') && id.endsWith('.json')) return JSON.parse(readFileSync(path.join(root, id.slice(2)), 'utf8'));
      if (id.startsWith('@/')) return load(`${id.slice(2)}.ts`);
      return require(id);
    }
    vm.runInNewContext(source, { module, exports: module.exports, require: localRequire, process: { env: environment }, Buffer, URL, Date: Clock, console, Uint8Array }, { filename });
    cache.set(filename, module.exports); return module.exports;
  }
  return { lib: load('lib/analytics-v2.ts'), route: () => load('app/api/analytics/route.ts'), load, sessions, views, events, calls, mirrored, advance(ms) { now += ms; } };
}
function view(overrides = {}) {
  const id = randomUUID();
  return { version: 2, eventId: id, pageViewId: id, tabId: randomUUID(), type: 'page_view', path: '/', referrer: 'https://www.google.com/search?q=private', sequence: 1, ...overrides };
}
function action(parent, overrides = {}) {
  return { ...parent, eventId: randomUUID(), sequence: parent.sequence + 1, type: 'cv_opened', target: 'cv', ...overrides };
}
const context = (browserHash = browser) => ({ browserHash, ip: '192.0.2.10', userAgent: 'Safari/605.1' });
function request(body, headers = {}) {
  return new NextRequest('https://portfolio.example/api/analytics', { method: 'POST', headers: { host: 'portfolio.example', origin: 'https://portfolio.example', 'content-type': 'application/json', 'user-agent': 'Safari/605.1', ...headers }, body: JSON.stringify(body) });
}

test('v2 rejects private, unknown, forged success and malformed event properties before storage', () => {
  const f = fixture(); const original = view();
  assert.ok(f.lib.normalizeAnalyticsV2Event(original));
  assert.ok(f.lib.normalizeAnalyticsV2Event({ ...original, campaign: 'linkedin:social:featured' }));
  for (const event of [null, [], { ...original, email: 'someone@example.com' }, { ...original, browserHash: browser },
    { ...original, type: 'cv_request_saved' }, action(original, { type: 'cv_submitted' }), { ...original, sequence: -1 }, { ...original, sequence: 0.5 },
    { ...original, pageViewId: 'not-a-uuid' }, { ...original, eventId: randomUUID() },
    action(original, { control: 'reader@example.com' }), action(original, { target: 'name@example.com' }),
    action(original, { type: 'video_progress', value: 42 }), action(original, { type: 'engagement', target: undefined, activeMs: 99_999_999 }),
    action(original, { type: 'cv_request_rejected', target: 'arbitrary failure message' }),
    { ...original, campaign: 'utm_campaign=reader@example.com' }, { ...original, campaign: 'linkedin:social:reader-name' }]) assert.equal(f.lib.normalizeAnalyticsV2Event(event), null);
  assert.equal(f.calls.length, 0);
});

test('one browser shares a 30-minute session across pages and tabs without merging their path identity', async () => {
  const f = fixture(); const first = view();
  await f.lib.recordAnalyticsV2Event(first, context());
  f.advance(10000);
  const second = view({ path: '/product', tabId: first.tabId, sequence: 2 });
  const otherTab = view({ path: '/cv' });
  await f.lib.recordAnalyticsV2Event(second, context());
  await f.lib.recordAnalyticsV2Event(otherTab, context());
  assert.equal(f.sessions.size, 1); assert.equal(f.views.size, 3);
  assert.equal(f.views.get(first.pageViewId).session_id, f.views.get(otherTab.pageViewId).session_id);
  assert.notEqual(f.views.get(first.pageViewId).tab_id, f.views.get(otherTab.pageViewId).tab_id);
  assert.equal([...f.sessions.values()][0].source, 'www.google.com');
  assert.equal(f.calls.filter(c => c.sql.startsWith('SELECT pg_advisory_xact_lock')).length, 3);
});

test('inactivity creates a new session while duplicate view retries do not create a view or extend session time', async () => {
  const f = fixture(); const first = view();
  await f.lib.recordAnalyticsV2Event(first, context());
  f.advance(29 * 60000); await f.lib.recordAnalyticsV2Event(first, context());
  assert.equal(f.views.size, 1); assert.equal([...f.sessions.values()][0].last_activity_at, start);
  f.advance(2 * 60000); await f.lib.recordAnalyticsV2Event(view(), context());
  assert.equal(f.sessions.size, 2); assert.equal(f.views.size, 2);
});

test('an approved campaign source is captured once and internal navigation cannot replace acquisition', async () => {
  const f = fixture(); const first = view({ campaign: 'linkedin:social:featured' });
  await f.lib.recordAnalyticsV2Event(first, context());
  f.advance(1000);
  await f.lib.recordAnalyticsV2Event(view({ path: '/product', referrer: '', campaign: 'email:email:cv' }), context());
  assert.equal(f.sessions.size, 1);
  assert.equal([...f.sessions.values()][0].source, 'linkedin');
  assert.equal([...f.sessions.values()][0].campaign, 'linkedin:social:featured');
});

test('event UUID retries and another browser claiming the same view cannot inflate events or orphan sessions', async () => {
  const f = fixture(); const first = view(); const click = action(first);
  await f.lib.recordAnalyticsV2Event(first, context());
  await f.lib.recordAnalyticsV2Event(click, context());
  await f.lib.recordAnalyticsV2Event(click, context());
  assert.equal(f.events.size, 1);
  assert.equal((await f.lib.recordAnalyticsV2Event(first, context(otherBrowser))).accepted, false);
  assert.equal((await f.lib.recordAnalyticsV2Event(action(first), context(otherBrowser))).accepted, false);
  assert.equal(f.sessions.size, 1); assert.equal(f.views.size, 1); assert.equal(f.events.size, 1);
});

test('actions require their real parent page, tab, path and a later sequence', async () => {
  const f = fixture(); const first = view();
  assert.equal((await f.lib.recordAnalyticsV2Event(action(first), context())).accepted, false);
  await f.lib.recordAnalyticsV2Event(first, context());
  for (const overrides of [{ tabId: randomUUID() }, { path: '/cv' }, { sequence: 1 }]) {
    assert.equal((await f.lib.recordAnalyticsV2Event(action(first, overrides), context())).accepted, false);
  }
  assert.equal(f.events.size, 0);
});

test('CTA impressions accept published navigation targets and video measurement includes 90 percent', async () => {
  const f = fixture(); const first = view(); await f.lib.recordAnalyticsV2Event(first, context());
  const impression = action(first, { type: 'cta_viewed', target: '/product', control: 'home:work:1' });
  assert.equal((await f.lib.recordAnalyticsV2Event(impression, context())).accepted, true);
  assert.equal((await f.lib.recordAnalyticsV2Event({ ...impression, eventId: randomUUID(), target: '/private' }, context())).accepted, false);
  assert.equal((await f.lib.recordAnalyticsV2Event(action(first, { type: 'video_progress', target: 'video', value: 90 }), context())).accepted, true);
});

test('engagement snapshots are cumulative, bounded by elapsed time, retry-safe and do not keep zero-activity sessions alive', async () => {
  const f = fixture(); const first = view();
  await f.lib.recordAnalyticsV2Event(first, context());
  assert.equal(f.views.get(first.pageViewId).active_ms, null, 'Unknown timing is not zero');
  f.advance(10000);
  const measure = action(first, { type: 'engagement', target: undefined, activeMs: 10000 });
  await f.lib.recordAnalyticsV2Event(measure, context());
  f.advance(60000);
  await f.lib.recordAnalyticsV2Event(measure, context());
  await f.lib.recordAnalyticsV2Event({ ...measure, eventId: randomUUID(), activeMs: 5000 }, context());
  assert.equal(f.views.get(first.pageViewId).active_ms, 10000);
  assert.equal([...f.sessions.values()][0].last_activity_at, start + 10000);
  assert.equal(f.events.size, 0, 'Heartbeats do not inflate deliberate action counts');
  const second = view(); await f.lib.recordAnalyticsV2Event(second, context());
  f.advance(1000);
  await f.lib.recordAnalyticsV2Event(action(second, { type: 'engagement', target: undefined, activeMs: 100000 }), context());
  assert.equal(f.views.get(second.pageViewId).active_ms, 1000, 'An exaggerated client duration is clamped to server elapsed time');
});

test('server-confirmed CV success is browser-owned and idempotent and carries no contact identifier', async () => {
  const f = fixture(); const first = view(); await f.lib.recordAnalyticsV2Event(first, context());
  const conversion = { pageViewId: first.pageViewId, eventId: randomUUID() };
  assert.equal(await f.lib.recordAnalyticsConversion(conversion, otherBrowser), false);
  assert.equal(await f.lib.recordAnalyticsConversion(conversion, browser), true);
  assert.equal(await f.lib.recordAnalyticsConversion(conversion, browser), false);
  assert.equal(f.events.size, 1);
  assert.equal([...f.events.values()][0].event_type, 'cv_request_saved');
  assert.doesNotMatch(JSON.stringify([...f.events.values()]), /email|lead_id|contact_id/);
});

test('the trusted CV handler records submission before success without accepting a foreign browser parent', async () => {
  const f = fixture(); const first = view(); await f.lib.recordAnalyticsV2Event(first, context());
  const submitted = { pageViewId: first.pageViewId, eventId: randomUUID() };
  assert.equal(await f.lib.recordAnalyticsSubmission(submitted, otherBrowser), false);
  assert.equal(await f.lib.recordAnalyticsSubmission(submitted, browser), true);
  assert.equal(await f.lib.recordAnalyticsSubmission(submitted, browser), false);
  await f.lib.recordAnalyticsConversion({ pageViewId: first.pageViewId, eventId: randomUUID() }, browser);
  assert.deepEqual([...f.events.values()].map(e => e.event_type), ['cv_submitted', 'cv_request_saved']);
});

test('public requests cannot spoof either server-owned CV stage even with a valid browser cookie', async () => {
  const f = fixture(), first = view(), route = f.route();
  const response = await route.POST(request(first));
  const cookie = response.cookies.get('ps_visitor');
  const before = f.calls.length;
  for (const type of ['cv_submitted', 'cv_request_saved']) {
    assert.equal((await route.POST(request(action(first, { type }), { cookie: `ps_visitor=${cookie.value}` }))).status, 400);
  }
  assert.equal(f.calls.length, before, 'Rejected stage claims must not touch the database');
  assert.equal(f.events.size, 0);
});

test('trusted CV activity refreshes its owned view and session atomically, while duplicates and foreign claims do not', async () => {
  const f = fixture(); const first = view(); await f.lib.recordAnalyticsV2Event(first, context());
  const parent = f.views.get(first.pageViewId), session = f.sessions.get(parent.session_id);
  f.advance(29 * 60000);
  const submitted = { pageViewId: first.pageViewId, eventId: randomUUID() };
  assert.equal(await f.lib.recordAnalyticsSubmission(submitted, otherBrowser), false);
  assert.equal(session.last_activity_at, start);
  assert.equal(parent.last_observed_at.getTime(), start);
  assert.equal(await f.lib.recordAnalyticsSubmission(submitted, browser), true);
  assert.equal(session.last_activity_at, start + 29 * 60000);
  assert.equal(parent.last_observed_at.getTime(), start + 29 * 60000);
  f.advance(2 * 60000);
  assert.equal(await f.lib.recordAnalyticsConversion({ pageViewId: first.pageViewId, eventId: randomUUID() }, browser), true,
    'A real submission keeps its existing session active for the subsequent server success');
  assert.equal(session.last_activity_at, start + 31 * 60000);
  assert.equal(parent.last_observed_at.getTime(), start + 31 * 60000);
  assert.equal(parent.active_ms, null, 'Observed CV activity does not fabricate engagement duration');
  f.advance(1000);
  assert.equal(await f.lib.recordAnalyticsSubmission(submitted, browser), false);
  assert.equal(session.last_activity_at, start + 31 * 60000, 'A duplicate event cannot prolong the session');
  const statement = f.calls.find(c => c.sql.startsWith('WITH inserted AS (INSERT INTO site_analytics_v2_events'));
  assert.match(statement.sql, /UPDATE site_analytics_v2_views.*FROM inserted.*UPDATE site_analytics_v2_sessions.*FROM inserted/);
  assert.match(statement.sql, /s.browser_hash = \$4/);
});

test('a trusted CV submission across IST midnight keeps its original session and records the new observation time', async () => {
  const f = fixture(); f.advance((12 * 60 + 29) * 60000); // 23:59 IST, 18:29 UTC.
  const first = view(); await f.lib.recordAnalyticsV2Event(first, context());
  f.advance(2 * 60000); // 00:01 IST on the following day.
  assert.equal(await f.lib.recordAnalyticsSubmission({ pageViewId: first.pageViewId, eventId: randomUUID() }, browser), true);
  assert.equal(f.sessions.size, 1);
  assert.equal(f.views.get(first.pageViewId).last_observed_at.toISOString(), '2026-11-06T18:31:00.000Z');
  assert.equal([...f.sessions.values()][0].last_activity_at, Date.parse('2026-11-06T18:31:00.000Z'));
});

test('trusted CV submissions share a 30-per-15-minute browser limit across tabs and leave rejected clocks untouched', async () => {
  const f = fixture(), first = view(), second = view({ path: '/cv' });
  await f.lib.recordAnalyticsV2Event(first, context());
  await f.lib.recordAnalyticsV2Event(second, context());
  for (let i = 0; i < 30; i++) {
    assert.equal(await f.lib.recordAnalyticsSubmission({ pageViewId: (i % 2 ? second : first).pageViewId, eventId: randomUUID() }, browser), true);
  }
  f.advance(60000);
  const parent = f.views.get(second.pageViewId), session = f.sessions.get(parent.session_id);
  assert.equal(await f.lib.recordAnalyticsSubmission({ pageViewId: second.pageViewId, eventId: randomUUID() }, browser), false);
  assert.equal(f.events.size, 30);
  assert.equal(parent.last_observed_at.getTime(), start);
  assert.equal(session.last_activity_at, start);
  assert.equal(await f.lib.recordAnalyticsConversion({ pageViewId: second.pageViewId, eventId: randomUUID() }, browser), true,
    'The submission limit must not suppress the saved event from an already accepted CV request');
  const other = view(); await f.lib.recordAnalyticsV2Event(other, context(otherBrowser));
  assert.equal(await f.lib.recordAnalyticsSubmission({ pageViewId: other.pageViewId, eventId: randomUUID() }, otherBrowser), true,
    'One browser cannot consume another browser’s submission allowance');
  f.advance(15 * 60000);
  assert.equal(await f.lib.recordAnalyticsSubmission({ pageViewId: second.pageViewId, eventId: randomUUID() }, browser), true,
    'Expired submission activity releases the rolling-window allowance');
});

test('both trusted CV event types respect the shared 5000-event rolling daily cap', async () => {
  for (const method of ['recordAnalyticsSubmission', 'recordAnalyticsConversion']) {
    const f = fixture(), first = view(); await f.lib.recordAnalyticsV2Event(first, context());
    const parent = f.views.get(first.pageViewId), session = f.sessions.get(parent.session_id);
    for (let i = 0; i < 4999; i++) f.events.set(String(i), { event_id: String(i), session_id: session.id,
      page_view_id: first.pageViewId, event_type: 'navigation_clicked', occurred_at: new Date(start) });
    assert.equal(await f.lib[method]({ pageViewId: first.pageViewId, eventId: randomUUID() }, browser), true);
    f.advance(1000);
    assert.equal(await f.lib[method]({ pageViewId: first.pageViewId, eventId: randomUUID() }, browser), false);
    assert.equal(f.events.size, 5000);
    assert.equal(session.last_activity_at, start);
    assert.equal(parent.last_observed_at.getTime(), start);
    f.advance(86400000);
    const next = view(); await f.lib.recordAnalyticsV2Event(next, context());
    assert.equal(await f.lib[method]({ pageViewId: next.pageViewId, eventId: randomUUID() }, browser), true,
      'Old event rows must not consume the next day’s allowance');
  }
});

test('trusted event budgets are checked under the same browser transaction lock as public ingestion', async () => {
  const f = fixture(), first = view(); await f.lib.recordAnalyticsV2Event(first, context());
  const begin = f.calls.length;
  await f.lib.recordAnalyticsSubmission({ pageViewId: first.pageViewId, eventId: randomUUID() }, browser);
  const calls = f.calls.slice(begin);
  const lock = calls.findIndex(call => call.sql.startsWith('SELECT pg_advisory_xact_lock'));
  const insert = calls.findIndex(call => call.sql.startsWith('WITH inserted AS'));
  assert.equal(calls[0].sql, 'BEGIN');
  assert.ok(lock > 0 && insert > lock, 'A new SQL snapshot reads the budget only after the browser lock is acquired');
  assert.equal(calls[lock].values.length, 1);
  assert.equal(calls[lock].values[0], browser);
  assert.match(calls[insert].sql, /owner.browser_hash = \$4 AND budget.occurred_at >= NOW\(\) - INTERVAL '24 hours'\) < 5000/);
  assert.match(calls[insert].sql, /\$2::TEXT <> 'cv_submitted' OR.*submitted.event_type = 'cv_submitted'.*INTERVAL '15 minutes'\) < 30/);
  assert.equal(calls.at(-2).sql, 'COMMIT');
  assert.equal(calls.at(-1).sql, 'RELEASE');
});

test('valid v2 page view sets identity only after commit; actions require the established cookie', async () => {
  const f = fixture(), route = f.route(); const first = view();
  assert.equal((await route.POST(request(action(first)))).status, 204);
  assert.equal(f.calls.length, 0);
  const response = await route.POST(request(first));
  assert.equal(response.status, 204);
  for (const attribute of [/ps_visitor=/, /HttpOnly/i, /Secure/i, /SameSite=lax/i]) assert.match(response.headers.get('set-cookie'), attribute);
  const cookie = response.cookies.get('ps_visitor');
  const next = await route.POST(request(action(first), { cookie: `ps_visitor=${cookie.value}` }));
  assert.equal(next.status, 204); assert.equal(next.headers.get('set-cookie'), null);
  assert.equal(f.events.size, 1);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('v2 production collection excludes privacy opt-outs, development and preview requests', async () => {
  for (const env of [{ NODE_ENV: 'development' }, { VERCEL_ENV: 'preview' }]) {
    const f = fixture({ env }); assert.equal((await f.route().POST(request(view()))).status, 204); assert.equal(f.calls.length, 0);
  }
  for (const headers of [{ cookie: 'ps_analytics_disabled=1' }, { dnt: '1' }, { 'sec-gpc': '1' }, { 'user-agent': 'Googlebot' }]) {
    const f = fixture(); assert.equal((await f.route().POST(request(view(), headers))).status, 204); assert.equal(f.calls.length, 0);
  }
});

test('v2 rejects cross-origin, oversized, forged conversion and private-property payloads without storage', async () => {
  const f = fixture(), route = f.route();
  assert.equal((await route.POST(request(view(), { origin: 'https://evil.example' }))).status, 403);
  assert.equal((await route.POST(request(view(), { 'content-length': '17000' }))).status, 413);
  assert.equal((await route.POST(request({ ...view(), email: 'private@example.com' }))).status, 400);
  assert.equal((await route.POST(request(action(view(), { type: 'cv_request_saved' })))).status, 400);
  assert.equal(f.calls.length, 0);
});

test('v2 storage failures stay private and do not set a measurement cookie', async () => {
  const f = fixture({ fail: true }); const response = await f.route().POST(request(view()));
  assert.equal(response.status, 503); assert.equal(response.headers.get('set-cookie'), null);
  assert.doesNotMatch(await response.text(), /postgres|credential|192\.0\.2/);
});

test('retained records and bound SQL values omit raw network details, personal text and query strings', async () => {
  const f = fixture(); const first = view({ path: '/product?email=private@example.com#section' });
  await f.lib.recordAnalyticsV2Event(first, context());
  assert.equal([...f.views.values()][0].path, '/product');
  assert.equal([...f.sessions.values()][0].source, 'www.google.com');
  for (const call of f.calls) {
    assert.doesNotMatch(call.sql, new RegExp(first.eventId));
    assert.doesNotMatch(JSON.stringify(call.values), /192\.0\.2\.10|Safari|private@example|search\?q/);
  }
  assert.ok(f.calls.some(c => /DELETE.*180 days/.test(c.sql)));
  const schema = f.calls.filter(c => c.sql.startsWith('CREATE TABLE')).map(c => c.sql).join('\n');
  assert.doesNotMatch(schema, /\b(?:email|ip_address|user_agent|contact_id)\b/);
});
