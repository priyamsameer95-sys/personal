const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const source = require('../content/cv-download.json');
const root = path.join(__dirname, '..');
const { BLOCKED_CV_DOMAIN_PATTERN } = require('../lib/cv-email-policy.cjs');
function load(filename, stubs = {}, environment = {}, extras = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path.join(root, filename), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { module, exports: module.exports, process: { env: environment }, Buffer, URL, Date,
    require: id => Object.hasOwn(stubs, id) ? stubs[id] : require(id.startsWith('.') ? path.join(root, path.dirname(filename), id) : id), ...extras,
  }, { filename });
  return module.exports;
}
const download = load('lib/cv-download.ts', { '../content/cv-download.json': source });
const emailChecks = load('lib/cv-email.ts', {}, {}, { setTimeout, clearTimeout });
function storeFixture({ configured = true } = {}) {
  const leads = new Map(), limits = new Map(), calls = [], events = [], receipts = new Map();
  let fail = false;
  const db = async (strings, ...values) => {
    const sql = strings.join('?').replace(/\s+/g, ' ').trim();
    calls.push({ sql, values });
    if (fail) throw new Error('Private connection detail must not escape');
    if (sql.startsWith('CREATE') || sql.startsWith('DELETE')) return { rows: [] };
    if (sql.startsWith('INSERT INTO cv_download_rate_limits')) {
      const count = (limits.get(values[0]) || 0) + 1;
      if (count > 5) return { rows: [] };
      limits.set(values[0], count);
      return { rows: [{ request_count: count }] };
    }
    if (sql.startsWith('SELECT email_hash')) return { rows: receipts.has(values[0]) ? [{ email_hash: receipts.get(values[0]) }] : [] };
    if (sql.startsWith('WITH claimed AS')) {
      if (receipts.has(values[0])) return { rows: [{ saved: 0 }] };
      receipts.set(values[0], values[1]);
      const previous = leads.get(values[2]);
      leads.set(values[2], { email: values[2], download_count: (previous?.download_count || 0) + 1, last_source_path: values[3], cv_sha256: values[4], notice_version: values[5], first_requested_at: '2026-10-16T01:00:00.000Z', last_requested_at: '2026-10-16T02:00:00.000Z' });
      events.push({ email: values[2], source_path: values[6], cv_sha256: values[7] });
      return { rows: [{ saved: 1 }] };
    }
    if (sql.startsWith('WITH saved_lead AS')) {
      const previous = leads.get(values[0]);
      leads.set(values[0], { email: values[0], download_count: (previous?.download_count || 0) + 1, last_source_path: values[1], cv_sha256: values[2], notice_version: values[3], first_requested_at: '2026-10-16T01:00:00.000Z', last_requested_at: '2026-10-16T02:00:00.000Z' });
      if (sql.includes('INSERT INTO cv_download_events')) events.push({ email: values[0], source_path: values[4], cv_sha256: values[5] });
      return { rows: [] };
    }
    if (sql.startsWith('SELECT COUNT')) {
      const excluded = [...leads.values()].filter(lead => new RegExp(values[0], 'i').test(lead.email.trim().split('@')[1]));
      return { rows: [{ total: leads.size - excluded.length, excluded_contacts: excluded.length, excluded_requests: excluded.reduce((sum, lead) => sum + lead.download_count, 0) }] };
    }
    if (sql.startsWith('SELECT email')) return { rows: [...leads.values()].filter(lead => !new RegExp(values[0], 'i').test(lead.email.trim().split('@')[1])).slice(0, values[1]) };
    throw new Error(`Unexpected query: ${sql}`);
  };
  const lib = load('lib/cv-leads.ts', { '@/lib/db': db, '@/lib/cv-download': download }, configured ? { POSTGRES_URL: 'postgres://test-private', ADMIN_PASSWORD: 'test-secret' } : {});
  return { lib, leads, limits, calls, events, setFailure(value) { fail = value; } };
}
function request(body = { email: 'reader@gmail.com', website: '', sourcePath: '/cv' }, options = {}) {
  return new NextRequest(options.url || 'https://portfolio.example/api/cv-download', {
    method: 'POST', headers: { host: 'portfolio.example', origin: 'https://portfolio.example', 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.10', ...options.headers },
    body: options.raw === undefined ? JSON.stringify(body) : options.raw,
  });
}
function routeFixture(lib, record = lib.recordCVInterest, checkCVEmailDomain = async () => {}) {
  return load('app/api/cv-download/route.ts', { '@/lib/cv-leads': { ...lib, recordCVInterest: record }, '@/lib/cv-download': download, '@/lib/cv-email': { ...emailChecks, checkCVEmailDomain }, '@/lib/auth': { getClientIp: req => req.headers.get('x-forwarded-for') }, '@/lib/analytics-identity': { ANALYTICS_BROWSER_COOKIE: 'ps_visitor', analyticsBrowserIdentity: () => ({ isNew: true }) }, '@/lib/analytics-v2': { recordAnalyticsConversion: async () => {} } });
}

test('test addresses and failed email checks cannot create CV leads or return a download', async () => {
  const f = storeFixture();
  const checks = emailChecks.createCVEmailDomainCheck({ resolverFactory: () => { throw Error('Reserved domains must not reach DNS'); } });
  const route = routeFixture(f.lib, f.lib.recordCVInterest, checks);
  for (const email of ['portfolio-verification@example.com', 'person@team.example.net', 'person@localhost.test', 'person@mailinator.com']) {
    const response = await route.POST(request({ email, website: '', sourcePath: '/cv' }));
    assert.equal(response.status, 400);
    assert.ok(!(await response.json()).downloadUrl);
  }
  assert.equal(f.calls.length, 0, 'Rejected addresses never reach storage or add counts');
  const unavailable = routeFixture(f.lib, f.lib.recordCVInterest, async () => { throw new emailChecks.CVEmailCheckUnavailableError(); });
  const response = await unavailable.POST(request({ email: 'reader@gmail.com' }));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('retry-after'), '30');
  assert.match((await response.json()).error, /could not be checked/);
  assert.equal(f.calls.length, 0);
});

