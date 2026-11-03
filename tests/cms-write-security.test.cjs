'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { pathToFileURL } = require('node:url');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.join(__dirname, '..');
const environment = { BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_teststore_SyntheticOnlyForTests' };
const hostname = 'teststore.public.blob.vercel-storage.com';
const ownerId = '11111111-1111-4111-8111-111111111111';
const ownedMediaId = '22222222-2222-4222-8222-222222222222';
const foreignMediaId = '33333333-3333-4333-8333-333333333333';

function load(filename, stubs = {}, globals = {}) {
  const source = readFileSync(path.join(root, filename), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    process: { env: { ...environment } },
    Buffer, URL, Uint8Array, AbortSignal, Request, Response,
    console: { error() {} },
    require: id => Object.hasOwn(stubs, id) ? stubs[id] : require(id),
    ...globals,
  }, { filename });
  return module.exports;
}

const mediaLibrary = load('lib/admin-media.ts');
const validation = load('lib/validation.ts', { './admin-media': mediaLibrary });
const pdfMedia = () => ({
  blob_url: `https://${hostname}/cv/sample.pdf`, blob_pathname: 'cv/sample.pdf',
  kind: 'pdf', mime_type: 'application/pdf', protected: false, sort_order: 0,
  width: null, height: null, orientation: null,
});
const payload = () => ({
  type: 'cv', title: 'Synthetic CV', summary: null, body_markdown: '', meta: {},
  status: 'draft', downloadable: true, sort_order: 0, media: [pdfMedia()],
});

function routeFixture(filename) {
  const calls = { sql: [], downloads: 0, parses: 0, deletions: 0, slugs: 0 };
  const db = async (strings, ...values) => {
    const sql = strings.join('?').replace(/\s+/g, ' ').trim();
    calls.sql.push({ sql, values });
    if (sql.startsWith('SELECT id, type FROM content_items')) return { rows: [{ id: ownerId, type: 'cv' }] };
    if (sql.startsWith('SELECT id, blob_url FROM media_assets')) return { rows: [{ id: ownedMediaId, blob_url: pdfMedia().blob_url }] };
    if (sql.startsWith('INSERT INTO content_items')) return { rows: [{ id: ownerId, slug: 'synthetic-cv' }] };
    return { rows: [], rowCount: 1 };
  };
  const safeDownload = (...args) => mediaLibrary.downloadAdminPDF(args[0], args[1], {
    env: environment,
    fetcher: async () => {
      calls.downloads++;
      return new Response('%PDF-1.7\nsynthetic PDF fixture', { headers: { 'content-type': 'application/pdf' } });
    },
  });
  const route = load(filename, {
    '@/lib/admin-media': { ...mediaLibrary, downloadAdminPDF: safeDownload },
    '@/lib/auth': {
      // These tests start after successful owner authorization. Independent
      // authentication tests exercise real session and origin rejection.
      isAdminAuthenticated: async () => true,
      isAdminWriteAuthenticated: async () => true,
      readAdminJSON: request => request.json(),
    },
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
    '@vercel/blob': { del: async () => { calls.deletions++; } },
    '@/lib/db': db,
    '@/lib/pdf': { extractPdfText: async () => { calls.parses++; return 'Synthetic extracted CV'; } },
    '@/lib/slugify': {
      slugify: title => title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      deduplicateSlug: async slug => { calls.slugs++; return slug; },
    },
    '@/lib/validation': validation,
  });
  return { route, calls };
}

