'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Readable } = require('node:stream');
const { createLocalAnalytics, productionRequest, createCredentialProvider } = require('../scripts/local-analytics.cjs');

const origin = 'http://127.0.0.1:4310';
const time = Date.parse('2026-10-22T01:30:00Z');
const token = `${Buffer.from(JSON.stringify({ expiry: time + 86400000 })).toString('base64url')}.test-signature`;
const report = {
  pageViews: 8, visitors: 4, clicks: 3, cvRequests: 2, cvContacts: 1,
  daily: [{ date: '2026-10-22', pageViews: 8 }], topPages: [{ path: '/', views: 8 }],
  cvLeads: [{ email: 'synthetic-only@example.com', download_count: 2 }],
};

function setup(options = {}) {
  const calls = [];
  const app = createLocalAnalytics({
    now: () => time,
    env: {},
    getCredential: async () => token,
    getDataProvider: async () => null,
    requestUpstream: async (endpoint, args) => {
      calls.push({ endpoint, ...args });
      if (options.transport) return options.transport(endpoint, args);
      return { status: 200, body: endpoint.includes('format=csv') ? 'Email,Requests\r\nsynthetic-only@example.com,2\r\n' : JSON.stringify(report) };
    },
    ...options,
  });
  return { app, calls };
}

async function request(app, target, { method = 'POST', body = {}, raw, headers = {}, remoteAddress = '127.0.0.1' } = {}) {
  const incoming = Readable.from([Buffer.from(raw === undefined ? JSON.stringify(body) : raw)]);
  incoming.method = method;
  incoming.url = target;
  incoming.socket = { remoteAddress };
  incoming.headers = { host: '127.0.0.1:4310', origin, 'x-local-analytics': '1', 'content-type': 'application/json', ...headers };
  const response = {
    status: 0, headers: {}, body: '',
    writeHead(status, values) { this.status = status; this.headers = values; },
    end(value) { this.body = Buffer.isBuffer(value) ? value.toString('utf8') : value; },
  };
  await app.handler(incoming, response);
  return response;
}

test('local report and CSV open without a browser password, cookie, login or session request', async () => {
  const { app, calls } = setup();
  const result = await request(app, '/api/report', { body: { days: 30 } });
  assert.equal(result.status, 200, result.body);
  assert.deepEqual(JSON.parse(result.body), report);
  assert.equal(result.headers['Set-Cookie'], undefined);
  assert.deepEqual(calls[0], { endpoint: '/api/admin/analytics?days=30', cookie: `admin_session=${token}`, maxBytes: 1048576 });
  assert.doesNotMatch(result.body, /test-signature|admin_session/);
  const csv = await request(app, '/api/export');
  assert.equal(csv.status, 200);
  assert.equal(csv.headers['Content-Type'], 'text/csv; charset=utf-8');
  assert.match(csv.headers['Content-Disposition'], /attachment; filename="cv-interests.csv"/);
  assert.match(csv.body, /synthetic-only@example.com,2/);
  assert.equal(calls[1].endpoint, '/api/admin/cv-leads?format=csv');
  assert.equal(calls[1].maxBytes, 3145728);
});

test('all former local password and session endpoints are absent', async () => {
  const { app, calls } = setup();
  for (const endpoint of ['/api/login', '/api/session', '/api/logout']) {
    for (const method of ['GET', 'POST']) {
      const result = await request(app, endpoint, { method, body: { password: 'never-send-this' } });
      assert.equal(result.status, 404);
      assert.equal(result.headers['Set-Cookie'], undefined);
    }
  }
  assert.equal(calls.length, 0);
});

test('missing or invalid server connection returns an honest unavailable state without contacting production', async () => {
  for (const credential of [null, '', undefined, 'admin_session=unsafe; other=value', 'unsafe\r\nheader']) {
    const { app, calls } = setup({ getCredential: async () => credential });
    for (const [endpoint, body] of [['/api/report', { days: 30 }], ['/api/export', {}]]) {
      const result = await request(app, endpoint, { body });
      assert.equal(result.status, 409);
      assert.deepEqual(JSON.parse(result.body), { error: 'Live website data is not connected on this Mac.', code: 'DATA_NOT_CONNECTED' });
      assert.doesNotMatch(result.body, /pageViews|cvLeads|unsafe|synthetic-only@/);
    }
    assert.equal(calls.length, 0);
  }
  const disconnected = setup({ getCredential: undefined });
  assert.equal((await request(disconnected.app, '/api/report', { body: { days: 7 } })).status, 409);
  assert.equal(disconnected.calls.length, 0);
});

