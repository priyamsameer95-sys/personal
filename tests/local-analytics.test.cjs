'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Readable } = require('node:stream');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createLocalAnalytics, productionRequest, SESSION_NAME } = require('../scripts/local-analytics.cjs');

const origin = 'http://127.0.0.1:4310';
const currentTime = Date.parse('2026-10-20T10:00:00Z');
function websiteCookie(expiry = currentTime + 24 * 60 * 60 * 1000) {
  return `${Buffer.from(JSON.stringify({ expiry })).toString('base64url')}.signature`;
}
const report = {
  days: 30, startDate: '2026-09-21', endDate: '2026-10-20', trackingStartedAt: '2026-10-20',
  pageViews: 7, visitors: 3, clicks: 4, cvRequests: 1, cvContacts: 1, cvRequestsAllTime: 1, cvLeadsTotal: 1,
  daily: [{ date: '2026-10-20', visitors: 3, pageViews: 7, clicks: 4, cvRequests: 1 }],
  topPages: [{ path: '/', views: 7, visitors: 3 }], interactions: [{ type: 'cv_opened', target: 'cv', count: 4 }],
  pageInteractions: [{ path: '/', count: 4 }], referrers: [], devices: [], countries: [],
  cvLeads: [{ email: 'test-only@example.com', first_requested_at: '2026-10-20', last_requested_at: '2026-10-20', download_count: 1, last_source_path: '/' }],
};
function setup(options = {}) {
  const calls = [];
  let clock = currentTime;
  const app = createLocalAnalytics({ now: () => clock, requestUpstream: async (endpoint, args = {}) => {
    calls.push({ endpoint, ...args });
    if (options.transport) return options.transport(endpoint, args);
    if (endpoint === '/api/admin/login') return { status: args.body.password === 'test-password' ? 200 : 401, body: '{}', setCookie: `admin_session=${websiteCookie()}; Path=/; HttpOnly; Secure; SameSite=lax` };
    if (endpoint.includes('format=csv')) return { status: 200, body: 'Email,Requests\r\ntest-only@example.com,1\r\n' };
    return { status: 200, body: JSON.stringify(report) };
  } });
  return { app, calls, tick(ms) { clock += ms; } };
}
async function request(app, pathname, { method = 'POST', body = {}, raw, headers = {}, remoteAddress = '127.0.0.1' } = {}) {
  const payload = raw === undefined ? JSON.stringify(body) : raw;
  const incoming = Readable.from([Buffer.from(payload)]);
  incoming.method = method; incoming.url = pathname; incoming.socket = { remoteAddress };
  incoming.headers = { host: '127.0.0.1:4310', origin, 'x-local-analytics': '1', 'content-type': 'application/json', ...headers };
  const response = { status: 0, headers: {}, body: '', writeHead(status, values) { this.status = status; this.headers = values; }, end(value) { this.body = Buffer.isBuffer(value) ? value.toString('utf8') : value; } };
  await app.handler(incoming, response);
  return response;
}
async function login(app) {
  const result = await request(app, '/api/login', { body: { password: 'test-password' } });
  assert.equal(result.status, 200, result.body);
  return result.headers['Set-Cookie'].split(';')[0];
}

