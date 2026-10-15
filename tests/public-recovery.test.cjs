const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const css = new Proxy({}, { get: (_, name) => name === '__esModule' ? false : String(name) });
const shell = ({ children }) => createElement('div', null, children);
const link = ({ children, ...props }) => createElement('a', props, children);
const empty = () => null;

function loadPage(filename, env, db, extra = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', filename), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  const stubs = {
    'next/link': link,
    '@/lib/db': { publicDb: db },
    '@/lib/content': { contentExcerpt: value => value || '' },
    '@/components/Header': empty,
    '@/components/Footer': empty,
    '@/components/PublicShell': shell,
    './blog.module.css': css,
    ...extra,
  };
  vm.runInNewContext(outputText, {
    module, exports: module.exports, process: { env }, console: { error() {} },
    require: name => Object.prototype.hasOwnProperty.call(stubs, name) ? stubs[name] : require(name),
  }, { filename });
  return module.exports;
}

test('Writing distinguishes a failed connection from an empty published collection', async () => {
  const failed = loadPage('app/blog/page.tsx', { POSTGRES_URL: 'configured' }, async () => { throw new Error('Connection failed'); });
  const failedHtml = renderToStaticMarkup(await failed.default());
  assert.match(failedHtml, /Writing is temporarily unavailable/);
  assert.match(failedHtml, /href="\/blog">Try again/);
  assert.match(failedHtml, /href="\/product"/);
  assert.doesNotMatch(failedHtml, /No essays/);

  const connected = loadPage('app/blog/page.tsx', { POSTGRES_URL: 'configured' }, async () => ({ rows: [] }));
  const emptyHtml = renderToStaticMarkup(await connected.default());
  assert.match(emptyHtml, /Start with a decision/);
  assert.doesNotMatch(emptyHtml, /temporarily unavailable/);
});

test('unconfigured Writing retains an honest case-led holding page without querying', async () => {
  const page = loadPage('app/blog/page.tsx', { NODE_ENV: 'production' }, () => assert.fail('Unconfigured Writing must not query'));
  const html = renderToStaticMarkup(await page.default());
  assert.match(html, /Start with a decision/);
  assert.match(html, /<h1>Writing\.<\/h1>/);
  assert.match(html, /href="\/product\/cashkaro-college-money-education-loans"/);
  assert.doesNotMatch(html, /temporarily unavailable|No essays|subscribe/i);
});

test('unknown public detail routes use 404 before touching an unconfigured database', async () => {
  const missing = new Error('404');
  const page = loadPage('app/[category]/[id]/page.tsx', { NODE_ENV: 'production' }, () => assert.fail('An unconfigured detail must not query'), {
    'next/navigation': { notFound() { throw missing; }, permanentRedirect() { assert.fail('No curated alias should resolve'); } },
    '@/components/MarkdownContent': empty,
    '@/components/work/CaseStudy': empty,
    '@/components/work/Media': empty,
    '@/lib/work': { findCaseStudy: () => undefined, findWorkCompany: () => undefined, isRetiredWorkSlug: () => false },
  });
  for (const category of ['art', 'blog', 'product']) {
    await assert.rejects(page.default({ params: { category, id: 'unknown' } }), error => error === missing);
  }
});

test('a configured public detail connection failure remains an error instead of an invented 404', async () => {
  const failure = new Error('Connection failed');
  const page = loadPage('app/[category]/[id]/page.tsx', { POSTGRES_URL: 'configured' }, async () => { throw failure; }, {
    'next/navigation': { notFound() { assert.fail('Database failure is not a missing page'); }, permanentRedirect: empty },
    '@/components/MarkdownContent': empty,
    '@/components/work/CaseStudy': empty,
    '@/components/work/Media': empty,
    '@/lib/work': { findCaseStudy: () => undefined, findWorkCompany: () => undefined, isRetiredWorkSlug: () => false },
  });
  await assert.rejects(page.default({ params: { category: 'art', id: 'published-painting' } }), error => error === failure);
});

test('published Art keeps stored image proportions and labels the record date as publication', async () => {
  const page = loadPage('app/[category]/[id]/page.tsx', { POSTGRES_URL: 'configured' }, async () => ({ rows: [{
    id: 'painting', title: 'A painting', summary: null, body_markdown: null, created_at: '2026-10-13T12:00:00Z',
    media: [{ blob_url: '/a-painting.webp', kind: 'image', alt_text: 'The full painting', width: 1600, height: 2100 }],
  }] }), {
    'next/navigation': { notFound() { assert.fail('Published painting should resolve'); }, permanentRedirect: empty },
    '@/components/MarkdownContent': empty,
    '@/components/work/CaseStudy': empty,
    '@/components/work/Media': ({ media }) => createElement('img', { src: media.src, alt: media.alt, width: media.width, height: media.height }),
    '@/lib/work': { findCaseStudy: () => undefined, findWorkCompany: () => undefined, isRetiredWorkSlug: () => false },
  });
  const html = renderToStaticMarkup(await page.default({ params: { category: 'art', id: 'painting' } }));
  assert.match(html, /alt="The full painting" width="1600" height="2100"/);
  assert.match(html, /Painting · Published/);
  assert.match(html, /Talk about this painting/);
  assert.doesNotMatch(html, /product leadership opportunity/);
});
