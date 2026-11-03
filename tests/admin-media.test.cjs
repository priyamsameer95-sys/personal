'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const source = readFileSync(path.join(__dirname, '../lib/admin-media.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const moduleFixture = { exports: {} };
vm.runInNewContext(outputText, {
  module: moduleFixture, exports: moduleFixture.exports, require, process: { env: {} },
  URL, Uint8Array, AbortSignal, fetch, Response,
});
const { getAdminBlobHostname, validateAdminMediaLocation, downloadAdminPDF, MAX_ADMIN_PDF_BYTES } = moduleFixture.exports;
const env = { BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_teststore_SyntheticSecretOnly' };
const hostname = 'teststore.public.blob.vercel-storage.com';
const file = 'CV - sample.pdf';
const url = `https://${hostname}/CV%20-%20sample.pdf`;
const pdf = Buffer.from('%PDF-1.7\nsynthetic PDF fixture');
const pdfResponse = (body = pdf, headers = {}) => new Response(body, { headers: { 'content-type': 'application/pdf', ...headers } });

test('media locations are bound to the configured store and exact uploaded pathname', () => {
  assert.equal(getAdminBlobHostname(env), hostname);
  assert.equal(validateAdminMediaLocation(url, file, env), null);
  assert.equal(validateAdminMediaLocation(`https://${hostname}/folder/caf%C3%A9.png`, 'folder/café.png', env), null);
  assert.equal(validateAdminMediaLocation(`https://${hostname}/literal%2520name.png`, 'literal%20name.png', env), null);
  assert.equal(getAdminBlobHostname({ CMS_BLOB_HOSTNAME: hostname }), hostname);
  assert.equal(getAdminBlobHostname({ ...env, CMS_BLOB_HOSTNAME: hostname }), hostname);
  assert.equal(getAdminBlobHostname({ ...env, CMS_BLOB_HOSTNAME: 'other.public.blob.vercel-storage.com' }), null);
  for (const unknown of [{}, { BLOB_READ_WRITE_TOKEN: 'unrecognized-format' }, { CMS_BLOB_HOSTNAME: 'attacker.example' }, { CMS_BLOB_HOSTNAME: `${hostname}:443` }, { CMS_BLOB_HOSTNAME: `${hostname}.` }]) {
    assert.equal(getAdminBlobHostname(unknown), null);
    assert.notEqual(validateAdminMediaLocation(url, file, unknown), null);
  }
});

test('SSRF inputs, host lookalikes, redirects, URL credentials and pathname ambiguity are rejected before fetching', async () => {
  const invalid = [
    ['http://127.0.0.1/private.pdf', 'private.pdf'],
    ['https://169.254.169.254/private.pdf', 'private.pdf'],
    ['file:///etc/passwd', 'etc/passwd'],
    [`https://other.public.blob.vercel-storage.com/${file}`, file],
    [`https://${hostname}.attacker.example/${file}`, file],
    [`https://${hostname}@attacker.example/${file}`, file],
    [`https://user:secret@${hostname}/${file}`, file],
    [`https://${hostname}:443/CV%20-%20sample.pdf`, file],
    [url + '?redirect=http://127.0.0.1', file], [url + '#fragment', file], [url + '?', file],
    [url, 'other.pdf'], [url, '/' + file], [' ' + url, file],
    [`https://${hostname}/a%2fb.pdf`, 'a/b.pdf'], [`https://${hostname}/a%5cb.pdf`, 'a\\b.pdf'],
    [`https://${hostname}/a/../file.pdf`, 'a/../file.pdf'],
    [`https://${hostname}/%00file.pdf`, '\0file.pdf'],
    [null, file], [url, undefined],
  ];
  let calls = 0;
  for (const [location, pathname] of invalid) {
    assert.notEqual(validateAdminMediaLocation(location, pathname, env), null, String(location));
    await assert.rejects(downloadAdminPDF(location, pathname, { env, fetcher: async () => { calls++; } }), /configured Blob storage/);
  }
  assert.equal(calls, 0);
});

test('PDF downloads enforce timeout, no redirects, content type and PDF signature without arrayBuffer', async () => {
  let argumentsSeen;
  const bytes = await downloadAdminPDF(url, file, { env, fetcher: async (...args) => {
    argumentsSeen = args;
    const response = pdfResponse(pdf, { 'content-length': String(pdf.length), 'content-type': 'application/pdf; charset=binary' });
    response.arrayBuffer = () => { throw Error('Unbounded arrayBuffer is forbidden'); };
    return response;
  } });
  assert.equal(Buffer.from(bytes).toString(), pdf.toString());
  assert.equal(argumentsSeen[0], url);
  assert.equal(argumentsSeen[1].redirect, 'error');
  assert.equal(argumentsSeen[1].cache, 'no-store');
  assert.equal(argumentsSeen[1].headers.Accept, 'application/pdf');
  assert.ok(argumentsSeen[1].signal instanceof AbortSignal);
  for (const response of [
    new Response('redirect', { status: 302, headers: { location: 'http://127.0.0.1/' } }),
    new Response(pdf, { status: 404, headers: { 'content-type': 'application/pdf' } }),
    new Response(pdf, { headers: { 'content-type': 'text/html' } }),
    pdfResponse('<html>not a PDF</html>'), pdfResponse(''),
    pdfResponse(pdf, { 'content-length': String(pdf.length + 1) }),
    pdfResponse(pdf, { 'content-length': '-1' }),
  ]) {
    await assert.rejects(downloadAdminPDF(url, file, { env, fetcher: async () => response }), /could not be read safely/);
  }
});

test('oversized declared or streaming PDFs are cancelled before the parser receives them', async () => {
  assert.equal(MAX_ADMIN_PDF_BYTES, 20 * 1024 * 1024);
  let declaredCancelled = false;
  const declaredBody = new ReadableStream({ cancel() { declaredCancelled = true; } });
  await assert.rejects(downloadAdminPDF(url, file, { env, fetcher: async () => pdfResponse(declaredBody, { 'content-length': String(MAX_ADMIN_PDF_BYTES + 1) }) }), /could not be read safely/);
  assert.equal(declaredCancelled, true);
  let streamCancelled = false;
  let pulls = 0;
  const oversized = new ReadableStream({
    pull(controller) { pulls++; controller.enqueue(new Uint8Array(1024 * 1024)); },
    cancel() { streamCancelled = true; },
  }, { highWaterMark: 0 });
  await assert.rejects(downloadAdminPDF(url, file, { env, fetcher: async () => pdfResponse(oversized) }), /could not be read safely/);
  assert.equal(streamCancelled, true);
  assert.equal(pulls, 21);
});

test('transport diagnostics and secret-bearing URLs never escape PDF failures', async () => {
  await assert.rejects(downloadAdminPDF(url, file, { env, fetcher: async () => { throw Error('private diagnostics synthetic-password'); } }), error => {
    assert.match(error.message, /could not be read safely/);
    assert.doesNotMatch(error.message, /diagnostics|password|teststore|https:/);
    return true;
  });
});
