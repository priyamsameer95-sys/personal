const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const ts = require('typescript');
const { NextRequest } = require('next/server');

const root = path.join(__dirname, '..');
const fixedNow = Date.parse('2026-10-20T11:00:00.000Z');
class TestDate extends Date {
  constructor(...args) { super(...(args.length ? args : [fixedNow])); }
  static now() { return fixedNow; }
}

function fixture(stubs = {}, environment = {}, globals = {}) {
  const cache = new Map();
  const env = { NODE_ENV: 'production', POSTGRES_URL: 'postgres://test-storage', ADMIN_PASSWORD: 'test-private-password', ...environment };
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    if (filename.endsWith('.json')) return JSON.parse(readFileSync(path.join(root, filename), 'utf8'));
    const module = { exports: {} };
    const source = ts.transpileModule(readFileSync(path.join(root, filename), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    function localRequire(id) {
      if (Object.hasOwn(stubs, id)) return stubs[id];
      if (id.endsWith('.css')) return {};
      if (id.startsWith('@/')) return load(id.slice(2) + (id.endsWith('.json') ? '' : '.ts'));
      if (id.startsWith('.')) return load(path.posix.normalize(path.posix.join(path.posix.dirname(filename), id)) + (id.endsWith('.json') ? '' : '.ts'));
      return require(id);
    }
    vm.runInNewContext(source, {
      module, exports: module.exports, require: localRequire, process: { env },
      Buffer, URL, URLSearchParams, Date: TestDate, TextEncoder, TextDecoder, Uint8Array,
      crypto: webcrypto, Headers, Request, Response, AbortSignal,
      console: { error() {}, warn() {}, log() {} },
      ...globals,
    }, { filename });
    cache.set(filename, module.exports);
    return module.exports;
  }
  return { load, environment: env };
}

function request(body, { headers = {}, raw, url = 'https://portfolio.example/api/analytics', method = 'POST', token } = {}) {
  return new NextRequest(url, {
    method,
    headers: {
      host: 'portfolio.example', origin: 'https://portfolio.example', 'content-type': 'application/json',
      'x-forwarded-for': '192.0.2.10', 'user-agent': 'Mozilla/5.0 (iPhone) Safari/605.1',
      ...(token ? { cookie: `admin_session=${token}` } : {}), ...headers,
    },
    ...(method === 'GET' ? {} : { body: raw === undefined ? JSON.stringify(body) : raw }),
  });
}

const event = () => ({ eventId: 'da6801a0-dbae-4197-8d9a-ae9e9d354ae6', path: '/product', referrer: 'https://www.google.com/search?q=private-email' });

test('shared action contract allows only the finite vocabulary and published navigation callback', () => {
  const { ANALYTICS_EVENT_TYPES, ANALYTICS_INTERACTION_TARGETS, normalizeAnalyticsAction } = fixture().load('lib/analytics-events.ts');
  const paths = value => value === '/cv' ? value : null;
  assert.equal(normalizeAnalyticsAction(undefined, undefined, paths).type, 'page_view');
  for (const type of ANALYTICS_EVENT_TYPES) {
    const action = normalizeAnalyticsAction(type, type === 'page_view' ? undefined : type === 'navigation_clicked' ? '/cv' : 'cv', paths);
    assert.equal(action.type, type);
  }
  for (const target of ANALYTICS_INTERACTION_TARGETS) assert.equal(normalizeAnalyticsAction('outbound_clicked', target, paths).target, target);
  for (const [type, target] of [[null, undefined], ['invented', 'cv'], ['page_view', null], ['navigation_clicked', '/private'], ['contact_clicked', 'reader@example.com'], ['filter_changed', 'free text'], ['media_opened', null]]) {
    assert.equal(normalizeAnalyticsAction(type, target, paths), null);
  }
});

test('analytics keeps only real public routes and removes query strings and fragments', () => {
  const { normalizeAnalyticsPath } = fixture({ '@/lib/db': () => { throw Error('Unexpected database read'); } }).load('lib/site-analytics.ts');
  for (const publicPath of ['/', '/product', '/cv', '/art', '/github', '/blog']) assert.equal(normalizeAnalyticsPath(publicPath), publicPath);
  assert.equal(normalizeAnalyticsPath('/product?email=private@example.com#case'), '/product');
  assert.equal(normalizeAnalyticsPath('/product/absolute-silkroute-marketplace?secret=value'), '/product/absolute-silkroute-marketplace');
  for (const invalid of [null, [], '//other.example', 'https://other.example/product', '/minforyam/analytics', '/api/admin/analytics', '/api/cv-download', '/cv/private@example.com.pdf', '/private@example.com', '/missing-page', '/product/unknown-sensitive-record', '/with space', '/product\\anything']) {
    assert.equal(normalizeAnalyticsPath(invalid), null, String(invalid));
  }
});

test('analytics retains referrer hostnames only and excludes credentials and non-web URLs', () => {
  const { normalizeReferrer } = fixture({ '@/lib/db': () => { throw Error('Unexpected database read'); } }).load('lib/site-analytics.ts');
  assert.equal(normalizeReferrer('https://www.google.com/search?q=someone@example.com#private'), 'google.com');
  assert.equal(normalizeReferrer('https://www.priyamsameer.com/product?email=private'), 'Direct / internal');
  for (const invalid of ['', null, 'not a URL', 'javascript:alert(1)', 'mailto:private@example.com', 'https://name:secret@example.com/path']) assert.equal(normalizeReferrer(invalid), 'Direct / internal');
});

test('visitor estimates rotate daily in India time without retaining raw visitor identifiers', () => {
  const { analyticsDay, analyticsVisitorHash } = fixture({ '@/lib/db': () => { throw Error('Unexpected database read'); } }).load('lib/site-analytics.ts');
  assert.equal(analyticsDay(new Date('2026-10-19T18:29:59.000Z')), '2026-10-19');
  assert.equal(analyticsDay(new Date('2026-10-19T18:30:00.000Z')), '2026-10-20');
  const a = analyticsVisitorHash('192.0.2.10', 'Mozilla/5.0 (iPhone) Safari/605.1', new Date('2026-10-20T00:00:00.000Z'));
  const b = analyticsVisitorHash('192.0.2.10', 'Mozilla/5.0 (iPhone) Safari/605.1', new Date('2026-10-21T00:00:00.000Z'));
  assert.match(a, /^[a-f0-9]{64}$/);
  assert.notEqual(a, b);
  assert.doesNotMatch(a, /192\.0\.2|Mozilla|test-private-password/);
  assert.equal(a, analyticsVisitorHash('192.0.2.10', 'Mozilla/5.0 (iPhone) Safari/605.1', new Date('2026-10-20T10:00:00.000Z')));
});

function publicRouteFixture({ authenticated = false, storageFailure = false } = {}) {
  const writes = [];
  const f = fixture({
    '@/lib/db': () => { throw Error('The public handler must use the analytics boundary'); },
    '@/lib/auth': {
      isAdminAuthenticated: async () => authenticated,
      getClientIp: req => req.headers.get('x-forwarded-for') || '127.0.0.1',
    },
  });
  const actual = f.load('lib/site-analytics.ts');
  const route = fixture({
    '@/lib/site-analytics': {
      ...actual,
      recordAnalyticsEvent: async (...args) => {
        writes.push(args);
        if (storageFailure) throw Error('postgres://private-connection-detail');
      },
    },
    '@/lib/auth': {
      isAdminAuthenticated: async () => authenticated,
      getClientIp: req => req.headers.get('x-forwarded-for') || '127.0.0.1',
    },
  }).load('app/api/analytics/route.ts');
  return { route, writes };
}

test('public analytics accepts a valid event without exposing any stored analytics', async () => {
  const f = publicRouteFixture();
  const response = await f.route.POST(request(event()));
  assert.ok(response.status >= 200 && response.status < 300);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(f.writes.length, 1);
  assert.equal(f.route.GET, undefined, 'The public endpoint provides no read operation');
  assert.doesNotMatch(await response.text(), /192\.0\.2|private-email|visitor|email|test-private-password/);
});

test('public ingestion rejects cross-origin and invalid payloads before calling storage', async () => {
  const f = publicRouteFixture();
  const cases = [
    [request(event(), { headers: { origin: 'https://other.example' } }), 403],
    [request(event(), { headers: { origin: '' } }), 403],
    [request(event(), { headers: { 'sec-fetch-site': 'cross-site' } }), 403],
    [request(event(), { headers: { 'content-type': 'text/plain' } }), 415],
    [request(null), 400], [request([]), 400],
    [request({ ...event(), eventId: 'not-a-uuid' }), 400],
    [request({ ...event(), email: 'private@example.com' }), 400],
    [request({ ...event(), type: 'hovered', target: 'work' }), 400],
    [request({ ...event(), type: 'page_view', target: 'cv' }), 400],
    [request({ ...event(), type: 'email_copied', target: 'reader@example.com' }), 400],
    [request({ ...event(), type: 'outbound_clicked', target: 'https://private.example/?email=reader@example.com' }), 400],
    [request({ ...event(), type: 'navigation_clicked', target: '/minforyam/analytics' }), 400],
    [request({ ...event(), type: 'navigation_clicked', target: '/product/not-published' }), 400],
    [request(event(), { raw: '{' }), 400],
    [request(event(), { raw: 'x'.repeat(5000) }), 413],
    [request(event(), { headers: { 'content-length': '5000' } }), 413],
  ];
  for (const [req, expected] of cases) {
    const response = await f.route.POST(req);
    assert.equal(response.status, expected);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal(f.writes.length, 0);
  for (const path of ['/minforyam/analytics', '/unpublished/secret']) {
    assert.equal((await f.route.POST(request({ ...event(), path }))).status, 204);
  }
  assert.equal(f.writes.length, 0, 'A rejected non-public path never touches analytics storage');
});

test('public ingestion accepts finite interaction labels and normalizes public navigation targets', async () => {
  const f = publicRouteFixture();
  for (const [type, target] of [
    ['cv_opened', 'cv'], ['cv_download_clicked', 'cv'], ['contact_opened', 'menu'],
    ['contact_clicked', 'email'], ['email_copied', 'email'], ['media_opened', 'image'],
    ['video_started', 'video'], ['filter_changed', 'filter'], ['menu_opened', 'menu'],
    ['outbound_clicked', 'company_website'], ['navigation_clicked', '/cv?email=reader@example.com#download'],
  ]) {
    assert.equal((await f.route.POST(request({ ...event(), type, target }))).status, 204);
  }
  assert.equal(f.writes.length, 11);
  const navigation = f.writes.at(-1)[0];
  assert.equal(navigation.target, '/cv');
  assert.equal(navigation.type, 'navigation_clicked');
  assert.doesNotMatch(JSON.stringify(f.writes), /reader@example\.com/);
});

test('ingestion honors the public host and proxy HTTPS while rejecting a changed authority', async () => {
  const f = publicRouteFixture();
  const publicProxy = request(event(), { url: 'http://internal.vercel.app/api/analytics', headers: {
    host: 'www.priyamsameer.com', origin: 'https://www.priyamsameer.com', 'x-forwarded-proto': 'https',
  } });
  assert.ok((await f.route.POST(publicProxy)).status < 300);
  const local = request(event(), { url: 'http://localhost:3000/api/analytics', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' } });
  assert.ok((await f.route.POST(local)).status < 300);
  const before = f.writes.length;
  for (const headers of [
    { host: 'portfolio.example', origin: 'http://portfolio.example' },
    { host: 'portfolio.example', origin: 'https://portfolio.example', 'x-forwarded-proto': 'https,http' },
    { host: 'portfolio.example@other.example', origin: 'https://other.example' },
    { host: '', origin: 'https://portfolio.example' },
  ]) assert.equal((await f.route.POST(request(event(), { headers }))).status, 403);
  assert.equal(f.writes.length, before);
});

test('owner visits, opt-out headers, bots and prefetch requests produce no analytics event', async () => {
  const owner = publicRouteFixture({ authenticated: true });
  assert.ok((await owner.route.POST(request(event()))).status < 300);
  assert.equal(owner.writes.length, 0);
  const f = publicRouteFixture();
  for (const headers of [{ dnt: '1' }, { 'sec-gpc': '1' }, { 'user-agent': 'Googlebot/2.1' }, { purpose: 'prefetch' }, { 'next-router-prefetch': '1' }]) {
    const response = await f.route.POST(request(event(), { headers }));
    assert.ok(response.status >= 200 && response.status < 300);
  }
  assert.equal(f.writes.length, 0);
});

test('analytics errors are contained and never expose database credentials', async () => {
  const f = publicRouteFixture({ storageFailure: true });
  const response = await f.route.POST(request(event()));
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(await response.text(), /postgres|private-connection-detail|192\.0\.2/);
});

test('private analytics requires handler authentication before any private query', async () => {
  let authenticated = false;
  const reads = [];
  const f = fixture({
    '@/lib/auth': { isAdminAuthenticated: async () => authenticated },
    '@/lib/site-analytics': {
      normalizeAnalyticsRange: value => value === '7' ? 7 : value === '90' ? 90 : 30,
      getSiteAnalytics: async days => { reads.push(days); return { days, summary: { pageViews: 1 } }; },
    },
  });
  const route = f.load('app/api/admin/analytics/route.ts');
  const denied = await route.GET(request(undefined, { method: 'GET', url: 'https://portfolio.example/api/admin/analytics' }));
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get('cache-control'), 'no-store');
  assert.match(denied.headers.get('x-robots-tag'), /noindex/);
  assert.equal(reads.length, 0);
  authenticated = true;
  const allowed = await route.GET(request(undefined, { method: 'GET', url: 'https://portfolio.example/api/admin/analytics?days=7' }));
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get('cache-control'), 'no-store');
  assert.match(allowed.headers.get('x-robots-tag'), /noindex/);
  assert.deepEqual(reads, [7]);
});

test('middleware keeps hosted analytics and CV-interest screens unavailable even to an authenticated owner', async () => {
  let authenticated = false;
  const { middleware, config } = fixture({ './lib/auth': { isAdminAuthenticated: async () => authenticated } }).load('middleware.ts');
  assert.ok(config.matcher.includes('/minforyam/:path*'));
  assert.ok(config.matcher.includes('/api/admin/:path*'));
  const apiRequest = request(undefined, { method: 'GET', url: 'https://portfolio.example/api/admin/analytics' });
  const denied = await middleware(apiRequest);
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get('cache-control'), 'no-store');
  assert.match(denied.headers.get('x-robots-tag'), /noindex/);
  for (const loggedIn of [false, true]) {
    authenticated = loggedIn;
    for (const pathname of ['/minforyam/analytics', '/minforyam/analytics/', '/minforyam/analytics/private', '/minforyam/cv-leads', '/minforyam/cv-leads/']) {
      const response = await middleware(request(undefined, { method: 'GET', url: `https://portfolio.example${pathname}` }));
      assert.equal(response.status, 404);
      assert.equal(response.headers.get('location'), null);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.match(response.headers.get('x-robots-tag'), /noindex/);
    }
  }
  const allowed = await middleware(apiRequest);
  assert.equal(allowed.headers.get('x-middleware-next'), '1', 'The local viewer still has an owner-authenticated transport');
});

test('private login redirects preserve the browser-facing host and HTTPS through a proxy', async () => {
  const { middleware } = fixture({ './lib/auth': { isAdminAuthenticated: async () => false } }).load('middleware.ts');
  for (const [internal, headers, expectedOrigin] of [
    ['http://internal.vercel.app/minforyam', { host: 'www.priyamsameer.com', 'x-forwarded-proto': 'https' }, 'https://www.priyamsameer.com'],
    ['http://localhost:3000/minforyam', { host: '127.0.0.1:3000' }, 'http://127.0.0.1:3000'],
  ]) {
    const response = await middleware(request(undefined, { method: 'GET', url: internal, headers }));
    assert.equal(response.status, 307);
    const location = new URL(response.headers.get('location'));
    assert.equal(location.origin, expectedOrigin);
    assert.equal(location.pathname, '/minforyam/login');
    assert.equal(location.searchParams.get('next'), null);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
  }
});

test('hosted analytics page independently returns not found without reading private data', async () => {
  const reads = [];
  const page = fixture({
    'next/link': () => null,
    'next/headers': { cookies: () => ({ get: () => ({ value: 'tampered-token' }) }) },
    'next/navigation': { notFound: () => { throw new Error('not-found'); } },
    '@/lib/auth': { SESSION_COOKIE_NAME: 'admin_session', verifySessionToken: async () => false },
    '@/lib/site-analytics': { getSiteAnalytics: async () => { reads.push(true); throw Error('A denied page read private records'); } },
  }).load('app/minforyam/analytics/page.tsx');
  assert.equal(page.dynamic, 'force-dynamic');
  assert.equal(page.metadata.robots.index, false);
  assert.equal(page.metadata.robots.follow, false);
  await assert.rejects(async () => page.default(), /not-found/);
  assert.equal(reads.length, 0);
});

test('authenticated analytics failures stay private and return a retryable status', async () => {
  const route = fixture({
    '@/lib/auth': { isAdminAuthenticated: async () => true },
    '@/lib/site-analytics': { normalizeAnalyticsRange: () => 90, getSiteAnalytics: async () => { throw Error('postgres://password@private-host'); } },
  }).load('app/api/admin/analytics/route.ts');
  const response = await route.GET(request(undefined, { method: 'GET', url: 'https://portfolio.example/api/admin/analytics?days=90' }));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('x-robots-tag'), /noindex/);
  assert.doesNotMatch(await response.text(), /postgres|password|private-host/);
});

