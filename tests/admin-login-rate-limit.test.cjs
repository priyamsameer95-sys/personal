'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const syntheticConnection = 'postgresql://fixture:synthetic-secret@fixture.invalid/test';
const source = readFileSync(path.join(__dirname, '..', 'lib/admin-login-rate-limit.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

function load(db, environment = {}) {
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, URL, process: { env: environment },
    require: name => name === '@/lib/db' ? db : require(name),
  });
  return module.exports;
}

function request(ip = '192.0.2.10', extra = {}) {
  return new Request('https://portfolio.invalid/api/admin/login', {
    headers: { 'x-vercel-forwarded-for': ip, ...extra },
  });
}

// This adapter models atomic persisted reservations. Tests exercise caller
// behavior across module instances; SQL-shape assertions cover the actual guard.
function fixture() {
  const calls = [], windows = new Map();
  let now = Date.parse('2026-11-03T16:35:00Z');
  let fail = null, malformed = null;
  const db = async (strings, ...values) => {
    const sql = strings.join('?').replace(/\s+/g, ' ').trim();
    calls.push({ sql, values });
    if (fail && fail(sql)) throw new Error(`private diagnostics ${syntheticConnection}`);
    if (sql.startsWith('CREATE TABLE')) return { rows: [] };
    if (sql.startsWith('DELETE')) {
      for (const [key, value] of windows) if (value.expires < now - 86400000) windows.delete(key);
      return { rows: [] };
    }
    assert.match(sql, /^WITH current_window AS/);
    assert.equal(values[0], 900);
    assert.equal(values[1], 900);
    const fingerprint = values[2], globalLimit = values[5], ipLimit = values[7];
    assert.match(fingerprint, /^[a-f0-9]{64}$/);
    assert.deepEqual(values.slice(2, 5), [fingerprint, fingerprint, fingerprint]);
    assert.equal(values[6], fingerprint);
    const start = Math.floor(now / 900000) * 900000;
    const record = windows.get(start) || { total: 0, ips: new Map(), expires: start + 900000 };
    const count = record.ips.get(fingerprint) || 0;
    const allowed = record.total < globalLimit && count < ipLimit;
    if (allowed) {
      record.total += 1;
      record.ips.set(fingerprint, count + 1);
      windows.set(start, record);
    }
    return { rows: [malformed || { allowed, retry_after: Math.max(1, Math.ceil((record.expires - now) / 1000)) }] };
  };
  const env = { POSTGRES_URL: syntheticConnection, VERCEL: '1' };
  return { db, env, calls, windows, lib: load(db, env),
    advance: ms => { now += ms; }, setFailure: value => { fail = value; }, setMalformed: value => { malformed = value; } };
}

test('persisted login budget reserves five attempts and rejects more without incrementing counters', async () => {
  const f = fixture();
  for (let i = 0; i < 5; i++) await f.lib.reserveAdminLoginAttempt(request());
  const record = [...f.windows.values()][0];
  await assert.rejects(f.lib.reserveAdminLoginAttempt(request()), error => {
    assert.ok(error instanceof f.lib.AdminLoginRateLimitError);
    assert.equal(error.retryAfter, 600);
    return true;
  });
  assert.equal(record.total, 5);
  assert.equal([...record.ips.values()][0], 5);
});

test('all instances share the same stored limit and concurrent attempts cannot gain extra slots', async () => {
  const f = fixture();
  const instances = Array.from({ length: 4 }, () => load(f.db, f.env));
  const result = await Promise.allSettled(Array.from({ length: 20 }, (_, index) => instances[index % 4].reserveAdminLoginAttempt(request())));
  assert.equal(result.filter(row => row.status === 'fulfilled').length, 5);
  assert.equal([...f.windows.values()][0].total, 5);
  const freshProcess = load(f.db, f.env);
  await assert.rejects(freshProcess.reserveAdminLoginAttempt(request()), freshProcess.AdminLoginRateLimitError);
});

test('global budget bounds distributed attempts and denied addresses cannot grow the stored map', async () => {
  const f = fixture();
  for (let i = 1; i <= 50; i++) await f.lib.reserveAdminLoginAttempt(request(`192.0.2.${i}`));
  for (let i = 51; i <= 60; i++) await assert.rejects(f.lib.reserveAdminLoginAttempt(request(`192.0.2.${i}`)), f.lib.AdminLoginRateLimitError);
  const record = [...f.windows.values()][0];
  assert.equal(record.total, 50);
  assert.equal(record.ips.size, 50);
});

