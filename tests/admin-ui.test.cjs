const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const Icon = require('./helpers/icon.cjs');

const root = path.join(__dirname, '..');
let remoteCalls = 0;
const forbiddenRemoteAction = () => { remoteCalls += 1; throw new Error('Remote admin actions are outside this UI test'); };
function load(filename, dependencies = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path.join(root, filename), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports, fetch: forbiddenRemoteAction,
    require: id => Object.hasOwn(dependencies, id) ? dependencies[id] : require(id),
  }, { filename });
  return module.exports;
}
const shared = load('components/admin/shared.tsx', { '@/components/Icon': Icon });
function editor({ textareaProps, value }) {
  return React.createElement('textarea', { ...textareaProps, value, onChange() {} });
}
const dependencies = {
  '@/components/Icon': Icon,
  '@vercel/blob/client': { upload: forbiddenRemoteAction },
  './shared': shared,
  'next/dynamic': () => editor,
  '@uiw/react-md-editor/markdown-editor.css': {},
};
const forms = Object.fromEntries(['WorkForm', 'BlogForm', 'ArtForm', 'CvForm'].map(name => [name, load(`components/admin/${name}.tsx`, dependencies).default]));
const sampleImage = index => ({ id: `image-${index}`, blob_url: `/local-image-${index}.webp`, width: 800, height: 600, alt_text: `Sample image ${index}`, sort_order: index - 1, protected: false });
const edits = {
  WorkForm: { title: 'A sample case', media: [sampleImage(1), sampleImage(2)] },
  BlogForm: { title: 'A sample essay', summary: 'A short introduction.', media: [sampleImage(1), sampleImage(2)] },
  ArtForm: { title: 'A sample painting', media: [sampleImage(1)] },
  CvForm: { title: 'A sample CV', media: [{ blob_pathname: 'cv/source.pdf' }], meta: { contact: { name: 'Sample Person', email: 'sample@example.com', linkedin: 'https://www.linkedin.com/in/sample', location: 'Bengaluru' }, experience: [{ company: 'Example company', role: 'Product manager', start: '2025', end: 'Present', bullets: ['A sample responsibility.'] }] } },
};
function renderForm(name, editItem) {
  return renderToStaticMarkup(React.createElement(forms[name], { editItem, onSuccess() {}, onDirtyChange() {} }));
}
function parse(html) {
  const rootNode = { tag: 'root', attrs: {}, parent: null, children: [], text: '' };
  const result = [], stack = [rootNode];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  let offset = 0;
  for (const token of html.matchAll(/<\/?([a-z][a-z0-9-]*)([^>]*)>/gi)) {
    stack[stack.length - 1].text += html.slice(offset, token.index);
    offset = token.index + token[0].length;
    const tag = token[1].toLowerCase();
    if (token[0].startsWith('</')) {
      const index = stack.map(node => node.tag).lastIndexOf(tag);
      if (index > 0) stack.length = index;
      continue;
    }
    const attrs = {};
    for (const attribute of token[2].matchAll(/([^\s=]+)(?:="([^"]*)")?/g)) attrs[attribute[1]] = attribute[2] || '';
    const parent = stack[stack.length - 1];
    const node = { tag, attrs, parent, children: [], text: '' };
    parent.children.push(node); result.push(node);
    if (!voidTags.has(tag)) stack.push(node);
  }
  return result;
}
function text(node) { return `${node.text} ${node.children.map(text).join(' ')}`.replace(/<[^>]+>/g, '').trim(); }
function accessibleName(node, nodes) {
  if (node.attrs['aria-label']) return node.attrs['aria-label'];
  if (node.attrs['aria-labelledby']) return node.attrs['aria-labelledby'].split(/\s+/).map(id => text(nodes.find(candidate => candidate.attrs.id === id) || { text: '', children: [] })).join(' ').trim();
  const label = nodes.find(candidate => candidate.tag === 'label' && candidate.attrs.for === node.attrs.id);
  if (label) return text(label);
  for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) if (ancestor.tag === 'label') return text(ancestor);
  return node.tag === 'button' ? text(node) : '';
}

// These inspect the actual component output; uploads, saves, publication,
// status changes and deletion are never invoked.
test('new and edited admin forms give every field a persistent accessible label', () => {
  for (const name of Object.keys(forms)) {
    for (const editItem of [undefined, edits[name]]) {
      const nodes = parse(renderForm(name, editItem));
      for (const control of nodes.filter(node => ['input', 'textarea'].includes(node.tag))) {
        assert.ok(accessibleName(control, nodes), `${name}: ${control.attrs.name || control.attrs.type} needs a label beyond its placeholder`);
        if (!['checkbox', 'file'].includes(control.attrs.type)) {
          assert.ok(control.attrs.class?.split(/\s+/).includes('text-base') || control.attrs.style?.includes('font-size:16px'), `${name}: readable 16px input text`);
        }
      }
      for (const label of nodes.filter(node => node.tag === 'label' && node.attrs.for)) assert.ok(nodes.some(node => node.attrs.id === label.attrs.for), `${name}: label target exists`);
    }
  }
  assert.equal(remoteCalls, 0);
});

