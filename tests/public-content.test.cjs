/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { readdirSync } = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const EmailContact = require('./helpers/email-contact.cjs');

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

test('public hosting permits the supplied CV and keeps source documents and archive parts private', () => {
  const publicRoot = path.join(__dirname, '../public');
  const retired = [];
  function inspect(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) inspect(filename);
      else if (/\.(?:pdf|docx?|pptx?|xlsx?|zip|7z|rar|tar|gz|txt)(?:\.part-\d+)?$/i.test(entry.name) || entry.name === 'archive-members.json') {
        const relative = path.relative(publicRoot, filename);
        if (relative !== 'cv/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf') retired.push(relative);
      }
    }
  }
  inspect(publicRoot);
  assert.deepEqual(retired, [], `Retired files must not be publicly hosted: ${retired.join(', ')}`);
});

test('the CV gate preserves the exact supplied PDF and exposes no download before email capture', () => {
  const bytes = readFileSync(path.join(__dirname, '../public/cv/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf'));
  const supplied = JSON.parse(readFileSync(path.join(__dirname, '../content/cv-download.json')));
  const approvedHash = '3a93c23d5b3ff90ead273b1ea1e6812e885df105bef525d638fb8fbe244ac713';
  assert.equal(supplied.sourceFile, 'Priyam_Sameer_Zero_to_One_Product_Manager_CV (4).pdf');
  assert.equal(supplied.sha256, approvedHash, 'The manifest records the supplied source rather than a generated replacement');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), approvedHash, 'Public PDF must match the uploaded source byte for byte');
  assert.equal(bytes.length, 126576);
  assert.equal(bytes.length, supplied.bytes);
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  assert.equal(existsSync(path.join(__dirname, '../scripts/build-cv.py')), false, 'An obsolete generator must not overwrite the supplied PDF');
  const component = require('./helpers/cv-download.cjs');
  const { createElement } = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const html = renderToStaticMarkup(createElement(component.default));
  const expectedUrl = `${supplied.publicPath}?v=${approvedHash.slice(0,12)}`;
  assert.equal(component.CV_DOWNLOAD_URL,expectedUrl);
  assert.match(html, /<button[^>]+aria-label="Download CV"[^>]+aria-haspopup="dialog"/);
  assert.match(html, /<dialog[^>]+aria-labelledby="[^"]+"[^>]+aria-describedby="[^"]+"/);
  assert.match(html, /type="email" name="email" autoComplete="email" maxLength="254" required/);
  assert.match(html, /This does not subscribe you to a newsletter/);
  assert.doesNotMatch(html, /href="[^\"]+\.pdf|download=/, 'A visitor must complete the email form before a visible file link is rendered');
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
    require: id => id === '@/lib/content' ? moduleContext.exports : id === './EmailContact' ? EmailContact : require(id),
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
