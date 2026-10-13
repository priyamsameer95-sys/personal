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
const visuals = load('components/work/VisualStory.tsx', { './visual-story.module.css': css });
const brandMarks = load('components/BrandMarks.tsx', { '@/lib/brands': load('lib/brands.ts'), './brand-marks.module.css': css }).default;
const companyContextData = load('lib/company-context.ts');
const companyContext = load('components/CompanyContext.tsx', { './BrandMarks': brandMarks, '@/lib/company-context': companyContextData, './company-context.module.css': css }).default;
const presentation = load('lib/work-presentation.ts');
const media = load('components/work/Media.tsx', { './work.module.css': css }).default;
const preview = load('components/work/WorkPreview.tsx', { 'next/link': ({ children, ...props }) => createElement('a', props, children), '@/lib/work-types': load('lib/work-types.ts'), '@/lib/work-presentation': presentation, './Media': media, '@/components/BrandMarks': brandMarks, './work-preview.module.css': css }).default;
const explorer = load('components/work/WorkExplorer.tsx', {
  'next/link': ({ children, ...props }) => createElement('a', props, children),
  './WorkPreview': preview, '@/lib/work-presentation': presentation,
  '@/lib/work-types': load('lib/work-types.ts'), './VisualStory': visuals, './work-explorer.module.css': css,
  '@/components/BrandMarks': brandMarks,
  '@/components/CompanyContext': companyContext, '@/lib/company-context': companyContextData,
});

test('Work starts with six media previews and exposes the entire company index initially', () => {
  const html = renderToStaticMarkup(createElement(explorer.default, { groups }));
  assert.match(html, /aria-label="Filter work by company"/);
  assert.match(html, /aria-pressed="true">All work/);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  assert.match(html, /All work <span>25<\/span>/);
  assert.match(html, /All work · 25 studies/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<label for="other-work-context">/);
  const sectionStart = id => html.match(new RegExp(`<section id="${id}"[^>]*>`))?.[0];
  for (const company of registry.companies) {
    assert.ok(sectionStart(company.id));
    assert.doesNotMatch(sectionStart(company.id), /hidden=/);
  }
  assert.doesNotMatch(sectionStart('other-contexts'), /hidden=/);
  const featured = registry.caseStudies.filter(study => study.featuredOrder).sort((a,b) => a.featuredOrder-b.featuredOrder);
  assert.equal(featured.length, 6);
  const featureArea = html.slice(html.indexOf('id="featured-title"'), html.indexOf('id="company-index"'));
  let preceding = -1;
  for (const study of featured) {
    const at = featureArea.indexOf(`id="preview-${study.id}"`);
    assert.ok(at > preceding, `${study.slug}: featured in configured order`);
    preceding = at;
    const primary = presentation.getPrimaryMedia(study)[0];
    assert.ok(featureArea.includes(primary.src), `${study.slug}: primary evidence visible`);
  }
  assert.match(featureArea, /<video[^>]+controls=""/);
  assert.match(featureArea, /aria-haspopup="dialog"/);
  assert.match(featureArea, /Validation status/);
  assert.match(featureArea, /Proposal/);
  for (const study of registry.caseStudies) {
    assert.equal((html.match(new RegExp(`href="/product/${study.slug}"`, 'g')) || []).length, study.featuredOrder ? 2 : 1, `${study.slug}: one index action plus optional feature action`);
    assert.ok(html.includes(study.visualSummary.title), `${study.slug}: short title missing`);
  }
  for (const sentence of registry.companies[0].summary.split(/(?<=\.)\s+/)) assert.ok(html.includes(sentence));
  assert.doesNotMatch(html, /<details|<summary|Read more|Company context/);
  assert.doesNotMatch(html, /autoPlay|autoplay|<a[^>]+download=/);
});

