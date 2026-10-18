const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { File } = require('node:buffer');

const demoRoot = path.join(__dirname, '..', 'public', 'github-demos');
const html = fs.readFileSync(path.join(demoRoot, 'csv-streamer', 'index.html'), 'utf8');
const parser = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).find(source => source.includes('const fileInput'));
assert.ok(parser, 'Use the actual staged parser code');

async function parse(chunks, useSample = false) {
  const elements = new Map();
  const downloads = [];
  let downloadable;
  let revoked;
  let pendingChange;
  function element(id) {
    if (!elements.has(id)) elements.set(id, { style: {}, classList: { add() {}, remove() {} }, listeners: {}, addEventListener(name, handler) { this.listeners[name] = handler; }, dispatchEvent(event) { pendingChange = this.listeners[event.type]?.(event); return true; } });
    return elements.get(id);
  }
  element('file-input').files = [{
    size: Buffer.byteLength(chunks.join('')),
    stream() { return new ReadableStream({ start(controller) { chunks.forEach(chunk => controller.enqueue(new TextEncoder().encode(chunk))); controller.close(); } }); },
  }];
  const context = vm.createContext({
    Blob, File, Event, URLSearchParams, TextDecoderStream, TextEncoder, performance,
    location: { search: '' },
    DataTransfer: class { constructor() { this.files = []; this.items = { add: file => this.files.push(file) }; } },
    document: {
      getElementById: element,
      createElement(tag) { assert.equal(tag, 'a'); return { click() { downloads.push({ href: this.href, filename: this.download }); } }; },
    },
    URL: { createObjectURL(blob) { downloadable = blob; return 'blob:synthetic-export'; }, revokeObjectURL(url) { revoked = url; } },
  });
  vm.runInContext(parser, context);
  if (useSample) {
    const source = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).find(script => script.includes('function useSampleCSV'));
    assert.ok(source, 'Use the actual published sample button handler');
    vm.runInContext(source, context);
    assert.equal(element('row-count').innerText, undefined, 'The tool waits for the visitor to choose the sample');
    element('sample-btn').listeners.click();
    await pendingChange;
    assert.equal(element('file-input').files[0].name, 'synthetic-demo.csv');
  } else await element('file-input').listeners.change();
  const blob = vm.runInContext('generatedJsonBlob', context);
  assert.ok(blob instanceof Blob);
  const output = JSON.parse(await blob.text());
  assert.equal(element('row-count').innerText, output.length.toLocaleString());
  assert.equal(element('progress-fill').style.width, '100%');
  assert.equal(element('download-btn').style.display, 'block');
  element('download-btn').listeners.click();
  assert.equal(downloadable, blob, 'The downloaded file is the exact parsed output blob');
  assert.deepEqual(downloads, [{ href: 'blob:synthetic-export', filename: 'data.json' }]);
  assert.equal(revoked, 'blob:synthetic-export');
  return output;
}

test('three stream chunks preserve rows after the first header and across split line boundaries', async () => {
  const output = await parse([
    'id,name,value\nA1,Alpha,100\nA2,Be',
    'ta,200\nA3,Gamma,300\n',
    'A4,Delta,400\nA5,Echo,500',
  ]);
  assert.deepEqual(output, [
    { id: 'A1', name: 'Alpha', value: '100' },
    { id: 'A2', name: 'Beta', value: '200' },
    { id: 'A3', name: 'Gamma', value: '300' },
    { id: 'A4', name: 'Delta', value: '400' },
    { id: 'A5', name: 'Echo', value: '500' },
  ]);
});

test('the synthetic sample exports all 250 labelled records correctly across many small chunks', async () => {
  const sample = fs.readFileSync(path.join(__dirname, 'fixtures', 'github-synthetic-demo.csv'), 'utf8');
  const chunks = [];
  for (let offset = 0; offset < sample.length; offset += 137) chunks.push(sample.slice(offset, offset + 137));
  assert.ok(chunks.length > 3);
  const output = await parse(chunks);
  assert.equal(output.length, 250);
  output.forEach((row, index) => {
    const number = index + 1;
    assert.deepEqual(row, { record_id: `DEMO-${String(number).padStart(3, '0')}`, label: `Sample record ${number}`, category: number % 2 ? 'Group A' : 'Group B', value: String(100 + number) });
  });
});

