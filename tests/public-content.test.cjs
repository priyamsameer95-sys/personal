/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { readdirSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = readFileSync(path.join(__dirname, '../lib/content.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const moduleContext = { exports: {} };
vm.runInNewContext(outputText, { module: moduleContext, exports: moduleContext.exports });
const { contentExcerpt, safeMarkdownUrl } = moduleContext.exports;

test('public Markdown rejects executable schemes and obfuscated protocols', () => {
  for (const unsafe of [
    'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)', 'java\nscript:alert(1)', 'java\tscript:alert(1)',
  ]) {
    assert.equal(safeMarkdownUrl(unsafe), '', unsafe);
  }
});

test('public Markdown preserves web, contact, and relative links', () => {
  for (const safe of [
    'https://example.com/page', 'http://example.com', 'mailto:hello@example.com',
    'tel:+918238452277', 'mailto:hello@example.zip', '/product/a-case-study', '#section',
    'images/diagram.png', '/search?query=one:two',
  ]) {
    assert.equal(safeMarkdownUrl(safe), safe);
  }
});

test('public Markdown rejects attachment links including encoded filenames and legacy downloads', () => {
  for (const attachment of [
    '/work/story.pdf', 'https://example.com/deck.PPTX?version=2#page',
    '/work/source.zip.part-01', '/cv/resume%2EPDF', '/cv/resume%252ePDF',
    '/work/source.docx', '/work/source.xlsx', '/work/source.html.txt',
    'https://example.com/video.mp4', '/api/download?id=7', '/work/downloads/notes',
  ]) assert.equal(safeMarkdownUrl(attachment), '', attachment);
});

test('public hosting contains website media rather than retired source documents and archive parts', () => {
  const publicRoot = path.join(__dirname, '../public');
  const retired = [];
  function inspect(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) inspect(filename);
      else if (/\.(?:pdf|docx?|pptx?|xlsx?|zip|7z|rar|tar|gz|txt)(?:\.part-\d+)?$/i.test(entry.name) || entry.name === 'archive-members.json') {
        retired.push(path.relative(publicRoot, filename));
      }
    }
  }
  inspect(publicRoot);
  assert.deepEqual(retired, [], `Retired files must not be publicly hosted: ${retired.join(', ')}`);
});

test('list excerpts omit formatting and only indicate actual truncation', () => {
  const body = '# An idea\n\nA **clear** [link](https://example.com) and ![photo](image.png).';
  assert.equal(contentExcerpt(body), 'An idea A clear link and .');
  assert.equal(contentExcerpt('One short paragraph.'), 'One short paragraph.');
  assert.equal(contentExcerpt(null), '');
  assert.equal(contentExcerpt('First paragraph with enough text to need truncation.', 25), 'First paragraph with…');
});

test('the actual public renderer outputs Markdown without executable HTML or links', () => {
  // The server renderer needs no stylesheet evaluation or browser during this test.
  require.extensions['.css'] = () => {};
  require.extensions['.less'] = () => {};
  const { createElement } = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const componentSource = readFileSync(path.join(__dirname, '../components/MarkdownContent.tsx'), 'utf8');
  const { outputText: componentJs } = ts.transpileModule(componentSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  });
  const componentModule = { exports: {} };
  vm.runInNewContext(componentJs, {
    module: componentModule,
    exports: componentModule.exports,
    require: id => id === '@/lib/content' ? moduleContext.exports : require(id),
  });
  const html = renderToStaticMarkup(createElement(componentModule.exports.default, {
    source: '# A heading\n\n- One\n- Two\n\n**Bold** and [safe](https://example.com) and [unsafe](javascript:alert) and [PDF source](/work/source.pdf)\n\n<script>alert(1)</script>\n\n| A | B |\n| - | - |\n| 1 | 2 |',
  }));
  assert.match(html, /<h2>A heading<\/h2>/);
  assert.match(html, /<ul>\s*<li>One<\/li>\s*<li>Two<\/li>\s*<\/ul>/);
  assert.match(html, /<strong>Bold<\/strong>/);
  assert.match(html, /<a href="https:\/\/example.com">safe<\/a>/);
  assert.match(html, /<table><thead>/);
  assert.doesNotMatch(html, /<script\b|href="javascript:/i);
  assert.doesNotMatch(html, /href="\/work\/source.pdf"/);
});