test('Production filter logic exposes all25, each company and honest additional contexts without omissions', () => {
  const ids = selected => Array.from(explorer.filterWorkGroups(groups, selected), group => group.company.id);
  assert.deepEqual(ids('cashkaro'), ['cashkaro']);
  assert.deepEqual(ids('absolute'), ['absolute']);
  assert.deepEqual(ids('all'), registry.companies.map(company => company.id));
  assert.equal(explorer.filterWorkGroups(groups, 'all').reduce((count, group) => count + group.studies.length, 0), 25);
  assert.deepEqual(ids('other'), ['founder-programmes', 'water-farmers', 'gujarat-action-group', 'advisory', 'cept']);
  assert.deepEqual(ids('advisory'), ['advisory']);
  assert.deepEqual(ids('unrecognised'), []);
});

test('Company deep links resolve the filter while malformed or unrelated fragments do not change it', () => {
  for (const company of registry.companies) {
    const match = explorer.resolveWorkFragment(`#${company.id}`, groups);
    assert.equal(match.selection, company.id);
    assert.equal(match.fragment, company.id);
    assert.equal(explorer.filterWorkGroups(groups, match.selection)[0].company.id, company.id);
  }
  assert.equal(explorer.resolveWorkFragment('#%63ashkaro', groups).selection, 'cashkaro');
  assert.equal(explorer.resolveWorkFragment('#other-contexts', groups).selection, 'other');
  for (const hash of ['', '#', '#%E0%A4', '#missing-company', '#story-build']) assert.equal(explorer.resolveWorkFragment(hash, groups), null);
});

test('All visual summaries retain real processes and explicit chart scope without mutating the full story', () => {
  assert.equal(registry.caseStudies.length, 25);
  assert.ok(registry.caseStudies.reduce((count, study) => count + study.sections.length, 0) >= 198, 'original source sections preserved alongside validation material');
  for (const study of registry.caseStudies) {
    const visual = study.visualSummary;
    for (const field of ['title', 'summary', 'challenge', 'role', 'decision', 'impact']) assert.ok(visual[field]?.trim(), `${study.slug}: ${field}`);
    assert.ok(visual.workflow.steps.length >= 3 && visual.workflow.steps.length <= 5);
    assert.ok(visual.workflow.note.trim());
    for (const chart of visual.charts || []) {
      assert.ok(chart.note.trim() && chart.values.length);
      assert.ok(chart.values.every(item => Number.isFinite(item.value) && item.value >= 0));
      if (chart.kind === 'donut') {
        assert.equal(chart.unit, '%');
        assert.equal(chart.values.reduce((total, item) => total + item.value, 0), 100);
        assert.match(chart.note, /computed|implied/i);
      }
    }
  }
});

test('company business, scale and official links appear before Priyam responsibility', () => {
  const html = renderToStaticMarkup(createElement(explorer.default, { groups }));
  for (const id of ['cashkaro','credflow','absolute','urbankhet']) {
    const company = companyContextData.getCompanyContext(id);
    const start = html.indexOf(`<section id="${id}"`);
    const section = html.slice(start, html.indexOf('<div class="indexList"', start));
    assert.ok(section.includes(company.about));
    assert.ok(section.indexOf(company.about) < section.indexOf('My responsibility'));
    for (const fact of company.facts) assert.ok(section.includes(fact.value));
    for (const website of company.websites) assert.ok(section.includes(`href="${website.href}"`));
    assert.ok(section.includes(company.scopeNote));
    assert.doesNotMatch(section, /<details|<summary/);
  }
  assert.equal(companyContextData.getCompanyContext('urbankhet').websites.length, 0);
  for (const company of Object.values(companyContextData.companyContexts)) {
    assert.ok(company.sources.length > 0);
    for (const fact of company.facts) assert.ok(company.sources.some(source => source.id === fact.sourceId));
    assert.ok(company.websites.every(website => website.href.startsWith('https://')));
  }
  assert.equal(companyContextData.getCompanyContext('missing-company'), undefined);
});
