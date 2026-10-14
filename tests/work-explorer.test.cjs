const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.join(__dirname, '..');
const css = new Proxy({}, { get: (_, name) => name === '__esModule' ? false : String(name) });
function load(relativePath, stubs = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path.join(root, relativePath), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { module, exports: module.exports, require: id => Object.hasOwn(stubs, id) ? stubs[id] : require(id) }, { filename: relativePath });
  return module.exports;
}
const registry = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
const groups = registry.companies.map(company => ({ company, studies: registry.caseStudies.filter(study => study.companyId === company.id) }));
const brandMarks = load('components/BrandMarks.tsx', { '@/lib/brands': load('lib/brands.ts'), './brand-marks.module.css': css }).default;
const companyContextData = load('lib/company-context.ts');
const companyContext = load('components/CompanyContext.tsx', { './BrandMarks': brandMarks, '@/lib/company-context': companyContextData, './company-context.module.css': css }).default;
const presentation = load('lib/work-presentation.ts');
const media = load('components/work/Media.tsx', { './work.module.css': css }).default;
const preview = load('components/work/WorkPreview.tsx', { 'next/link': ({ children, ...props }) => createElement('a', props, children), '@/lib/work-types': load('lib/work-types.ts'), '@/lib/work-presentation': presentation, './Media': media, '@/components/BrandMarks': brandMarks, './work-preview.module.css': css }).default;
const explorer = load('components/work/WorkExplorer.tsx', {
  'next/link': ({ children, ...props }) => createElement('a', props, children),
  './WorkPreview': preview, './work-explorer.module.css': css,
  '@/components/CompanyContext': companyContext,
});
const expected = ['cashkaro-college-money-education-loans','cashkaro-lending-mcp-feedback','cashkaro-lender-integration-operations','cashkaro-eduloans-policy-workflow','absolute-rural-credit-uli','absolute-silkroute-marketplace','absolute-crop-health-ai','urbankhet-farm-to-fork'];

const escaped = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');

test('Work exclusively spotlights the eight selected projects in the agreed priority', () => {
  const html = renderToStaticMarkup(createElement(explorer.default, { groups }));
  assert.deepEqual(Array.from(explorer.selectedWorkSlugs), expected);
  const shown = Array.from(explorer.selectWorkGroups(groups)).flatMap(group => Array.from(group.studies));
  assert.deepEqual(shown.map(study => study.slug), expected);
  assert.equal((html.match(/class="preview"/g) || []).length, 8);
  let preceding = -1;
  for (const study of shown) {
    const at = html.indexOf(`id="preview-${study.id}"`);
    assert.ok(at > preceding, `${study.slug}: selected priority`);
    preceding = at;
    const primary = presentation.getPrimaryMedia(study)[0];
    assert.ok(primary, `${study.slug}: primary evidence`);
    assert.ok(html.includes(`src="${primary.src}"`), `${study.slug}: visible original/labelled media`);
    assert.ok(html.includes(escaped(study.visualSummary.role)), `${study.slug}: personal ownership`);
    assert.ok(html.includes(escaped(study.visualSummary.decision)), `${study.slug}: decision`);
    assert.ok(html.includes(escaped(study.visualSummary.impact)), `${study.slug}: qualified impact/status`);
  }
  for (const study of registry.caseStudies.filter(study => !expected.includes(study.slug))) assert.doesNotMatch(html, new RegExp(`id="preview-${study.id}"`), `${study.slug}: excluded from selected page`);
  assert.match(html, /<video[^>]+controls=""/);
  assert.match(html, /aria-haspopup="dialog"/);
  assert.match(html, /Validation status/);
  assert.doesNotMatch(html, /<details|<summary|<select|aria-pressed|Filter work|All work|Full project index|Read more|What I bring/);
  assert.doesNotMatch(html, /autoPlay|autoplay|<a[^>]+download=/);
});