test('a new database-clock window permits another attempt and expired rows are pruned', async () => {
  const f = fixture();
  for (let i = 0; i < 5; i++) await f.lib.reserveAdminLoginAttempt(request());
  f.advance(600000);
  await f.lib.reserveAdminLoginAttempt(request());
  assert.equal(f.windows.size, 2);
  f.advance(2 * 86400000);
  await f.lib.reserveAdminLoginAttempt(request());
  assert.equal(f.windows.size, 1);
});

test('untrusted forwarding headers cannot change the fallback bucket on another host', async () => {
  const f = fixture();
  delete f.env.VERCEL;
  for (let i = 0; i < 5; i++) await f.lib.reserveAdminLoginAttempt(request(`192.0.2.${i}`, { 'x-forwarded-for': `198.51.100.${i}`, 'x-real-ip': `203.0.113.${i}` }));
  await assert.rejects(f.lib.reserveAdminLoginAttempt(request('192.0.2.99')), f.lib.AdminLoginRateLimitError);
  assert.equal([...f.windows.values()][0].ips.size, 1);
});

test('invalid and multiple deployment IPs share one fallback bucket', async () => {
  const f = fixture();
  for (const invalid of ['', 'unknown', '192.0.2.1, 198.51.100.1', '192.0.2.999', '[2001:db8::1]']) await f.lib.reserveAdminLoginAttempt(request(invalid));
  await assert.rejects(f.lib.reserveAdminLoginAttempt(request('not-an-ip')), f.lib.AdminLoginRateLimitError);
  assert.equal([...f.windows.values()][0].ips.size, 1);
});

test('equivalent IPv6 spellings share a canonical private bucket', async () => {
  const f = fixture();
  for (const address of ['2001:db8::1', '2001:0db8:0:0:0:0:0:1', '2001:DB8::1', '2001:db8::0001', '2001:0db8::1']) await f.lib.reserveAdminLoginAttempt(request(address));
  await assert.rejects(f.lib.reserveAdminLoginAttempt(request('2001:db8::1')), f.lib.AdminLoginRateLimitError);
  assert.equal([...f.windows.values()][0].ips.size, 1);
});

test('raw IP and configuration never enter SQL parameters, and admission is one atomic guarded statement', async () => {
  const f = fixture();
  await f.lib.reserveAdminLoginAttempt(request());
  const admission = f.calls.find(call => call.sql.startsWith('WITH current_window AS'));
  assert.match(admission.sql, /ON CONFLICT \(window_start\) DO UPDATE/);
  assert.match(admission.sql, /WHERE admin_login_attempt_budgets.attempt_count < \? AND COALESCE/);
  assert.match(admission.sql, /ip_counts ->> \?\)::INTEGER, 0\) < \? RETURNING/);
  assert.match(admission.sql, /SELECT EXISTS \(SELECT 1 FROM reservation\) AS allowed/);
  for (const call of f.calls) {
    assert.ok(!call.values.includes('192.0.2.10'));
    assert.ok(!call.values.includes(syntheticConnection));
    assert.doesNotMatch(call.sql, /192\.0\.2\.10|synthetic-secret/);
  }
  assert.equal(f.calls.filter(call => call.sql.startsWith('CREATE TABLE')).length, 1);
});

test('missing database configuration fails closed without touching storage', async () => {
  const f = fixture();
  const missing = load(f.db, { VERCEL: '1' });
  await assert.rejects(missing.reserveAdminLoginAttempt(request()), missing.AdminLoginRateStorageError);
  assert.equal(f.calls.length, 0);
});

test('schema failures can retry, and no store failure falls back to ephemeral admission', async () => {
  for (const startsWith of ['CREATE TABLE', 'DELETE', 'WITH current_window AS']) {
    const f = fixture();
    f.setFailure(sql => sql.startsWith(startsWith));
    await assert.rejects(f.lib.reserveAdminLoginAttempt(request()), error => {
      assert.ok(error instanceof f.lib.AdminLoginRateStorageError);
      assert.doesNotMatch(error.message, /postgres|synthetic-secret|private diagnostics/);
      return true;
    });
    assert.equal(f.windows.size, 0);
    f.setFailure(null);
    await f.lib.reserveAdminLoginAttempt(request());
    assert.equal([...f.windows.values()][0].total, 1);
  }
});

test('malformed database verdicts cannot accidentally grant admission', async () => {
  for (const invalid of [{ allowed: 'true', retry_after: 10 }, { allowed: true }, { allowed: true, retry_after: 0 }, { allowed: true, retry_after: 901 }]) {
    const f = fixture();
    f.setMalformed(invalid);
    await assert.rejects(f.lib.reserveAdminLoginAttempt(request()), f.lib.AdminLoginRateStorageError);
  }
});
