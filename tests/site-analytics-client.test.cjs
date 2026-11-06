const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const root = path.join(__dirname, '..');
const source = readFileSync(path.join(root, 'lib/analytics-client.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const settle = () => new Promise(resolve => setImmediate(resolve));
class Element {
  constructor(tag = 'button', attributes = {}, parent = null) { this.tagName = tag.toUpperCase(); this.attributes = attributes; this.parent = parent; this.id = attributes.id || ''; }
  getAttribute(key) { return Object.hasOwn(this.attributes, key) ? this.attributes[key] : null; }
  hasAttribute(key) { return Object.hasOwn(this.attributes, key); }
  matches(selector) {
    if (selector === 'header' || selector === 'footer' || selector === 'dialog' || selector === 'video') return this.tagName.toLowerCase() === selector;
    if (selector.includes('section[id]')) return ['SECTION', 'ARTICLE'].includes(this.tagName) && !!this.id || this.hasAttribute('data-analytics-section');
    return this.hasAttribute('data-analytics') || this.tagName === 'A' && this.hasAttribute('href') || this.tagName === 'BUTTON' && (this.hasAttribute('aria-pressed') || this.getAttribute('role') === 'tab');
  }
  closest(selector) { return this.matches(selector) ? this : this.parent?.closest(selector) || null; }
}
class Video extends Element {
  constructor(attributes = {}) { super('video', attributes); this.paused = false; this.ended = false; this.currentTime = 0; this.duration = 100; this.playbackRate = 1; }
}
function harness(options = {}) {
  const calls = [], beacons = [], elements = [], timeouts = new Map(), intervals = new Map(), docListeners = new Map(), winListeners = new Map(), observers = [];
  let now = 0, timerId = 0, ids = options.uuidSeed || 0, cleanup;
  const on = (map, name, fn) => { if (!map.has(name)) map.set(name, new Set()); map.get(name).add(fn); };
  const fire = (map, type, event = {}) => { for (const fn of [...(map.get(type) || [])]) fn({ type, isTrusted: true, ...event }); };
  const document = {
    cookie: options.disabled ? 'ps_analytics_disabled=1' : '', visibilityState: options.hidden ? 'hidden' : 'visible', focused: !options.hidden,
    referrer: 'https://www.example.org/private?email=never-send@example.org', body: new Element('body'), documentElement: { scrollHeight: 2000 },
    hasFocus() { return this.focused; },
    addEventListener: (n, fn) => on(docListeners, n, fn), removeEventListener: (n, fn) => docListeners.get(n)?.delete(fn),
    dispatchEvent: event => fire(docListeners, event.type, event),
    querySelectorAll: selector => elements.filter(el => selector === 'video' ? el.tagName === 'VIDEO' : selector.includes('section[id]')
      ? el.matches('section[id]') || ['cv_opened', 'contact_opened'].includes(el.getAttribute('data-analytics')) || (el.getAttribute('href') || '').startsWith('/product/') : el.matches(selector)),
  };
  const navigator = { doNotTrack: options.dnt ? '1' : 'unspecified', globalPrivacyControl: !!options.gpc,
    sendBeacon: (url, blob) => { if (!options.beacon) return false; beacons.push({ url, body: blob }); return true; },
    locks: { request: (_name, fn) => fn() },
  };
  const window = {
    location: { origin: 'https://www.priyamsameer.com', href: 'https://www.priyamsameer.com/', pathname: '/', hostname: options.hostname || 'www.priyamsameer.com', search: options.search || '' },
    crypto: { randomUUID: () => `12345678-1234-4123-8123-${String(++ids).padStart(12, '0')}` },
    innerHeight: 500, scrollY: 0, opener: null,
    addEventListener: (n, fn) => on(winListeners, n, fn), removeEventListener: (n, fn) => winListeners.get(n)?.delete(fn),
    setTimeout(fn, delay = 0) { const id = ++timerId; timeouts.set(id, { fn, at: now + delay }); return id; },
    clearTimeout: id => timeouts.delete(id),
    setInterval(fn, delay) { const id = ++timerId; intervals.set(id, { fn, at: now + delay, delay }); return id; },
    clearInterval: id => intervals.delete(id),
  };
  const storage = options.storage || new Map();
  const module = { exports: {} };
  class IntersectionObserver {
    constructor(callback) { this.callback = callback; this.elements = new Set(); observers.push(this); }
    observe(el) { this.elements.add(el); }
    disconnect() { this.elements.clear(); }
    fire(el, ratio = 1) { this.callback([{ target: el, isIntersecting: ratio > 0, intersectionRatio: ratio, intersectionRect: { height: ratio > 0 ? 200 : 0 } }]); }
  }
  const context = { module, exports: module.exports, document, window, navigator, URL, URLSearchParams, Blob, AbortController, Element, HTMLVideoElement: Video, IntersectionObserver,
    performance: { now: () => now }, Date: { now: () => now }, process: { env: options.local ? { NEXT_PUBLIC_ANALYTICS_ALLOW_LOCAL: '1' } : {} },
    CustomEvent: class { constructor(type, values) { this.type = type; this.detail = values.detail; } },
    sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    fetch(url, init) { const call = { url, init, body: JSON.parse(init.body) }; calls.push(call); return options.fetch ? options.fetch(call, calls.length) : Promise.resolve({ ok: true, status: 204 }); },
  };
  if (options.BroadcastChannel) context.BroadcastChannel = options.BroadcastChannel;
  vm.runInNewContext(compiled, context, { filename: 'lib/analytics-client.ts' });
  const api = module.exports;
  async function advance(ms) {
    const until = now + ms;
    while (true) {
      let next;
      for (const [id, t] of timeouts) if (t.at <= until && (!next || t.at < next.t.at)) next = { id, t, repeat: false };
      for (const [id, t] of intervals) if (t.at <= until && (!next || t.at < next.t.at)) next = { id, t, repeat: true };
      if (!next) break;
      now = next.t.at;
      if (next.repeat) next.t.at += next.t.delay; else timeouts.delete(next.id);
      next.t.fn(); await settle();
    }
    now = until; await settle();
  }
  function mount(route = '/') { window.location.pathname = route; window.location.href = `${window.location.origin}${route}`; cleanup = api.startAnalyticsVisit(route); }
  function route(next) { cleanup?.(); mount(next); }
  function click(el, extra = {}) { fire(docListeners, 'click', { target: el, button: 0, ...extra }); }
  return { api, calls, beacons, elements, document, navigator, window, observers, storage, advance, mount, route, click,
    doc: (type, e) => fire(docListeners, type, e), win: (type, e) => fire(winListeners, type, e), unmount: () => cleanup?.(),
    actions: () => calls.filter(c => !['page_view', 'engagement'].includes(c.body.type)).map(c => c.body),
    views: () => calls.filter(c => c.body.type === 'page_view').map(c => c.body),
  };
}
const link = (href, parent) => new Element('a', { href }, parent);
const button = (type, target = 'cv', attributes = {}, parent) => new Element('button', { 'data-analytics': type, 'data-analytics-target': target, ...attributes }, parent);

test('public paths strip private parameters and accept CMS underscores while rejecting admin/assets', () => {
  const { api } = harness();
  assert.equal(api.publicAnalyticsPath('/art/my_painting?email=secret#private'), '/art/my_painting');
  assert.equal(api.publicAnalyticsPath('/product/case/references'), '/product/case/references');
  for (const route of ['/minforyam', '/api/admin/analytics', '/brands/logo.svg', '//example.com', '/unknown']) assert.equal(api.publicAnalyticsPath(route), null);
});
test('campaign attribution accepts only explicitly approved triples', () => {
  const { api } = harness();
  assert.equal(api.analyticsCampaign('?utm_source=linkedin&utm_medium=social&utm_campaign=featured'), 'linkedin:social:featured');
  for (const query of ['?utm_source=unknown&utm_medium=social&utm_campaign=featured', '?utm_source=linkedin&utm_medium=social&utm_campaign=jane@example.com', '?utm_source=linkedin']) assert.equal(api.analyticsCampaign(query), undefined);
});
test('active clock measures foreground seconds, pauses while hidden and at idle cutoff', () => {
  const { api } = harness(), clock = api.createEngagementClock(0);
  for (let t = 1000; t <= 10000; t += 1000) clock.sample(t, true);
  for (let t = 11000; t <= 70000; t += 1000) clock.sample(t, false);
  assert.equal(clock.total(), 10000);
  clock.activity(70000);
  for (let t = 71000; t <= 140000; t += 1000) clock.sample(t, true);
  assert.equal(clock.total(), 70000, 'only60seconds after the latest activity counts');
  clock.sample(240000, true); assert.equal(clock.total(), 70000, 'sleep gaps are not credited');
});
test('foreground playback permits reading time beyond idle, but background playback does not', () => {
  const { api } = harness(), clock = api.createEngagementClock(0);
  for (let t = 1000; t <= 90000; t += 1000) clock.sample(t, true, true);
  assert.equal(clock.total(), 90000);
  for (let t = 91000; t <= 100000; t += 1000) clock.sample(t, false, true);
  assert.equal(clock.total(), 90000);
});
test('watch coverage uses unioned intervals, not a seek destination or repeated playback', () => {
  const { api } = harness();
  assert.equal(api.watchedPercent([[0, 10], [80, 90]], 100), 20);
  assert.equal(api.watchedPercent([[0, 40], [20, 60], [0, 40]], 100), 60);
  assert.equal(api.watchedPercent([[0, 100]], Infinity), 0);
});
test('page arrivals have distinct parent IDs and sequenced SPA transitions, while focus does not duplicate a view', async () => {
  const h = harness(); h.mount(); await h.advance(100); h.doc('visibilitychange'); await settle();
  for (const route of ['/cv', '/product/a-case', '/product/a-case/references', '/']) { h.route(route); await h.advance(100); }
  assert.deepEqual(h.views().map(v => v.path), ['/', '/cv', '/product/a-case', '/product/a-case/references', '/']);
  assert.equal(new Set(h.views().map(v => v.pageViewId)).size, 5);
  assert.equal(new Set(h.views().map(v => v.tabId)).size, 1);
  assert.ok(h.views().every(v => v.version === 2 && v.eventId === v.pageViewId && v.referrer === 'www.example.org'));
  assert.doesNotMatch(JSON.stringify(h.calls), /never-send|private\?/);
  assert.deepEqual(JSON.parse(JSON.stringify(h.api.getAnalyticsContext())), { pageViewId: h.views().at(-1).pageViewId });
});
test('dependent actions wait for first identity response without delaying the click handler', async () => {
  let release; const first = new Promise(resolve => { release = resolve; });
  const h = harness({ fetch: (_call, i) => i === 1 ? first : Promise.resolve({ ok: true, status: 204 }) });
  h.mount(); await h.advance(100); h.click(link('/cv')); h.route('/product'); await h.advance(100);
  assert.equal(h.calls.length, 1); assert.equal(h.api.getAnalyticsContext(), null);
  release({ ok: true, status: 204 }); await settle(); await settle();
  assert.equal(h.actions()[0].type, 'navigation_clicked');
  assert.equal(h.actions()[0].pageViewId, h.views()[0].pageViewId);
  assert.equal(h.views().length, 2);
});
test('failed delivery retries the identical event instead of manufacturing another view', async () => {
  const h = harness({ fetch: (_call, i) => i === 1 ? Promise.reject(new Error('offline')) : Promise.resolve({ ok: true, status: 204 }) });
  h.mount(); await h.advance(100); await h.advance(300);
  assert.equal(h.views().length, 2); assert.equal(h.views()[0].eventId, h.views()[1].eventId);
});
test('privacy, owner exclusion and nonproduction origins suppress all collection', async () => {
  for (const setting of [{ dnt: true }, { gpc: true }, { disabled: true }, { hostname: '127.0.0.1' }, { hostname: 'preview.vercel.app' }]) {
    const h = harness(setting); h.mount(); await h.advance(100); h.click(link('/cv')); await h.advance(15000); assert.equal(h.calls.length, 0);
  }
});
test('opting out cancels queued actions and removes the optional CV journey context', async () => {
  let release; const first = new Promise(resolve => { release = resolve; });
  const h = harness({ fetch: (_call, i) => i === 1 ? first : Promise.resolve({ ok: true, status: 204 }) });
  h.mount(); await h.advance(100); h.click(link('/cv'));
  h.document.cookie = 'ps_analytics_disabled=1'; h.win('portfolio:analytics-preference');
  release({ ok: true, status: 204 }); await settle();
  assert.equal(h.calls.length, 1); assert.equal(h.api.getAnalyticsContext(), null);
});
test('background initial load waits until visible; final hidden flush keeps previously measured time', async () => {
  const h = harness({ hidden: true, beacon: true }); h.mount(); await h.advance(100); assert.equal(h.calls.length, 0);
  h.document.visibilityState = 'visible'; h.document.focused = true; h.doc('visibilitychange'); await settle();
  await h.advance(10000); h.document.visibilityState = 'hidden'; h.document.focused = false; h.doc('visibilitychange');
  assert.equal(h.beacons.length, 1);
  const final = JSON.parse(await h.beacons[0].body.text());
  assert.equal(final.type, 'engagement'); assert.equal(final.activeMs, 10000);
  await h.advance(60000); assert.equal(h.beacons.length, 1);
});
test('button controls distinguish placements and a click confirms its own CTA exposure', async () => {
  const h = harness(), header = new Element('header'), footer = new Element('footer');
  const top = button('cv_opened', 'cv', {}, header), bottom = button('cv_opened', 'cv', {}, footer);
  h.elements.push(top, bottom); h.mount(); await h.advance(100); h.click(top); h.click(bottom); await settle();
  const actions = h.actions(); assert.deepEqual(actions.map(x => x.type), ['cta_viewed', 'cv_opened', 'cta_viewed', 'cv_opened']);
  assert.match(actions[1].control, /^header:/); assert.match(actions[3].control, /^footer:/);
  assert.equal(actions[0].control, actions[1].control);
});
test('contact and external clicks never send identifying destinations or query strings', async () => {
  const h = harness(); h.mount(); await h.advance(100);
  for (const href of ['mailto:owner@example.com?subject=private', 'tel:+1234567890', 'https://wa.me/123?text=secret', 'https://linkedin.com/in/private-name', 'https://github.com/private-owner/repository?token=secret', 'https://college.money/private', '/product/a-case?email=secret#private']) h.click(link(href));
  await settle();
  assert.deepEqual(h.actions().filter(e => e.type !== 'cta_viewed').map(a => a.target), ['email', 'phone', 'whatsapp', 'linkedin', 'github', 'live_product', '/product/a-case']);
  assert.doesNotMatch(JSON.stringify(h.calls), /owner@example|1234567890|private-name|private-owner|token=|email=secret/);
});
test('disabled, right-click and programmatic actions cannot produce deliberate click events', async () => {
  const h = harness(); h.mount(); await h.advance(100);
  h.click(button('cv_opened', 'cv', { disabled: '' })); h.click(button('cv_opened', 'cv', { 'aria-disabled': 'true' }));
  h.click(link('/cv'), { button: 2 }); h.click(link('/cv'), { isTrusted: false }); h.click(link('/api/admin/cv-leads'));
  h.click(link('javascript:alert(1)')); h.click(button('unknown', 'email'));
  await settle(); assert.equal(h.actions().length, 0);
  h.doc('auxclick', { button: 1, target: link('/cv') }); await settle(); assert.equal(h.actions()[0].type, 'navigation_clicked');
});
test('custom completion events omit arbitrary text and cannot declare server CV success', async () => {
  const h = harness(); h.mount(); await h.advance(100);
  h.doc('portfolio:analytics', { detail: { type: 'email_copied', target: 'email', value: 'private@example.com' } });
  h.doc('portfolio:analytics', { detail: { type: 'cv_request_saved', target: 'cv' } });
  h.api.emitAnalyticsAction('cv_download_initiated', 'cv', 'cv-automatic-download'); await settle();
  assert.deepEqual(h.actions().map(a => a.type), ['email_copied', 'cv_download_initiated']);
  assert.doesNotMatch(JSON.stringify(h.calls), /private@example/);
});
test('scroll milestones require a real scroll and fire once per page instance', async () => {
  const h = harness(); h.mount(); await h.advance(100); h.win('resize'); assert.equal(h.actions().length, 0);
  h.window.scrollY = 1200; h.doc('scroll'); h.doc('scroll'); await settle();
  assert.deepEqual(h.actions().filter(a => a.type === 'scroll_depth_reached').map(a => a.value), [25, 50, 75]);
});
test('CTA visibility requires half the button for one continuous second', async () => {
  const h = harness(), cv = button('cv_opened'); h.elements.push(cv); h.mount(); await h.advance(100);
  const observer = h.observers[0]; observer.fire(cv, 0.4); await h.advance(1000); assert.equal(h.actions().length, 0);
  observer.fire(cv, 0.6); await h.advance(500); observer.fire(cv, 0); await h.advance(1000); assert.equal(h.actions().length, 0);
  observer.fire(cv, 0.6); await h.advance(1000); assert.equal(h.actions()[0].type, 'cta_viewed');
  observer.fire(cv, 1); await h.advance(1000); assert.equal(h.actions().length, 1);
});
test('video seeks and background playback do not count as foreground watched coverage', async () => {
  const h = harness(), video = new Video(); h.elements.push(video); h.mount(); await h.advance(100);
  h.doc('play', { target: video }); await settle(); assert.equal(h.actions().length, 0, 'scripted play without a user gesture is excluded');
  h.doc('pointerdown', { target: video }); h.doc('play', { target: video }); await settle(); assert.equal(h.actions()[0].type, 'video_started');
  for (let i = 1; i <= 25; i++) { await h.advance(1000); video.currentTime = i; h.doc('timeupdate', { target: video }); }
  await settle(); assert.equal(h.actions().filter(x => x.type === 'video_progress')[0].value, 25);
  video.currentTime = 99; h.doc('timeupdate', { target: video }); video.ended = true; h.doc('ended', { target: video }); await settle();
  assert.equal(h.actions().filter(x => x.type === 'video_completed').length, 0);
});
test('focus after a31minute idle gap starts a fresh page instance rather than reviving the old session', async () => {
  const h = harness(); h.mount(); await h.advance(100);
  h.document.visibilityState = 'hidden'; h.document.focused = false; h.doc('visibilitychange'); await h.advance(31 * 60000);
  h.document.visibilityState = 'visible'; h.document.focused = true; h.doc('visibilitychange'); await settle();
  assert.equal(h.views().length, 2); assert.notEqual(h.views()[0].pageViewId, h.views()[1].pageViewId);
});
test('campaign metadata stays on page arrivals rather than leaking into every action', async () => {
  const h = harness({ search: '?utm_source=linkedin&utm_medium=social&utm_campaign=featured' }); h.mount(); await h.advance(100); h.click(link('/cv')); await settle();
  assert.equal(h.views()[0].campaign, 'linkedin:social:featured'); assert.equal(h.actions()[0].campaign, undefined);
});
test('unmount removes page handlers while retaining its final cumulative snapshot', async () => {
  const h = harness(); h.mount(); await h.advance(1100); h.unmount(); await settle(); const count = h.calls.length;
  h.click(link('/cv')); h.doc('scroll'); await h.advance(30000); assert.equal(h.calls.length, count);
  assert.equal(h.calls.at(-1).body.type, 'engagement');
});

test('per-tab sequence survives reload and keeps new arrivals after earlier events', async () => {
  const first = harness(); first.mount(); await first.advance(100); first.click(link('/cv')); await settle(); first.unmount(); await settle();
  const second = harness({ storage: first.storage, uuidSeed: 100 }); second.mount(); await second.advance(100);
  assert.equal(second.views()[0].tabId, first.views()[0].tabId);
  assert.ok(second.views()[0].sequence > Math.max(...first.calls.map(x => x.body.sequence)));
});
test('duplicating a tab gives it a separate journey without changing the original tab', async () => {
  const channels = new Set();
  class BroadcastChannel {
    constructor() { channels.add(this); }
    postMessage(data) { for (const channel of channels) if (channel !== this) channel.onmessage?.({ data }); }
    close() { channels.delete(this); }
  }
  const first = harness({ BroadcastChannel }); first.mount(); await first.advance(100);
  const original = first.views()[0].tabId;
  const second = harness({ BroadcastChannel, storage: new Map(first.storage), uuidSeed: 100 }); second.mount(); await second.advance(100);
  assert.notEqual(second.views()[0].tabId, original);
  first.click(link('/cv')); await settle(); assert.equal(first.actions()[0].tabId, original);
});
test('idle pages stop sending unchanged heartbeat snapshots', async () => {
  const h = harness(); h.mount(); await h.advance(90100);
  const before = h.calls.filter(x => x.body.type === 'engagement').length;
  await h.advance(90000);
  assert.equal(h.calls.filter(x => x.body.type === 'engagement').length, before);
});
function renderComponent(file, props) {
  const module = { exports: {} };
  const jsx = (type, properties) => ({ type, props: properties || {} });
  const output = ts.transpileModule(readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, URL, require(id) {
    if (id === 'react') return { useState: value => [value, () => {}], useRef: value => ({ current: value }), useId: () => 'test-id', useEffect() {} };
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
    if (id.endsWith('.css')) return { default: {} };
    return { default: () => null };
  } });
  return module.exports.default(props);
}
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)]; }
test('media and demo controls keep source IDs stable without using labels or private URLs', () => {
  const image = nodes(renderComponent('components/work/Media.tsx', { media: { id: 'RiskStac-Report', kind: 'image', src: '/image.png', alt: 'Public label', width: 100, height: 100 } }));
  assert.equal(image.find(x => x.type === 'button').props['data-analytics-id'], 'media:riskstac-report');
  const video = nodes(renderComponent('components/work/Media.tsx', { media: { id: 'college-tour', kind: 'video', src: '/video.mp4', title: 'Title' } }));
  assert.equal(video.find(x => x.type === 'video').props['data-analytics-id'], 'media:college-tour');
  const invalid = nodes(renderComponent('components/work/Media.tsx', { media: { id: 'someone@example.com', kind: 'image', src: '/image.png', alt: 'A', width: 100, height: 100 } }));
  assert.equal(invalid.find(x => x.type === 'button').props['data-analytics-id'], undefined);
  const demo = nodes(renderComponent('components/github/DemoLauncher.tsx', { title: 'Public demo', path: '/github-demos/eduloans/index.html' }));
  assert.equal(demo.find(x => x.type === 'button').props['data-analytics-id'], 'demo:eduloans');
  assert.equal(demo.find(x => x.type === 'button').props['data-analytics'], 'demo_started');
});