test('passwordless local requests retain strict Host, socket, Origin and custom-header protections', async () => {
  const { app, calls } = setup();
  for (const host of ['localhost:4310', 'attacker.example:4310', '127.0.0.1:4310.attacker.example', 'www.priyamsameer.com', undefined]) {
    assert.equal((await request(app, '/', { method: 'GET', headers: { host } })).status, 403);
  }
  for (const suppliedOrigin of ['https://www.priyamsameer.com', 'http://evil.example', 'null', undefined]) {
    assert.equal((await request(app, '/api/report', { body: { days: 30 }, headers: { origin: suppliedOrigin } })).status, 403);
  }
  assert.equal((await request(app, '/api/export', { headers: { 'x-local-analytics': undefined } })).status, 403);
  assert.equal((await request(app, '/api/report', { body: { days: 30 }, remoteAddress: '192.168.1.2' })).status, 403);
  assert.equal((await request(app, '/api/report', { body: { days: 30 }, remoteAddress: null })).status, 403);
  assert.equal(calls.length, 0);
  assert.equal((await request(app, '/api/report', { body: { days: 30 }, remoteAddress: '::ffff:127.0.0.1' })).status, 200);
});

test('only same-origin POST reads with bounded JSON and exact allowed fields can reach data transport', async () => {
  const { app, calls } = setup();
  for (const endpoint of ['/api/report', '/api/export']) {
    const get = await request(app, endpoint, { method: 'GET' });
    assert.equal(get.status, 405);
    assert.equal(get.headers.Allow, 'POST');
    assert.equal((await request(app, endpoint, { headers: { 'content-type': 'text/plain' } })).status, 415);
    assert.equal((await request(app, endpoint, { raw: '{' })).status, 400);
    assert.equal((await request(app, endpoint, { raw: '[]' })).status, 400);
    assert.equal((await request(app, endpoint, { raw: ' '.repeat(4097) })).status, 413);
    assert.equal((await request(app, endpoint, { headers: { 'content-length': '4097' } })).status, 413);
  }
  for (const body of [{ days: 1 }, { days: '30' }, { days: 30, cookie: token }, { days: 30, url: 'https://evil.example' }]) {
    assert.equal((await request(app, '/api/report', { body })).status, 400);
  }
  assert.equal((await request(app, '/api/export', { body: { format: 'json' } })).status, 400);
  assert.equal(calls.length, 0);
  for (const days of [7, 30, 90]) assert.equal((await request(app, '/api/report', { body: { days } })).status, 200);
});

test('fixed local assets are private and do not expose filesystem files or enable CORS', async () => {
  const { app, calls } = setup();
  const result = await request(app, '/', { method: 'GET' });
  assert.equal(result.status, 200);
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.match(result.headers['X-Robots-Tag'], /noindex/);
  assert.equal(result.headers['X-Frame-Options'], 'DENY');
  assert.match(result.headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.equal(result.headers['Access-Control-Allow-Origin'], undefined);
  assert.equal((await request(app, '/', { method: 'HEAD' })).body, '');
  for (const target of ['/scripts/local-analytics.cjs', '/.env', '/api/admin/analytics', '/dashboard.css?secret=1', '/%2e%2e/package.json']) {
    assert.equal((await request(app, target, { method: 'GET' })).status, 404);
  }
  assert.equal(calls.length, 0);
});

test('upstream refusals never remove production authentication or leak response bodies', async () => {
  for (const status of [401, 403]) {
    const { app } = setup({ transport: async () => ({ status, body: 'secret upstream diagnostics' }) });
    const result = await request(app, '/api/report', { body: { days: 30 } });
    assert.equal(result.status, 409);
    assert.equal(JSON.parse(result.body).code, 'DATA_NOT_CONNECTED');
    assert.doesNotMatch(result.body, /secret|sign-in|password/);
    assert.equal(result.headers['Set-Cookie'], undefined);
  }
  for (const response of [{ status: 503, body: 'secret db value' }, { status: 200, body: '<html>secret</html>' }, { status: 200, body: '{}' }]) {
    const { app } = setup({ transport: async () => response });
    const result = await request(app, '/api/report', { body: { days: 30 } });
    assert.equal(result.status, 502);
    assert.doesNotMatch(result.body, /secret|<html>|pageViews/);
  }
});

test('credential errors and shutdown do not leak secrets or deliver delayed private data', async () => {
  const throwing = setup({ getCredential: async () => { throw Error('secret-password'); } });
  const error = await request(throwing.app, '/api/report', { body: { days: 30 } });
  assert.equal(error.status, 502);
  assert.doesNotMatch(error.body, /secret-password/);
  let release;
  const { app } = setup({ transport: async () => new Promise(resolve => { release = resolve; }) });
  const pending = request(app, '/api/report', { body: { days: 30 } });
  while (!release) await new Promise(resolve => setImmediate(resolve));
  app.close();
  release({ status: 200, body: JSON.stringify(report) });
  const stopped = await pending;
  assert.equal(stopped.status, 503);
  assert.doesNotMatch(stopped.body, /synthetic-only@|pageViews/);
});

test('process-only session credential is normalized server-side without website password requests', async () => {
  for (const value of [token, `admin_session=${token}`]) {
    const calls = [];
    const provider = createCredentialProvider({ env: { ANALYTICS_ADMIN_SESSION: value }, now: () => time, requestUpstream: async (...args) => { calls.push(args); } });
    assert.equal(await provider.getCredential(), `admin_session=${token}`);
    assert.equal(calls.length, 0);
    provider.close();
    assert.equal(await provider.getCredential(), null);
  }
});

test('optional process-only password signs in automatically once and never creates a local browser password', async () => {
  const calls = [];
  const provider = createCredentialProvider({ env: { ADMIN_PASSWORD: 'synthetic-server-secret' }, now: () => time, requestUpstream: async (endpoint, args) => {
    calls.push({ endpoint, ...args });
    return { status: 200, body: '{}', setCookie: `admin_session=${token}; HttpOnly; Secure` };
  } });
  const result = await Promise.all([provider.getCredential(), provider.getCredential(), provider.getCredential()]);
  assert.deepEqual(result, Array(3).fill(`admin_session=${token}`));
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], { endpoint: '/api/admin/login', method: 'POST', body: { password: 'synthetic-server-secret' }, maxBytes: 8192 });
  assert.equal(await provider.getCredential(), `admin_session=${token}`);
  assert.equal(calls.length, 1);
  provider.invalidate();
  assert.equal(await provider.getCredential(), null);
});