test('serves only fixed local dashboard assets with private response protections', async () => {
  const { app, calls } = setup();
  const page = await request(app, '/', { method: 'GET' });
  assert.equal(page.status, 200);
  assert.match(page.body, /A private view/);
  assert.match(page.body, /127\.0\.0\.1/);
  assert.equal(page.headers['Cache-Control'], 'no-store');
  assert.match(page.headers['X-Robots-Tag'], /noindex/);
  assert.equal(page.headers['X-Frame-Options'], 'DENY');
  assert.match(page.headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.equal(page.headers['Access-Control-Allow-Origin'], undefined);
  assert.equal((await request(app, '/dashboard.js', { method: 'GET' })).status, 200);
  assert.equal((await request(app, '/icon.svg', { method: 'GET' })).headers['Content-Type'], 'image/svg+xml');
  assert.equal((await request(app, '/', { method: 'HEAD' })).body, '');
  for (const target of ['/scripts/local-analytics.cjs', '/.env', '/api/admin/analytics', '/dashboard.css?secret=1', '/%2e%2e/package.json']) {
    assert.equal((await request(app, target, { method: 'GET' })).status, 404);
  }
  assert.equal(calls.length, 0);
});

test('rejects non-loopback Hosts, alternate origins, forged socket addresses and missing custom headers before upstream access', async () => {
  const { app, calls } = setup();
  for (const host of ['localhost:4310', 'attacker.example:4310', '127.0.0.1:4310.attacker.example', 'www.priyamsameer.com']) {
    assert.equal((await request(app, '/', { method: 'GET', headers: { host } })).status, 403);
  }
  for (const suppliedOrigin of ['https://www.priyamsameer.com', 'http://evil.example', 'null', undefined]) {
    assert.equal((await request(app, '/api/session', { headers: { origin: suppliedOrigin } })).status, 403);
  }
  assert.equal((await request(app, '/api/login', { body: { password: 'test-password' }, headers: { 'x-local-analytics': undefined } })).status, 403);
  assert.equal((await request(app, '/', { method: 'GET', remoteAddress: '192.168.1.2' })).status, 403);
  assert.equal(calls.length, 0);
});

test('all local API reads and exports require same-origin POST and bounded JSON', async () => {
  const { app, calls } = setup();
  for (const endpoint of ['/api/session', '/api/report', '/api/export', '/api/login', '/api/logout']) {
    const get = await request(app, endpoint, { method: 'GET' });
    assert.equal(get.status, 405); assert.equal(get.headers.Allow, 'POST');
  }
  assert.equal((await request(app, '/api/session', { headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal((await request(app, '/api/session', { raw: '{' })).status, 400);
  assert.equal((await request(app, '/api/session', { raw: '[]' })).status, 400);
  assert.equal((await request(app, '/api/session', { raw: ' '.repeat(4097) })).status, 413);
  assert.equal((await request(app, '/api/session', { headers: { 'content-length': '4097' } })).status, 413);
  assert.equal((await request(app, '/api/session', { body: { upstream: 'http://evil.example' } })).status, 400);
  assert.equal(calls.length, 0);
});

test('unauthenticated requests do not fetch or expose reports or CV emails', async () => {
  const { app, calls } = setup();
  assert.deepEqual(JSON.parse((await request(app, '/api/session')).body), { authenticated: false });
  for (const [endpoint, body] of [['/api/report', { days: 30 }], ['/api/export', {}]]) {
    const result = await request(app, endpoint, { body });
    assert.equal(result.status, 401); assert.doesNotMatch(result.body, /test-only@/);
  }
  assert.equal(calls.length, 0);
});

test('owner sign-in keeps production credentials server-side behind a separate random local cookie', async () => {
  const { app, calls } = setup();
  const result = await request(app, '/api/login', { body: { password: 'test-password' } });
  assert.equal(result.status, 200);
  assert.deepEqual(JSON.parse(result.body), { authenticated: true });
  assert.match(result.headers['Set-Cookie'], new RegExp(`^${SESSION_NAME}=[a-f0-9]{64}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400$`));
  assert.doesNotMatch(JSON.stringify(result), /test-password|admin_session|signature/);
  assert.equal(calls[0].endpoint, '/api/admin/login');
  assert.deepEqual(calls[0].body, { password: 'test-password' });
  const cookie = result.headers['Set-Cookie'].split(';')[0];
  assert.deepEqual(JSON.parse((await request(app, '/api/session', { headers: { cookie } })).body), { authenticated: true });
  const reportResult = await request(app, '/api/report', { body: { days: 7 }, headers: { cookie } });
  assert.equal(reportResult.status, 200);
  assert.deepEqual(JSON.parse(reportResult.body), report);
  assert.equal(calls[1].endpoint, '/api/admin/analytics?days=7');
  assert.equal(calls[1].cookie, `admin_session=${websiteCookie()}`);
  assert.equal(reportResult.headers['Set-Cookie'], undefined);
});

test('report ranges and fields cannot change the fixed owner export destination', async () => {
  const { app, calls } = setup(); const cookie = await login(app);
  for (const body of [{ days: 1 }, { days: '30' }, { days: 30, url: 'http://evil.example' }, { days: 30, cookie: 'fake' }]) {
    assert.equal((await request(app, '/api/report', { body, headers: { cookie } })).status, 400);
  }
  for (const range of [7, 30, 90]) assert.equal((await request(app, '/api/report', { body: { days: range }, headers: { cookie } })).status, 200);
  assert.equal(calls.length, 4);
});

test('authenticated CSV export uses the fixed private endpoint and download filename', async () => {
  const { app, calls } = setup(); const cookie = await login(app);
  const result = await request(app, '/api/export', { headers: { cookie } });
  assert.equal(result.status, 200);
  assert.equal(result.headers['Content-Type'], 'text/csv; charset=utf-8');
  assert.equal(result.headers['Content-Disposition'], 'attachment; filename="cv-interests.csv"');
  assert.equal(result.body, 'Email,Requests\r\ntest-only@example.com,1\r\n');
  assert.equal(calls[1].endpoint, '/api/admin/cv-leads?format=csv');
  assert.equal(calls[1].maxBytes, 3 * 1024 * 1024);
});

test('local sessions expire within 24 hours and disappear on process shutdown or sign-out', async () => {
  const state = setup(); const cookie = await login(state.app);
  const logout = await request(state.app, '/api/logout', { headers: { cookie } });
  assert.equal(logout.status, 200); assert.match(logout.headers['Set-Cookie'], /Max-Age=0/);
  assert.equal((await request(state.app, '/api/report', { body: { days: 30 }, headers: { cookie } })).status, 401);
  const next = await login(state.app); state.tick(24 * 60 * 60 * 1000 + 1);
  assert.equal((await request(state.app, '/api/export', { headers: { cookie: next } })).status, 401);
  const fresh = setup(); const freshCookie = await login(fresh.app); fresh.app.close();
  assert.equal((await request(fresh.app, '/api/export', { headers: { cookie: freshCookie } })).status, 401);
});

test('session lifetime is capped to the production session expiry and not extended by reads', async () => {
  const state = setup({ transport: async endpoint => endpoint.endsWith('login') ? { status: 200, body: '{}', setCookie: `admin_session=${websiteCookie(currentTime + 10000)}; HttpOnly` } : { status: 200, body: JSON.stringify(report) } });
  const result = await request(state.app, '/api/login', { body: { password: 'test-password' } });
  assert.equal(result.status, 200); assert.match(result.headers['Set-Cookie'], /Max-Age=10$/);
  const cookie = result.headers['Set-Cookie'].split(';')[0];
  state.tick(10001);
  assert.equal((await request(state.app, '/api/export', { headers: { cookie } })).status, 401);
});

test('sign-in rate limit stops repeated guesses before contacting production', async () => {
  const state = setup();
  for (let count = 0; count < 5; count++) assert.equal((await request(state.app, '/api/login', { body: { password: 'wrong' } })).status, 401);
  const blocked = await request(state.app, '/api/login', { body: { password: 'test-password' } });
  assert.equal(blocked.status, 429); assert.equal(blocked.headers['Retry-After'], '900'); assert.equal(state.calls.length, 5);
  state.tick(15 * 60 * 1000 + 1);
  assert.equal((await request(state.app, '/api/login', { body: { password: 'test-password' } })).status, 200);
});

test('login rejects unknown fields and never turns arbitrary upstream errors into local responses', async () => {
  const { app, calls } = setup();
  for (const body of [{}, { password: '' }, { password: 'x'.repeat(1025) }, { password: 'test-password', endpoint: 'http://evil.example' }]) {
    assert.equal((await request(app, '/api/login', { body })).status, 400);
  }
  assert.equal(calls.length, 0);
  const failing = setup({ transport: async () => { throw Error('secret-database-password'); } });
  const result = await request(failing.app, '/api/login', { body: { password: 'secret-password' } });
  assert.equal(result.status, 502); assert.doesNotMatch(result.body, /secret-/);
  const malformed = setup({ transport: async () => ({ status: 200, body: '{}', setCookie: 'not_the_cookie=secret-value;' }) });
  assert.equal((await request(malformed.app, '/api/login', { body: { password: 'test-password' } })).status, 502);
});

test('upstream authentication expiry clears local access and does not forward an upstream error body', async () => {
  const { app, calls } = setup({ transport: async endpoint => endpoint.endsWith('login') ? { status: 200, body: '{}', setCookie: `admin_session=${websiteCookie()}; HttpOnly` } : { status: 401, body: 'private-upstream-body' } });
  const cookie = await login(app);
  const result = await request(app, '/api/report', { body: { days: 30 }, headers: { cookie } });
  assert.equal(result.status, 401); assert.doesNotMatch(result.body, /private-upstream-body/); assert.match(result.headers['Set-Cookie'], /Max-Age=0/);
  assert.equal((await request(app, '/api/export', { headers: { cookie } })).status, 401); assert.equal(calls.length, 2);
});

test('unreadable or incomplete reports and upstream failures are errors rather than fake zero traffic', async () => {
  for (const response of [{ status: 503, body: 'private db error' }, { status: 200, body: '<html>error</html>' }, { status: 200, body: '{}' }]) {
    const { app } = setup({ transport: async endpoint => endpoint.endsWith('login') ? { status: 200, body: '{}', setCookie: `admin_session=${websiteCookie()}; HttpOnly` } : response });
    const cookie = await login(app); const result = await request(app, '/api/report', { body: { days: 30 }, headers: { cookie } });
    assert.equal(result.status, 502); assert.doesNotMatch(result.body, /private db error|<html>|pageViews/);
  }
});

test('production transport accepts only fixed HTTPS owner endpoints and rejects configurable destinations', async () => {
  for (const endpoint of ['http://evil.example', '//evil.example', '/api/admin/analytics?days=365', '/api/admin/analytics?days=30&url=evil', '/api/admin/cv-leads?format=json', '/api/admin/login?next=evil']) {
    await assert.rejects(productionRequest(endpoint), /Unsupported production endpoint/);
  }
  assert.throws(() => createLocalAnalytics({ port: 80 }), /Invalid local analytics port/);
});

test('dashboard client uses text rendering, same-origin POST and clears private records after sign-out', () => {
  const client = readFileSync(path.join(__dirname, '../local-analytics/dashboard.js'), 'utf8');
  assert.doesNotMatch(client, /innerHTML|outerHTML|document\.write|localStorage|sessionStorage/);
  assert.match(client, /node\.textContent = String\(text\)/);
  assert.match(client, /method: 'POST', credentials: 'same-origin', mode: 'same-origin'/);
  assert.match(client, /'X-Local-Analytics': '1'/);
  assert.match(client, /\$\('password'\)\.value = ''/);
  assert.match(client, /Clear private records from the DOM/);
  assert.match(client, /signal: AbortSignal\.timeout/);
  assert.match(client, /data\.interactions/);
  assert.match(client, /data\.pageInteractions/);
});

test('sign-out invalidates an in-flight report or CSV response on the local server', async () => {
  for (const endpoint of ['/api/report', '/api/export']) {
    let release;
    const { app } = setup({ transport: async target => {
      if (target.endsWith('login')) return { status: 200, body: '{}', setCookie: `admin_session=${websiteCookie()}; HttpOnly` };
      return new Promise(resolve => { release = resolve; });
    } });
    const cookie = await login(app);
    const pending = request(app, endpoint, { body: endpoint.endsWith('report') ? { days: 30 } : {}, headers: { cookie } });
    while (!release) await new Promise(resolve => setImmediate(resolve));
    assert.equal((await request(app, '/api/logout', { headers: { cookie } })).status, 200);
    release({ status: 200, body: endpoint.endsWith('report') ? JSON.stringify(report) : 'private-records' });
    const result = await pending;
    assert.equal(result.status, 401);
    assert.doesNotMatch(result.body, /test-only@example|private-records/);
  }
});

class TestNode {
  constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.listeners = {}; this.dataset = {}; this.style = {}; this.hidden = false; this.disabled = false; this.value = ''; this._text = ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  append(...nodes) { this.children.push(...nodes); for (const node of nodes) node.parent = this; }
  replaceChildren(...nodes) { this._text = ''; this.children = []; this.append(...nodes); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) { const nodes = []; for (const child of this.children) { if (child.tagName.toLowerCase() === selector) nodes.push(child); nodes.push(...child.querySelectorAll(selector)); } return nodes; }
  closest(selector) { return selector === 'button[data-days]' && this.tagName === 'BUTTON' && this.dataset.days ? this : null; }
  focus() { this.focused = true; }
  click() { this.clicked = true; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  async emit(name, event = {}) { for (const listener of this.listeners[name] || []) await listener(event); }
}
function dashboardClient({ authenticated = true, getReport = async () => report, getExport = async () => new Blob(['safe,test']), loginResponse = async () => ({ authenticated: true }) } = {}) {
  const html = readFileSync(path.join(__dirname, '../local-analytics/index.html'), 'utf8');
  const nodes = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], new TestNode()]));
  nodes['sign-in'].hidden = false; nodes.dashboard.hidden = true; nodes.report.hidden = true; nodes['report-error'].hidden = true;
  nodes['login-form'].append(new TestNode('button'));
  nodes['report-error'].append(new TestNode('p'));
  for (const range of [7, 30, 90]) { const button = new TestNode('button'); button.dataset.days = String(range); nodes.ranges.append(button); }
  const calls = [];
  const objectURLs = [];
  const document = { getElementById: id => nodes[id], createElement: tag => new TestNode(tag), createElementNS: (ns, tag) => new TestNode(tag), body: new TestNode('body') };
  const transport = async (endpoint, options) => {
    const body = JSON.parse(options.body); calls.push({ endpoint, body, options });
    let value;
    if (endpoint === '/api/session') value = { authenticated };
    else if (endpoint === '/api/report') value = await getReport(body.days);
    else if (endpoint === '/api/export') return { ok: true, blob: getExport };
    else if (endpoint === '/api/login') value = await loginResponse(body);
    else value = { authenticated: false };
    if (value instanceof Error) return { ok: false, status: value.status || 502, json: async () => ({ error: value.message }) };
    return { ok: true, json: async () => value };
  };
  const context = { document, fetch: transport, Intl, Date, AbortSignal, Error, setTimeout, URL: { createObjectURL(blob) { objectURLs.push(blob); return 'blob:test'; }, revokeObjectURL() {} } };
  vm.runInNewContext(readFileSync(path.join(__dirname, '../local-analytics/dashboard.js'), 'utf8'), context);
  return { nodes, calls, objectURLs, document };
}
const flushClient = () => new Promise(resolve => setImmediate(resolve));

test('actual dashboard client renders populated reports safely and clears contact records on sign-out', async () => {
  const unsafe = '<img src=x onerror=alert(1)>';
  const { nodes, calls, document } = dashboardClient({ getReport: async () => ({ ...report, cvLeads: [{ ...report.cvLeads[0], email: unsafe }], interactions: [{ type: 'outbound_clicked', target: unsafe, count: 4 }] }) });
  await flushClient();
  assert.equal(nodes.dashboard.hidden, false); assert.equal(nodes.report.hidden, false);
  assert.match(nodes.metrics.textContent, /Clicks & actions4/);
  assert.match(nodes.contacts.textContent, /<img src=x onerror=alert\(1\)>/);
  assert.match(nodes.interactions.textContent, /<img src=x onerror=alert\(1\)>/);
  assert.equal(document.body.querySelectorAll('img').length, 0);
  assert.equal(nodes.contacts.querySelectorAll('img').length, 0);
  await nodes.logout.emit('click');
  assert.equal(nodes.dashboard.hidden, true); assert.equal(nodes['sign-in'].hidden, false);
  assert.equal(nodes.contacts.textContent, ''); assert.equal(nodes.metrics.textContent, '');
  assert.equal(nodes.password.focused, true);
  assert.equal(calls.at(-1).endpoint, '/api/logout');
});

test('actual dashboard client renders empty and failed reports as distinct states', async () => {
  const empty = { ...report, pageViews: 0, visitors: 0, clicks: 0, cvRequests: 0, cvContacts: 0, daily: [], topPages: [], cvLeads: [], interactions: [], pageInteractions: [] };
  const { nodes } = dashboardClient({ getReport: async selected => selected === 7 ? empty : selected === 90 ? new Error('Synthetic storage outage') : report });
  await flushClient();
  await nodes.ranges.emit('click', { target: nodes.ranges.children[0] });
  await flushClient();
  assert.equal(nodes.report.hidden, false); assert.equal(nodes['report-error'].hidden, true);
  assert.match(nodes.pages.textContent, /first recorded visit/);
  assert.match(nodes.contacts.textContent, /No one has shared/);
  await nodes.ranges.emit('click', { target: nodes.ranges.children[2] });
  await flushClient();
  assert.equal(nodes.report.hidden, true); assert.equal(nodes['report-error'].hidden, false);
  assert.match(nodes['report-error'].textContent, /Synthetic storage outage/);
});

test('actual dashboard login clears the password field before awaiting authentication', async () => {
  let resolveLogin;
  const { nodes, calls } = dashboardClient({ authenticated: false, loginResponse: async () => new Promise(resolve => { resolveLogin = resolve; }) });
  await flushClient(); nodes.password.value = 'synthetic-password-only';
  const pending = nodes['login-form'].emit('submit', { preventDefault() {} });
  assert.equal(nodes.password.value, '');
  assert.equal(nodes['login-form'].querySelector('button').disabled, true);
  assert.equal(calls.at(-1).body.password, 'synthetic-password-only');
  resolveLogin({ authenticated: true }); await pending;
  assert.equal(nodes.report.hidden, false); assert.equal(nodes['dashboard-title'].focused, true);
});

test('actual dashboard does not download a delayed export after sign-out', async () => {
  let resolveExport;
  const { nodes, objectURLs } = dashboardClient({ getExport: async () => new Promise(resolve => { resolveExport = resolve; }) });
  await flushClient(); const pending = nodes.export.emit('click');
  while (!resolveExport) await flushClient();
  await nodes.logout.emit('click'); resolveExport(new Blob(['private-records'])); await pending;
  assert.equal(objectURLs.length, 0);
  assert.equal(nodes['export-status'].textContent, '');
  assert.equal(nodes.contacts.textContent, '');
});
