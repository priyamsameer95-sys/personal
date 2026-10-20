const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const root = path.join(__dirname, '..');
function compile(file, context) {
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  vm.runInNewContext(outputText, { ...context, module, exports: module.exports }, { filename: file });
  return module.exports;
}
const contract = compile('lib/analytics-events.ts', {});

class Element {
  constructor(tagName = 'button', attributes = {}, parent = null) {
    this.tagName = tagName.toUpperCase(); this.attributes = attributes; this.parent = parent;
  }
  getAttribute(name) { return Object.hasOwn(this.attributes, name) ? this.attributes[name] : null; }
  hasAttribute(name) { return Object.hasOwn(this.attributes, name); }
  closest() {
    if (this.hasAttribute('data-analytics') || this.tagName === 'A' && this.hasAttribute('href')) return this;
    return this.parent?.closest() || null;
  }
}

function harness({ pathname = '/', hidden = false, dnt = false, gpc = false, fetchFailure = false } = {}) {
  const calls = [], listeners = new Map(), timers = new Map(), refs = [];
  let route = pathname, cleanup, dependencies, cursor = 0, sequence = 0;
  const navigator = { doNotTrack: dnt ? '1' : 'unspecified', globalPrivacyControl: gpc };
  const document = {
    visibilityState: hidden ? 'hidden' : 'visible', referrer: 'https://www.example.org/private?email=do-not-send@example.org#private',
    addEventListener(name, fn) { if (!listeners.has(name)) listeners.set(name, new Set()); listeners.get(name).add(fn); },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
  };
  const window = {
    location: { origin: 'https://www.priyamsameer.com', href: 'https://www.priyamsameer.com/' },
    crypto: { randomUUID: () => `12345678-1234-4123-8123-${String(++sequence).padStart(12, '0')}` },
    setTimeout(fn) { const id = ++sequence; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const component = compile('components/SiteAnalytics.tsx', {
    navigator, document, window, URL, Element, WeakSet,
    fetch(url, options) {
      if (fetchFailure === 'throw') throw new Error('Storage unavailable');
      calls.push({ url, options, body: JSON.parse(options.body) });
      return fetchFailure ? Promise.reject(new Error('Network unavailable')) : Promise.resolve({ ok: true });
    },
    require(id) {
      if (id === '@/lib/analytics-events') return contract;
      if (id === 'next/navigation') return { usePathname: () => route };
      if (id === 'react') return {
        useRef(initial) { const index = cursor++; return refs[index] ||= { current: initial }; },
        useEffect(callback, nextDependencies) {
          if (JSON.stringify(dependencies) === JSON.stringify(nextDependencies)) return;
          cleanup?.(); dependencies = nextDependencies; cleanup = callback();
        },
      };
      throw new Error(`Unexpected import ${id}`);
    },
  }).default;
  function render(nextPath = route) { route = nextPath; cursor = 0; component(); }
  function fire(type, event = {}) { for (const fn of listeners.get(type) || []) fn(event); }
  function click(target, extra = {}) { fire('click', { type: 'click', target, button: 0, isTrusted: true, ...extra }); }
  function flushTimers() { for (const [id, fn] of [...timers]) { timers.delete(id); fn(); } }
  render();
  return { calls, document, navigator, listeners, click, fire, render, flushTimers, unmount: () => cleanup?.() };
}
const link = href => new Element('a', { href });
const action = (type, target, attributes = {}) => new Element('button', { 'data-analytics': type, 'data-analytics-target': target, ...attributes });
const events = h => h.calls.map(call => ({ type: call.body.type, target: call.body.target, path: call.body.path }));

test('the real client counts public page entry, route transitions and references once per visit', () => {
  const h = harness();
  h.flushTimers(); h.fire('visibilitychange'); h.render();
  for (const route of ['/cv', '/art', '/github', '/blog', '/product', '/product/absolute-crop-health-ai', '/product/absolute-crop-health-ai/references', '/art/a-painting', '/blog/a-post', '/']) {
    h.render(route); h.flushTimers();
  }
  assert.equal(h.calls.length, 11);
  assert.ok(h.calls.every(call => call.body.type === 'page_view' && call.body.referrer === 'www.example.org'));
  assert.equal(new Set(h.calls.map(call => call.body.eventId)).size, 11);
  assert.ok(h.calls.every(call => call.url === '/api/analytics' && call.options.keepalive && call.options.mode === 'same-origin'));
  for (const route of ['/minforyam', '/api/admin/analytics', '/unknown', '/brands/absolute.svg']) { h.render(route); h.flushTimers(); }
  assert.equal(h.calls.length, 11);
});

test('navigation sees clicks on child icons and keyboard activation without sending a query or fragment', () => {
  const h = harness();
  const anchor = link('/product/absolute-crop-health-ai?email=private@example.org#private');
  h.click(new Element('svg', {}, anchor), { detail: 0 });
  h.flushTimers();
  assert.deepEqual(events(h), [
    { type: 'page_view', target: undefined, path: '/' },
    { type: 'navigation_clicked', target: '/product/absolute-crop-health-ai', path: '/' },
  ]);
  assert.doesNotMatch(JSON.stringify(h.calls), /private@example|#private|email=/);
});

test('middle-button link navigation is counted while other auxiliary clicks and buttons are ignored', () => {
  const h = harness(); h.flushTimers();
  const project = link('/product/absolute-crop-health-ai?private=ignored');
  h.fire('auxclick', { type: 'auxclick', target: new Element('span', {}, project), button: 1, isTrusted: true });
  h.fire('auxclick', { type: 'auxclick', target: link('https://github.com/priyamsameer95-sys/personal'), button: 1, isTrusted: true });
  for (const button of [0, 2]) h.fire('auxclick', { type: 'auxclick', target: project, button, isTrusted: true });
  h.fire('auxclick', { type: 'auxclick', target: action('cv_opened', 'cv'), button: 1, isTrusted: true });
  h.fire('auxclick', { type: 'auxclick', target: project, button: 1, isTrusted: false });
  assert.deepEqual(h.calls.slice(1).map(call => [call.body.type, call.body.target]), [
    ['navigation_clicked', '/product/absolute-crop-health-ai'], ['outbound_clicked', 'github'],
  ]);
});

test('contact, GitHub and public product links use fixed categories instead of identifying destinations', () => {
  const h = harness({ pathname: '/cv' }); h.flushTimers();
  for (const href of [
    'mailto:owner@example.org?subject=Confidential', 'tel:+1234567890',
    'https://wa.me/1234567890?text=Secret', 'https://www.linkedin.com/in/private-name?tracking=secret',
    'https://github.com/private-owner/private-project?token=secret', 'https://college.money/abroad?email=secret',
    'https://www.upaj.org/riskstac?token=secret', 'https://external.example.org/private-document?token=secret',
  ]) h.click(link(href));
  assert.deepEqual(h.calls.slice(1).map(call => [call.body.type, call.body.target]), [
    ['contact_clicked', 'email'], ['contact_clicked', 'phone'], ['contact_clicked', 'whatsapp'], ['contact_clicked', 'linkedin'],
    ['outbound_clicked', 'github'], ['outbound_clicked', 'live_product'], ['outbound_clicked', 'live_product'], ['outbound_clicked', 'external'],
  ]);
  assert.doesNotMatch(JSON.stringify(h.calls), /Confidential|1234567890|private-name|private-owner|token=|private-document|owner@example/);
});

test('only deliberate, enabled interactions in the fixed vocabulary are captured', () => {
  const h = harness(); h.flushTimers();
  h.click(action('cv_opened', 'cv')); h.click(action('media_opened', 'image'));
  h.click(action('outbound_clicked', 'company_website')); h.click(action('menu_opened', 'menu'));
  h.click(action('filter_changed', 'filter'));
  const before = h.calls.length;
  h.click(action('cv_opened', 'private@example.com'));
  h.click(action('arbitrary-input-event', 'email'));
  h.click(action('cv_opened', 'cv', { disabled: '' }));
  h.click(action('cv_opened', 'cv', { 'aria-disabled': 'true' }));
  h.click(link('/api/admin/cv-leads?format=csv')); h.click(link('/minforyam'));
  h.click(link('javascript:alert(1)')); h.click(link('https://user:password@example.com/'));
  h.click(link('/cv'), { button: 2 }); h.click(link('/cv'), { isTrusted: false });
  h.click(new Element('input', { value: 'private@example.org' }));
  assert.equal(h.calls.length, before);
});

test('CV clicks are intent, while the automatic approved download does not manufacture a user click', () => {
  const h = harness({ pathname: '/cv' }); h.flushTimers();
  h.click(action('cv_opened', 'cv'));
  h.click(action('cv_download_clicked', 'cv'));
  h.click(link('/cv/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf?v=private'), { isTrusted: false });
  h.click(link('/cv/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf?v=private'));
  assert.deepEqual(h.calls.slice(1).map(call => [call.body.type, call.body.target]), [
    ['cv_opened', 'cv'], ['cv_download_clicked', 'cv'], ['cv_download_clicked', 'cv'],
  ]);
  assert.doesNotMatch(JSON.stringify(h.calls), /\.pdf|v=private/);
});

test('video metrics require playback and do not count repeated play or an autoplay element', () => {
  const h = harness({ pathname: '/product/urbankhet-farm-to-fork' }); h.flushTimers();
  const video = new Element('video', { src: '/private-filename.mp4', poster: '/poster.png' });
  h.click(video);
  assert.equal(h.calls.length, 1);
  h.fire('play', { target: video }); h.fire('play', { target: video });
  h.fire('play', { target: new Element('video', { autoplay: '' }) });
  h.fire('play', { target: new Element('button') });
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[1].body.type, 'video_started');
  assert.equal(h.calls[1].body.target, 'video');
  assert.doesNotMatch(JSON.stringify(h.calls), /private-filename|poster.png/);
});

test('clipboard success is measured after completion, with a finite payload and no email value', () => {
  const h = harness(); h.flushTimers();
  h.fire('portfolio:analytics', { detail: { type: 'email_copied', target: 'email', value: 'do-not-send@example.org' } });
  h.fire('portfolio:analytics', { detail: { type: 'email_copied', target: 'do-not-send@example.org' } });
  h.fire('portfolio:analytics', { detail: { type: 'cv_opened', target: 'cv' } });
  h.fire('portfolio:analytics', { detail: 'do-not-send@example.org' });
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[1].body.type, 'email_copied');
  assert.doesNotMatch(JSON.stringify(h.calls), /do-not-send/);
});

test('DNT, GPC and background tabs exclude both page views and interactions', () => {
  for (const privacy of [{ dnt: true }, { gpc: true }]) {
    const h = harness(privacy); h.flushTimers(); h.click(link('/cv')); h.fire('play', { target: new Element('video') });
    assert.equal(h.calls.length, 0);
    assert.equal(h.listeners.size, 0);
  }
  const h = harness({ hidden: true });
  h.flushTimers(); h.click(link('/cv')); assert.equal(h.calls.length, 0);
  h.document.visibilityState = 'visible'; h.fire('visibilitychange'); assert.equal(h.calls.length, 1);
  h.navigator.globalPrivacyControl = true; h.click(link('/cv')); h.fire('play', { target: new Element('video') });
  assert.equal(h.calls.length, 1);
});

test('route cleanup removes old handlers, and network failures never block visitor actions', async () => {
  const h = harness(); h.flushTimers(); h.render('/github'); h.flushTimers();
  assert.equal(h.listeners.get('click').size, 1);
  h.click(link('/art')); assert.equal(h.calls.length, 3);
  assert.equal(h.calls[2].body.path, '/github');
  h.unmount(); h.click(link('/cv')); h.fire('play', { target: new Element('video') });
  assert.equal(h.calls.length, 3);
  for (const fetchFailure of [true, 'throw']) {
    const failed = harness({ fetchFailure });
    assert.doesNotThrow(() => { failed.flushTimers(); failed.click(link('/cv')); });
  }
  await new Promise(resolve => setImmediate(resolve));
});

test('public controls declare media, contact, CV, menu and company actions consistently', () => {
  const files = ['components/CvDownload.tsx', 'components/ContactChooser.tsx', 'components/Header.tsx', 'components/work/Media.tsx', 'components/github/DemoLauncher.tsx', 'components/CompanyContext.tsx', 'components/work/WorkPreview.tsx'];
  const source = files.map(file => readFileSync(path.join(root, file), 'utf8')).join('\n');
  for (const type of ['cv_opened', 'cv_download_clicked', 'contact_opened', 'menu_opened', 'media_opened', 'outbound_clicked']) assert.ok(source.includes(type), type);
  const email = readFileSync(path.join(root, 'components/EmailContact.tsx'), 'utf8');
  assert.ok(email.indexOf("clipboard.writeText(email)") < email.indexOf("type: 'email_copied'"));
  assert.match(email, /detail: \{ type: 'email_copied', target: 'email' \}/);
});
