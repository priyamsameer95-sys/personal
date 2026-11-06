#!/usr/bin/env node
'use strict';

const http = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { loadLocalConnection, createLocalDataProvider } = require('./local-analytics-data.cjs');
const { normalizeOptions } = require('../lib/analytics-explore.cjs');

const UPSTREAM = 'https://www.priyamsameer.com';
const SESSION_MS = 24 * 60 * 60 * 1000;
const RETRY_MS = 15 * 60 * 1000;
const ASSETS = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/dashboard.css', ['dashboard.css', 'text/css; charset=utf-8']],
  ['/dashboard.js', ['dashboard.js', 'text/javascript; charset=utf-8']],
  ['/charts.js', ['charts.js', 'text/javascript; charset=utf-8']],
  ['/icon.svg', ['icon.svg', 'image/svg+xml']],
]);
const COMMON_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data: blob:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

class RequestError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}

function notConnected() {
  return new RequestError(409, 'Live website data is not connected on this Mac.', 'DATA_NOT_CONNECTED');
}

async function readBounded(stream, maxBytes) {
  const chunks = [];
  let length = 0;
  for await (const chunk of stream) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += value.length;
    if (length > maxBytes) throw new RequestError(413, 'Request is too large.');
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function readJSON(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) {
    throw new RequestError(415, 'JSON is required.');
  }
  const length = Number(request.headers['content-length']);
  if (Number.isFinite(length) && length > 4096) throw new RequestError(413, 'Request is too large.');
  let body;
  try { body = JSON.parse(await readBounded(request, 4096)); } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(400, 'The request could not be read.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new RequestError(400, 'The request could not be read.');
  return body;
}

// The production origin and endpoints are fixed. Tests inject a transport, never a URL.
async function productionRequest(endpoint, { method = 'GET', body, cookie, maxBytes = 1024 * 1024 } = {}) {
  if (!/^\/api\/admin\/(?:login|analytics\?days=(?:7|30|90)|cv-leads\?format=csv)$/.test(endpoint)) {
    throw new Error('Unsupported production endpoint.');
  }
  const response = await fetch(`${UPSTREAM}${endpoint}`, {
    method,
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
    headers: {
      Accept: endpoint.includes('format=csv') ? 'text/csv' : 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel();
    throw new Error('Production response is too large.');
  }
  const responseBody = response.body ? await readBounded(response.body, maxBytes) : '';
  return { status: response.status, body: responseBody, setCookie: response.headers.get('set-cookie') || '' };
}

function sessionCookie(value) {
  if (typeof value !== 'string') return null;
  const token = value.startsWith('admin_session=') ? value.slice('admin_session='.length) : value;
  return /^[A-Za-z0-9_.-]{1,1024}$/.test(token) ? `admin_session=${token}` : null;
}

function sessionExpiry(cookie, now) {
  let expiry = now + SESSION_MS;
  try {
    const claimedExpiry = JSON.parse(Buffer.from(cookie.slice('admin_session='.length).split('.')[0], 'base64url').toString('utf8')).expiry;
    if (typeof claimedExpiry === 'number' && Number.isFinite(claimedExpiry)) expiry = Math.min(expiry, claimedExpiry);
  } catch { /* Only the production website verifies its signed credential. */ }
  return expiry;
}

// This transport credential never reaches browser HTML, responses, cookies or local storage.
// There is deliberately no local password and no endpoint for supplying a credential.
function createCredentialProvider({ env = process.env, requestUpstream = productionRequest, now = Date.now } = {}) {
  let cached = null;
  let pending = null;
  let retryAfter = 0;
  let closed = false;

  async function resolveCredential() {
    if (closed) return null;
    const configured = sessionCookie(env.ANALYTICS_ADMIN_SESSION);
    if (configured && sessionExpiry(configured, now()) > now()) return configured;
    if (cached && cached.expires > now()) return cached.cookie;
    if (now() < retryAfter || typeof env.ADMIN_PASSWORD !== 'string' || !env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length > 1024) return null;
    const result = await requestUpstream('/api/admin/login', { method: 'POST', body: { password: env.ADMIN_PASSWORD }, maxBytes: 8192 });
    if (closed) return null;
    if (result.status !== 200) { retryAfter = now() + RETRY_MS; return null; }
    const token = result.setCookie?.match(/(?:^|,\s*)admin_session=([A-Za-z0-9_.-]{1,1024})(?:;|$)/)?.[1];
    const cookie = sessionCookie(token);
    if (!cookie) { retryAfter = now() + RETRY_MS; return null; }
    const expires = sessionExpiry(cookie, now());
    if (expires <= now()) { retryAfter = now() + RETRY_MS; return null; }
    cached = { cookie, expires };
    return cookie;
  }

  return {
    async getCredential() {
      if (!pending) pending = resolveCredential().finally(() => { pending = null; });
      return pending;
    },
    invalidate() { cached = null; retryAfter = now() + RETRY_MS; },
    close() { closed = true; cached = null; },
  };
}

function createLocalAnalytics({ port = 4310, requestUpstream = productionRequest, now = Date.now, env = process.env, getCredential, getDataProvider } = {}) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local analytics port.');
  const authority = `127.0.0.1:${port}`;
  const origin = `http://${authority}`;
  const credentials = createCredentialProvider({ env, requestUpstream, now });
  const credentialForRequest = getCredential || credentials.getCredential;
  let closed = false;
  let directData = null;
  let directConnection = null;

  async function resolveDataProvider() {
    if (getDataProvider) return getDataProvider();
    const connection = await loadLocalConnection();
    if (!connection) return null;
    if (connection !== directConnection) {
      await directData?.close?.();
      directData = createLocalDataProvider({ connectionString: connection, now });
      directConnection = connection;
    }
    return directData;
  }

  function send(response, status, payload, headers = {}) {
    const text = typeof payload === 'string' || Buffer.isBuffer(payload) ? payload : JSON.stringify(payload);
    response.writeHead(status, { ...COMMON_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...headers });
    response.end(text);
  }
  async function authenticatedUpstream(endpoint, options) {
    if (closed) throw new RequestError(503, 'The local dashboard has stopped.');
    const cookie = sessionCookie(await credentialForRequest());
    if (!cookie) throw notConnected();
    const result = await requestUpstream(endpoint, { ...options, cookie });
    if (closed) throw new RequestError(503, 'The local dashboard has stopped.');
    if (result.status === 401 || result.status === 403) {
      credentials.invalidate();
      throw notConnected();
    }
    if (result.status !== 200) throw new RequestError(502, 'The live website could not return your report. Please try again.');
    return result;
  }

  async function handler(request, response) {
    try {
      const address = request.socket?.remoteAddress;
      if (request.headers.host !== authority || (address !== '127.0.0.1' && address !== '::ffff:127.0.0.1')) {
        throw new RequestError(403, 'This dashboard is available on this Mac only.');
      }
      if (!request.url || !request.url.startsWith('/') || request.url.startsWith('//')) throw new RequestError(400, 'Invalid request.');
      const url = new URL(request.url, origin);
      const pathname = url.pathname;

      if (ASSETS.has(pathname) && (request.method === 'GET' || request.method === 'HEAD') && !url.search) {
        const [filename, type] = ASSETS.get(pathname);
        const content = await readFile(path.join(__dirname, '..', 'local-analytics', filename));
        return send(response, 200, request.method === 'HEAD' ? '' : content, { 'Content-Type': type });
      }
      if (!['/api/report', '/api/export', '/api/explore', '/api/leads'].includes(pathname) || url.search) {
        return send(response, 404, { error: 'Not found.' });
      }
      if (request.method !== 'POST') return send(response, 405, { error: 'Use a same-origin dashboard request.' }, { Allow: 'POST' });
      // POST ensures browsers send Origin even for report reads and exports.
      if (request.headers.origin !== origin || request.headers['x-local-analytics'] !== '1') {
        throw new RequestError(403, 'Open the dashboard directly on this Mac.');
      }
      const body = await readJSON(request);
      if (pathname === '/api/explore') {
        try { normalizeOptions(body, now()); } catch (error) { throw new RequestError(400, error.message); }
        const provider = await resolveDataProvider();
        if (!provider?.explore) return send(response, 200, { available: false, reason: 'Journey tracking is not connected. Historical counts remain available.' });
        const report = await provider.explore(body);
        if ((!body.view || body.view === 'overview') && !body.device && !body.source && !body.path) {
          const { cvLeads, ...legacy } = await provider.getReport(body);
          report.legacy = legacy;
        }
        return send(response, 200, report);
      }
      if (pathname === '/api/leads') {
        if (Object.keys(body).length) throw new RequestError(400, 'Invalid request.');
        const provider = await resolveDataProvider();
        if (!provider?.getLeads) throw notConnected();
        return send(response, 200, await provider.getLeads());
      }
      if (pathname === '/api/report') {
        if (Object.keys(body).some(key => key !== 'days') || ![7, 30, 90].includes(body.days)) throw new RequestError(400, 'Choose 7, 30 or 90 days.');
        const provider = await resolveDataProvider();
        if (provider) return send(response, 200, await provider.getReport(body.days));
        const result = await authenticatedUpstream(`/api/admin/analytics?days=${body.days}`, { maxBytes: 1024 * 1024 });
        let report;
        try { report = JSON.parse(result.body); } catch { throw new RequestError(502, 'The live website returned an unreadable report.'); }
        if (!report || !Array.isArray(report.daily) || !Array.isArray(report.topPages) || !Array.isArray(report.cvLeads) || typeof report.pageViews !== 'number') {
          throw new RequestError(502, 'The live website returned an incomplete report.');
        }
        return send(response, 200, report);
      }
      if (Object.keys(body).length) throw new RequestError(400, 'Invalid request.');
      const provider = await resolveDataProvider();
      if (provider) return send(response, 200, await provider.exportCSV(), { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="cv-interests.csv"' });
      const result = await authenticatedUpstream('/api/admin/cv-leads?format=csv', { maxBytes: 3 * 1024 * 1024 });
      return send(response, 200, result.body, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="cv-interests.csv"' });
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 502;
      // Never forward upstream response bodies, exceptions or credentials into logs or responses.
      return send(response, status, { error: error instanceof RequestError ? error.message : 'The live website could not be reached. Please try again.', ...(error instanceof RequestError && error.code ? { code: error.code } : {}) });
    }
  }

  return { handler, origin, close() { closed = true; credentials.close(); void directData?.close?.(); } };
}

if (require.main === module) {
  const port = 4310;
  const dashboard = createLocalAnalytics({ port });
  const server = http.createServer(dashboard.handler);
  server.requestTimeout = 20000;
  server.headersTimeout = 10000;
  server.maxRequestsPerSocket = 100;
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`Local analytics: ${dashboard.origin}\nNo dashboard password. Available only on this Mac.\n`);
  });
  server.on('error', error => {
    process.stderr.write(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Open ${dashboard.origin} if the dashboard is already running.\n` : 'The local analytics dashboard could not start.\n');
    process.exitCode = 1;
  });
  function shutdown() { dashboard.close(); server.close(() => process.exit(0)); }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { createLocalAnalytics, productionRequest, createCredentialProvider };
