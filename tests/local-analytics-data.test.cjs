'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtemp, writeFile, chmod, symlink, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createLocalDataProvider, loadLocalConnection, LocalDataError, cvCSV, localDay } = require('../scripts/local-analytics-data.cjs');
const { BLOCKED_CV_DOMAIN_PATTERN } = require('../lib/cv-email-policy.cjs');

const secret = 'postgresql://synthetic:fixture-password@fixture.example/test?sslmode=require';
const now = Date.parse('2026-10-21T20:00:00Z'); // Already 22 October in India.
const fixtureLead = {
  email: 'synthetic-only@gmail.com', first_requested_at: new Date('2026-10-16T01:00:00Z'),
  last_requested_at: new Date('2026-10-22T00:15:00Z'), download_count: '3', last_source_path: '/cv',
};

function setup({ fail, lead = fixtureLead, empty = false, tables = {}, uniqueStarted = null, historicalTests = [] } = {}) {
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
      if (/COUNT\(DISTINCT LOWER\(TRIM\(email\)\)\)/.test(sql)) {
        assert.equal(params[2], BLOCKED_CV_DOMAIN_PATTERN);
        return { rows: [{ total: empty ? '0' : '1', requests: empty ? '0' : '3', period_contacts: empty ? '0' : '1',
          excluded_contacts: String(new Set(historicalTests.map(row => row.email.trim().toLowerCase())).size),
          excluded_requests: String(historicalTests.reduce((sum, row) => sum + Number(row.download_count), 0)) }] };
      }
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
  assert.equal(report.excludedCVContacts, 0);
  assert.equal(report.excludedCVRequests, 0);
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
      assert.deepEqual(call.params, [first, '2026-10-23', ...(call.sql.includes('FROM cv_download_events') ? [BLOCKED_CV_DOMAIN_PATTERN] : [])]);
      assert.match(call.sql, /\$1::TIMESTAMP AT TIME ZONE 'Asia\/Kolkata'/);
      assert.match(call.sql, /\$2::TIMESTAMP AT TIME ZONE 'Asia\/Kolkata'/);
    }
    const emailQuery = calls.find(call => /GROUP BY LOWER\(TRIM\(email\)\)/.test(call.sql));
    assert.deepEqual(emailQuery.params, [200, BLOCKED_CV_DOMAIN_PATTERN]);
    assert.match(emailQuery.sql, /WHERE SPLIT_PART.*!~\* \$2 GROUP BY.*LIMIT \$1/);
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
  assert.deepEqual(period.params, ['2026-09-23', '2026-10-23', BLOCKED_CV_DOMAIN_PATTERN]);
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
  const lead = { ...fixtureLead, email: '=FORMULA@gmail.com', last_source_path: '  @bad,"quoted"\nnext' };
  const { provider, calls, closed } = setup({ lead });
  const csv = await provider.exportCSV();
  assert.match(csv, /^"Email","First request \(UTC\)","Last request \(UTC\)","Recorded requests","Last page"\r\n/);
  assert.match(csv, /"'=FORMULA@gmail\.com"/);
  assert.match(csv, /"'  @bad,""quoted""\nnext"/);
  assert.match(csv, /"3"/);
  assert.deepEqual(calls[1].params, [10000, BLOCKED_CV_DOMAIN_PATTERN]);
  assert.match(calls[1].sql, /GROUP BY LOWER\(TRIM\(email\)\)/);
  assert.equal(calls.at(-1).sql, 'COMMIT');
  assert.equal(closed(), 1);
  for (const prefix of ['=', '+', '-', '@', ' \t=']) assert.match(cvCSV([{ email: `${prefix}unsafe`, download_count: 1 }]), /"'/);
});