test('multiple admin forms have unique field IDs and all explicit actions are non-submit buttons', () => {
  const html = renderToStaticMarkup(React.createElement('div', null, Object.entries(forms).map(([name, Form]) => React.createElement(Form, { key: name, editItem: edits[name], onSuccess() {}, onDirtyChange() {} }))));
  const nodes = parse(html);
  const ids = nodes.filter(node => node.attrs.id).map(node => node.attrs.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const button of nodes.filter(node => node.tag === 'button')) {
    assert.equal(button.attrs.type, 'button');
    assert.ok(accessibleName(button, nodes), 'actions have descriptive text or an accessible name');
    assert.match(button.attrs.class, /min-h-11/);
  }
});

test('file pickers remain keyboard reachable and have a visible focus indicator on the upload label', () => {
  for (const name of ['WorkForm', 'BlogForm', 'ArtForm', 'CvForm']) {
    const nodes = parse(renderForm(name));
    const input = nodes.find(node => node.tag === 'input' && node.attrs.type === 'file');
    assert.ok(input, name);
    assert.doesNotMatch(input.attrs.class || '', /(?:^|\s)hidden(?:\s|$)/, `${name}: display:none would remove keyboard access`);
    assert.equal(input.attrs.tabindex === '-1', false);
    if (input.attrs.class?.includes('sr-only')) {
      const label = nodes.find(node => node.tag === 'label' && node.attrs.for === input.attrs.id);
      assert.match(label.attrs.class, /peer-focus-visible:outline/);
      assert.match(label.attrs.class, /min-h-11/);
    }
  }
});

test('image and experience controls have 44px targets, meaningful names and correct reorder boundaries', () => {
  for (const name of ['WorkForm', 'BlogForm']) {
    const nodes = parse(renderForm(name, edits[name]));
    const action = label => nodes.find(node => node.tag === 'button' && node.attrs['aria-label'] === label);
    assert.ok(action('Move image 1 earlier'));
    assert.ok(Object.hasOwn(action('Move image 1 earlier').attrs, 'disabled'));
    assert.equal(Object.hasOwn(action('Move image 1 later').attrs, 'disabled'), false);
    assert.ok(Object.hasOwn(action('Move image 2 later').attrs, 'disabled'));
    for (const node of nodes.filter(node => node.tag === 'button' && node.attrs['aria-label'])) {
      assert.match(node.attrs.class, /min-h-11/);
      assert.match(node.attrs.class, /min-w-11/);
      assert.ok(node.children.some(child => child.tag === 'svg'), 'action icon is SVG rather than a font ligature');
    }
    assert.ok(action('Remove image 1'));
  }
  const cv = parse(renderForm('CvForm', edits.CvForm));
  const remove = cv.find(node => node.attrs['aria-label'] === 'Remove experience 1 at Example company');
  assert.ok(remove);
  assert.match(remove.attrs.class, /min-h-11/);
  assert.match(remove.attrs.class, /min-w-11/);
});

test('private library actions remain visible without hover and keep item-specific labels', () => {
  const values = [[{ id: 'local-item', title: 'Local sample case', type: 'work', status: 'draft', updated_at: '2026-10-16T00:00:00Z', media: [sampleImage(1)] }], false, null, null, null, false];
  let index = 0;
  const Library = load('components/admin/ContentLibrary.tsx', {
    ...dependencies,
    react: { ...React, useState: initial => [index < values.length ? values[index++] : initial, () => {}], useEffect() {} },
  }).default;
  const html = renderToStaticMarkup(React.createElement(Library, { type: 'work', refreshTrigger: 0, onEdit() {} }));
  const nodes = parse(html);
  for (const label of ['Publish Local sample case', 'Edit Local sample case', 'Delete Local sample case']) {
    const button = nodes.find(node => node.tag === 'button' && node.attrs['aria-label'] === label);
    assert.ok(button, label);
    assert.equal(button.attrs.type, 'button');
    assert.match(button.attrs.class, /min-h-11/); assert.match(button.attrs.class, /min-w-11/);
    for (let ancestor = button.parent; ancestor; ancestor = ancestor.parent) assert.doesNotMatch(ancestor.attrs.class || '', /(?:^|\s)(?:sm:)?opacity-0(?:\s|$)/);
  }
  assert.doesNotMatch(html, /material-symbols-rounded/);
  assert.equal(remoteCalls, 0);
});

test('shared progress and notifications expose status and stay within a phone-width container', () => {
  for (const [progress, expected] of [[25, '25'], [130, '100'], [-10, '0']]) {
    const nodes = parse(renderToStaticMarkup(React.createElement(shared.ProgressBar, { progress, message: 'Saving artwork' })));
    const bar = nodes.find(node => node.attrs.role === 'progressbar');
    assert.equal(bar.attrs['aria-label'], 'Saving artwork');
    assert.equal(bar.attrs['aria-valuenow'], expected);
    assert.equal(bar.attrs['aria-valuemin'], '0'); assert.equal(bar.attrs['aria-valuemax'], '100');
  }
  for (const type of ['success', 'error']) {
    const nodes = parse(renderToStaticMarkup(React.createElement(shared.Toast, { type, message: 'A local status message', onClose() {} })));
    const notice = nodes.find(node => node.attrs.role === (type === 'error' ? 'alert' : 'status'));
    assert.ok(notice);
    assert.match(notice.attrs.class, /left-4/); assert.match(notice.attrs.class, /right-4/);
    const close = nodes.find(node => node.tag === 'button');
    assert.equal(close.attrs['aria-label'], 'Dismiss notification');
    assert.equal(close.attrs.type, 'button');
  }
});
