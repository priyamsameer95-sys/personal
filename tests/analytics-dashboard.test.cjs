const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.join(__dirname, '..');
function loadPage({ authenticated = true, data = fixture(), failure = false } = {}) {
  const calls = [];
  const { outputText } = ts.transpileModule(readFileSync(path.join(root, 'app/minforyam/analytics/page.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  const stubs = {
    'next/link': ({ children, prefetch, ...props }) => React.createElement('a', props, children),
    'next/headers': { cookies: () => ({ get: () => ({ value: 'fixture-session-token' }) }) },
    'next/navigation': { redirect: location => { calls.push(['redirect', location]); throw new Error(`Redirect:${location}`); } },
    '@/lib/auth': { SESSION_COOKIE_NAME: 'admin_session', verifySessionToken: async () => { calls.push(['authenticate']); return authenticated; } },
    '@/lib/site-analytics': { getSiteAnalytics: async days => { calls.push(['query', days]); if (failure) throw new Error('postgres://private-connection-must-stay-private'); return data; } },
    './analytics.module.css': new Proxy({}, { get: (_, key) => key }),
  };
  vm.runInNewContext(outputText, { module, exports: module.exports, require: id => Object.hasOwn(stubs, id) ? stubs[id] : require(id) }, { filename: 'analytics/page.tsx' });
  return { page: module.exports, calls };
}

// Deliberately synthetic examples; never connected to storage or a live account.
function fixture(empty = false) {
  return {
    days: 7, startDate: '2026-10-14T00:00:00+05:30', endDate: '2026-10-20T23:59:59+05:30',
    trackingStartedAt: empty ? null : '2026-10-19T10:00:00+05:30',
    visitors: empty ? 0 : 3, pageViews: empty ? 0 : 5, cvRequests: empty ? 0 : 2,
    cvContacts: empty ? 0 : 1, cvRequestsAllTime: empty ? 0 : 9,
    daily: Array.from({ length: 7 }, (_, index) => ({ date: `2026-10-${14 + index}`, visitors: !empty && index === 6 ? 3 : 0, pageViews: !empty && index === 6 ? 5 : 0, cvRequests: !empty && index === 6 ? 2 : 0 })),
    topPages: empty ? [] : [{ path: '/product', views: 5, visitors: 3 }],
    referrers: empty ? [] : [{ source: 'example.org', visits: 5 }],
    devices: empty ? [] : [{ device: 'Mobile', visits: 5 }], countries: [],
    cvLeads: empty ? [] : [{ email: 'synthetic-reader@example.com', first_requested_at: '2026-10-16T02:00:00Z', last_requested_at: '2026-10-20T01:30:00Z', download_count: 9, last_source_path: '/cv' }],
    cvLeadsTotal: empty ? 0 : 1,
  };
}
const render = element => renderToStaticMarkup(element);

test('private analytics authenticates before querying and redirects an unsigned visitor', async () => {
  const { page, calls } = loadPage({ authenticated: false });
  await assert.rejects(page.default({ searchParams: { days: '7' } }), /Redirect:\/minforyam\/login/);
  assert.deepEqual(calls, [['authenticate'], ['redirect', '/minforyam/login']]);
  assert.equal(page.dynamic, 'force-dynamic');
  assert.equal(page.metadata.robots.index, false);
  assert.equal(page.metadata.robots.follow, false);
});

test('populated analytics distinguishes the selected period from lifetime CV contacts', async () => {
  const { page, calls } = loadPage();
  const html = render(await page.default({ searchParams: { days: '7' } }));
  assert.deepEqual(calls, [['authenticate'], ['query', 7]]);
  assert.match(html, /synthetic-reader@example.com/);
  assert.match(html, /9 recorded requests across all time/);
  assert.match(html, /independent of the date filter/);
  assert.match(html, /not confirmed PDF opens/);
  assert.match(html, /They do not identify people or link browsing to a CV email/);
  assert.match(html, /Visitor-days/);
  assert.match(html, /Page views by referrer/);
  assert.doesNotMatch(html, /<h2[^>]*>Countries<\/h2>/);
  assert.match(html, /aria-current="page"[^>]*>7 days/);
  assert.match(html, /href="\/api\/admin\/cv-leads\?format=csv"/);
});

test('daily chart exposes the same observed data as an accessible table and uses IST dates', async () => {
  const { page } = loadPage();
  const html = render(await page.default({ searchParams: { days: '7' } }));
  assert.match(html, /role="img" aria-labelledby="daily-chart-title daily-chart-description"/);
  assert.match(html, /<caption>Daily website activity in Indian Standard Time<\/caption>/);
  assert.match(html, /<th scope="row">20 Oct<\/th><td>3<\/td><td>5<\/td><td>2<\/td>/);
  assert.match(html, /Latest request · IST/);
  assert.match(html, /20 Oct 2026, 07:00 am/i);
});

test('an empty analytics period renders a real empty state without fabricated trends', async () => {
  const { page } = loadPage({ data: fixture(true) });
  const html = render(await page.default({}));
  assert.match(html, /No activity recorded in this period/);
  assert.match(html, /Previous traffic cannot be reconstructed/);
  assert.match(html, /No one has shared an email/);
  assert.doesNotMatch(html, /synthetic-reader|% growth|Analytics could not be loaded/);
});

test('storage failures show an error instead of zero metrics or database details', async () => {
  const { page } = loadPage({ failure: true });
  const html = render(await page.default({ searchParams: { days: '90' } }));
  assert.match(html, /role="alert"/);
  assert.match(html, /Analytics could not be loaded/);
  assert.match(html, /href="\/minforyam\/analytics\?days=90"[^>]*>Try again/);
  assert.doesNotMatch(html, /private-connection|postgres:|Activity summary|synthetic-reader/);
});

test('date ranges normalize unexpected query values before the storage query', async () => {
  for (const [input, expected] of [['7', 7], ['90', 90], ['30', 30], ['9999', 30], [['7', '90'], 30], [undefined, 30]]) {
    const { page, calls } = loadPage();
    await page.default({ searchParams: { days: input } });
    assert.deepEqual(calls, [['authenticate'], ['query', expected]]);
  }
});

test('traffic labels from storage are rendered as text rather than executable markup', async () => {
  const data = fixture();
  data.referrers = [{ source: '<script>alert(1)</script>', visits: 1 }];
  const { page } = loadPage({ data });
  const html = render(await page.default({ searchParams: { days: '7' } }));
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
