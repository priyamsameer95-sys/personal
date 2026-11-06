'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const charts = require('../local-analytics/charts.js');
const overview = {
  available: true, coverage: { startedAt: '2026-11-06T01:00:00Z' }, range: { startDate: '2026-10-08', endDate: '2026-11-06' },
  summary: { browsers: 2, sessions: 3, views: 7, activeMs: 42000, measuredViews: 5, avgActiveMs: 8400, medianActiveMs: 6000, cvRequests: 1, contactActions: 2 },
  daily: [{ date: '2026-11-06', views: 7, sessions: 3, browsers: 2, cvRequests: 1 }], sources: [{ name: 'linkedin.com', count: 2 }], devices: [{ name: 'Desktop', count: 3 }], filters: { sources: ['linkedin.com'], paths: ['/', '/product', '/cv'] },
};
const journey = { available: true, totalJourneys: 3, browsers: 2, sessions: 3, nodes: [{ id: 'home:0', label: 'Home', path: '/', count: 3, stage: 0 }, { id: 'work:1', label: 'Selected work', path: '/product', count: 2, stage: 1 }, { id: 'end:1', label: 'No further recorded activity', kind: 'ended', count: 1, stage: 1 }], links: [{ source: 'home:0', target: 'work:1', count: 2 }, { source: 'home:0', target: 'end:1', count: 1 }] };
const leads = { total: 1, requestsAllTime: 1, leads: [{ email: 'test-only@example.com', first_requested_at: '2026-11-06', last_requested_at: '2026-11-06', download_count: 1, last_source_path: '/' }] };
class Node {
  constructor(tag = 'div') { this.nodeType = 1; this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.listeners = {}; this.dataset = {}; this.style = { setProperty(k, v) { this[k] = v; } }; this.hidden = false; this.disabled = false; this._value = null; this._text = ''; this.className = ''; this.classList = { add: (...names) => { this.className = [...new Set([...this.className.split(' ').filter(Boolean), ...names])].join(' '); }, remove: (...names) => { this.className = this.className.split(' ').filter(n => !names.includes(n)).join(' '); }, toggle: (name, force) => { const has = this.className.split(' ').includes(name), next = force === undefined ? !has : force; if (next) this.classList.add(name); else this.classList.remove(name); return next; } }; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  get id() { return this.attributes.id || ''; }
  get options() { return this.children.filter(child => child.tagName === 'OPTION'); }
  get selectedOptions() { return this.options.filter(option => option.value === this.value); }
  set value(value) { this._value = String(value); }
  get value() { if (this._value !== null) return this._value; if (this.tagName === 'SELECT') return (this.options.find(option => option.attributes.selected !== undefined) || this.options[0])?.value || ''; if (this.tagName === 'OPTION') return this.attributes.value ?? this.textContent; return this.attributes.value || ''; }
  append(...nodes) { this.children.push(...nodes); for (const node of nodes) node.parent = this; }
  prepend(...nodes) { this.children.unshift(...nodes); for (const node of nodes) node.parent = this; }
  replaceChildren(...nodes) { this._text = ''; this.children = []; this.append(...nodes); }
  setAttribute(key, value) { this.attributes[key] = String(value); if (key === 'class') this.className = String(value); if (key === 'hidden') this.hidden = true; if (key.startsWith('data-')) this.dataset[key.slice(5).replace(/-([a-z])/g, (_, v) => v.toUpperCase())] = String(value); }
  removeAttribute(key) { delete this.attributes[key]; }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  matches(selector) {
    if (selector.includes(' ')) { const parts = selector.split(/\s+/); return this.matches(parts.pop()) && !!this.parent?.closest(parts.join(' ')); }
    const attr = selector.match(/\[([^=\]]+)(?:=['"]?([^'"\]]+)['"]?)?\]/), cls = selector.match(/\.([a-z-]+)/), tag = selector.match(/^[a-z0-9]+/i);
    return (!tag || this.tagName.toLowerCase() === tag[0].toLowerCase()) && (!cls || this.className.split(' ').includes(cls[1])) && (!attr || this.attributes[attr[1]] !== undefined && (!attr[2] || this.attributes[attr[1]] === attr[2]));
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) { const nodes = []; for (const child of this.children) { if (child.matches(selector)) nodes.push(child); nodes.push(...child.querySelectorAll(selector)); } return nodes; }
  closest(selector) { if (this.matches(selector)) return this; return this.parent?.closest(selector) || null; }
  focus() { this.focused = true; }
  click() { this.clicked = true; }
  scrollIntoView() {}
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  async emit(name, event = {}) { for (const listener of this.listeners[name] || []) await listener({ target: this, preventDefault() {}, ...event }); }
}
function parseHTML(html) {
  const root = new Node('body'), stack = [root], nodes = {};
  for (const part of html.match(/<[^>]+>|[^<]+/g)) {
    if (/^<\//.test(part)) { if (stack.length > 1) stack.pop(); continue; }
    if (/^<!/.test(part)) continue;
    if (/^</.test(part)) { const tag = part.match(/^<([a-z0-9-]+)/i)?.[1]; if (!tag) continue; const node = new Node(tag); for (const a of part.matchAll(/\s([a-z0-9:-]+)(?:="([^"]*)")?/gi)) node.setAttribute(a[1], a[2] ?? ''); if (node.attributes.id) nodes[node.attributes.id] = node; stack.at(-1).append(node); if (!['meta', 'link', 'input', 'br'].includes(tag)) stack.push(node); }
    else if (part.trim()) stack.at(-1)._text += part.replace(/&amp;/g, '&').trim();
  }
  return { root, nodes };
}
function client({ getOverview = async () => overview, getJourney = async () => journey, getPages = async () => ({ available: false }), getLeads = async () => leads, getExport = async () => new Blob(['test']), getLegacy } = {}) {
  const html = readFileSync(path.join(__dirname, '../local-analytics/index.html'), 'utf8'), { root, nodes } = parseHTML(html), calls = [], objectURLs = [], intervals = [], stored = new Map();
  const document = { getElementById: id => nodes[id], querySelector: selector => root.querySelector(selector), querySelectorAll: selector => root.querySelectorAll(selector), createElement: tag => new Node(tag), createElementNS: (_, tag) => new Node(tag), body: root, visibilityState: 'visible', listeners: {}, addEventListener(name, fn) { this.listeners[name] = fn; } };
  const transport = async (endpoint, options) => { const body = JSON.parse(options.body); calls.push({ endpoint, body, options }); let value; if (endpoint === '/api/export') return { ok: true, blob: getExport }; if (endpoint === '/api/leads') value = await getLeads(); else if (endpoint === '/api/report' && getLegacy) value = await getLegacy(); else { assert.equal(endpoint, '/api/explore'); value = body.view === 'overview' ? await getOverview(body) : body.view === 'journey' ? await getJourney(body) : body.view === 'pages' ? await getPages(body) : { available: false }; } if (value instanceof Error) return { ok: false, status: value.status || 502, json: async () => ({ error: value.message, code: value.code }) }; return { ok: true, json: async () => value }; };
  vm.runInNewContext(readFileSync(path.join(__dirname, '../local-analytics/dashboard.js'), 'utf8'), { document, fetch: transport, PriyamCharts: charts, Intl, Date, AbortSignal, Error, Blob, setTimeout, setInterval(fn) { intervals.push(fn); }, localStorage: { getItem(key) { return stored.get(key) || null; }, setItem(key, value) { stored.set(key, value); } }, URL: { createObjectURL(blob) { objectURLs.push(blob); return 'blob:test'; }, revokeObjectURL() {} } });
  const nav = view => document.querySelector('.view-nav').emit('click', { target: document.querySelectorAll('.view-nav button').find(n => n.dataset.view === view) });
  return { nodes, calls, objectURLs, document, html, nav, intervals };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('dashboard loads overview and flow without a password, external service or contact records', async () => {
  const { nodes, calls, html } = client(); await flush();
  assert.equal(nodes.report.hidden, false); assert.equal(nodes.password, undefined);
  assert.doesNotMatch(html, /type="password"|Website admin password|Sign out/);
  assert.deepEqual(calls.map(call => call.body.view), ['overview', 'journey']);
  assert.equal(calls[0].body.days, 30); assert.equal(calls[0].options.headers['X-Local-Analytics'], '1');
  assert.equal(nodes.contacts.textContent, ''); assert.match(nodes.metrics.textContent, /Unique visitors2/);
  assert.match(nodes['overview-flow'].textContent, /3 tab journeys/);
});

test('missing protected connection shows unavailable rather than zero or login', async () => {
  const error = Object.assign(new Error('Private connection unavailable'), { code: 'DATA_NOT_CONNECTED', status: 409 });
  const { nodes } = client({ getOverview: async () => error }); await flush();
  assert.equal(nodes.report.hidden, true); assert.equal(nodes['report-error'].hidden, false);
  assert.match(nodes['report-error'].textContent, /Live data is not connected/); assert.equal(nodes.metrics.textContent, '');
});

test('CV addresses are fetched on their own view, rendered as text and cleared on navigation', async () => {
  const unsafe = '<img src=x onerror=alert(1)>', app = client({ getLeads: async () => ({ ...leads, leads: [{ ...leads.leads[0], email: unsafe }] }) }); await flush();
  assert.equal(app.calls.some(call => call.endpoint === '/api/leads'), false);
  await app.nav('cv'); await flush(); assert.match(app.nodes.contacts.textContent, /<img src=x onerror=alert/);
  assert.equal(app.document.body.querySelectorAll('img').length, 0);
  await app.nav('overview'); await flush(); assert.equal(app.nodes.contacts.textContent, ''); assert.equal(app.nodes['contact-count'].textContent, '');
});

test('hide data clears all reports and prevents automatic refresh', async () => {
  const app = client(); await flush(); await app.nav('cv'); await flush(); await app.nodes['hide-data'].emit('click');
  assert.equal(app.nodes.report.hidden, true); assert.equal(app.nodes.metrics.textContent, ''); assert.equal(app.nodes.contacts.textContent, '');
  assert.equal(app.nodes['overview-flow'].textContent, ''); const count = app.calls.length; app.intervals[0](); await flush(); assert.equal(app.calls.length, count);
});

test('a late overview response cannot reveal data after Hide data', async () => {
  let resolve; const app = client({ getOverview: () => new Promise(done => { resolve = done; }) });
  await app.nodes['hide-data'].emit('click'); resolve(overview); await flush();
  assert.equal(app.nodes.report.hidden, true); assert.equal(app.nodes.metrics.textContent, '');
});

test('a late contact export is discarded after Hide data', async () => {
  let resolve; const app = client({ getExport: () => new Promise(done => { resolve = done; }) }); await flush(); await app.nav('cv'); await flush();
  const pending = app.nodes.export.emit('click'); await flush(); await app.nodes['hide-data'].emit('click'); resolve(new Blob(['private'])); await pending;
  assert.equal(app.objectURLs.length, 0); assert.equal(app.nodes['export-status'].textContent, '');
});

test('empty measured journeys and unavailable tracking have different honest states', async () => {
  const app = client({ getJourney: async () => ({ available: true, nodes: [], links: [] }) }); await flush(); assert.match(app.nodes['overview-flow'].textContent, /No journeys in this selection/);
  const missing = client({ getJourney: async () => ({ available: false }) }); await flush(); assert.match(missing.nodes['overview-flow'].textContent, /Journeys start with the new tracking/);
});

test('legacy-only overview keeps recorded browser totals but never invents sessions or time', async () => {
  const app = client({ getOverview: async () => ({ available: false, coverage: {}, summary: {}, legacy: { uniqueVisitors: 41, pageViews: 137, cvRequests: null }, daily: [], filters: {} }), getJourney: async () => ({ available: false }) }); await flush();
  assert.match(app.nodes.metrics.textContent, /Unique visitors41/); assert.match(app.nodes.metrics.textContent, /Sessions—/); assert.match(app.nodes.metrics.textContent, /Avg\. active time—/); assert.match(app.nodes.metrics.textContent, /CV requests—/);
  assert.match(app.nodes['visitor-note'].textContent, /Historical totals remain available/);
});

test('chart selection has a keyboard route and meaningful labels, not hover-only content', async () => {
  const app = client(); await flush(); const nodes = app.nodes['overview-flow'].querySelectorAll('.graph-node'); assert.equal(nodes.length, 3);
  assert.equal(nodes[0].attributes.tabindex, '0'); assert.match(nodes[0].attributes['aria-label'], /Home: 3/);
  await nodes[0].emit('keydown', { key: 'Enter' }); assert.match(app.nodes['overview-flow'].textContent, /Selected pointHome/);
});

test('auto-refresh pauses while the dashboard tab is hidden', async () => {
  const app = client(); await flush(); const count = app.calls.length; app.document.visibilityState = 'hidden'; app.intervals[0](); await flush(); assert.equal(app.calls.length, count);
});

test('funnel builder submits named ordered steps rather than a free-form query', async () => {
  const app = client(); await flush(); await app.nav('funnels'); await flush();
  await app.nodes['new-funnel'].emit('click');
  assert.equal(app.nodes['funnel-builder'].hidden, false);
  assert.equal(app.nodes['funnel-steps'].children.length, 2);
  app.nodes['funnel-name'].value = 'My CV funnel';
  await app.nodes['funnel-builder'].emit('submit'); await flush();
  const call = app.calls.at(-1); assert.equal(call.body.view, 'funnel');
  assert.deepEqual(call.body.steps.map(step => step.type), ['cv_opened', 'cv_request_saved']);
  assert.equal(call.body.funnel, undefined); assert.equal(app.nodes['funnel-builder'].hidden, true);
});

test('a late contact response is discarded when the reader changes views', async () => {
  let resolve; const app = client({ getLeads: () => new Promise(done => { resolve = done; }) }); await flush();
  const pending = app.nav('cv'); await flush(); await app.nav('overview'); await flush();
  resolve(leads); await pending; await flush(); assert.equal(app.nodes.contacts.textContent, '');
});

test('unavailable v2 hydrates old daily/device/referrer data and labels it as page-view aggregates', async () => {
  const app = client({ getOverview: async () => ({ available: false, reason: 'not_initialized', coverage: {}, range: { startDate: '2026-11-01', endDate: '2026-11-06' }, summary: {}, filters: {}, daily: [], legacy: { uniqueVisitors: 41, pageViews: 137, cvRequests: null, daily: [{ date: '2026-11-06', pageViews: 7, cvRequests: null }], referrers: [{ source: 'linkedin.com', visits: 4 }], devices: [{ device: 'Phone', visits: 3 }], topPages: [{ path: '/', views: 7 }] } }), getJourney: async () => ({ available: false }) }); await flush();
  assert.match(app.nodes['daily-table'].textContent, /7/);
  assert.match(app.nodes.referrers.textContent, /linkedin\.com4/);
  assert.match(app.nodes.devices.textContent, /Phone3/);
  assert.equal(app.nodes['sources-title'].textContent, 'Sources of page views');
  assert.equal(app.nodes['devices-title'].textContent, 'Devices · page views');
  assert.match(app.nodes['report-period'].textContent, /1 Nov 2026/);
  assert.match(app.nodes.metrics.textContent, /Sessions—/);
});

test('source and page filters retain their selection when a narrower result has no options', async () => {
  const app = client({ getOverview: async body => body.device ? { ...overview, filters: { sources: [], paths: [] }, daily: [], summary: { ...overview.summary, views: 0 } } : overview }); await flush();
  app.nodes['source-filter'].value = 'linkedin.com'; app.nodes['device-filter'].value = 'Tablet';
  await app.nodes['device-filter'].emit('change'); await flush();
  assert.equal(app.nodes['source-filter'].value, 'linkedin.com');
  assert.equal(app.nodes['device-filter'].value, 'Tablet');
  assert.equal(app.calls.filter(call => call.body.view === 'overview').at(-1).body.source, 'linkedin.com');
});

test('historical page and action totals remain available while session-level detail awaits collection', async () => {
  const app = client({ getOverview: async () => ({ available: false, coverage: {}, range: { startDate: '2026-11-01', endDate: '2026-11-06' }, summary: {}, filters: {}, legacy: { uniqueVisitors: 41, pageViews: 137, cvRequests: null, topPages: [{ path: '/', views: 50, browserVisitors: 30 }, { path: '/product', views: 20, browserVisitors: 10 }], pageInteractions: [{ path: '/', count: 7 }], interactions: [{ type: 'cv_opened', target: 'cv', count: 3 }], daily: [], referrers: [], devices: [] } }), getJourney: async () => ({ available: false }) }); await flush();
  await app.nav('pages'); await flush();
  assert.match(app.nodes.pages.textContent, /Historical page totals/);
  assert.match(app.nodes.pages.textContent, /Home50307/);
  assert.match(app.nodes['page-detail'].textContent, /Historical actions · all pages/);
  assert.match(app.nodes['page-detail'].textContent, /CV form opened/);
  assert.match(app.nodes['page-time-ranking'].textContent, /was not measured/);
});

const mixedOverview = {
  ...overview,
  legacy: {
    uniqueVisitors: 41, pageViews: 137, cvRequests: null,
    daily: [{ date: '2026-11-05', pageViews: 90, cvRequests: null }, { date: '2026-11-06', pageViews: 47, cvRequests: null }],
    topPages: [{ path: '/art', views: 87, browserVisitors: 31 }, { path: '/', views: 50, browserVisitors: 20 }],
    referrers: [{ source: 'legacy.example', visits: 137 }], devices: [{ device: 'Phone', visits: 137 }],
  },
};
const measuredPages = { available: true, coverage: overview.coverage, pages: [{ path: '/', title: 'Home', views: 7, browsers: 2, sessions: 3, measuredViews: 5, avgActiveMs: 8400, entries: 3, lastObserved: 2, controls: [{ id: 'header:work', type: 'navigation_clicked', count: 2, impressions: 3, clickRate: 2 / 3 }] }] };
const cellValues = row => row.children.map(cell => cell.textContent);

test('mixed tracking keeps complete daily totals without adding the new stream twice', async () => {
  const app = client({ getOverview: async () => mixedOverview }); await flush();
  const dailyRows = app.nodes['daily-table'].querySelectorAll('tbody tr').map(cellValues);
  assert.deepEqual(dailyRows, [['5 Nov 2026', '90', '—', '—', '—'], ['6 Nov 2026', '47', '3', '2', '—']]);
  assert.match(app.nodes.metrics.textContent, /Page views137/);
  assert.match(app.nodes['daily-table'].textContent, /Sessions and daily unique browsers use journey measurement only/);
  assert.match(app.nodes.referrers.textContent, /linkedin\.com2/);
  assert.doesNotMatch(app.nodes.referrers.textContent, /legacy\.example/);
  assert.equal(app.nodes['sources-title'].textContent, 'Where visits start');
});

test('mixed page reports preserve older pages beside scoped engagement and working control detail', async () => {
  const app = client({ getOverview: async () => mixedOverview, getPages: async () => measuredPages }); await flush(); await app.nav('pages'); await flush();
  const tables = app.nodes.pages.querySelectorAll('table');
  assert.equal(tables.length, 2);
  assert.deepEqual(tables[0].querySelectorAll('tbody tr').map(cellValues), [['Art', '87', '31'], ['Home', '50', '20']]);
  assert.deepEqual(tables[1].querySelectorAll('tbody tr').map(cellValues), [['Home', '7', '2', '3', '5', '8s', '3', '2']]);
  assert.match(app.nodes.pages.textContent, /already include the views measured below/);
  assert.match(app.nodes.pages.textContent, /Journey measurement since 6 Nov 2026/);
  assert.match(app.nodes['page-view-ranking'].textContent, /Art87Home50/);
  await tables[1].querySelector('button').emit('click');
  assert.match(app.nodes['page-detail'].textContent, /Controls & buttons/);
  assert.match(app.nodes['page-detail'].textContent, /header:work/);
});

test('historical page totals stay visible even with no new views in the selected period', async () => {
  const app = client({ getOverview: async () => mixedOverview, getPages: async () => ({ ...measuredPages, pages: [] }) }); await flush(); await app.nav('pages'); await flush();
  assert.match(app.nodes.pages.textContent, /Art8731/);
  assert.match(app.nodes.pages.textContent, /No measured page activity/);
  assert.match(app.nodes['page-time-ranking'].textContent, /not available yet/);
});

test('cohort filters never merge unfiltered historical totals into trends or pages', async () => {
  for (const [id, value] of [['device-filter', 'Desktop'], ['source-filter', 'linkedin.com'], ['page-filter', '/']]) {
    const app = client({ getOverview: async () => mixedOverview, getPages: async () => measuredPages }); await flush();
    app.nodes[id].value = value; await app.nodes[id].emit('change'); await flush(); await app.nav('pages'); await flush();
    assert.deepEqual(app.nodes['daily-table'].querySelectorAll('tbody tr').map(cellValues), [['6 Nov 2026', '7', '3', '2', '1']]);
    assert.match(app.nodes.metrics.textContent, /Page views7/);
    assert.doesNotMatch(app.nodes.pages.textContent, /All recorded page totals|Art/);
    assert.equal(app.nodes.pages.querySelectorAll('table').length, 1);
    assert.equal(app.nodes['page-view-ranking'].textContent, 'Home7');
  }
});

test('switching views during an in-flight refresh cannot leave Refresh permanently disabled', async () => {
  let finishOldJourney, pageLoads = 0;
  const app = client({
    getJourney: () => new Promise(resolve => { finishOldJourney = resolve; }),
    getPages: async () => { pageLoads++; return measuredPages; },
  });
  await flush();
  assert.equal(app.nodes.refresh.disabled, true);
  await app.nav('pages'); await flush();
  assert.equal(pageLoads, 1);
  finishOldJourney(journey); await flush();
  assert.equal(app.nodes.refresh.disabled, false);
  assert.match(app.nodes['report-status'].textContent, /^Updated /);
  assert.equal(app.nodes['view-pages'].hidden, false);
  assert.equal(app.nodes['overview-flow'].textContent, '', 'The obsolete journey must not render after navigation');
  await app.nodes.refresh.emit('click'); await flush();
  assert.equal(pageLoads, 2, 'A later refresh remains usable');
  assert.equal(app.nodes.refresh.disabled, false);
});

test('navigation and journey options wait for a pending filtered overview and use its current selection', async () => {
  let finishFiltered;
  const app = client({ getOverview: body => body.device ? new Promise(resolve => { finishFiltered = resolve; }) : Promise.resolve(overview) });
  await flush();
  app.nodes['device-filter'].value = 'Phone'; await app.nodes['device-filter'].emit('change'); await flush();
  const journeyRequests = app.calls.filter(call => call.body.view === 'journey').length;
  await app.nav('journeys'); app.nodes['journey-depth'].value = '7'; await app.nodes['journey-depth'].emit('change'); await flush();
  assert.equal(app.calls.filter(call => call.body.view === 'journey').length, journeyRequests, 'Do not combine a new filtered detail query with the old overview');
  finishFiltered({ ...overview, summary: { ...overview.summary, views: 1 } }); await flush();
  const latest = app.calls.at(-1).body;
  assert.equal(latest.view, 'journey'); assert.equal(latest.device, 'Phone'); assert.equal(latest.depth, 7);
  assert.match(app.nodes.metrics.textContent, /Page views1/);
  assert.equal(app.nodes.refresh.disabled, false);
  assert.equal(app.nodes['view-journeys'].hidden, false);
});

test('an older refresh cannot clear loading or replace the data of a newer refresh', async () => {
  const pending = [];
  const app = client({ getOverview: () => new Promise(resolve => pending.push(resolve)) }); await flush();
  app.nodes['date-range'].value = '7'; await app.nodes['date-range'].emit('change'); await flush();
  pending[0]({ ...overview, summary: { ...overview.summary, views: 99 } }); await flush();
  assert.equal(app.nodes.refresh.disabled, true); assert.equal(app.nodes.metrics.textContent, '');
  pending[1]({ ...overview, summary: { ...overview.summary, views: 4 } }); await flush();
  assert.equal(app.nodes.refresh.disabled, false); assert.match(app.nodes.metrics.textContent, /Page views4/);
  assert.doesNotMatch(app.nodes.metrics.textContent, /99/);
});
