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
      recordPageView: async (...args) => {
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

test('middleware protects analytics and keeps rejected responses private before handlers run', async () => {
  let authenticated = false;
  const { middleware, config } = fixture({ './lib/auth': { isAdminAuthenticated: async () => authenticated } }).load('middleware.ts');
  assert.ok(config.matcher.includes('/minforyam/:path*'));
  assert.ok(config.matcher.includes('/api/admin/:path*'));
  const apiRequest = request(undefined, { method: 'GET', url: 'https://portfolio.example/api/admin/analytics' });
  const pageRequest = request(undefined, { method: 'GET', url: 'https://portfolio.example/minforyam/analytics' });
  const denied = await middleware(apiRequest);
  assert.equal(denied.status, 401);
  assert.equal(denied.headers.get('cache-control'), 'no-store');
  assert.match(denied.headers.get('x-robots-tag'), /noindex/);
  const redirect = await middleware(pageRequest);
  assert.equal(redirect.status, 307);
  const location = new URL(redirect.headers.get('location'));
  assert.equal(location.pathname, '/minforyam/login');
  assert.equal(location.searchParams.get('next'), '/minforyam/analytics');
  assert.equal(redirect.headers.get('cache-control'), 'no-store');
  authenticated = true;
  for (const req of [apiRequest, pageRequest]) {
    const allowed = await middleware(req);
    assert.equal(allowed.headers.get('x-middleware-next'), '1');
    assert.equal(allowed.headers.get('cache-control'), 'no-store');
    assert.match(allowed.headers.get('x-robots-tag'), /noindex/);
  }
});

test('private login redirects preserve the browser-facing host and HTTPS through a proxy', async () => {
  const { middleware } = fixture({ './lib/auth': { isAdminAuthenticated: async () => false } }).load('middleware.ts');
  for (const [internal, headers, expectedOrigin] of [
    ['http://internal.vercel.app/minforyam/analytics', { host: 'www.priyamsameer.com', 'x-forwarded-proto': 'https' }, 'https://www.priyamsameer.com'],
    ['http://localhost:3000/minforyam/analytics', { host: '127.0.0.1:3000' }, 'http://127.0.0.1:3000'],
  ]) {
    const response = await middleware(request(undefined, { method: 'GET', url: internal, headers }));
    assert.equal(response.status, 307);
    const location = new URL(response.headers.get('location'));
    assert.equal(location.origin, expectedOrigin);
    assert.equal(location.pathname, '/minforyam/login');
    assert.equal(location.searchParams.get('next'), '/minforyam/analytics');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
  }
});

test('private analytics page independently checks its session before reading data', async () => {
  const reads = [];
  const page = fixture({
    'next/link': () => null,
    'next/headers': { cookies: () => ({ get: () => ({ value: 'tampered-token' }) }) },
    'next/navigation': { redirect: location => { throw new Error(`redirect:${location}`); } },
    '@/lib/auth': { SESSION_COOKIE_NAME: 'admin_session', verifySessionToken: async () => false },
    '@/lib/site-analytics': { getSiteAnalytics: async () => { reads.push(true); throw Error('A denied page read private records'); } },
  }).load('app/minforyam/analytics/page.tsx');
  assert.equal(page.dynamic, 'force-dynamic');
  assert.equal(page.metadata.robots.index, false);
  assert.equal(page.metadata.robots.follow, false);
  await assert.rejects(page.default({ searchParams: { days: '30' } }), /redirect:\/minforyam\/login/);
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
  const calls = [], events = new Map();
  const db = async (strings, ...values) => {
    const sql = strings.join('?').replace(/\s+/g, ' ').trim();
    calls.push({ sql, values });
    if (fail) throw Error('postgres://private-password@private-host');
    if (sql.startsWith('CREATE') || sql.startsWith('DELETE') || sql.startsWith('INSERT INTO site_analytics_settings')) return { rows: [] };
    if (sql.startsWith('INSERT INTO site_page_views')) {
      const [eventId, path, referrer, visitor, device] = values;
      if (!events.has(eventId)) events.set(eventId, { path, referrer, visitor, device });
      else if (!sql.includes('ON CONFLICT (event_id) DO NOTHING')) throw Error('Duplicate event');
      return { rows: [] };
    }
    throw Error(`Unexpected query: ${sql}`);
  };
  const f = fixture({ '@/lib/db': db }, configured ? {} : { POSTGRES_URL: undefined, ADMIN_PASSWORD: undefined, ANALYTICS_SECRET: undefined });
  return { ...f, lib: f.load('lib/site-analytics.ts'), calls, events };
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
  assert.equal(report.cvRequests, 3, 'Only new dated request events count in the period');
  assert.equal(report.cvRequestsAllTime, 9, 'Historic lead counts remain visible separately');
  assert.equal(report.cvContacts, 1);
  assert.equal(report.trackingStartedAt, '2026-10-20T10:00:00.000Z');
  assert.equal(report.cvLeads[0].email, lead.email);
  assert.deepEqual(limits, [200]);
  assert.deepEqual(Array.from(report.countries), [], 'No location is inferred without a configured source');
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
  assert.deepEqual(JSON.parse(sent.options.body), { eventId: event().eventId, path: '/product', referrer: 'www.google.com' });
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