function storageFixture({ fail = false, configured = true } = {}) {
  const calls = [], events = new Map(), interactions = new Map();
  const db = async (strings, ...values) => {
    const sql = strings.join('?').replace(/\s+/g, ' ').trim();
    calls.push({ sql, values });
    if (fail) throw Error('postgres://private-password@private-host');
    if (sql.startsWith('CREATE') || sql.startsWith('DELETE') || sql.startsWith('INSERT INTO site_analytics_settings')) return { rows: [] };
    if (sql.startsWith('INSERT INTO site_page_views')) {
      const [eventId, path, referrer, visitor, device] = values;
      const withinBudget = Array.from(events.values()).filter(row => row.visitor === visitor).length < 500;
      if (!events.has(eventId) && withinBudget) events.set(eventId, { path, referrer, visitor, device });
      else if (!sql.includes('ON CONFLICT (event_id) DO NOTHING')) throw Error('Duplicate event');
      return { rows: [] };
    }
    if (sql.startsWith('INSERT INTO site_interaction_events')) {
      const [eventId, path, type, target, visitor] = values;
      const withinBudget = Array.from(interactions.values()).filter(row => row.visitor === visitor).length < 1000;
      if (!interactions.has(eventId) && withinBudget) interactions.set(eventId, { path, type, target, visitor });
      else if (!sql.includes('ON CONFLICT (event_id) DO NOTHING')) throw Error('Duplicate event');
      return { rows: [] };
    }
    if (sql.startsWith('SELECT type, id, slug')) return { rows: [] };
    throw Error(`Unexpected query: ${sql}`);
  };
  const f = fixture({ '@/lib/db': db }, configured ? {} : { POSTGRES_URL: undefined, ADMIN_PASSWORD: undefined, ANALYTICS_SECRET: undefined });
  return { ...f, lib: f.load('lib/site-analytics.ts'), calls, events, interactions };
}