test('historical test requests are excluded consistently from report totals, dated counts, lists and CSV without writes', async () => {
  const historicalTests = [{ email: 'portfolio-verification@example.com', download_count: 3 }, { email: 'old@team.mailinator.com', download_count: 2 }];
  const { provider, calls } = setup({ historicalTests });
  const report = await provider.getReport(30);
  assert.equal(report.cvContacts, 1);
  assert.equal(report.cvRequestsAllTime, 3);
  assert.equal(report.excludedCVContacts, 2);
  assert.equal(report.excludedCVRequests, 5);
  assert.deepEqual(report.cvLeads.map(row => row.email), [fixtureLead.email]);
  assert.doesNotMatch(await provider.exportCSV(), /portfolio-verification|mailinator/);
  const contactQuery = calls.find(call => /AS period_contacts/.test(call.sql));
  for (const alias of ['total', 'requests', 'period_contacts']) assert.match(contactQuery.sql, new RegExp(`!~\\* \\$3[^]*?AS ${alias}`));
  assert.match(contactQuery.sql, /~\* \$3\) AS excluded_contacts/);
  assert.match(contactQuery.sql, /~\* \$3\), 0\) AS excluded_requests/);
  const eventQuery = calls.find(call => /FROM cv_download_events/.test(call.sql));
  assert.match(eventQuery.sql, /WHERE requested_at.*AND SPLIT_PART.*!~\* \$3 GROUP BY/);
  for (const query of calls.filter(call => /GROUP BY LOWER\(TRIM\(email\)\)/.test(call.sql))) {
    assert.match(query.sql, /WHERE SPLIT_PART.*!~\* \$2 GROUP BY.*LIMIT \$1/);
    assert.equal(query.params[1], BLOCKED_CV_DOMAIN_PATTERN);
  }
  assert.equal(calls.some(call => /^(?:DELETE|UPDATE|INSERT|ALTER|CREATE)\b/.test(call.sql)), false);
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

function exploreFixture({ views = [], events = [], ready = true, coverage = true, fail } = {}) {
  const calls = [];
  let opened = 0, closed = 0;
  const provider = createLocalDataProvider({ connectionString: secret, now: () => now,
    createConnection: async () => {
      opened++;
      return {
        async query(query, params = []) {
          const sql = query.replace(/\s+/g, ' ').trim();
          calls.push({ sql, params });
          if (fail?.(sql)) throw Error(`Private diagnostics: ${secret}`);
          if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql)) return { rows: [] };
          assert.match(sql, /^SELECT\b/, 'The local dashboard must never migrate or mutate production data');
          assert.doesNotMatch(sql, /\b(?:cv_download_leads|cv_download_events|email)\b/i,
            'Journey queries must not join contact identities or email records');
          if (sql.includes('to_regclass')) return { rows: [{ ready }] };
          if (sql.includes('FROM site_analytics_v2_settings')) return { rows: coverage ? [{
            journey_tracking_started_at: '2026-10-21T12:00:00Z',
            engagement_tracking_started_at: '2026-10-21T12:00:00Z',
          }] : [] };
          if (sql.startsWith('SELECT v.*')) return { rows: views };
          if (sql.startsWith('SELECT e.*')) return { rows: events };
          assert.fail(`Unexpected journey query: ${sql}`);
        },
        async close() { closed++; },
      };
    } });
  return { provider, calls, opened: () => opened, closed: () => closed };
}

const boundaryView = {
  id: '10000000-0000-4000-8000-000000000001', session_id: '20000000-0000-4000-8000-000000000001',
  tab_id: '30000000-0000-4000-8000-000000000001', browser_hash: 'a'.repeat(64), path: '/cv', sequence: 0,
  occurred_at: '2026-10-21T18:29:00Z', last_observed_at: '2026-10-21T18:32:00Z', active_ms: 90000,
  source: 'linkedin', device: 'Phone', session_started_at: '2026-10-21T18:29:00Z',
  session_last_activity: '2026-10-21T18:32:00Z',
};

