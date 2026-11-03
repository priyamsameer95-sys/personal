const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { randomBytes, webcrypto } = require('node:crypto');
const ts = require('typescript');
const { NextRequest } = require('next/server');

// Compile the actual application modules in memory so the tests need no
// additional runner, build output, database, or service credentials.
function loadModule(filename, dependencies = {}, environment = {}, clock = Date) {
  const source = readFileSync(path.join(__dirname, '..', filename), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    require: id => Object.hasOwn(dependencies, id) ? dependencies[id] : require(id),
    process: { env: environment },
    Buffer,
    TextEncoder,
    URL,
    Headers,
    Request,
    ReadableStream,
    crypto: webcrypto,
    Date: clock,
    console,
  }, { filename });
  return module.exports;
}

function fixture() {
  const environment = { ADMIN_PASSWORD: randomBytes(32).toString('hex'), NODE_ENV: 'production' };
  let now = Date.now();
  class TestDate extends Date { static now() { return now; } }
  const auth = loadModule('lib/auth.ts', {}, environment, TestDate);
  let rateError, reserved = 0;
  class MockRateLimitError extends Error { constructor(retryAfter) { super('Rate limited'); this.retryAfter = retryAfter; } }
  const limiter = {
    AdminLoginRateLimitError: MockRateLimitError,
    async reserveAdminLoginAttempt() { reserved += 1; if (rateError) throw rateError; },
  };
  const media = loadModule('lib/admin-media.ts', {}, environment, TestDate);
  const dependencies = { '@/lib/auth': auth, './lib/auth': auth, '@/lib/admin-login-rate-limit': limiter, './admin-media': media, '@/lib/admin-media': media };
  return {
    environment,
    auth,
    limiter,
    now: () => now,
    reservations: () => reserved,
    setRateError: error => { rateError = error; },
    advance: milliseconds => { now += milliseconds; },
    load: (filename, additional = {}) => loadModule(filename, { ...dependencies, ...additional }, environment, TestDate),
  };
}

