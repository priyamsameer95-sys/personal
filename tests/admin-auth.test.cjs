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
  const dependencies = { '@/lib/auth': auth, './lib/auth': auth };
  return {
    environment,
    auth,
    advance: milliseconds => { now += milliseconds; },
    load: (filename, additional = {}) => loadModule(filename, { ...dependencies, ...additional }, environment, TestDate),
  };
}

function request(url, { method = 'GET', body, token, signature, ip } = {}) {
  const headers = new Headers();
  if (token) headers.set('cookie', `admin_session=${token}`);
  if (signature) headers.set('x-vercel-signature', signature);
  if (ip) headers.set('x-forwarded-for', ip);
  if (body !== undefined) headers.set('content-type', 'application/json');
  return new NextRequest(`https://portfolio.example${url}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

async function signPayload(payload, password) {
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const key = await webcrypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadBase64));
  return `${payloadBase64}.${Buffer.from(signature).toString('hex')}`;
}

test('sessions require a configured password and fail closed if it is removed', async () => {
  const f = fixture();
  const token = await f.auth.createSessionToken();
  for (const missing of [undefined, '', '  \n\t']) {
    f.environment.ADMIN_PASSWORD = missing;
    assert.equal(await f.auth.verifySessionToken(token), false);
    await assert.rejects(f.auth.createSessionToken(), /not configured/);
  }
});

test('configured sessions keep their cookie format and 24-hour lifetime', async () => {
  const f = fixture();
  const token = await f.auth.createSessionToken();
  assert.match(token, /^[A-Za-z0-9_-]+\.[a-f0-9]{64}$/);
  assert.equal(await f.auth.verifySessionToken(token), true);
  f.advance(24 * 60 * 60 * 1000 - 1);
  assert.equal(await f.auth.verifySessionToken(token), true);
  f.advance(1);
  assert.equal(await f.auth.verifySessionToken(token), false);
});

test('tampered, oversized, malformed, and invalid-expiry sessions are rejected', async () => {
  const f = fixture();
  const token = await f.auth.createSessionToken();
  const [payload, signature] = token.split('.');
  for (const invalid of [undefined, '', 'bad', `${payload}.`, `${payload}.zz`, `${payload}.${signature}.extra`, 'a'.repeat(1025)]) {
    assert.equal(await f.auth.verifySessionToken(invalid), false);
  }
  const alteredSignature = `${signature[0] === '0' ? '1' : '0'}${signature.slice(1)}`;
  assert.equal(await f.auth.verifySessionToken(`${payload}.${alteredSignature}`), false);
  for (const invalidPayload of [{}, null, { expiry: 'future' }, { expiry: Date.now() + 0.5 }, { expiry: 0 }]) {
    assert.equal(await f.auth.verifySessionToken(await signPayload(invalidPayload, f.environment.ADMIN_PASSWORD)), false);
  }
  f.environment.ADMIN_PASSWORD = randomBytes(32).toString('hex');
  assert.equal(await f.auth.verifySessionToken(token), false);
});

test('login rejects absent configuration, malformed bodies, and wrong passwords', async () => {
  const f = fixture();
  const login = f.load('app/api/admin/login/route.ts');
  for (const body of [null, [], {}, { password: 1 }, { password: '' }]) {
    const response = await login.POST(request('/api/admin/login', { method: 'POST', body }));
    assert.equal(response.status, 400);
    assert.equal(response.headers.has('set-cookie'), false);
  }
  const invalid = await login.POST(request('/api/admin/login', { method: 'POST', body: { password: randomBytes(32).toString('hex') } }));
  assert.equal(invalid.status, 401);
  delete f.environment.ADMIN_PASSWORD;
  const disabled = await login.POST(request('/api/admin/login', { method: 'POST', body: {} }));
  assert.equal(disabled.status, 503);
  assert.equal(disabled.headers.has('set-cookie'), false);
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
  assert.match(cookie, /SameSite=lax/i);
  assert.match(cookie, /Max-Age=86400/i);
});

test('login rate limits repeated failures and clears them after successful login', async () => {
  const f = fixture();
  const login = f.load('app/api/admin/login/route.ts');
  const wrongPassword = randomBytes(32).toString('hex');
  for (let i = 0; i < 4; i++) {
    assert.equal((await login.POST(request('/api/admin/login', { method: 'POST', body: { password: wrongPassword } }))).status, 401);
  }
  assert.equal((await login.POST(request('/api/admin/login', { method: 'POST', body: { password: f.environment.ADMIN_PASSWORD } }))).status, 200);
  for (let i = 0; i < 5; i++) {
    assert.equal((await login.POST(request('/api/admin/login', { method: 'POST', body: { password: wrongPassword } }))).status, 401);
  }
  assert.equal((await login.POST(request('/api/admin/login', { method: 'POST', body: { password: wrongPassword } }))).status, 429);
  f.advance(15 * 60 * 1000 + 1);
  assert.equal((await login.POST(request('/api/admin/login', { method: 'POST', body: { password: f.environment.ADMIN_PASSWORD } }))).status, 200);
});

test('middleware protects every admin endpoint and page while allowing login', async () => {
  const f = fixture();
  const { middleware } = f.load('middleware.ts');
  for (const url of ['/api/admin/content', '/api/admin/content/item', '/api/admin/content/item/status', '/api/admin/migrate', '/api/admin/logout', '/api/admin/blob-upload']) {
    assert.equal((await middleware(request(url))).status, 401);
  }
  const page = await middleware(request('/minforyam'));
  assert.equal(page.status, 307);
  assert.equal(page.headers.get('location'), 'https://portfolio.example/minforyam/login');
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