test('historical reserved and disposable contacts are excluded before list limits and counted separately without deleting records', async () => {
  const f = storeFixture();
  const row = { first_requested_at: '2026-10-16T01:00:00Z', last_requested_at: '2026-10-16T02:00:00Z', last_source_path: '/cv' };
  f.leads.set('portfolio-verification@example.com', { ...row, email: 'portfolio-verification@example.com', download_count: 3 });
  f.leads.set('old@team.mailinator.com', { ...row, email: 'old@team.mailinator.com', download_count: 2 });
  f.leads.set('reader@gmail.com', { ...row, email: 'reader@gmail.com', download_count: 4 });
  const result = await f.lib.listCVInterests(1);
  assert.equal(result.total, 1);
  assert.equal(result.excludedCVContacts, 2);
  assert.equal(result.excludedCVRequests, 5);
  assert.equal(result.leads.length, 1);
  assert.equal(result.leads[0].email, 'reader@gmail.com');
  assert.equal(f.leads.size, 3, 'Original historical records remain intact');
  const queries = f.calls.filter(call => call.sql.startsWith('SELECT'));
  assert.match(queries[0].sql, /WHERE SPLIT_PART\(LOWER\(TRIM\(email\)\), '@', 2\) !~\* \? ORDER BY.*LIMIT \?/);
  assert.deepEqual(queries[0].values, [BLOCKED_CV_DOMAIN_PATTERN, 1]);
  assert.ok(queries.every(call => !/example\.com|mailinator\.com/.test(call.sql)), 'Policy values remain bound parameters');
  assert.doesNotMatch(f.lib.cvInterestsCSV(result.leads), /portfolio-verification|mailinator/);
  assert.equal(f.calls.some(call => /^(DELETE|UPDATE|INSERT)/.test(call.sql)), false);
});

test('CV addresses are normalized with bounded email validation and sources exclude query data', () => {
  const { lib } = storeFixture();
  assert.equal(lib.normalizeCVEmail('  Reader+Role@Example.COM '), 'reader+role@example.com');
  for (const invalid of [null, [], 'a', 'x@localhost', '.a@example.com', 'a..b@example.com', 'a@-host.com', 'a@host..com', `${'a'.repeat(65)}@example.com`, 'a@example.com\nBcc:other@example.com']) assert.equal(lib.normalizeCVEmail(invalid), null, String(invalid));
  assert.equal(lib.normalizeCVSource('/product/college'), '/product/college');
  for (const unsafe of ['https://other.example', '//other.example', '/cv?email=private', '/cv#private', '/with space']) assert.equal(lib.normalizeCVSource(unsafe), '/');
});

test('real storage path creates independent tables, parameterizes upserts and deduplicates repeat interest', async () => {
  const f = storeFixture();
  const route = routeFixture(f.lib);
  for (let i = 0; i < 2; i++) assert.equal((await route.POST(request({ email: ' Reader@Gmail.com ', website: '', sourcePath: '/product' }))).status, 200);
  assert.equal(f.leads.size, 1);
  const row = f.leads.get('reader@gmail.com');
  assert.equal(row.download_count, 2);
  assert.equal(row.last_source_path, '/product');
  assert.equal(row.cv_sha256, source.sha256);
  assert.equal(row.notice_version, 'cv-interest-v1');
  assert.equal(f.calls.filter(call => call.sql.startsWith('CREATE TABLE')).length, 3, 'Initialization is cached, independently of the content migration');
  const insert = f.calls.find(call => call.sql.startsWith('WITH saved_lead AS'));
  assert.match(insert.sql, /ON CONFLICT \(email\) DO UPDATE/);
  assert.ok(!insert.sql.includes('reader@gmail.com'), 'Email remains a bound SQL parameter');
  for (const call of f.calls) assert.ok(!call.values.includes('192.0.2.10'), 'Raw IP is never stored');
  assert.match([...f.limits.keys()][0], /^[a-f0-9]{64}$/);
  const listed = await f.lib.listCVInterests();
  assert.equal(listed.total, 1);
  assert.equal(listed.leads[0].email, 'reader@gmail.com');
});

