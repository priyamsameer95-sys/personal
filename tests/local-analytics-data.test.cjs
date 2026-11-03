'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtemp, writeFile, chmod, symlink, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createLocalDataProvider, loadLocalConnection, LocalDataError, cvCSV, localDay } = require('../scripts/local-analytics-data.cjs');

const secret = 'postgresql://synthetic:fixture-password@fixture.example/test?sslmode=require';
const now = Date.parse('2026-10-21T20:00:00Z'); // Already 22 October in India.
const fixtureLead = {
  email: 'synthetic-only@example.com', first_requested_at: new Date('2026-10-16T01:00:00Z'),
  last_requested_at: new Date('2026-10-22T00:15:00Z'), download_count: '3', last_source_path: '/cv',
};

function setup({ fail, lead = fixtureLead, empty = false, tables = {}, uniqueStarted = null } = {}) {
  const calls = [];
  let closed = 0;
  const connection = {
    async query(query, params = []) {
      const sql = query.replace(/\s+/g, ' ').trim();
      calls.push({ sql, params });
      if (fail && fail(sql)) throw Object.assign(Error(`private database diagnostics ${secret}`), { code: '42P01' });
      if (/^(?:BEGIN|COMMIT|ROLLBACK)/.test(sql)) return { rows: [] };
      assert.match(sql, /^SELECT\b/);
      if (/to_regclass/.test(sql)) return { rows: [{ cv_leads: true, cv_events: true, page_views: true, interactions: true, settings: true, browser_hash: false, browser_tracking: false, ...tables }] };
      if (/enabled_at/.test(sql)) return { rows: empty ? [] : [{ enabled_at: '2026-10-20T02:00:00Z', browser_tracking_started_at: uniqueStarted }] };
      if (/COUNT\(DISTINCT LOWER\(TRIM\(email\)\)\)/.test(sql)) return { rows: [{ total: empty ? '0' : '1', requests: empty ? '0' : '3', period_contacts: empty ? '0' : '1' }] };
      if (/GROUP BY LOWER\(TRIM\(email\)\)/.test(sql)) return { rows: empty ? [] : [lead] };
      if (/FROM cv_download_events/.test(sql)) return { rows: empty ? [] : [{ day: '2026-10-22', requests: '2' }] };
      if (/FROM site_interaction_events/.test(sql)) {
        if (/event_type AS type/.test(sql)) return { rows: empty ? [] : [{ type: 'cv_opened', target: 'cv', count: '4' }] };
        if (/SELECT path/.test(sql)) return { rows: empty ? [] : [{ path: '/cv', count: '4' }] };
        if (/AS day/.test(sql)) return { rows: empty ? [] : [{ day: '2026-10-22', clicks: '4' }] };
        return { rows: [{ clicks: empty ? '0' : '4' }] };
      }
      if (/referrer AS source/.test(sql)) return { rows: empty ? [] : [{ source: 'search.example', visits: '7' }] };
      if (/SELECT device/.test(sql)) return { rows: empty ? [] : [{ device: 'Phone', visits: '7' }] };
      if (/SELECT path/.test(sql)) return { rows: empty ? [] : [{ path: '/cv', views: '7', visitors: '3', unique_visitors: '2', unique_views: '5' }] };
      if (/AS day/.test(sql)) return { rows: empty ? [] : [{ day: '2026-10-22', views: '7', visitors: '3' }] };
      if (/FROM site_page_views/.test(sql)) return { rows: [{ views: empty ? '0' : '7', visitors: empty ? '0' : '3', unique_visitors: empty ? '0' : '2', unique_views: empty ? '0' : '5' }] };
      assert.fail(`Unexpected fixture query: ${sql}`);
    },
    async close() { closed += 1; },
  };
  const provider = createLocalDataProvider({ connectionString: secret, now: () => now, createConnection: async value => {
    assert.equal(value, secret);
    return connection;
  } });
  return { provider, calls, closed: () => closed };
}

