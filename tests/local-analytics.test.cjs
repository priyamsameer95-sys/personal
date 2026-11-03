'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const report = {
  days: 30, startDate: '2026-09-21', endDate: '2026-10-20', trackingStartedAt: '2026-10-20',
  pageViews: 7, visitors: 3, clicks: 4, cvRequests: 1, cvContacts: 1, cvRequestsAllTime: 1, cvLeadsTotal: 1,
  daily: [{ date: '2026-10-20', visitors: 3, pageViews: 7, clicks: 4, cvRequests: 1 }],
  topPages: [{ path: '/', views: 7, visitors: 3 }], interactions: [{ type: 'cv_opened', target: 'cv', count: 4 }],
  pageInteractions: [{ path: '/', count: 4 }], referrers: [], devices: [], countries: [],
  cvLeads: [{ email: 'test-only@example.com', first_requested_at: '2026-10-20', last_requested_at: '2026-10-20', download_count: 1, last_source_path: '/' }],
};
class TestNode {
  constructor(tag = 'div') { this.tagName = tag.toUpperCase(); this.children = []; this.attributes = {}; this.listeners = {}; this.dataset = {}; this.style = {}; this.hidden = false; this.disabled = false; this.value = ''; this._text = ''; }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  append(...nodes) { this.children.push(...nodes); for (const node of nodes) node.parent = this; }
  replaceChildren(...nodes) { this._text = ''; this.children = []; this.append(...nodes); }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) { const nodes = []; for (const child of this.children) { if (child.tagName.toLowerCase() === selector) nodes.push(child); nodes.push(...child.querySelectorAll(selector)); } return nodes; }
  closest(selector) { return selector === 'button[data-days]' && this.tagName === 'BUTTON' && this.dataset.days ? this : null; }
  focus() { this.focused = true; }
  click() { this.clicked = true; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); }
  async emit(name, event = {}) { for (const listener of this.listeners[name] || []) await listener(event); }
}

function dashboardClient({ getReport = async () => report, getExport = async () => new Blob(['safe,test']) } = {}) {
  const html = readFileSync(path.join(__dirname, '../local-analytics/index.html'), 'utf8');
  const nodes = Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(match => [match[1], new TestNode()]));
  nodes.dashboard.hidden = false; nodes.report.hidden = true; nodes['report-error'].hidden = true;
  nodes['report-error'].append(new TestNode('h2'),new TestNode('p'));
  for (const range of [7,30,90]) { const button = new TestNode('button'); button.dataset.days = String(range); nodes.ranges.append(button); }
  const calls = [], objectURLs = [];
  const document = { getElementById: id => nodes[id], createElement: tag => new TestNode(tag), createElementNS: (ns,tag) => new TestNode(tag), body: new TestNode('body') };
  const transport = async (endpoint,options) => {
    const body = JSON.parse(options.body); calls.push({endpoint,body,options});
    if (endpoint === '/api/export') return { ok:true,blob:getExport };
    assert.equal(endpoint,'/api/report','The local interface must never ask for credentials or a login session');
    const value = await getReport(body.days);
    if (value instanceof Error) return {ok:false,status:value.status || 502,json:async()=>({error:value.message,code:value.code})};
    return {ok:true,json:async()=>value};
  };
  vm.runInNewContext(readFileSync(path.join(__dirname,'../local-analytics/dashboard.js'),'utf8'), {document,fetch:transport,Intl,Date,AbortSignal,Error,setTimeout,URL:{createObjectURL(blob){objectURLs.push(blob);return 'blob:test'},revokeObjectURL(){}}});
  return {nodes,calls,objectURLs,document,html};
}
const flushClient=()=>new Promise(resolve=>setImmediate(resolve));