test('the visible sample CSV button feeds the actual parser and produces a downloadable 250-row result', async () => {
  const output = await parse([], true);
  assert.equal(output.length, 250);
  assert.deepEqual(output[0], { record_id: 'DEMO-001', label: 'Sample record 1', category: 'Group A', value: '101' });
  assert.deepEqual(output.at(-1), { record_id: 'DEMO-250', label: 'Sample record 250', category: 'Group B', value: '350' });
});

{
const html = fs.readFileSync(path.join(demoRoot, 'colour-palette', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);

test('all original swatches are labelled keyboard buttons and copy without triggering page regeneration', async () => {
  const copied = [];
  const listeners = {};
  function node() {
    return { children: [], attrs: {}, listeners: {}, style: {}, classList: { add() {}, remove() {} }, appendChild(child) { this.children.push(child); }, setAttribute(name, value) { this.attrs[name] = value; }, addEventListener(name, handler) { this.listeners[name] = handler; }, querySelector(selector) { return this.children[selector === '.hex-code' ? 1 : 2]; } };
  }
  const palette = node();
  Object.defineProperty(palette, 'innerHTML', { set() { this.children = []; } });
  const context = vm.createContext({
    document: { getElementById: () => palette, createElement: node, addEventListener(name, handler) { listeners[name] = handler; } },
    copyPreviewText: async (text, visible) => { copied.push({ text, visible }); return true; },
    setTimeout() {}, console,
  });
  vm.runInContext(scripts.find(source => source.includes('const paletteContainer')), context);
  assert.equal(palette.children.length, 5);
  const card = palette.children[0];
  for (const swatch of palette.children) {
    assert.equal(swatch.tabIndex, 0);
    assert.equal(swatch.attrs.role, 'button');
    assert.equal(swatch.attrs['aria-label'], `Copy ${swatch.children[1].textContent}`);
  }
  for (const [key, code] of [['Enter', 'Enter'], [' ', 'Space']]) {
    let prevented = false, stopped = false;
    card.listeners.keydown({ key, code, preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
    await Promise.resolve();
    assert.equal(prevented, true);
    assert.equal(stopped, true);
    assert.equal(copied.at(-1).text, card.children[1].textContent);
    assert.equal(copied.at(-1).visible, card.children[1]);
  }
  assert.equal(palette.children[0], card, 'Keyboard copy keeps the selected palette');
  listeners.keydown({ code: 'Space', preventDefault() {} });
  assert.notEqual(palette.children[0], card, 'Page-level Space still generates a new palette');
  assert.equal(copied.length, 2);
});

test('opaque-origin clipboard fallback reports success only if the browser actually copies, otherwise selecting visible text', async () => {
  const source = scripts.find(source => source.includes('async function copyPreviewText'));
  for (const succeeds of [true, false]) {
    let removed = false, restored = false, selected;
    const output = { textContent: '#123456' };
    const context = vm.createContext({
      navigator: {},
      document: {
        activeElement: { focus() { restored = true; } },
        createElement() { return { style: {}, setAttribute() {}, focus() {}, select() {}, remove() { removed = true; } }; },
        body: { appendChild() {} },
        execCommand(command) { assert.equal(command, 'copy'); return succeeds; },
        createRange() { return { selectNodeContents(node) { selected = node; } }; },
      },
      window: { getSelection() { return { removeAllRanges() {}, addRange() {} }; } },
    });
    vm.runInContext(source, context);
    assert.equal(await context.copyPreviewText('#123456', output), succeeds);
    assert.equal(removed, true);
    assert.equal(restored, true);
    assert.equal(selected, succeeds ? undefined : output);
  }
});
}
