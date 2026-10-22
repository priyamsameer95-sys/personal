'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const moduleValue = { exports: {} };
const compiled = ts.transpileModule(readFileSync(path.join(__dirname, '../lib/cv-email.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(compiled, { module: moduleValue, exports: moduleValue.exports, require, setTimeout, clearTimeout });
const { createCVEmailDomainCheck, CVEmailRejectedError, CVEmailCheckUnavailableError } = moduleValue.exports;
const dnsError = code => Object.assign(new Error('Private resolver detail'), { code });
function fixture(overrides = {}, options = {}) {
  const queried = [], cancelled = [];
  const resolver = {
    resolveMx: async domain => { queried.push(domain); return [{ exchange: 'mx.mailhost.net', priority: 10 }]; },
    resolve4: async () => { throw dnsError('ENODATA'); },
    resolve6: async () => { throw dnsError('ENODATA'); },
    cancel: () => cancelled.push(true), ...overrides,
  };
  return { check: createCVEmailDomainCheck({ resolverFactory: () => resolver, ...options }), queried, cancelled };
}

test('reserved and common disposable domains are rejected without DNS, including subdomains and mixed case', async () => {
  const f = fixture();
  for (const address of [
    'portfolio-verification@example.com', 'a@team.EXAMPLE.org', 'a@example.net',
    'a@company.test', 'a@company.invalid', 'a@company.localhost', 'a@company.local',
    'a@mailinator.com', 'a@inbox.yopmail.com', 'a@10minutemail.com',
  ]) await assert.rejects(f.check(address), CVEmailRejectedError);
  assert.equal(f.queried.length, 0);
});

test('valid provider, company and plus aliases use domain-only DNS and share a bounded-lifetime cache', async () => {
  let now = 0;
  const f = fixture({}, { now: () => now });
  await f.check('recruiter+priyam@gmail.com');
  await f.check('test@gmail.com'); // A name is not evidence of a fake inbox.
  await f.check('o.connor@company.co.in');
  assert.deepEqual(f.queried, ['gmail.com', 'company.co.in']);
  now = 3600001;
  await f.check('another@gmail.com');
  assert.deepEqual(f.queried, ['gmail.com', 'company.co.in', 'gmail.com']);
  assert.equal(f.cancelled.length, 3);
});

test('null MX and nonexistent domains cannot pass through a website address fallback', async () => {
  for (const exchange of ['', '.']) {
    let fallback = 0;
    const f = fixture({ resolveMx: async () => [{ exchange, priority: 0 }], resolve4: async () => { fallback++; return ['192.0.2.1']; } });
    await assert.rejects(f.check('person@no-mail.company'), CVEmailRejectedError);
    assert.equal(fallback, 0);
  }
  const missing = fixture({ resolveMx: async () => { throw dnsError('ENOTFOUND'); } });
  await assert.rejects(missing.check('person@missing.company'), CVEmailRejectedError);
});

test('domains without explicit MX retain the standards-based A or AAAA mail fallback', async () => {
  const ipv4 = fixture({ resolveMx: async () => { throw dnsError('ENODATA'); }, resolve4: async () => ['192.0.2.1'] });
  await ipv4.check('person@legacy.company');
  const ipv6 = fixture({ resolveMx: async () => [], resolve6: async () => ['2001:db8::1'] });
  await ipv6.check('person@legacy.company');
  const neither = fixture({ resolveMx: async () => [] });
  await assert.rejects(neither.check('person@no-mail.company'), CVEmailRejectedError);
});

test('temporary DNS failure is retryable, sanitized and not cached as a rejection', async () => {
  let outage = true, calls = 0;
  const f = fixture({ resolveMx: async () => { calls++; if (outage) throw dnsError('ESERVFAIL'); return [{ exchange: 'mx.company.net', priority: 10 }]; } });
  await assert.rejects(f.check('person@company.net'), error => error instanceof CVEmailCheckUnavailableError && !error.message.includes('Private resolver'));
  outage = false;
  await f.check('person@company.net');
  assert.equal(calls, 2);
});

test('one usable address family passes without waiting for the other family to time out', async () => {
  for (const family of ['resolve4', 'resolve6']) {
    const other = family === 'resolve4' ? 'resolve6' : 'resolve4';
    const f = fixture({ resolveMx: async () => [], [family]: async () => [family === 'resolve4' ? '192.0.2.1' : '2001:db8::1'], [other]: async () => new Promise(() => {}) }, { timeoutMs: 30 });
    await f.check('person@legacy.company');
    assert.equal(f.cancelled.length, 1);
  }
});

test('a stuck lookup is bounded and concurrent requests for one domain share a single check', async () => {
  let calls = 0;
  const f = fixture({ resolveMx: async () => { calls++; return new Promise(() => {}); } }, { timeoutMs: 10 });
  const checks = await Promise.allSettled([f.check('a@slow.company'), f.check('b@slow.company')]);
  assert.equal(calls, 1);
  for (const result of checks) { assert.equal(result.status, 'rejected'); assert.ok(result.reason instanceof CVEmailCheckUnavailableError); }
  assert.equal(f.cancelled.length, 1);
});