test('each recorded CV request atomically updates its contact and appends one dated event', async () => {
  const f = storeFixture();
  await f.lib.recordCVInterest('reader@gmail.com', '/cv', '192.0.2.10');
  const before = f.calls.length;
  await f.lib.recordCVInterest('reader@gmail.com', '/product', '192.0.2.10');
  const statements = f.calls.slice(before);
  assert.equal(statements.length, 3, 'Only expiry pruning, rate limiting and a combined contact/event write are needed');
  const writes = statements.filter(call => call.sql.startsWith('WITH saved_lead AS'));
  assert.equal(writes.length, 1);
  assert.match(writes[0].sql, /WITH saved_lead AS \(INSERT INTO cv_download_leads/);
  assert.match(writes[0].sql, /ON CONFLICT \(email\) DO UPDATE/);
  assert.match(writes[0].sql, /RETURNING email\) INSERT INTO cv_download_events/);
  assert.match(writes[0].sql, /SELECT email, \?, \? FROM saved_lead$/);
  assert.equal(statements.filter(call => call.sql.startsWith('INSERT INTO cv_download_events')).length, 0, 'A second independent write cannot create a partial record');
  assert.equal(f.leads.get('reader@gmail.com').download_count, 2);
  assert.deepEqual(f.events, [
    { email: 'reader@gmail.com', source_path: '/cv', cv_sha256: source.sha256 },
    { email: 'reader@gmail.com', source_path: '/product', cv_sha256: source.sha256 },
  ]);
});

test('the API returns the approved original PDF only after the database write completes', async () => {
  const f = storeFixture();
  let finish, called = false, settled = false;
  const route = routeFixture(f.lib, async () => { called = true; await new Promise(resolve => { finish = resolve; }); });
  const pending = route.POST(request()).then(response => { settled = true; return response; });
  while (!called) await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false, 'No download response precedes the awaited write');
  finish();
  const response = await pending;
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), { downloadUrl: download.CV_DOWNLOAD_URL, filename: 'Priyam_Sameer_CV.pdf' });
});

test('public lead POST rejects cross-origin, malformed, extra, honeypot and oversized input before writing', async () => {
  const f = storeFixture(), route = routeFixture(f.lib);
  const cases = [
    [request(undefined, { headers: { origin: 'https://other.example' } }), 403],
    [request(undefined, { headers: { origin: '' } }), 403],
    [request(undefined, { headers: { 'sec-fetch-site': 'cross-site' } }), 403],
    [request(undefined, { headers: { 'content-type': 'text/plain' } }), 415],
    [request(null), 400], [request([]), 400], [request({ email: 'invalid' }), 400],
    [request({ email: 'reader@gmail.com', website: 'spam' }), 400],
    [request({ email: 'reader@gmail.com', extra: true }), 400],
    [request(undefined, { raw: '{' }), 400],
    [request(undefined, { raw: 'x'.repeat(2049) }), 413],
    [request(undefined, { headers: { 'content-length': '2049' } }), 413],
  ];
  for (const [req, status] of cases) {
    const response = await route.POST(req);
    assert.equal(response.status, status);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.ok(!(await response.json()).downloadUrl);
  }
  assert.equal(f.calls.length, 0);
});

