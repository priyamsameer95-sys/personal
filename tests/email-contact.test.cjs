const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const css = new Proxy({}, { get: (_, name) => name === '__esModule' ? false : String(name) });

function load(filename, dependencies = {}, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path.join(__dirname, '..', filename), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports,
    require: id => id === '@/components/Icon' ? require('./helpers/icon.cjs') : Object.hasOwn(dependencies, id) ? dependencies[id] : require(id),
    ...globals,
  }, { filename });
  return module.exports;
}

// Keep the component's real async handler and render output. Only React's hook
// storage and the browser clipboard/timer boundary are replaced for these tests.
function fixture(clipboard) {
  let status;
  let effect;
  let timer;
  let cleared = false;
  const react = {
    useState(initial) {
      if (status === undefined) status = initial;
      return [status, next => { status = next; }];
    },
    useEffect(callback) { effect = callback; },
  };
  const component = load('components/EmailContact.tsx', {
    react,
    './email-contact.module.css': css,
  }, {
    navigator: clipboard ? { clipboard } : {},
    window: {
      setTimeout(callback, delay) { timer = { callback, delay }; return 1; },
      clearTimeout(id) { assert.equal(id, 1); cleared = true; },
    },
  });
  return {
    ...component,
    renderCopy: props => component.CopyEmailButton(props || {}),
    runEffect: () => effect(),
    timer: () => timer,
    wasCleared: () => cleared,
  };
}

function controls(tree) {
  const [button, announcement] = tree.props.children;
  return { button, announcement };
}

test('copy uses only the address while the email action preserves its subject and label', async () => {
  const writes = [];
  const f = fixture({ async writeText(text) { writes.push(text); } });
  const subject = 'College.money — product conversation & next steps';
  const contact = f.default({ subject, children: 'Discuss a similar problem' });
  const [link, copy] = contact.props.children;
  assert.equal(link.type, 'a');
  assert.equal(link.props.href, `mailto:${f.emailAddress}?subject=${encodeURIComponent(subject)}`);
  assert.equal(link.props.children, 'Discuss a similar problem');
  assert.equal(copy.type, f.CopyEmailButton, 'Copy is a sibling of the email link, never a nested button');
  await controls(f.renderCopy(copy.props)).button.props.onClick();
  assert.deepEqual(writes, [f.emailAddress]);
  const { button, announcement } = controls(f.renderCopy());
  assert.equal(button.props.children, 'Copied');
  assert.equal(announcement.props.children, 'Email address copied.');
  assert.equal(announcement.props.role, 'status');
  const customHref = 'mailto:Priyam.Sameer.95@gmail.com?subject=Original%20case&body=Keep%20this';
  assert.equal(f.default({ href: customHref }).props.children[0].props.href, customHref);
});

test('copy waits for clipboard completion before announcing success', async () => {
  let finish;
  const f = fixture({ writeText: () => new Promise(resolve => { finish = resolve; }) });
  const pending = controls(f.renderCopy()).button.props.onClick();
  assert.equal(controls(f.renderCopy()).announcement.props.children, '');
  finish();
  await pending;
  assert.equal(controls(f.renderCopy()).announcement.props.children, 'Email address copied.');
});

test('missing clipboard and rejected permission show a truthful selectable-address fallback', async () => {
  for (const clipboard of [undefined, { async writeText() { throw new Error('Permission denied'); } }]) {
    const f = fixture(clipboard);
    await controls(f.renderCopy()).button.props.onClick();
    const { button, announcement } = controls(f.renderCopy());
    assert.equal(button.props.children, 'Copy email');
    assert.equal(announcement.props.role, 'status');
    assert.equal(announcement.props.className, 'failure');
    assert.equal(announcement.props.children, `Couldn’t copy automatically. Select and copy: ${f.emailAddress}`);
    assert.doesNotMatch(announcement.props.children, /Email address copied/);
  }
});

test('copy remains a labelled non-submit action and resets its success status', async () => {
  const f = fixture({ async writeText() {} });
  const initial = controls(f.renderCopy());
  assert.equal(initial.button.type, 'button');
  assert.equal(initial.button.props.type, 'button');
  assert.equal(initial.button.props['aria-label'], 'Copy email address');
  await initial.button.props.onClick();
  f.renderCopy();
  const cleanup = f.runEffect();
  assert.equal(f.timer().delay, 4000);
  f.timer().callback();
  assert.equal(controls(f.renderCopy()).announcement.props.children, '');
  cleanup();
  assert.equal(f.wasCleared(), true);
});

test('public Markdown adds copy to Priyam email links without changing other destinations', () => {
  const f = fixture();
  const content = load('lib/content.ts');
  const markdown = load('components/MarkdownContent.tsx', {
    '@uiw/react-md-editor/nohighlight': { Markdown: () => null },
    '@/lib/content': content,
    './EmailContact': { __esModule: true, ...f },
  }).default({ source: '[Email Priyam](mailto:Priyam.Sameer.95@gmail.com)' });
  const renderLink = markdown.props.components.a;
  for (const href of [
    `mailto:${f.emailAddress}?subject=Keep%20the%20case`,
    'MAILTO:priyam.sameer.95%40gmail.com?subject=Original',
  ]) {
    const link = renderLink({ href, children: 'Email Priyam' });
    assert.equal(link.type, f.default);
    assert.equal(link.props.href, href);
    assert.equal(link.props.children, 'Email Priyam');
  }
  for (const href of ['mailto:another@example.com', 'https://example.com', 'mailto:%malformed']) {
    const link = renderLink({ href, children: 'Other link' });
    assert.equal(link.type, 'a');
    assert.equal(link.props.href, href);
  }
  assert.equal(renderLink({ children: 'Unavailable link' }).type, 'span');
});
