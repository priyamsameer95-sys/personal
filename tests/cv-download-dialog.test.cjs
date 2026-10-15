const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { CV_DOWNLOAD_URL } = require('./helpers/cv-download.cjs');
const css = new Proxy({}, { get: (_, name) => name === '__esModule' ? false : String(name) });

// The browser provides native-dialog focus containment. These doubles exercise
// our actual component's request sequencing, focus restoration and reopen state.
function fixture(fetcher) {
  let cursor = 0, tree, nodes = [], effects = [], previousRefs = [];
  const slots = [], cleanups = [];
  const control = () => ({ focused: 0, focus() { this.focused++; } });
  const launcher = control(), input = control(), ready = control();
  const nativeForm = { resetCount: 0, reset() { this.resetCount++; } };
  const modal = { open: false, showModal() { this.open = true; }, close() { this.open = false; nodes.find(node => node.type === 'dialog').props.onClose(); } };
  const downloads = [];
  const document = { body: { style: { overflow: 'auto' }, appendChild(link) { downloads.push(link); } },
    createElement() { return { clicked: false, click() { this.clicked = true; }, remove() {} }; },
  };
  const react = {
    useRef(initial) { const index = cursor++; return slots[index] ||= { current: initial }; },
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = value; }]; },
    useId() { const index = cursor++; return slots[index] ||= `cv-${index}`; },
    useEffect(effect, dependencies) {
      const index = cursor++, previous = slots[index];
      if (!previous || dependencies.some((value, position) => value !== previous[position])) effects.push({ index, effect });
      slots[index] = dependencies;
    },
  };
  class Fields { constructor(fields) { this.fields = fields; } get(name) { return this.fields[name]; } }
  const source = readFileSync(path.join(__dirname, '../components/CvDownload.tsx'), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { module, exports: module.exports, document, window: { location: { origin: 'https://portfolio.example', pathname: '/cv' } }, URL, FormData: Fields, AbortController, fetch: fetcher,
    require: id => id === 'react' ? react : id === '@/lib/cv-download' ? { CV_DOWNLOAD_URL, CV_DOWNLOAD_FILENAME: 'Priyam_Sameer_CV.pdf' } : id === '@/components/Icon' ? require('./helpers/icon.cjs') : id.endsWith('.css') ? css : require(id),
  });
  function render() {
    cursor = 0; effects = []; nodes = [];
    tree = module.exports.default({ className: 'cv-action' });
    const visit = node => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(visit); return; }
      nodes.push(node); visit(node.props?.children);
    };
    visit(tree);
    previousRefs.forEach(ref => { ref.current = null; });
    previousRefs = [];
    for (const node of nodes) {
      if (!node.ref) continue;
      node.ref.current = node.type === 'dialog' ? modal : node.type === 'form' ? nativeForm : node.type === 'input' ? input : node.type === 'a' ? ready : launcher;
      previousRefs.push(node.ref);
    }
    for (const { index, effect } of effects) { cleanups[index]?.(); cleanups[index] = effect(); }
    return tree;
  }
  render();
  return { render, document, downloads, launcher, input, ready, modal, nativeForm,
    find: predicate => nodes.find(predicate),
    show() { nodes.find(node => node.type === 'button' && node.props['aria-label'] === 'Download CV').props.onClick(); render(); },
    submit(email = 'reader@example.com') { return nodes.find(node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { email, website: '' } }); },
    unmount() { cleanups.forEach(cleanup => cleanup?.()); },
  };
}

test('the labelled native CV dialog focuses email, closes with restored focus, and cleans up background scrolling', () => {
  const f = fixture();
  const trigger = f.find(node => node.type === 'button' && node.props['aria-label'] === 'Download CV');
  const dialog = f.find(node => node.type === 'dialog');
  assert.equal(trigger.props['aria-controls'], dialog.props.id);
  assert.ok(dialog.props['aria-labelledby'] && dialog.props['aria-describedby']);
  assert.equal(dialog.props.open, undefined, 'showModal supplies modal semantics');
  f.show();
  assert.equal(f.modal.open, true);
  assert.equal(f.input.focused, 1);
  assert.equal(f.document.body.style.overflow, 'hidden');
  assert.equal(f.find(node => node.type === 'button' && node.props['aria-label'] === 'Download CV').props['aria-expanded'], true);
  // Escape closes a native dialog and dispatches this same close event.
  f.modal.close(); f.render();
  assert.equal(f.document.body.style.overflow, 'auto');
  assert.equal(f.launcher.focused, 1);
  f.show(); f.unmount();
  assert.equal(f.document.body.style.overflow, 'auto');
});

test('download waits for successful capture, focuses the fallback, and refocuses a fresh email field on reopening', async () => {
  let finish, payload;
  const f = fixture((url, options) => { assert.equal(url, '/api/cv-download'); payload = JSON.parse(options.body); return new Promise(resolve => { finish = resolve; }); });
  f.show();
  const submitted = f.submit(); f.render();
  assert.deepEqual(payload, { email: 'reader@example.com', website: '', sourcePath: '/cv' });
  assert.equal(f.downloads.length, 0);
  const submit = f.find(node => node.type === 'button' && node.props.type === 'submit');
  assert.equal(submit.props.disabled, true);
  assert.equal(f.find(node => node.type === 'button' && node.props['aria-label'] === 'Close CV request').props.disabled, undefined);
  finish({ ok: true, json: async () => ({ downloadUrl: CV_DOWNLOAD_URL }) });
  await submitted; f.render();
  assert.equal(f.downloads.length, 1);
  assert.equal(f.downloads[0].clicked, true);
  assert.equal(f.downloads[0].href, CV_DOWNLOAD_URL);
  assert.equal(f.downloads[0].download, 'Priyam_Sameer_CV.pdf');
  assert.equal(f.ready.focused, 1);
  assert.equal(f.find(node => node.type === 'a').props.href, CV_DOWNLOAD_URL);
  f.modal.close(); f.render(); f.show();
  assert.equal(f.input.focused, 2, 'Email focus waits for the remounted form');
  assert.ok(f.find(node => node.type === 'input' && node.props.name === 'email'));
  assert.equal(f.find(node => node.type === 'a'), undefined, 'A new request starts with the email form');
});

test('storage/network failures and a substituted PDF never trigger a download or accuse a valid email', async () => {
  for (const response of [
    { ok: false, json: async () => ({ error: 'The CV request could not be saved. Please try again shortly.' }) },
    { ok: true, json: async () => ({ downloadUrl: '/cv/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf?v=000000000000' }) },
    { ok: true, json: async () => ({ downloadUrl: 'https://other.example/CV.pdf' }) },
  ]) {
    const f = fixture(async () => response); f.show(); await f.submit(); f.render();
    assert.equal(f.downloads.length, 0);
    assert.ok(f.find(node => node.props?.role === 'alert'));
    const input = f.find(node => node.type === 'input' && node.props.name === 'email');
    assert.equal(input.props['aria-invalid'], undefined);
    assert.equal(input.props.readOnly, false);
  }
});

test('closing a pending request aborts the client and cannot initiate a late download', async () => {
  let finish, signal;
  const f = fixture((url, options) => { signal = options.signal; return new Promise(resolve => { finish = resolve; }); });
  f.show(); const submitted = f.submit(); f.render();
  f.modal.close(); f.render();
  assert.equal(signal.aborted, true);
  finish({ ok: true, json: async () => ({ downloadUrl: CV_DOWNLOAD_URL }) });
  await submitted; f.render();
  assert.equal(f.downloads.length, 0);
  assert.equal(f.launcher.focused, 1);
});