test('same-origin checks use the public Host and proxy protocol while rejecting a different host or scheme', async () => {
  const f = storeFixture(), route = routeFixture(f.lib);
  const local = await route.POST(request(undefined, { url: 'http://localhost:3000/api/cv-download', headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' } }));
  assert.equal(local.status, 200, 'A normalized Next hostname does not reject the browser-facing loopback authority');
  const customDomain = await route.POST(request(undefined, { url: 'http://internal.vercel.app/api/cv-download', headers: { host: 'www.priyamsameer.com', origin: 'https://www.priyamsameer.com', 'x-forwarded-proto': 'https' } }));
  assert.equal(customDomain.status, 200, 'The proxy-supplied HTTPS scheme matches the custom domain');
  const before = f.calls.length;
  for (const headers of [
    { host: 'portfolio.example', origin: 'https://other.example' },
    { host: 'portfolio.example', origin: 'http://portfolio.example' },
    { host: 'portfolio.example', origin: 'https://portfolio.example', 'x-forwarded-proto': 'http' },
    { host: 'portfolio.example', origin: 'https://portfolio.example', 'x-forwarded-proto': 'https,http' },
    { host: '', origin: 'https://portfolio.example' },
    { host: 'portfolio.example@other.example', origin: 'https://other.example' },
  ]) assert.equal((await route.POST(request(undefined, { headers }))).status, 403);
  assert.equal(f.calls.length, before, 'Rejected origins cannot write interest records');
});

test('missing credentials and storage failures return retryable errors without a download or private details', async () => {
  for (const configured of [false, true]) {
    const f = storeFixture({ configured });
    if (configured) f.setFailure(true);
    const response = await routeFixture(f.lib).POST(request());
    assert.equal(response.status, 503);
    const body = await response.text();
    assert.match(body, /could not be saved/);
    assert.doesNotMatch(body, /downloadUrl|postgres|connection detail|reader@example/);
    if (!configured) assert.equal(f.calls.length, 0);
  }
  const f = storeFixture();
  f.setFailure(true);
  assert.equal((await routeFixture(f.lib).POST(request())).status, 503);
  f.setFailure(false);
  assert.equal((await routeFixture(f.lib).POST(request())).status, 200, 'An initialization failure can be retried');
});

test('the durable limiter blocks a sixth request, including across new handler instances', async () => {
  const f = storeFixture();
  for (let count = 0; count < 5; count++) assert.equal((await routeFixture(f.lib).POST(request())).status, 200);
  const response = await routeFixture(f.lib).POST(request());
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get('retry-after')) > 0);
  assert.ok(!(await response.json()).downloadUrl);
  assert.equal(f.leads.get('reader@gmail.com').download_count, 5);
  assert.equal(f.events.length, 5, 'Rate-limited requests cannot add dated CV events');
});

test('admin list and CSV require handler-level authentication and never cache personal data', async () => {
  const f = storeFixture();
  await f.lib.recordCVInterest('=test@gmail.com', '/cv', '192.0.2.10');
  let authenticated = false;
  const api = load('app/api/admin/cv-leads/route.ts', { '@/lib/auth': { isAdminAuthenticated: async () => authenticated }, '@/lib/cv-leads': f.lib });
  const before = f.calls.length;
  for (const query of ['', '?format=csv']) {
    const denied = await api.GET(new NextRequest(`https://portfolio.example/api/admin/cv-leads${query}`));
    assert.equal(denied.status, 401);
    assert.equal(denied.headers.get('cache-control'), 'no-store');
  }
  assert.equal(f.calls.length, before, 'An unauthorized read never queries private records');
  authenticated = true;
  const list = await api.GET(new NextRequest('https://portfolio.example/api/admin/cv-leads'));
  assert.equal((await list.json()).leads[0].email, '=test@gmail.com');
  const csv = await api.GET(new NextRequest('https://portfolio.example/api/admin/cv-leads?format=csv'));
  assert.equal(csv.headers.get('cache-control'), 'no-store');
  assert.match(csv.headers.get('content-disposition'), /attachment/);
  assert.match(await csv.text(), /"'=test@gmail.com"/);
  for (const email of ['+test@example.com', '-test@example.com', '@test@example.com', '\t=test@gmail.com']) assert.ok(f.lib.cvInterestsCSV([{ email }]).includes(`"'${email}"`));
  f.setFailure(true);
  assert.equal((await api.GET(new NextRequest('https://portfolio.example/api/admin/cv-leads'))).status, 503);
});


test('a retried CV request saves exactly once while a new request remains a separate interest', async () => {
  const f = storeFixture();
  const id = 'a0000000-0000-4000-8000-000000000001';
  assert.equal(await f.lib.recordCVInterestOnce('reader@gmail.com', '/cv', '192.0.2.10', id), true);
  assert.equal(await f.lib.recordCVInterestOnce('reader@gmail.com', '/cv', '192.0.2.10', id), false);
  assert.equal(f.leads.get('reader@gmail.com').download_count, 1);
  assert.equal(f.events.length, 1);
  await assert.rejects(f.lib.recordCVInterestOnce('different@gmail.com', '/cv', '192.0.2.10', id), f.lib.CVLeadConflictError);
  assert.equal(await f.lib.recordCVInterestOnce('reader@gmail.com', '/cv', '192.0.2.10', 'a0000000-0000-4000-8000-000000000002'), true);
  assert.equal(f.leads.get('reader@gmail.com').download_count, 2);
  assert.ok(f.calls.filter(c=>c.sql.includes('cv_request_receipts')).every(c=>!c.values.includes('reader@gmail.com') || c.sql.startsWith('WITH claimed')));
});