test('local dashboard opens directly and loads a report without a password or browser login request', async()=>{
  const {nodes,calls,html}=dashboardClient(); await flushClient();
  assert.equal(nodes.dashboard.hidden,false); assert.equal(nodes.report.hidden,false);
  assert.equal(nodes.password,undefined); assert.equal(nodes['login-form'],undefined);
  assert.doesNotMatch(html,/<input|Sign out|Open my analytics|Website admin password/i);
  assert.equal(calls.length,1); assert.equal(calls[0].endpoint,'/api/report');
  assert.equal(calls[0].body.days,30);
  assert.equal(calls[0].options.headers['X-Local-Analytics'],'1');
});
test('an unconfigured protected data connection shows unavailable, never a login prompt or zero counts',async()=>{
  const unavailable=Object.assign(new Error('No private connection'),{status:409,code:'DATA_NOT_CONNECTED'});
  const {nodes}=dashboardClient({getReport:async()=>unavailable}); await flushClient();
  assert.equal(nodes.dashboard.hidden,false); assert.equal(nodes.report.hidden,true);
  assert.equal(nodes['report-error'].hidden,false);
  assert.match(nodes['report-error'].textContent,/Live data is not connected/);
  assert.match(nodes['report-error'].textContent,/counts and email addresses are not available/);
  assert.equal(nodes.metrics.textContent,''); assert.equal(nodes.contacts.textContent,'');
});
test('populated reports remain text-safe, and Hide data clears records from the DOM',async()=>{
  const unsafe='<img src=x onerror=alert(1)>';
  const {nodes,document}=dashboardClient({getReport:async()=>({...report,cvLeads:[{...report.cvLeads[0],email:unsafe}],interactions:[{type:'outbound_clicked',target:unsafe,count:4}]})});
  await flushClient();
  assert.match(nodes.metrics.textContent,/Clicks & actions4/);
  assert.match(nodes.contacts.textContent,/<img src=x onerror=alert/);
  assert.match(nodes.interactions.textContent,/<img src=x onerror=alert/);
  assert.equal(document.body.querySelectorAll('img').length,0);
  await nodes['hide-data'].emit('click');
  assert.equal(nodes.report.hidden,true); assert.equal(nodes.contacts.textContent,'');
  assert.equal(nodes.metrics.textContent,''); assert.equal(nodes['contact-count'].textContent,'');
  assert.match(nodes['report-status'].textContent,/Report hidden/);
});
test('date filters distinguish empty activity from a failed data source',async()=>{
  const empty={...report,pageViews:0,visitors:0,clicks:0,cvRequests:0,cvContacts:0,daily:[],topPages:[],cvLeads:[],interactions:[],pageInteractions:[]};
  const {nodes}=dashboardClient({getReport:async selected=>selected===7?empty:selected===90?new Error('Synthetic storage outage'):report});
  await flushClient(); await nodes.ranges.emit('click',{target:nodes.ranges.children[0]}); await flushClient();
  assert.equal(nodes.report.hidden,false); assert.match(nodes.contacts.textContent,/No one has shared/);
  await nodes.ranges.emit('click',{target:nodes.ranges.children[2]}); await flushClient();
  assert.equal(nodes.report.hidden,true); assert.equal(nodes['report-error'].hidden,false);
  assert.match(nodes['report-error'].textContent,/Synthetic storage outage/);
  assert.equal(nodes.contacts.textContent,'');
});
test('a late export is discarded after Hide data is clicked',async()=>{
  let resolveExport;
  const {nodes,objectURLs}=dashboardClient({getExport:async()=>new Promise(resolve=>{resolveExport=resolve})});
  await flushClient(); const pending=nodes.export.emit('click');
  while(!resolveExport)await flushClient();
  await nodes['hide-data'].emit('click'); resolveExport(new Blob(['private-records'])); await pending;
  assert.equal(objectURLs.length,0); assert.equal(nodes['export-status'].textContent,'');
});
test('Hide data prevents a delayed report from returning until explicitly refreshed',async()=>{
  let resolveReport;
  const {nodes}=dashboardClient({getReport:async()=>new Promise(resolve=>{resolveReport=resolve})});
  while(!resolveReport)await flushClient();
  await nodes['hide-data'].emit('click'); resolveReport(report); await flushClient();
  assert.equal(nodes.report.hidden,true); assert.equal(nodes.contacts.textContent,'');
});

 test('missing dated CV history stays unavailable while all-time counts and emails remain visible', async()=>{
  const data={...report,cvRequests:null,availability:{pageViews:true,interactions:true,cvRequestHistory:false},daily:report.daily.map(day=>({...day,cvRequests:null}))};
  const {nodes}=dashboardClient({getReport:async()=>data}); await flushClient();
  assert.equal(nodes.report.hidden,false);
  assert.match(nodes.metrics.textContent,/CV requests · this period—Dated history was not recorded/);
  assert.equal(nodes['cv-legend'].hidden,true);
  assert.match(nodes['tracking-start'].textContent,/Exact dated CV request history was not recorded/);
  assert.match(nodes.contacts.textContent,/test-only@example.com/);
  assert.match(nodes['record-note'].textContent,/reserved test domain/);
  assert.equal(nodes['daily-chart'].querySelectorAll('path').length,1);
 });

 test('unique visitors display period browser counts with coverage rather than relabelled visitor-days',async()=>{
  const {nodes}=dashboardClient({getReport:async()=>({...report,uniqueVisitors:2,uniqueTrackedPageViews:5,uniqueTrackingStartedAt:'2026-10-20T01:00:00Z'})});
  await flushClient();
  assert.match(nodes.metrics.textContent,/Unique visitors2/);
  assert.doesNotMatch(nodes.metrics.textContent,/Unique visitors3/);
  assert.match(nodes['visitor-note'].textContent,/5 of 7 page views/);
  assert.match(nodes['visitor-note'].textContent,/3 visitor-days/);
  await nodes['hide-data'].emit('click');
  assert.equal(nodes['visitor-note'].textContent,'');
 });
 test('legacy-only records show unique visitors as unavailable instead of a made-up total',async()=>{
  const {nodes}=dashboardClient();await flushClient();
  assert.match(nodes.metrics.textContent,/Unique visitors—/);
  assert.match(nodes['visitor-note'].textContent,/historical unique visitors cannot be reconstructed/);
 });

 test('historical test entries are explained but never displayed as real CV interest',async()=>{
  const {nodes}=dashboardClient({getReport:async()=>({...report,cvContacts:0,cvRequestsAllTime:0,cvLeadsTotal:0,cvLeads:[],excludedCVContacts:1,excludedCVRequests:3})});
  await flushClient();
  assert.match(nodes.metrics.textContent,/Emails shared0/);
  assert.match(nodes.metrics.textContent,/CV requests · all time0/);
  assert.match(nodes['record-note'].textContent,/Excluded 1 test or disposable email address and 3 historical requests/);
  assert.match(nodes.contacts.textContent,/No CV requests remain after excluding test addresses/);
  assert.doesNotMatch(nodes.contacts.textContent,/@example\.com/);
 });