function request(method, body) {
  return new Request(`https://www.priyamsameer.com/api/admin/content/${ownerId}`, {
    method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

function assertNoSideEffects(calls) {
  assert.equal(calls.downloads, 0, 'Rejected payload triggered an outbound request');
  assert.equal(calls.parses, 0, 'Rejected payload reached the PDF parser');
  assert.equal(calls.deletions, 0, 'Rejected payload deleted storage objects');
  assert.equal(calls.slugs, 0, 'Rejected payload reached slug/storage work');
  assert.ok(calls.sql.every(call => /^SELECT\b/.test(call.sql)), 'Rejected payload mutated content');
}

test('content validation accepts normal owner data and rejects malformed content before storage', () => {
  assert.equal(validation.validateContentPayload(payload()), null);
  const invalid = [
    null, [], 'string', { ...payload(), type: 'unrecognized' },
    { ...payload(), title: 12 }, { ...payload(), title: 'x'.repeat(301) },
    { ...payload(), summary: {} }, { ...payload(), summary: 'x'.repeat(4001) },
    { ...payload(), body_markdown: [] }, { ...payload(), body_markdown: 'x'.repeat(100001) },
    { ...payload(), meta: [] }, { ...payload(), meta: { content: 'x'.repeat(20001) } },
    { ...payload(), sort_order: 1.5 }, { ...payload(), sort_order: 100001 },
    { ...payload(), media: {} }, { ...payload(), media: [null] },
    { ...payload(), media: [{ ...pdfMedia(), kind: 'image' }] },
    { ...payload(), media: [{ ...pdfMedia(), mime_type: 'text/html' }] },
    { ...payload(), media: [{ ...pdfMedia(), alt_text: {} }] },
  ];
  for (const body of invalid) assert.equal(typeof validation.validateContentPayload(body), 'string');
});

test('malformed database-bound media and flags are rejected before a content record can be partially saved', () => {
  const invalid = [
    { ...payload(), downloadable: 'true' },
    ...[
      { protected: 'false' }, { width: '100' }, { width: -1 },
      { height: 1.5 }, { height: {} }, { orientation: 'attacker-controlled-value' },
      { sort_order: [] }, { sort_order: -Infinity },
    ].map(change => ({ ...payload(), media: [{ ...pdfMedia(), ...change }] })),
  ];
  for (const body of invalid) assert.equal(typeof validation.validateContentPayload(body), 'string');
});

const unsafeMedia = [
  ['http://127.0.0.1/private.pdf', 'private.pdf'],
  ['https://169.254.169.254/latest/meta-data/', 'latest/meta-data/'],
  ['file:///etc/passwd', 'etc/passwd'],
  [`https://${hostname}.attacker.invalid/cv/sample.pdf`, 'cv/sample.pdf'],
  ['https://other-store.public.blob.vercel-storage.com/cv/sample.pdf', 'cv/sample.pdf'],
  [`https://${hostname}/cv/sample.pdf?redirect=http://localhost`, 'cv/sample.pdf'],
  [`https://${hostname}/cv/sample.pdf`, 'other-file.pdf'],
];

for (const method of ['POST', 'PUT']) {
  test(`${method} rejects SSRF and foreign storage objects before fetch, parsing or writes`, async () => {
    for (const [blob_url, blob_pathname] of unsafeMedia) {
      const filename = method === 'POST' ? 'app/api/admin/content/route.ts' : 'app/api/admin/content/[id]/route.ts';
      const f = routeFixture(filename);
      const body = { ...payload(), media: [{ ...pdfMedia(), blob_url, blob_pathname }] };
      const response = await f.route[method](request(method, body), { params: Promise.resolve({ id: ownerId }) });
      assert.equal(response.status, 400, blob_url);
      assertNoSideEffects(f.calls);
    }
  });
}

test('PUT rejects a media ID owned by another record before changing any content', async () => {
  const f = routeFixture('app/api/admin/content/[id]/route.ts');
  const body = { ...payload(), media: [{ ...pdfMedia(), id: foreignMediaId }] };
  const response = await f.route.PUT(request('PUT', body), { params: Promise.resolve({ id: ownerId }) });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /does not belong/);
  assertNoSideEffects(f.calls);
  assert.equal(f.calls.sql.length, 2, 'Ownership should use only content and associated-media reads');
});

test('owner content flows still save a valid CV and safely read its own uploaded PDF', async () => {
  for (const method of ['POST', 'PUT']) {
    const filename = method === 'POST' ? 'app/api/admin/content/route.ts' : 'app/api/admin/content/[id]/route.ts';
    const f = routeFixture(filename);
    const body = payload();
    if (method === 'PUT') body.media[0].id = ownedMediaId;
    const response = await f.route[method](request(method, body), { params: Promise.resolve({ id: ownerId }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).success, true);
    assert.equal(f.calls.downloads, 1);
    assert.equal(f.calls.parses, 1);
    assert.ok(f.calls.sql.some(call => /^(?:INSERT|UPDATE)\b/.test(call.sql)));
    assert.equal(f.calls.deletions, 0);
  }
});

test('web migration is disabled for an authenticated owner without any database access', async () => {
  const f = routeFixture('app/api/admin/migrate/route.ts');
  const response = await f.route.POST(request('POST', {}));
  assert.equal(response.status, 403);
  assert.match((await response.json()).error, /disabled/);
  assert.equal(f.calls.sql.length, 0);
});

test('headers deny cross-site framing while retaining same-site demo embedding', async () => {
  const { default: config } = await import(pathToFileURL(path.join(root, 'next.config.mjs')).href);
  const rules = await config.headers();
  const base = new Map(rules.find(rule => rule.source === '/:path*').headers.map(header => [header.key.toLowerCase(), header.value]));
  assert.equal(config.poweredByHeader, false);
  assert.equal(base.get('x-frame-options'), 'SAMEORIGIN');
  assert.match(base.get('content-security-policy'), /frame-ancestors 'self'/);
  assert.match(base.get('content-security-policy'), /object-src 'none'/);
  assert.match(base.get('content-security-policy'), /base-uri 'self'/);
  for (const prefix of ['/minforyam/:path*', '/api/admin/:path*']) {
    const effective = new Map(base);
    for (const header of rules.find(rule => rule.source === prefix).headers) effective.set(header.key.toLowerCase(), header.value);
    assert.equal(effective.get('x-frame-options'), 'DENY');
    assert.match(effective.get('content-security-policy'), /frame-ancestors 'none'/);
    assert.equal(effective.get('cache-control'), 'no-store');
  }
  // Public demo paths inherit SAMEORIGIN rather than the private editor DENY.
  assert.ok(!rules.some(rule => rule.source.startsWith('/github-demos') && rule.headers.some(header => header.key.toLowerCase() === 'x-frame-options' && header.value === 'DENY')));
});