function request(url, { method = 'GET', body, token, signature, ip, headers: extra = {}, raw } = {}) {
  const headers = new Headers({ host: 'www.priyamsameer.com' });
  if (!['GET', 'HEAD'].includes(method)) {
    headers.set('origin', 'https://www.priyamsameer.com');
    headers.set('sec-fetch-site', 'same-origin');
    headers.set('content-type', 'application/json');
  }
  if (token) headers.set('cookie', `admin_session=${token}`);
  if (signature) headers.set('x-vercel-signature', signature);
  if (ip) headers.set('x-forwarded-for', ip);
  for (const [key, value] of Object.entries(extra)) value === null ? headers.delete(key) : headers.set(key, value);
  return new NextRequest(`https://www.priyamsameer.com${url}`, {
    method,
    headers,
    ...(raw !== undefined ? { body: raw, ...(raw instanceof ReadableStream ? { duplex: 'half' } : {}) } : body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

async function signPayload(payload, password, legacy = false) {
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const key = await webcrypto.subtle.importKey(
    'raw', new TextEncoder().encode(legacy ? password : `cms-admin-session:v2:${password}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadBase64));
  return `${payloadBase64}.${Buffer.from(signature).toString('hex')}`;
}

test('sessions require a sufficiently strong configured password and fail closed if it is removed', async () => {
  const f = fixture();
  const token = await f.auth.createSessionToken();
  for (const missing of [undefined, '', '  \n\t', 'weak-password', 'x'.repeat(19), 'x'.repeat(257)]) {
    f.environment.ADMIN_PASSWORD = missing;
    assert.equal(await f.auth.verifySessionToken(token), false);
    await assert.rejects(f.auth.createSessionToken(), /not configured/);
  }
});

test('versioned sessions have an eight-hour lifetime and fresh nonces even in the same millisecond', async () => {
  const f = fixture();
  const token = await f.auth.createSessionToken();
  assert.match(token, /^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
  const payload = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
  assert.equal(payload.version, 2);
  assert.equal(payload.purpose, 'cms-admin');
  assert.equal(payload.issuedAt, f.now());
  assert.equal(payload.expiry - payload.issuedAt, 8 * 60 * 60 * 1000);
  assert.match(payload.nonce, /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  assert.notEqual(await f.auth.createSessionToken(), token);
  assert.equal(await f.auth.verifySessionToken(token), true);
  f.advance(8 * 60 * 60 * 1000 - 1);
  assert.equal(await f.auth.verifySessionToken(token), true);
  f.advance(1);
  assert.equal(await f.auth.verifySessionToken(token), false);
});

test('tampered, oversized, malformed, future-issued and overlong signed sessions are rejected', async () => {
  const f = fixture();
  const token = await f.auth.createSessionToken();
  const [payload, signature] = token.split('.');
  for (const invalid of [undefined, '', 'bad', `${payload}.`, `${payload}.zz`, `${payload}.${signature}.extra`, 'a'.repeat(1025)]) {
    assert.equal(await f.auth.verifySessionToken(invalid), false);
  }
  const alteredSignature = `${signature[0] === '0' ? '1' : '0'}${signature.slice(1)}`;
  assert.equal(await f.auth.verifySessionToken(`${payload}.${alteredSignature}`), false);
  const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  for (const invalidPayload of [{}, null, { expiry: 'future' }, { expiry: Date.now() + 0.5 }, { expiry: 0 },
    { ...decoded, version: 1 }, { ...decoded, purpose: 'analytics' },
    { ...decoded, issuedAt: f.now() + 1, expiry: decoded.expiry + 1 },
    { ...decoded, issuedAt: f.now() + 0.5 }, { ...decoded, expiry: decoded.expiry + 1 },
    { ...decoded, nonce: '' }, { ...decoded, nonce: 1 }, { ...decoded, nonce: 'not-a-uuid' },
    { ...decoded, expiry: Number.MAX_SAFE_INTEGER }, { ...decoded, extra: 'x'.repeat(1500) }]) {
    assert.equal(await f.auth.verifySessionToken(await signPayload(invalidPayload, f.environment.ADMIN_PASSWORD)), false);
  }
  f.environment.ADMIN_PASSWORD = randomBytes(32).toString('hex');
  assert.equal(await f.auth.verifySessionToken(token), false);
});

test('legacy sessions signed with the old password key are invalid after the v2 transition', async () => {
  const f = fixture();
  const old = await signPayload({ expiry: f.now() + 86400000 }, f.environment.ADMIN_PASSWORD, true);
  assert.equal(await f.auth.verifySessionToken(old), false);
  const currentPayload = JSON.parse(Buffer.from((await f.auth.createSessionToken()).split('.')[0], 'base64url').toString());
  assert.equal(await f.auth.verifySessionToken(await signPayload(currentPayload, f.environment.ADMIN_PASSWORD, true)), false);
});

test('login rejects absent configuration, malformed bodies, and wrong passwords', async () => {
  const f = fixture();
  const login = f.load('app/api/admin/login/route.ts');
  for (const body of [null, [], {}, { password: 1 }, { password: '' }, { password: 'x'.repeat(257) }]) {
    const response = await login.POST(request('/api/admin/login', { method: 'POST', body }));
    assert.equal(response.status, 400);
    assert.equal(response.headers.has('set-cookie'), false);
  }
  assert.equal(f.reservations(), 0, 'Invalid bodies never reach the shared reservation store');
  const invalid = await login.POST(request('/api/admin/login', { method: 'POST', body: { password: randomBytes(32).toString('hex') } }));
  assert.equal(invalid.status, 401);
  assert.equal(f.reservations(), 1);
  delete f.environment.ADMIN_PASSWORD;
  const disabled = await login.POST(request('/api/admin/login', { method: 'POST', body: {} }));
  assert.equal(disabled.status, 503);
  assert.equal(disabled.headers.has('set-cookie'), false);
  f.environment.ADMIN_PASSWORD = 'weak-password';
  assert.equal((await login.POST(request('/api/admin/login', { method: 'POST', body: { password: 'weak-password' } }))).status, 503);
});

test('login sets a signed HttpOnly, Secure, SameSite cookie only after success', async () => {
  const f = fixture();
  const login = f.load('app/api/admin/login/route.ts');
  const response = await login.POST(request('/api/admin/login', {
    method: 'POST', body: { password: f.environment.ADMIN_PASSWORD },
  }));
  assert.equal(response.status, 200);
  assert.equal(await f.auth.verifySessionToken(response.cookies.get('admin_session').value), true);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=strict/i);
  assert.match(cookie, /Max-Age=28800/i);
  assert.equal(f.reservations(), 1);
});

test('login cannot issue a cookie when its durable rate limit or storage denies admission', async () => {
  const f = fixture();
  const login = f.load('app/api/admin/login/route.ts');
  f.setRateError(new f.limiter.AdminLoginRateLimitError(123));
  const limited = await login.POST(request('/api/admin/login', { method: 'POST', body: { password: f.environment.ADMIN_PASSWORD } }));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get('retry-after'), '123');
  assert.equal(limited.headers.has('set-cookie'), false);
  f.setRateError(new Error('private database secret must not be returned'));
  const unavailable = await login.POST(request('/api/admin/login', { method: 'POST', body: { password: f.environment.ADMIN_PASSWORD } }));
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.has('set-cookie'), false);
  assert.doesNotMatch(await unavailable.text(), /private database secret/);
});

test('login rejects foreign, missing and malformed origins or form submissions before password or storage', async () => {
  const f = fixture();
  const login = f.load('app/api/admin/login/route.ts');
  const unsafeHeaders = [
    { origin: null }, { origin: 'null' }, { origin: 'https://attacker.invalid' },
    { origin: 'https://www.priyamsameer.com/' },
    { origin: 'https://attacker@www.priyamsameer.com' },
    { origin: 'http://www.priyamsameer.com' },
    { origin: 'https://www.priyamsameer.com', 'sec-fetch-site': 'cross-site' },
    { origin: 'https://www.priyamsameer.com', 'sec-fetch-site': 'same-site' },
    { origin: 'https://attacker.invalid', host: 'attacker.invalid' },
    { 'content-type': null }, { 'content-type': 'text/plain' },
    { 'content-type': 'application/x-www-form-urlencoded' },
    { 'content-type': 'multipart/form-data; boundary=fixture' },
  ];
  for (const headers of unsafeHeaders) {
    const response = await login.POST(request('/api/admin/login', { method: 'POST', body: { password: f.environment.ADMIN_PASSWORD }, headers }));
    assert.equal(response.status, 403, JSON.stringify(headers));
    assert.equal(response.headers.has('set-cookie'), false);
  }
  assert.equal(f.reservations(), 0);
});

test('trusted origin policy keeps production, explicit preview and local development origins separate', async () => {
  const f = fixture();
  const attempt = (url, origin, host) => f.auth.isTrustedAdminRequest(new NextRequest(url, { method: 'POST', headers: { origin, host, 'content-type': 'application/json' } }));
  assert.equal(attempt('https://www.priyamsameer.com/api/admin/login', 'https://www.priyamsameer.com', 'www.priyamsameer.com'), true);
  assert.equal(attempt('https://www.priyamsameer.com/api/admin/login', 'https://priyamsameer.com', 'www.priyamsameer.com'), false);
  assert.equal(attempt('http://localhost:3000/api/admin/login', 'http://localhost:3000', 'localhost:3000'), false);
  f.environment.VERCEL_URL = 'portfolio-preview.vercel.app';
  assert.equal(attempt('https://portfolio-preview.vercel.app/api/admin/login', 'https://portfolio-preview.vercel.app', 'portfolio-preview.vercel.app'), true);
  assert.equal(attempt('https://other-preview.vercel.app/api/admin/login', 'https://other-preview.vercel.app', 'other-preview.vercel.app'), false);
  f.environment.NODE_ENV = 'development';
  assert.equal(attempt('http://localhost:3000/api/admin/login', 'http://localhost:3000', 'localhost:3000'), true);
  assert.equal(attempt('http://localhost:3000/api/admin/login', 'http://localhost:4310', 'localhost:3000'), false);
});

test('bounded JSON rejects dishonest declared sizes and chunked oversize bodies before login admission', async () => {
  const f = fixture();
  const login = f.load('app/api/admin/login/route.ts');
  for (const headers of [{ 'content-length': '2049' }, { 'content-length': '-1' }, { 'content-length': 'unknown' }]) {
    const response = await login.POST(request('/api/admin/login', { method: 'POST', body: { password: f.environment.ADMIN_PASSWORD }, headers }));
    assert.equal(response.status, 400);
    assert.equal(response.headers.has('set-cookie'), false);
  }
  let canceled = false;
  const payload = Buffer.from(JSON.stringify({ password: f.environment.ADMIN_PASSWORD, padding: 'x'.repeat(4096) }));
  let offset = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (offset >= payload.length) return controller.close();
      controller.enqueue(payload.subarray(offset, offset + 512)); offset += 512;
    },
    cancel() { canceled = true; },
  });
  const oversized = await login.POST(request('/api/admin/login', { method: 'POST', raw: stream, headers: { 'content-length': null } }));
  assert.equal(oversized.status, 400);
  assert.equal(oversized.headers.has('set-cookie'), false);
  assert.equal(canceled, true);
  assert.equal(f.reservations(), 0);
  await assert.rejects(f.auth.readAdminJSON(request('/api/admin/content', { method: 'POST', raw: '{malformed' })), /Invalid request payload/);
  const valid = await f.auth.readAdminJSON(request('/api/admin/content', { method: 'POST', body: { title: 'Readable' } }));
  assert.equal(valid.title, 'Readable');
});

test('middleware protects every admin endpoint and page while allowing login', async () => {
  const f = fixture();
  const { middleware } = f.load('middleware.ts');
  for (const url of ['/api/admin/content', '/api/admin/content/item', '/api/admin/content/item/status', '/api/admin/migrate', '/api/admin/logout', '/api/admin/blob-upload']) {
    assert.equal((await middleware(request(url))).status, 401);
  }
  const page = await middleware(request('/minforyam'));
  assert.equal(page.status, 307);
  assert.equal(page.headers.get('location'), 'https://www.priyamsameer.com/minforyam/login');
  for (const url of ['/api/admin/login', '/minforyam/login']) {
    assert.equal((await middleware(request(url))).headers.get('x-middleware-next'), '1');
  }
  const token = await f.auth.createSessionToken();
  assert.equal((await middleware(request('/api/admin/migrate', { token }))).headers.get('x-middleware-next'), '1');
  delete f.environment.ADMIN_PASSWORD;
  assert.equal((await middleware(request('/api/admin/migrate', { token }))).status, 401);
});

test('all admin data handlers enforce authorization before touching services', async () => {
  const f = fixture();
  const forbiddenService = () => { throw new Error('An unauthenticated request touched a service'); };
  const mocks = {
    '@/lib/db': { __esModule: true, default: forbiddenService },
    '@/lib/slugify': {},
    '@/lib/validation': {},
    '@/lib/pdf': { extractPdfText: forbiddenService },
    '@vercel/blob': { del: forbiddenService },
    'next/headers': { cookies: forbiddenService },
  };
  const handlers = [
    ['app/api/admin/content/route.ts', ['GET', 'POST']],
    ['app/api/admin/content/[id]/route.ts', ['GET', 'PUT', 'DELETE']],
    ['app/api/admin/content/[id]/status/route.ts', ['PUT']],
    ['app/api/admin/migrate/route.ts', ['POST']],
    ['app/api/admin/logout/route.ts', ['POST']],
  ];
  for (const [filename, methods] of handlers) {
    const route = f.load(filename, mocks);
    for (const method of methods) {
      const response = await route[method](request('/api/admin/protected', { method }), { params: { id: 'item' } });
      assert.equal(response.status, 401, `${filename} ${method}`);
    }
  }
});

test('valid cookies cannot authorize CMS writes from another origin or an HTML form, independently of middleware', async () => {
  const f = fixture();
  const token = await f.auth.createSessionToken();
  let services = 0;
  const forbiddenService = () => { services += 1; throw new Error('A forbidden-origin request touched a service'); };
  const mocks = {
    '@/lib/db': { __esModule: true, default: forbiddenService },
    '@/lib/slugify': {}, '@/lib/validation': {},
    '@/lib/pdf': { extractPdfText: forbiddenService },
    '@vercel/blob': { del: forbiddenService },
  };
  const handlers = [
    ['app/api/admin/content/route.ts', 'POST', '/api/admin/content'],
    ['app/api/admin/content/[id]/route.ts', 'PUT', '/api/admin/content/item'],
    ['app/api/admin/content/[id]/route.ts', 'DELETE', '/api/admin/content/item'],
    ['app/api/admin/content/[id]/status/route.ts', 'PUT', '/api/admin/content/item/status'],
    ['app/api/admin/migrate/route.ts', 'POST', '/api/admin/migrate'],
    ['app/api/admin/logout/route.ts', 'POST', '/api/admin/logout'],
  ];
  for (const [filename, method, url] of handlers) {
    const route = f.load(filename, mocks);
    for (const headers of [{ origin: null }, { origin: 'https://attacker.invalid' }, { 'sec-fetch-site': 'cross-site' }, { 'content-type': 'application/x-www-form-urlencoded' }]) {
      const response = await route[method](request(url, { method, token, body: {}, headers }), { params: Promise.resolve({ id: 'item' }) });
      assert.equal(response.status, 401, `${filename} ${method} ${JSON.stringify(headers)}`);
      assert.equal(response.headers.has('set-cookie'), false);
    }
  }
  assert.equal(services, 0);
  const upload = f.load('app/api/admin/blob-upload/route.ts', {
    '@/lib/validation': {}, '@vercel/blob/client': { handleUpload: forbiddenService },
  });
  for (const headers of [{ origin: null }, { origin: 'https://attacker.invalid' }, { 'content-type': 'text/plain' }]) {
    const response = await upload.POST(request('/api/admin/blob-upload', { method: 'POST', token,
      body: { type: 'blob.generate-client-token', payload: { pathname: 'image.png' } }, headers }));
    assert.equal(response.status, 401);
  }
  assert.equal(services, 0);
});

test('middleware denies cross-origin writes even with a valid signed session', async () => {
  const f = fixture();
  const { middleware } = f.load('middleware.ts');
  const token = await f.auth.createSessionToken();
  for (const headers of [{ origin: null }, { origin: 'https://attacker.invalid' }, { 'content-type': 'text/plain' }]) {
    const response = await middleware(request('/api/admin/content', { method: 'POST', token, body: {}, headers }));
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal((await middleware(request('/api/admin/content', { token }))).headers.get('x-middleware-next'), '1', 'Read routes remain session protected without a write-origin requirement');
});

test('web migration remains disabled by default even for an authenticated same-origin owner', async () => {
  const f = fixture();
  const token = await f.auth.createSessionToken();
  const migration = f.load('app/api/admin/migrate/route.ts', { '@/lib/db': { __esModule: true, default: () => assert.fail('Disabled migration accessed the database') } });
  const response = await migration.POST(request('/api/admin/migrate', { method: 'POST', token, body: {} }));
  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /disabled/i);
});

test('same-origin sign-out clears the strict admin cookie and rejects forged sign-out', async () => {
  const f = fixture();
  const token = await f.auth.createSessionToken();
  const logout = f.load('app/api/admin/logout/route.ts');
  const response = await logout.POST(request('/api/admin/logout', { method: 'POST', token }));
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /admin_session=;/);
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/i);
  assert.match(response.headers.get('set-cookie'), /SameSite=strict/i);
  assert.equal((await logout.POST(request('/api/admin/logout', { method: 'POST', token, headers: { origin: 'https://attacker.invalid' } }))).status, 401);
});

test('a forged callback header cannot authorize upload token generation', async () => {
  const f = fixture();
  const { middleware } = f.load('middleware.ts');
  let sdkCalled = false;
  const upload = f.load('app/api/admin/blob-upload/route.ts', {
    '@/lib/validation': {},
    '@vercel/blob/client': { handleUpload: async () => { sdkCalled = true; return {}; } },
  });
  const options = {
    method: 'POST',
    signature: randomBytes(32).toString('hex'),
    body: { type: 'blob.generate-client-token', payload: { pathname: 'image.png' } },
  };
  assert.equal((await middleware(request('/api/admin/blob-upload', options))).headers.get('x-middleware-next'), '1');
  assert.equal((await upload.POST(request('/api/admin/blob-upload', options))).status, 401);
  assert.equal(sdkCalled, false);
});

test('authenticated uploads keep per-type size and MIME constraints', async () => {
  const f = fixture();
  const validation = f.load('lib/validation.ts');
  let constraints;
  const upload = f.load('app/api/admin/blob-upload/route.ts', {
    '@/lib/validation': validation,
    '@vercel/blob/client': {
      handleUpload: async options => {
        constraints = await options.onBeforeGenerateToken('cv.pdf', options.body.payload.clientPayload);
        return { type: 'blob.generate-client-token', clientToken: randomBytes(32).toString('hex') };
      },
    },
  });
  const token = await f.auth.createSessionToken();
  const response = await upload.POST(request('/api/admin/blob-upload', {
    method: 'POST', token,
    body: { type: 'blob.generate-client-token', payload: { pathname: 'cv.pdf', clientPayload: JSON.stringify({ type: 'cv' }) } },
  }));
  assert.equal(response.status, 200);
  assert.deepEqual(constraints.allowedContentTypes, validation.TYPE_CONFIGS.cv.allowedMimes);
  assert.equal(constraints.maximumSizeInBytes, validation.TYPE_CONFIGS.cv.maxFileSizeBytes);
  assert.equal(JSON.parse(constraints.tokenPayload).type, 'cv');
});

test('Blob completion callbacks require a valid SDK signature without a browser cookie', async () => {
  const { createHmac } = require('node:crypto');
  const { handleUpload } = require('@vercel/blob/client');
  const f = fixture();
  delete f.environment.ADMIN_PASSWORD;
  const readWriteToken = randomBytes(32).toString('hex');
  const upload = f.load('app/api/admin/blob-upload/route.ts', {
    '@/lib/validation': {},
    '@vercel/blob/client': { handleUpload: options => handleUpload({ ...options, token: readWriteToken }) },
  });
  const { middleware } = f.load('middleware.ts');
  const body = { type: 'blob.upload-completed', payload: { blob: { pathname: 'image.png' }, tokenPayload: null } };
  const signature = createHmac('sha256', readWriteToken).update(JSON.stringify(body)).digest('hex');
  const validOptions = { method: 'POST', body, signature };
  assert.equal((await middleware(request('/api/admin/blob-upload', validOptions))).headers.get('x-middleware-next'), '1');
  const valid = await upload.POST(request('/api/admin/blob-upload', validOptions));
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { type: 'blob.upload-completed', response: 'ok' });
  assert.equal((await upload.POST(request('/api/admin/blob-upload', { method: 'POST', body }))).status, 400);
  assert.equal((await upload.POST(request('/api/admin/blob-upload', { method: 'POST', body, signature: randomBytes(32).toString('hex') }))).status, 400);
  const alteredBody = { ...body, payload: { blob: { pathname: 'different.png' }, tokenPayload: null } };
  assert.equal((await upload.POST(request('/api/admin/blob-upload', { method: 'POST', body: alteredBody, signature }))).status, 400);
});
