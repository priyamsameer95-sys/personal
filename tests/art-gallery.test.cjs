const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const {createElement} = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const Icon = require('./helpers/icon.cjs');

const root = path.join(__dirname, '..');
const data = JSON.parse(readFileSync(path.join(root, 'content/art/works.json'), 'utf8'));
const css = new Proxy({}, {get: (_, name) => name === '__esModule' ? false : String(name)});
const escapeHtml = text => text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');

function load(file, stubs = {}) {
  const {outputText} = ts.transpileModule(readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true},
  });
  const module = {exports: {}};
  vm.runInNewContext(outputText, {
    module, exports: module.exports,
    require: id => Object.hasOwn(stubs, id) ? stubs[id] : require(id),
  }, {filename: file});
  return module.exports;
}

const Media = load('components/work/Media.tsx', {'./work.module.css': css, '@/components/Icon':Icon}).default;
const Gallery = load('components/art/ArtGallery.tsx', {
  '@/components/work/Media': Media, './art-gallery.module.css': css, '@/components/Icon':Icon,
}).default;
const render = (props = {}) => renderToStaticMarkup(createElement(Gallery, {
  collections: data.collections, works: data.works, ...props,
}));

test('the quiet painting index uses six named native links without repeating artwork thumbnails', () => {
  const html = render();
  const nav = html.match(/<nav[^>]+aria-label="Paintings"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav);
  assert.equal((nav.match(/<a\b/g) || []).length, 6);
  assert.equal((nav.match(/<img\b/g) || []).length, 0);
  for (const work of data.works) {
    assert.ok(nav.includes(`href="#${work.id}"`));
    assert.ok(nav.includes(`>${escapeHtml(work.title)}</a>`));
    assert.ok(html.includes(`id="${work.id}" tabindex="-1"`));
  }
  assert.equal((html.match(/<img\b/g) || []).length, 12, 'Only six original paintings and their six real close-ups are shown');
  assert.match(html, /id="artworks" tabindex="-1"/);
  assert.match(html, /href="#artworks"[^>]*>Back to all paintings/);
  assert.doesNotMatch(html, /role="tab|aria-selected|<details\b|<summary\b|aria-hidden="true"[^>]*>[^<]*Artist/);
});

test('each painting is a separate open entry with a title, full work, note and directly enlarged close-up', () => {
  const html = render();
  assert.equal((html.match(/<article\b/g) || []).length, 6);
  for (const work of data.works) {
    const start = html.indexOf(`<article id="${work.id}"`);
    const end = html.indexOf('</article>', start);
    const entry = html.slice(start, end);
    assert.ok(entry.indexOf(`<h3 id="artwork-title-${work.id}"`) < entry.indexOf('<figure'));
    assert.ok(entry.includes(escapeHtml(work.medium)));
    assert.ok(entry.includes(escapeHtml(work.dimensions)));
    assert.match(entry, new RegExp(`data-source-page="${work.sourcePage}"`));
    assert.match(entry, new RegExp(`data-source-page="${work.detailImages[0].sourcePage}"`));
    assert.ok(entry.indexOf('<figure') < entry.indexOf('Artist’s note'));
    for (const paragraph of work.statement.split(/\n\s*\n/)) assert.ok(entry.includes(escapeHtml(paragraph)));
    assert.equal((entry.match(/aria-haspopup="dialog"/g) || []).length, 2);
    assert.ok(entry.includes(`aria-label="Enlarge image: ${escapeHtml(work.image.alt)}"`));
    assert.ok(entry.includes(`aria-label="Enlarge image: ${escapeHtml(work.detailImages[0].alt)}"`));
    assert.match(entry, />Detail<\/figcaption>/);
  }
  assert.match(html, /Paintings, close-ups and notes from my original portfolio\./);
  assert.doesNotMatch(html, /<a[^>]+download=|autoplay|<details\b|<summary\b/i);
});

test('empty collections render nothing and multiple real collections retain their named headings', () => {
  assert.equal(render({collections: [], works: []}), '');
  assert.equal(render({collections: data.collections, works: []}), '');
  const works = data.works.map((work, index) => ({...work, collectionId: index < 3 ? 'first' : 'second'}));
  const html = render({collections: [{id:'first',title:'First collection'}, {id:'second',title:'Second collection'}], works});
  assert.match(html, /href="#collection-first"/);
  assert.match(html, /href="#collection-second"/);
  assert.match(html, /<h2 id="collection-title-first">First collection<\/h2>/);
  assert.match(html, /<h2 id="collection-title-second">Second collection<\/h2>/);
});

test('gallery close-ups request bounded optimized previews while enlargement retains every full-size original', () => {
  const mediaProps = [];
  const Gallery = load('components/art/ArtGallery.tsx', {
    '@/components/work/Media': props => { mediaProps.push(props); return createElement(Media,props); },
    './art-gallery.module.css':css, '@/components/Icon':Icon,
  }).default;
  renderToStaticMarkup(createElement(Gallery,{collections:data.collections,works:data.works}));
  for(const work of data.works) for(const detail of work.detailImages){
    const props = mediaProps.find(props=>props.media.src===detail.src);
    assert.ok(props,`${work.title}: original retained for enlargement`);
    assert.equal(props.media.width,detail.width);
    assert.equal(props.media.height,detail.height);
    const url = new URL(props.previewSrc,'https://portfolio.example');
    assert.equal(url.pathname,'/_next/image');
    assert.equal(url.searchParams.get('url'),detail.src);
    assert.ok(Number(url.searchParams.get('w'))<=640,`${work.title}: the larger close-up preview is bounded`);
  }
  const originals = mediaProps.filter(props => data.works.some(work => work.image.src === props.media.src));
  assert.equal(originals.length, 6);
  assert.equal(originals.filter(props => props.priority).length, 1, 'Only the opening artwork loads eagerly');
  assert.equal(originals[0].priority, true);
  for (const work of data.works) {
    const original = originals.find(props => props.media.id === work.id);
    assert.equal(original.previewSrc, work.image.previewSrc);
    assert.equal(original.media.width, work.image.width);
    assert.equal(original.media.height, work.image.height);
  }
});