test('direct report combines all-time CV emails and requests with bounded page, action and daily records', async () => {
  const { provider, calls, closed } = setup();
  const report = await provider.getReport(7);
  assert.deepEqual({ views: report.pageViews, visitorDays: report.visitors, clicks: report.clicks,
    periodRequests: report.cvRequests, distinctEmails: report.cvContacts, allRequests: report.cvRequestsAllTime },
  { views: 7, visitorDays: 3, clicks: 4, periodRequests: 2, distinctEmails: 1, allRequests: 3 });
  assert.equal(report.startDate, '2026-10-16');
  assert.equal(report.endDate, '2026-10-22');
  assert.equal(report.trackingStartedAt, '2026-10-20T02:00:00.000Z');
  assert.equal(report.daily.length, 7);
  assert.deepEqual(report.daily[0], { date: '2026-10-16', visitors: 0, pageViews: 0, clicks: 0, cvRequests: 0 });
  assert.deepEqual(report.daily[6], { date: '2026-10-22', visitors: 3, pageViews: 7, clicks: 4, cvRequests: 2 });
  assert.deepEqual(report.cvLeads, [{ ...fixtureLead, first_requested_at: fixtureLead.first_requested_at.toISOString(),
    last_requested_at: fixtureLead.last_requested_at.toISOString(), download_count: 3 }]);
  assert.equal(report.cvLeadsTotal, 1);
  assert.equal(report.cvContactsInPeriod, 1);
  assert.deepEqual(report.availability, { pageViews: true, interactions: true, cvRequestHistory: true, uniqueVisitors: false });
  assert.deepEqual(report.topPages, [{ path: '/cv', views: 7, visitors: 3, browserVisitors: null }]);
  assert.deepEqual(report.referrers, [{ source: 'search.example', visits: 7 }]);
  assert.deepEqual(report.devices, [{ device: 'Phone', visits: 7 }]);
  assert.deepEqual(report.interactions, [{ type: 'cv_opened', target: 'cv', count: 4 }]);
  assert.deepEqual(report.pageInteractions, [{ path: '/cv', count: 4 }]);
  assert.deepEqual(report.countries, []);
  assert.equal(closed(), 1);
  assert.equal(calls[0].sql, 'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  assert.equal(calls.at(-1).sql, 'COMMIT');
  for (const call of calls.slice(1, -1)) assert.match(call.sql, /^SELECT\b/);
  assert.doesNotMatch(JSON.stringify(report), /fixture-password|connectionString/);
});

test('all traffic ranges use explicit India-local midnight bounds and retain dated zero days', async () => {
  assert.equal(localDay(Date.parse('2026-10-21T18:29:59Z')), '2026-10-21');
  assert.equal(localDay(Date.parse('2026-10-21T18:30:00Z')), '2026-10-22');
  for (const [input, days, first] of [[7, 7, '2026-10-16'], [30, 30, '2026-09-23'], [90, 90, '2026-07-25'], ['7', 30, '2026-09-23'], [1, 30, '2026-09-23']]) {
    const { provider, calls } = setup({ empty: true });
    const report = await provider.getReport(input);
    assert.equal(report.days, days);
    assert.equal(report.startDate, first);
    assert.equal(report.daily.length, days);
    assert.equal(report.trackingStartedAt, null);
    assert.equal(report.cvRequestsAllTime, 0);
    assert.deepEqual(report.cvLeads, []);
    const traffic = calls.filter(call => /WHERE occurred_at >=|WHERE requested_at >=/.test(call.sql));
    assert.equal(traffic.length, 10);
    for (const call of traffic) {
      assert.deepEqual(call.params, [first, '2026-10-23']);
      assert.match(call.sql, /\$1::TIMESTAMP AT TIME ZONE 'Asia\/Kolkata'/);
      assert.match(call.sql, /\$2::TIMESTAMP AT TIME ZONE 'Asia\/Kolkata'/);
    }
    const emailQuery = calls.find(call => /GROUP BY LOWER\(TRIM\(email\)\)/.test(call.sql));
    assert.deepEqual(emailQuery.params, [200]);
    assert.doesNotMatch(emailQuery.sql, /WHERE/);
    assert.match(emailQuery.sql, /SUM\(download_count\)/);
  }
});

test('historical lead records remain visible when dated CV event history was never recorded', async () => {
  const { provider, calls } = setup({ tables: { cv_events: false } });
  const report = await provider.getReport(30);
  assert.equal(report.cvContacts, 1);
  assert.equal(report.cvRequestsAllTime, 3);
  assert.equal(report.cvContactsInPeriod, 1);
  assert.equal(report.cvLeads[0].email, fixtureLead.email);
  assert.equal(report.pageViews, 7);
  assert.equal(report.clicks, 4);
  assert.equal(report.cvRequests, null);
  assert.equal(report.availability.cvRequestHistory, false);
  assert.equal(report.daily.every(day => day.cvRequests === null), true);
  assert.equal(calls.some(call => /FROM cv_download_events/.test(call.sql)), false);
  const period = calls.find(call => /AS period_contacts/.test(call.sql));
  assert.match(period.sql, /FILTER \(WHERE last_requested_at >=/);
  assert.deepEqual(period.params, ['2026-09-23', '2026-10-23']);
});

test('missing optional analytics tables show unavailable measures while recorded CV contacts are retained', async () => {
  const { provider, calls } = setup({ tables: { page_views: false, interactions: false, settings: false, cv_events: false } });
  const report = await provider.getReport(7);
  assert.equal(report.pageViews, null);
  assert.equal(report.visitors, null);
  assert.equal(report.clicks, null);
  assert.equal(report.trackingStartedAt, null);
  assert.equal(report.cvRequests, null);
  assert.equal(report.cvRequestsAllTime, 3);
  assert.equal(report.cvContacts, 1);
  assert.deepEqual(report.topPages, []);
  assert.deepEqual(report.interactions, []);
  assert.deepEqual(report.availability, { pageViews: false, interactions: false, cvRequestHistory: false, uniqueVisitors: false });
  assert.equal(report.daily.every(day => day.pageViews === null && day.visitors === null && day.clicks === null && day.cvRequests === null), true);
  assert.equal(calls.some(call => /FROM (?:site_page_views|site_interaction_events|site_analytics_settings|cv_download_events)/.test(call.sql)), false);
  const required = setup({ tables: { cv_leads: false } });
  await assert.rejects(required.provider.getReport(7), LocalDataError);
  assert.equal(required.calls.at(-1).sql, 'ROLLBACK');
});

test('missing tables and failed database access produce unavailable errors, roll back and close without leaking credentials', async () => {
  for (const failing of [/FROM site_page_views/, /FROM site_interaction_events/, /FROM cv_download_leads/, /FROM cv_download_events/]) {
    const { provider, calls, closed } = setup({ fail: sql => failing.test(sql) });
    await assert.rejects(provider.getReport(30), error => error instanceof LocalDataError && error.code === 'DATA_UNAVAILABLE' && !/fixture|postgres|42P01/.test(error.message));
    assert.equal(calls.at(-1).sql, 'ROLLBACK');
    assert.equal(closed(), 1);
    assert.equal(calls.some(call => /^(CREATE|INSERT|UPDATE|DELETE|ALTER|DROP)\b/.test(call.sql)), false);
  }
  const provider = createLocalDataProvider({ connectionString: secret, createConnection: async () => { throw Error(secret); } });
  await assert.rejects(provider.getReport(), error => error instanceof LocalDataError && !error.message.includes(secret));
});

test('CSV export requests up to 10000 grouped contacts and neutralizes spreadsheet formulas and quotes', async () => {
  const lead = { ...fixtureLead, email: '=FORMULA@example.com', last_source_path: '  @bad,"quoted"\nnext' };
  const { provider, calls, closed } = setup({ lead });
  const csv = await provider.exportCSV();
  assert.match(csv, /^"Email","First request \(UTC\)","Last request \(UTC\)","Recorded requests","Last page"\r\n/);
  assert.match(csv, /"'=FORMULA@example\.com"/);
  assert.match(csv, /"'  @bad,""quoted""\nnext"/);
  assert.match(csv, /"3"/);
  assert.deepEqual(calls[1].params, [10000]);
  assert.match(calls[1].sql, /GROUP BY LOWER\(TRIM\(email\)\)/);
  assert.equal(calls.at(-1).sql, 'COMMIT');
  assert.equal(closed(), 1);
  for (const prefix of ['=', '+', '-', '@', ' \t=']) assert.match(cvCSV([{ email: `${prefix}unsafe`, download_count: 1 }]), /"'/);
});

test('private connection loader accepts only owner-only regular configuration files', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'priyam-analytics-test-'));
  const file = path.join(directory, 'connection.json');
  try {
    await writeFile(file, JSON.stringify({ connectionString: secret }), { mode: 0o600 });
    assert.equal(await loadLocalConnection(file), secret);
    await chmod(file, 0o644);
    await assert.rejects(loadLocalConnection(file), LocalDataError);
    await chmod(file, 0o600);
    await symlink(file, path.join(directory, 'link.json'));
    await assert.rejects(loadLocalConnection(path.join(directory, 'link.json')), LocalDataError);
    await writeFile(file, JSON.stringify({ connectionString: secret, password: 'unexpected' }));
    await assert.rejects(loadLocalConnection(file), LocalDataError);
    await writeFile(file, JSON.stringify({ connectionString: 'https://invalid.example' }));
    await assert.rejects(loadLocalConnection(file), LocalDataError);
    assert.equal(await loadLocalConnection(path.join(directory, 'missing.json')), null);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('invalid connection strings and malformed numeric records cannot be presented as successful reports', async () => {
  for (const connectionString of [undefined, '', 'https://user:secret@example.com/db', 'postgresql://no-password@example.com/db']) {
    assert.throws(() => createLocalDataProvider({ connectionString }), LocalDataError);
  }
  const { provider, calls } = setup({ lead: { ...fixtureLead, download_count: 'not-a-number' } });
  await assert.rejects(provider.getReport(), LocalDataError);
  assert.equal(calls.at(-1).sql, 'ROLLBACK');
});

 test('period unique browsers remain separate from daily estimates and preserve incomplete historical coverage', async()=>{
  const f=setup({tables:{browser_hash:true,browser_tracking:true},uniqueStarted:'2026-10-20T12:00:00Z'});
  const r=await f.provider.getReport(7);
  assert.equal(r.visitors,3);
  assert.equal(r.uniqueVisitors,2,'A returning browser across multiple days must not become another unique visitor');
  assert.equal(r.uniqueTrackedPageViews,5);
  assert.equal(r.pageViews,7,'Unidentified historical page views are preserved, never merged into new unique totals');
  assert.equal(r.uniqueTrackingStartedAt,'2026-10-20T12:00:00.000Z');
  assert.equal(r.topPages[0].browserVisitors,2);
  const query=f.calls.find(c=>/COUNT\(DISTINCT browser_hash\)/.test(c.sql)&&!c.sql.startsWith('SELECT path'));
  assert.match(query.sql,/COUNT\(browser_hash\) AS unique_views/);
  assert.deepEqual(query.params,['2026-10-16','2026-10-23']);
  assert.doesNotMatch(query.sql,/COALESCE\(browser_hash|GROUP BY/);
 });
 test('old or not-yet-started collectors never turn historical visitor-days into unique visitors', async()=>{
  for(const options of [{},{tables:{browser_hash:true,browser_tracking:true}}]) {
   const f=setup(options),r=await f.provider.getReport(30);
   assert.equal(r.uniqueVisitors,null);assert.equal(r.uniqueTrackingStartedAt,null);
   assert.equal(r.uniqueTrackedPageViews,null);assert.equal(r.visitors,3);
   if(!options.tables)assert.equal(f.calls.some(c=>/COUNT\(DISTINCT browser_hash\)/.test(c.sql)),false);
  }
 });