test('selected projects are stable without mutating or filtering away the complete source registry', () => {
  const before = JSON.stringify(groups);
  const selected = explorer.selectWorkGroups(groups);
  assert.deepEqual(Array.from(selected, group => group.company.id), ['cashkaro','absolute','urbankhet']);
  assert.deepEqual(Array.from(selected, group => group.studies.length), [4,3,1]);
  assert.equal(JSON.stringify(groups), before);
  assert.equal(registry.caseStudies.length, 25);
  assert.deepEqual(Array.from(explorer.selectWorkGroups([])), []);
  const partial = groups.map(group => ({ ...group, studies: group.studies.filter(study => study.slug !== expected[0]) }));
  assert.equal(explorer.selectWorkGroups(partial).reduce((count, group) => count + group.studies.length, 0), 7);
});

test('all nine company/context anchors retain clear selected-work or Experience destinations', () => {
  const html = renderToStaticMarkup(createElement(explorer.default, { groups }));
  for (const company of registry.companies) {
    assert.ok(html.includes(`id="${company.id}"`), `${company.id}: old anchor retained`);
    assert.equal(explorer.resolveWorkFragment(`#${company.id}`, groups), company.id);
  }
  const destinations = { credflow:'/cv#credflow', 'founder-programmes':'/cv#other-contexts', 'water-farmers':'/cv#internship', 'gujarat-action-group':'/cv#other-contexts', advisory:'/cv#other-contexts', cept:'/cv#education' };
  for (const [id, href] of Object.entries(destinations)) assert.match(html, new RegExp(`<a[^>]+id="${id}"[^>]+href="${href}"`));
  assert.equal(explorer.resolveWorkFragment('#%63ashkaro', groups), 'cashkaro');
  assert.equal(explorer.resolveWorkFragment('#other-contexts', groups), 'other-contexts');
  assert.equal(explorer.resolveWorkFragment('#company-index', groups), 'company-index');
  for (const hash of ['', '#', '#%E0%A4', '#missing-company', '#story-build']) assert.equal(explorer.resolveWorkFragment(hash, groups), null);
  assert.match(html, /view my experience/);
});

test('business context precedes project ownership and Upaj stack proof remains readily accessible', () => {
  const html = renderToStaticMarkup(createElement(explorer.default, { groups }));
  for (const id of ['cashkaro','absolute','urbankhet']) {
    const company = companyContextData.getCompanyContext(id);
    const start = html.indexOf(`<section id="${id}"`);
    const next = html.indexOf('<div class="selectedProjects"', start);
    const context = html.slice(start, next);
    if (company.abstract) {
      for (const part of company.abstract) assert.ok(context.includes(escaped(part.text)));
      assert.doesNotMatch(context, /Sources ·|Reviewed 14 October|June 2020 snapshot|Venture recognition/);
    } else {
      assert.ok(context.includes(escaped(company.about)));
      for (const fact of company.facts) assert.ok(context.includes(escaped(fact.value)));
      assert.ok(context.includes(escaped(company.scopeNote)));
    }
    for (const website of company.websites) assert.ok(context.includes(`href="${website.href}"`));
    assert.ok(next < html.indexOf('My ownership', start));
  }
  const stack = html.slice(html.indexOf('id="upaj-stack-title"'), html.indexOf('id="preview-rural-credit-uli"'));
  for (const slug of ['absolute-upaj-farmer-experience','absolute-farm-os-iot-gis','absolute-crop-health-ai','absolute-rural-credit-uli']) assert.ok(stack.includes(`href="/product/${slug}"`), `${slug}: direct Upaj-stack proof`);
  assert.match(stack, /Farmer app|Farm monitoring|Crop-health AI|RiskStac for institutions/);
  assert.equal(companyContextData.getCompanyContext('urbankhet').websites.length, 0);
  assert.match(html, /\$100 million in funding/);
  assert.doesNotMatch(html, /\$1,000 million|\$1000 million|src="\/brands\/bankkaro\.png"|src="\/brands\/upaj-black\.svg"/);
});

test('Work route presents the selected set and does not append uncurated published records', () => {
  const source = readFileSync(path.join(root, 'app/product/page.tsx'), 'utf8');
  assert.match(source, /Selected work\./);
  assert.match(source, /Eight selected projects/);
  assert.doesNotMatch(source, /loadPublishedWork|additionalWork|Additional product work|complete company index/);
});