test('journey provider uses bounded, parameterized read-only snapshots without contact joins', async () => {
  const f = exploreFixture();
  const source = "source' OR 1=1 --";
  const result = await f.provider.explore({ days: 1, device: 'Phone', source, path: '/cv' });
  assert.equal(result.available, true);
  assert.deepEqual(result.range, { startDate: '2026-10-22', endDate: '2026-10-22' });
  assert.equal(f.calls[0].sql, 'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  assert.equal(f.calls.at(-1).sql, 'COMMIT');
  assert.equal(f.closed(), 1);
  const records = f.calls.filter(call => /^SELECT [ve]\.\*/.test(call.sql));
  assert.equal(records.length, 2);
  for (const call of records) {
    assert.deepEqual(call.params, ['2026-10-22', '2026-10-23', 'Phone', source, '/cv']);
    assert.match(call.sql, /LIMIT 100001$/);
    assert.match(call.sql, /v\.occurred_at < \(\$2::TIMESTAMP AT TIME ZONE 'Asia\/Kolkata'\)/);
    assert.match(call.sql, /s\.device = \$3/);
    assert.match(call.sql, /s\.source = \$4/);
    assert.match(call.sql, /p\.path = \$5/);
    assert.equal(call.sql.includes(source), false, 'User filters stay in parameters, never SQL text');
  }
  assert.doesNotMatch(JSON.stringify(result), /fixture-password|browser_hash|synthetic-only@/);
});

test('a post-midnight CV save retains its old parent without inventing a new page view or allocating cumulative time', async () => {
  const events = ['cv_opened', 'cv_submitted', 'cv_request_saved', 'cv_download_initiated'].map((type, i) => ({
    event_id: `40000000-0000-4000-8000-00000000000${i + 1}`,
    session_id: boundaryView.session_id, page_view_id: boundaryView.id, tab_id: boundaryView.tab_id,
    sequence: i + 1, event_type: type, target: 'cv', occurred_at: `2026-10-21T18:3${i}:00Z`,
  }));
  const f = exploreFixture({ views: [boundaryView], events });
  const report = await f.provider.explore({ days: 1 });
  assert.equal(report.summary.views, 0);
  assert.equal(report.summary.sessions, 1);
  assert.equal(report.summary.browsers, 1);
  assert.equal(report.summary.cvRequests, 1);
  assert.equal(report.summary.avgActiveMs, null);
  assert.equal(report.health.boundaryTimingExcluded, 1);
  assert.deepEqual(report.daily.map(row => [row.date, row.views, row.sessions, row.browsers, row.cvRequests]),
    [['2026-10-22', 0, 1, 1, 1]]);
  assert.doesNotMatch(JSON.stringify(report), new RegExp(boundaryView.browser_hash));
  const viewQuery = f.calls.find(call => call.sql.startsWith('SELECT v.*'));
  assert.match(viewQuery.sql, /OR \(v\.last_observed_at >= \$|OR \(v\.last_observed_at >= \(/);
  assert.match(viewQuery.sql, /active\.page_view_id=v\.id/);
  const eventQuery = f.calls.find(call => call.sql.startsWith('SELECT e.*'));
  assert.match(eventQuery.sql, /AND e\.occurred_at >= \(\$1::TIMESTAMP AT TIME ZONE 'Asia\/Kolkata'\)/);
  assert.match(eventQuery.sql, /AND e\.occurred_at < \(\$2::TIMESTAMP AT TIME ZONE 'Asia\/Kolkata'\)/);
  const funnel = await f.provider.explore({ days: 1, view: 'funnel', funnel: 'cv' });
  assert.deepEqual(funnel.stages.map(stage => stage.count), [1, 1, 1, 1]);
});

test('missing journey tables or coverage stays unavailable without migrations or raw record reads', async () => {
  for (const configuration of [{ ready: false }, { coverage: false }]) {
    const f = exploreFixture(configuration);
    const report = await f.provider.explore({ days: 1 });
    assert.equal(report.available, false);
    assert.equal('summary' in report, false);
    assert.equal(f.calls.some(call => /^SELECT [ve]\.\*/.test(call.sql)), false);
    assert.equal(f.calls.at(-1).sql, 'COMMIT');
    assert.equal(f.closed(), 1);
  }
});

test('invalid journey options cannot open a database connection', async () => {
  for (const options of [{ startDate: '2020-01-01' }, { path: '/cv?email=person@example.com' },
    { source: 'person@example.com' }, { unexpected: 'field' }]) {
    const f = exploreFixture();
    await assert.rejects(f.provider.explore(options), TypeError);
    assert.equal(f.opened(), 0);
    assert.deepEqual(f.calls, []);
  }
});

test('journey read failure rolls back, closes the connection and redacts diagnostics', async () => {
  const f = exploreFixture({ fail: sql => sql.startsWith('SELECT e.*') });
  await assert.rejects(f.provider.explore({ days: 1 }), error => {
    assert.ok(error instanceof LocalDataError);
    assert.doesNotMatch(String(error), /Private diagnostics|fixture-password|postgresql/);
    return true;
  });
  assert.equal(f.calls.at(-1).sql, 'ROLLBACK');
  assert.equal(f.closed(), 1);
});

test('oversized journey selections return no sampled totals', async () => {
  const f = exploreFixture({ views: Array(100001).fill(boundaryView) });
  const report = await f.provider.explore({ days: 1 });
  assert.equal(report.available, false);
  assert.equal(report.truncated, true);
  assert.equal('summary' in report, false);
  assert.match(report.reason, /no sampled totals/);
  assert.equal(f.calls.at(-1).sql, 'COMMIT');
  assert.equal(f.closed(), 1);
});

test('installed driver connection timeout stays catchable when WebSocket errors have a read-only message', async () => {
  const { execFile } = require('node:child_process');
  const { promisify } = require('node:util');
  const readerPath = require.resolve('../scripts/local-analytics-data.cjs');
  const script = `
    const assert=require('node:assert/strict'), Module=require('node:module');
    const {createRequire}=Module, req=createRequire(${JSON.stringify(readerPath)});
    const actual=req('@vercel/postgres'), {neonConfig}=req('@neondatabase/serverless');
    const sockets=[];
    class OfflineSocket {
      constructor(){this.handlers={};this.readyState=0;sockets.push(this);}
      addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
      send(){}
      close(){
        const event=Object.create(null);
        Object.defineProperty(event,'message',{get:()=> 'synthetic private driver diagnostics'});
        queueMicrotask(()=>{for(const fn of this.handlers.error||[])fn(event);for(const fn of this.handlers.close||[])fn({});});
      }
    }
    neonConfig.webSocketConstructor=OfflineSocket;
    let ended=0;
    class BoundedClient extends actual.VercelClient {
      constructor(config){assert.equal(config.connectionTimeoutMillis,15000);assert.equal(config.query_timeout,20000);super({...config,connectionTimeoutMillis:15});}
      end(){ended++;return super.end();}
    }
    const load=Module._load;
    Module._load=function(id,parent,...rest){return id==='@vercel/postgres'?{VercelClient:BoundedClient}:load.call(this,id,parent,...rest);};
    const {openConnection,LocalDataError}=require(${JSON.stringify(readerPath)});
    (async()=>{
      await assert.rejects(openConnection('postgresql://synthetic:fake@fixture-pooler.neon.tech/test?sslmode=require'),error=>error instanceof LocalDataError&&!error.message.includes('diagnostics'));
      assert.equal(sockets.length,1);assert.equal(ended,1);
      console.log('caught and cleaned up');
    })().catch(()=>{process.exitCode=1;});
  `;
  const result = await promisify(execFile)(process.execPath, ['-e', script], { timeout: 5000 });
  assert.match(result.stdout, /caught and cleaned up/);
  assert.equal(result.stderr, '');
});

test('connection errors between snapshot queries are contained and the next query fails without diagnostics', async () => {
  const vm = require('node:vm');
  const fs = require('node:fs');
  const { EventEmitter } = require('node:events');
  let client, queryCalls=0, closed=0;
  class Client extends EventEmitter {
    constructor(config){super();client=this;assert.equal(config.connectionString,secret);}
    async connect(){}
    async query(){queryCalls++;return {rows:[]};}
    async end(){closed++;}
  }
  const module={exports:{}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../scripts/local-analytics-data.cjs'),'utf8'), {
    module,exports:module.exports,__dirname:path.dirname(require.resolve('../scripts/local-analytics-data.cjs')),process,URL,Date,
    require(id){return id==='@vercel/postgres'?{VercelClient:Client}:id==='../lib/cv-email-policy.cjs'?require('../lib/cv-email-policy.cjs'):id==='../lib/analytics-explore.cjs'?require('../lib/analytics-explore.cjs'):require(id);},
  });
  const connection=await module.exports.openConnection(secret);
  await connection.query('SELECT 1');
  assert.doesNotThrow(()=>client.emit('error',Error('synthetic private connection diagnostics')));
  await assert.rejects(connection.query('SELECT 2'),error=>error.code==='DATA_UNAVAILABLE'&&!error.message.includes('private connection diagnostics'));
  assert.equal(queryCalls,1);
  await connection.close();assert.equal(closed,1);
});