test('page-view storage is idempotent and writes only minimized, parameterized fields', async () => {
  const f = storageFixture();
  const submitted = { ...event(), path: '/product?email=private@example.com#draft', referrer: 'https://www.google.com/search?q=private@example.com' };
  const context = { ip: '192.0.2.10', userAgent: 'Mozilla/5.0 (iPhone) Safari/605.1', country: 'IN' };
  await f.lib.recordPageView(submitted, context);
  await f.lib.recordPageView(submitted, context);
  assert.equal(f.events.size, 1);
  const row = f.events.get(submitted.eventId);
  assert.deepEqual(row, { path: '/product', referrer: 'google.com', visitor: f.lib.analyticsVisitorHash(context.ip, context.userAgent), device: 'Phone' });
  for (const { sql, values } of f.calls) {
    assert.ok(!sql.includes(submitted.eventId), 'Event input stays a bound parameter');
    assert.ok(!values.includes(context.ip), 'Raw IP is not retained');
    assert.ok(!values.includes(context.userAgent), 'Full user agent is not retained');
    assert.doesNotMatch(JSON.stringify(values), /private@example\.com|#draft|private-password|192\.0\.2\.10/);
  }
  const schema = f.calls.filter(call => call.sql.startsWith('CREATE TABLE')).map(call => call.sql).join('\n');
  assert.doesNotMatch(schema, /\b(?:email|user_agent|ip_address|country)\b/);
  assert.ok(f.calls.some(call => /DELETE FROM site_page_views.*180 days/.test(call.sql)), 'Daily estimates have a bounded retention period');
  const before = f.calls.length;
  await f.lib.recordPageView({ ...event(), path: '/minforyam/analytics' }, context);
  await f.lib.recordPageView({ ...event(), eventId: 'not-a-uuid' }, context);
  assert.equal(f.calls.length, before);
});

test('analytics storage fails closed without configuration and conceals database details', async () => {
  const absent = storageFixture({ configured: false });
  await assert.rejects(absent.lib.recordPageView(event(), { ip: '192.0.2.10', userAgent: 'Safari' }), /temporarily unavailable/);
  assert.equal(absent.calls.length, 0);
  const failed = storageFixture({ fail: true });
  await assert.rejects(failed.lib.recordPageView(event(), { ip: '192.0.2.10', userAgent: 'Safari' }), error => {
    assert.doesNotMatch(error.message, /postgres|private-password|private-host/);
    return true;
  });
});

test('interaction storage is separate, idempotent, capped and excludes private targets or raw visitor identifiers', async () => {
  const f = storageFixture();
  const context = { ip: '192.0.2.10', userAgent: 'Mozilla/5.0 (iPhone) Safari/605.1' };
  const clicked = { ...event(), type: 'navigation_clicked', target: '/cv?email=private@example.com#download' };
  await f.lib.recordAnalyticsEvent(clicked, context);
  await f.lib.recordAnalyticsEvent(clicked, context);
  assert.equal(f.interactions.size, 1);
  assert.equal(f.events.size, 0, 'Interactions must not inflate page views or visitor-day estimates');
  assert.deepEqual(f.interactions.get(clicked.eventId), { path: '/product', type: 'navigation_clicked', target: '/cv', visitor: f.lib.analyticsVisitorHash(context.ip, context.userAgent) });
  const interactionInsert = f.calls.find(call => call.sql.startsWith('INSERT INTO site_interaction_events'));
  assert.match(interactionInsert.sql, /< 1000 ON CONFLICT \(event_id\) DO NOTHING/);
  assert.match(interactionInsert.sql, /visitor_hash = \? AND occurred_at >= \(\?::TIMESTAMP AT TIME ZONE 'Asia\/Kolkata'\)/);
  assert.ok(f.calls.some(call => /DELETE FROM site_interaction_events.*180 days/.test(call.sql)));
  for (const { sql, values } of f.calls) {
    assert.ok(!sql.includes(clicked.eventId));
    assert.doesNotMatch(JSON.stringify(values), /private@example\.com|192\.0\.2\.10|Mozilla|Safari/);
  }
  for (const [type, target] of [['email_copied', 'private@example.com'], ['navigation_clicked', '/minforyam'], ['outbound_clicked', 'https://private.example'], ['page_view', 'cv'], ['made_up', 'work']]) {
    await f.lib.recordAnalyticsEvent({ ...event(), type, target }, context);
  }
  assert.equal(f.interactions.size, 1);
  assert.equal(f.events.size, 0);
  for (let index = 1; index <= 1001; index++) {
    await f.lib.recordAnalyticsEvent({ ...event(), eventId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, type: 'contact_clicked', target: 'email' }, context);
  }
  assert.equal(f.interactions.size, 1000, 'A daily visitor budget caps interaction writes independently');
  await f.lib.recordAnalyticsEvent({ ...event(), type: 'page_view' }, context);
  assert.equal(f.events.size, 1, 'Legacy page-view storage still operates independently of interaction budget');
});

test('published CMS pages resolve to their public canonical URLs while unpublished guesses are never stored', async () => {
  const calls = [], events = [];
  const f = fixture({ '@/lib/db': async (strings, ...values) => {
    const sql = strings.join('?').replace(/\s+/g, ' ').trim();
    calls.push({ sql, values });
    if (sql.startsWith('SELECT type, id, slug')) {
      assert.match(sql, /WHERE status = 'published'/);
      return { rows: [{ type: 'blog', id: '7eeef69d-8e5a-4d32-9a55-c6ee2a6e4f6f', slug: 'product-decisions' }, { type: 'art', id: 'f04d39c9-a136-4d97-a373-e326f8663325', slug: 'landscape-study' }, { type: 'blog', id: '0a9c6255-3231-4bb3-8c79-c3c073f6d1c0', slug: 'private@example.com' }, { type: 'work', id: 'd73463a4-f493-4fd6-8b18-feb9b3c57b1a', slug: 'moneylion-wow-strategy' }] };
    }
    if (sql.startsWith('INSERT INTO site_page_views')) events.push(values);
    return { rows: [] };
  } }).load('lib/site-analytics.ts');
  assert.equal(await f.resolveAnalyticsPath('/blog/7eeef69d-8e5a-4d32-9a55-c6ee2a6e4f6f?email=private@example.com'), '/blog/product-decisions');
  assert.equal(await f.resolveAnalyticsPath('/art/landscape-study'), '/art/landscape-study');
  assert.equal(await f.resolveAnalyticsPath('/blog/unpublished-private-note'), null);
  assert.equal(await f.resolveAnalyticsPath('/blog/private@example.com'), null);
  assert.equal(await f.resolveAnalyticsPath('/blog/0a9c6255-3231-4bb3-8c79-c3c073f6d1c0'), null, 'A safe ID alias cannot cause an unsafe canonical slug to be stored');
  assert.equal(await f.resolveAnalyticsPath('/product/moneylion-wow-strategy'), null, 'An old published record cannot restore a retired public route');
  assert.equal(calls.filter(call => call.sql.startsWith('SELECT type, id, slug')).length, 1, 'Published identifiers are cached briefly rather than querying arbitrary guessed slugs');
  const context = { ip: '192.0.2.10', userAgent: 'Safari' };
  await f.recordAnalyticsEvent({ ...event(), path: '/blog/product-decisions' }, context);
  await f.recordAnalyticsEvent({ ...event(), path: '/blog/unpublished-private-note' }, context);
  assert.equal(events.length, 1);
  assert.equal(events[0][1], '/blog/product-decisions');
  assert.doesNotMatch(JSON.stringify(events), /unpublished-private-note|private@example\.com/);
});

test('analytics reports a complete IST date range without inventing historical request events', async () => {
  const calls = [], limits = [];
  const lead = { email: 'reader@example.com', first_requested_at: '2026-10-10T11:00:00Z', last_requested_at: '2026-10-20T11:00:00Z', download_count: 9, last_source_path: '/cv' };
  const db = async (strings, ...values) => {
    const sql = strings.join('?').replace(/\s+/g, ' ').trim();
    calls.push({ sql, values });
    if (sql.startsWith('CREATE') || sql.startsWith('INSERT INTO site_analytics_settings')) return { rows: [] };
    if (sql.startsWith('SELECT enabled_at')) return { rows: [{ enabled_at: '2026-10-20T10:00:00Z' }] };
    if (sql.includes('FROM cv_download_leads')) return { rows: [{ requests: 9 }] };
    if (sql.includes('FROM cv_download_events')) return { rows: [{ day: '2026-10-19', requests: 2 }, { day: '2026-10-20', requests: 1 }] };
    if (sql.includes('FROM site_interaction_events')) {
      if (sql.startsWith('SELECT TO_CHAR')) return { rows: [{ day: '2026-10-20', clicks: 4 }] };
      if (sql.startsWith('SELECT event_type')) return { rows: [{ type: 'cv_opened', target: 'cv', count: 4 }] };
      if (sql.startsWith('SELECT path')) return { rows: [{ path: '/cv', count: 4 }] };
      return { rows: [{ clicks: 4 }] };
    }
    if (sql.startsWith('SELECT TO_CHAR')) return { rows: [{ day: '2026-10-19', views: 5, visitors: 2 }, { day: '2026-10-20', views: 7, visitors: 3 }] };
    if (sql.startsWith('SELECT path')) return { rows: [{ path: '/product', views: 12, visitors: 5 }] };
    if (sql.startsWith('SELECT referrer')) return { rows: [{ source: 'google.com', visits: 12 }] };
    if (sql.startsWith('SELECT device')) return { rows: [{ device: 'Phone', visits: 12 }] };
    if (sql.startsWith('SELECT COUNT')) return { rows: [{ views: 12, visitors: 5 }] };
    throw Error(`Unexpected query: ${sql}`);
  };
  const lib = fixture({
    '@/lib/db': db,
    '@/lib/cv-leads': { ensureCVLeadSchema: async () => {}, listCVInterests: async limit => { limits.push(limit); return { leads: [lead], total: 1 }; } },
  }).load('lib/site-analytics.ts');
  const report = await lib.getSiteAnalytics(7);
  assert.equal(report.days, 7);
  assert.equal(report.startDate, '2026-10-14');
  assert.equal(report.endDate, '2026-10-20');
  assert.equal(report.daily.length, 7);
  assert.equal(report.daily[0].pageViews, 0);
  assert.equal(report.pageViews, 12);
  assert.equal(report.visitors, 5);
  assert.equal(report.clicks, 4);
  assert.equal(report.daily.at(-1).clicks, 4);
  assert.equal(report.daily[0].clicks, 0);
  assert.equal(report.interactions[0].type, 'cv_opened');
  assert.equal(report.interactions[0].target, 'cv');
  assert.equal(report.pageInteractions[0].path, '/cv');
  assert.equal(report.cvRequests, 3, 'Only new dated request events count in the period');
  assert.equal(report.cvRequestsAllTime, 9, 'Historic lead counts remain visible separately');
  assert.equal(report.cvContacts, 1);
  assert.equal(report.trackingStartedAt, '2026-10-20T10:00:00.000Z');
  assert.equal(report.cvLeads[0].email, lead.email);
  assert.deepEqual(limits, [200]);
  assert.deepEqual(Array.from(report.countries), [], 'No location is inferred without a configured source');
  assert.ok(calls.some(call => call.sql.includes('GROUP BY path ORDER BY views DESC, path LIMIT 100')));
  assert.ok(calls.some(call => call.sql.includes('GROUP BY path ORDER BY count DESC, path LIMIT 100')));
  assert.ok(!calls.some(call => /JOIN.*cv_download|cv_download.*JOIN/.test(call.sql)), 'Anonymous actions are never joined to CV email addresses');
  for (const call of calls.filter(call => call.sql.includes('WHERE occurred_at') || call.sql.includes('WHERE requested_at'))) {
    assert.deepEqual(call.values, ['2026-10-14', '2026-10-21']);
    assert.match(call.sql, /AT TIME ZONE 'Asia\/Kolkata'/);
  }
  for (const invalid of [null, -1, 0, 'all', 10000, '7; SELECT email']) assert.equal(lib.normalizeAnalyticsRange(invalid), 30);
  assert.equal(lib.normalizeAnalyticsRange('90'), 90);
});

function trackerFixture({ path = '/product', dnt, gpc, visibility = 'visible', fail = false } = {}) {
  const effects = [], timers = [], requests = [], listeners = new Map();
  const document = {
    visibilityState: visibility,
    referrer: 'https://www.google.com/search?q=reader@example.com#private',
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: name => listeners.delete(name),
  };
  const tracker = fixture({
    react: { useEffect: effect => effects.push(effect), useRef: () => ({ current: '' }) },
    'next/navigation': { usePathname: () => path },
  }, {}, {
    navigator: { doNotTrack: dnt, globalPrivacyControl: gpc }, document,
    window: { crypto: { randomUUID: () => event().eventId }, setTimeout: callback => { timers.push(callback); return 1; }, clearTimeout() {} },
    fetch: (url, options) => { requests.push({ url, options }); return fail ? Promise.reject(Error('Offline')) : Promise.resolve({ ok: true }); },
  }).load('components/SiteAnalytics.tsx');
  return { tracker, effects, timers, requests, document, listeners };
}

test('browser tracking sends only a visible public pathname and sanitized referrer host once', async () => {
  const f = trackerFixture({ visibility: 'hidden', fail: true });
  assert.equal(f.tracker.default(), null);
  const cleanup = f.effects[0]();
  f.timers[0]();
  assert.equal(f.requests.length, 0, 'Background pages do not count until visible');
  f.document.visibilityState = 'visible';
  f.listeners.get('visibilitychange')();
  f.listeners.get('visibilitychange')();
  await Promise.resolve();
  assert.equal(f.requests.length, 1, 'Visibility transitions cannot duplicate the page view');
  const sent = f.requests[0];
  assert.equal(sent.url, '/api/analytics');
  assert.equal(sent.options.credentials, 'same-origin');
  assert.equal(sent.options.keepalive, true);
  assert.deepEqual(JSON.parse(sent.options.body), { eventId: event().eventId, path: '/product', referrer: 'www.google.com', type: 'page_view' });
  assert.doesNotMatch(sent.options.body, /reader@example|search\?|#private/);
  cleanup();
  assert.equal(f.listeners.size, 0);
});

test('browser tracking respects privacy controls and excludes private or service pages', () => {
  for (const options of [{ dnt: '1' }, { gpc: true }, { path: '/minforyam/analytics' }, { path: '/api/cv-download' }]) {
    const f = trackerFixture(options);
    f.tracker.default();
    f.effects[0]();
    assert.equal(f.timers.length, 0);
    assert.equal(f.requests.length, 0);
  }
});