test('automatic credential failure waits fifteen minutes before retrying to avoid locking website sign-in', async () => {
  let now = time;
  let attempts = 0;
  const provider = createCredentialProvider({ env: { ADMIN_PASSWORD: 'synthetic-wrong-secret' }, now: () => now, requestUpstream: async () => { attempts += 1; return { status: 401, body: 'private upstream detail' }; } });
  for (let index = 0; index < 10; index += 1) assert.equal(await provider.getCredential(), null);
  assert.equal(attempts, 1);
  now += 15 * 60 * 1000 + 1;
  assert.equal(await provider.getCredential(), null);
  assert.equal(attempts, 2);
});

test('missing, malformed and already expired process credentials do not create fake authenticated access', async () => {
  const expired = `${Buffer.from(JSON.stringify({ expiry: time - 1 })).toString('base64url')}.signature`;
  for (const env of [{}, { ANALYTICS_ADMIN_SESSION: 'cookie=unsafe; secret=value' }, { ANALYTICS_ADMIN_SESSION: expired }, { ADMIN_PASSWORD: '' }]) {
    let calls = 0;
    const provider = createCredentialProvider({ env, now: () => time, requestUpstream: async () => { calls += 1; } });
    assert.equal(await provider.getCredential(), null);
    assert.equal(calls, 0);
  }
});

test('fixed production transport rejects arbitrary URLs and allows neither redirects nor unbounded responses', async () => {
  for (const endpoint of ['https://evil.example', '//evil.example', '/api/admin/analytics?days=365', '/api/admin/analytics?days=30&url=evil', '/api/admin/cv-leads?format=json', '/api/admin/login?next=evil']) {
    await assert.rejects(productionRequest(endpoint), /Unsupported production endpoint/);
  }
  assert.throws(() => createLocalAnalytics({ port: 80 }), /Invalid local analytics port/);
  const savedFetch = global.fetch;
  try {
    let options;
    global.fetch = async (url, args) => { options = args; assert.equal(url, 'https://www.priyamsameer.com/api/admin/analytics?days=30'); return new Response('{}', { status: 200 }); };
    await productionRequest('/api/admin/analytics?days=30', { cookie: `admin_session=${token}` });
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.headers.Cookie, `admin_session=${token}`);
    global.fetch = async () => new Response('123456789', { status: 200 });
    await assert.rejects(productionRequest('/api/admin/analytics?days=30', { maxBytes: 4 }), /too large/);
    global.fetch = async () => new Response('x', { status: 200, headers: { 'Content-Length': '1000' } });
    await assert.rejects(productionRequest('/api/admin/analytics?days=30', { maxBytes: 4 }), /too large/);
  } finally { global.fetch = savedFetch; }
});

test('private direct database provider supplies consolidated reports and CSV without a website password', async () => {
  const reads=[];
  const { app, calls }=setup({ getCredential:async()=>{throw Error('Website password must not be required');},getDataProvider:async()=>({getReport:async days=>{reads.push(days);return report},exportCSV:async()=> 'Email,Requests\r\nsynthetic-only@example.com,2\r\n'}) });
  const response=await request(app,'/api/report',{body:{days:7}});
  assert.equal(response.status,200);assert.deepEqual(JSON.parse(response.body),report);assert.deepEqual(reads,[7]);
  const csv=await request(app,'/api/export');assert.equal(csv.status,200);assert.match(csv.body,/synthetic-only@example.com/);
  assert.equal(calls.length,0);
});
