#!/usr/bin/env node
'use strict';

const http = require('node:http');
const { randomBytes } = require('node:crypto');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

const UPSTREAM = 'https://www.priyamsameer.com';
const SESSION_NAME = 'priyam_local_analytics';
const SESSION_MS = 24 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ASSETS = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/dashboard.css', ['dashboard.css', 'text/css; charset=utf-8']],
  ['/dashboard.js', ['dashboard.js', 'text/javascript; charset=utf-8']],
  ['/icon.svg', ['icon.svg', 'image/svg+xml']],
]);
const COMMON_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
};

class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
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

function createLocalAnalytics({ port = 4310, requestUpstream = productionRequest, now = Date.now } = {}) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid local analytics port.');
  const authority = `127.0.0.1:${port}`;
  const origin = `http://${authority}`;
  const sessions = new Map();
  let loginAttempts = [];

  function send(response, status, payload, headers = {}) {
    const text = typeof payload === 'string' || Buffer.isBuffer(payload) ? payload : JSON.stringify(payload);
    response.writeHead(status, { ...COMMON_HEADERS, 'Content-Type': 'application/json; charset=utf-8', ...headers });
    response.end(text);
  }
  function expireCookie() { return `${SESSION_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`; }
  function readSession(request) {
    const token = (request.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${SESSION_NAME}=([a-f0-9]{64})(?:;|$)`))?.[1];
    for (const [key, value] of sessions) if (value.expires <= now()) sessions.delete(key);
    return token && sessions.has(token) ? { token, ...sessions.get(token) } : null;
  }
  function requireSession(request) {
    const session = readSession(request);
    if (!session) throw new RequestError(401, 'Sign in to view your analytics.');
    return session;
  }
  async function authenticatedUpstream(request, endpoint, options) {
    const session = requireSession(request);
    const result = await requestUpstream(endpoint, { ...options, cookie: session.cookie });
    if (!readSession(request) || !sessions.has(session.token)) {
      throw new RequestError(401, 'Your local session ended. Please sign in again.');
    }
    if (result.status === 401 || result.status === 403) {
      sessions.delete(session.token);
      throw new RequestError(401, 'Your website session expired. Please sign in again.');
    }
    if (result.status !== 200) throw new RequestError(502, 'The live website could not return your report. Please try again.');
    return result;
  }

  async function handler(request, response) {
    try {
      const address = request.socket?.remoteAddress;
      if (request.headers.host !== authority || (address && address !== '127.0.0.1' && address !== '::ffff:127.0.0.1')) {
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
      if (!['/api/login', '/api/session', '/api/report', '/api/logout', '/api/export'].includes(pathname) || url.search) {
        return send(response, 404, { error: 'Not found.' });
      }
      if (request.method !== 'POST') return send(response, 405, { error: 'Use a same-origin dashboard request.' }, { Allow: 'POST' });
      // POST ensures browsers send Origin even for report reads and exports.
      if (request.headers.origin !== origin || request.headers['x-local-analytics'] !== '1') {
        throw new RequestError(403, 'Open the dashboard directly on this Mac.');
      }
      const body = await readJSON(request);
      if (pathname === '/api/login') {
        if (Object.keys(body).some(key => key !== 'password') || typeof body.password !== 'string' || !body.password || body.password.length > 1024) {
          throw new RequestError(400, 'Enter your existing website admin password.');
        }
        loginAttempts = loginAttempts.filter(time => time > now() - LOGIN_WINDOW_MS);
        if (loginAttempts.length >= 5) return send(response, 429, { error: 'Too many sign-in attempts. Please wait 15 minutes.' }, { 'Retry-After': '900' });
        loginAttempts.push(now());
        const result = await requestUpstream('/api/admin/login', { method: 'POST', body: { password: body.password }, maxBytes: 8192 });
        if (result.status === 401) throw new RequestError(401, 'That password was not accepted by your website.');
        if (result.status === 429) throw new RequestError(429, 'Your website has paused sign-in attempts. Please wait 15 minutes.');
        if (result.status !== 200) throw new RequestError(502, 'Website sign-in is unavailable. Please try again.');
        const cookie = result.setCookie.match(/(?:^|,\s*)admin_session=([A-Za-z0-9_.-]{1,1024})(?:;|$)/)?.[1];
        if (!cookie) throw new RequestError(502, 'The website did not return a valid session.');
        const token = randomBytes(32).toString('hex');
        let lifetime = SESSION_MS;
        try {
          const expiry = JSON.parse(Buffer.from(cookie.split('.')[0], 'base64url').toString('utf8')).expiry;
          if (typeof expiry === 'number' && Number.isFinite(expiry)) lifetime = Math.min(lifetime, expiry - now());
        } catch { /* The website authenticates its own opaque cookie on each report request. */ }
        if (lifetime <= 0) throw new RequestError(502, 'The website session has already expired.');
        if (sessions.size >= 8) sessions.delete(sessions.keys().next().value);
        const oldSession = readSession(request);
        if (oldSession) sessions.delete(oldSession.token);
        sessions.set(token, { cookie: `admin_session=${cookie}`, expires: now() + lifetime });
        loginAttempts = [];
        return send(response, 200, { authenticated: true }, { 'Set-Cookie': `${SESSION_NAME}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${Math.floor(lifetime / 1000)}` });
      }
      if (pathname === '/api/session') {
        if (Object.keys(body).length) throw new RequestError(400, 'Invalid request.');
        return send(response, 200, { authenticated: !!readSession(request) });
      }
      if (pathname === '/api/logout') {
        if (Object.keys(body).length) throw new RequestError(400, 'Invalid request.');
        const session = readSession(request);
        if (session) sessions.delete(session.token);
        return send(response, 200, { authenticated: false }, { 'Set-Cookie': expireCookie() });
      }
      if (pathname === '/api/report') {
        if (Object.keys(body).some(key => key !== 'days') || ![7, 30, 90].includes(body.days)) throw new RequestError(400, 'Choose 7, 30 or 90 days.');
        const result = await authenticatedUpstream(request, `/api/admin/analytics?days=${body.days}`, { maxBytes: 1024 * 1024 });
        let report;
        try { report = JSON.parse(result.body); } catch { throw new RequestError(502, 'The live website returned an unreadable report.'); }
        if (!report || !Array.isArray(report.daily) || !Array.isArray(report.topPages) || !Array.isArray(report.cvLeads) || typeof report.pageViews !== 'number') {
          throw new RequestError(502, 'The live website returned an incomplete report.');
        }
        return send(response, 200, report);
      }
      if (Object.keys(body).length) throw new RequestError(400, 'Invalid request.');
      const result = await authenticatedUpstream(request, '/api/admin/cv-leads?format=csv', { maxBytes: 3 * 1024 * 1024 });
      return send(response, 200, result.body, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="cv-interests.csv"' });
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 502;
      // Never forward upstream response bodies, exceptions or credentials into logs or responses.
      return send(response, status, { error: error instanceof RequestError ? error.message : 'The live website could not be reached. Please try again.' }, status === 401 ? { 'Set-Cookie': expireCookie() } : {});
    }
  }

  return { handler, origin, close: () => sessions.clear() };
}

if (require.main === module) {
  const port = 4310;
  const dashboard = createLocalAnalytics({ port });
  const server = http.createServer(dashboard.handler);
  server.requestTimeout = 20000;
  server.headersTimeout = 10000;
  server.maxRequestsPerSocket = 100;
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(`Private analytics: ${dashboard.origin}\nSign in with your existing website admin password.\n`);
  });
  server.on('error', error => {
    process.stderr.write(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Open ${dashboard.origin} if the dashboard is already running.\n` : 'The local analytics dashboard could not start.\n');
    process.exitCode = 1;
  });
  function shutdown() { dashboard.close(); server.close(() => process.exit(0)); }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { createLocalAnalytics, productionRequest, SESSION_NAME };
