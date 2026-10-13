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
const explorer = load('components/work/WorkExplorer.tsx', {
  '@/lib/work-types': load('lib/work-types.ts'), './VisualStory': visuals, './work-explorer.module.css': css,
  '@/components/BrandMarks': brandMarks,
});

test('Work Explorer renders five initial studies, clear company controls and every reachable case route', () => {
  const html = renderToStaticMarkup(createElement(explorer.default, { groups }));
  assert.match(html, /aria-label="Filter work by company"/);
  assert.match(html, /aria-pressed="true">CashKaro \/ BankKaro/);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  assert.match(html, /All work <span>25<\/span>/);
  assert.match(html, /CashKaro \/ BankKaro · 5 studies/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /<label for="other-work-context">/);
  const sectionStart = id => html.match(new RegExp(`<section id="${id}"[^>]*>`))?.[0];
  assert.ok(sectionStart('cashkaro'));
  assert.doesNotMatch(sectionStart('cashkaro'), /hidden=/);
  for (const company of registry.companies.filter(company => company.id !== 'cashkaro')) assert.match(sectionStart(company.id), /hidden=/);
  assert.match(sectionStart('other-contexts'), /hidden=/);
  for (const study of registry.caseStudies) {
    assert.equal((html.match(new RegExp(`href="/product/${study.slug}"`, 'g')) || []).length, 1, `${study.slug}: exactly one case action`);
    assert.ok(html.includes(study.visualSummary.title), `${study.slug}: short title missing`);
  }
  assert.ok(html.includes(registry.companies[0].role));
  for (const sentence of registry.companies[0].summary.split(/(?<=\.)\s+/)) assert.ok(html.includes(sentence));
  assert.doesNotMatch(html, /class="workflow"|class="chart"|class="comparison"|class="donut"/);
  assert.match(html, /Authored workflow overview; full technical model in the case study/);
  assert.match(html, /Portfolio diagram explaining the historical account/);
  assert.match(html, /<summary>Company context/);
  assert.match(html, /Read case study/);
  assert.doesNotMatch(html, /<a[^>]+download=/);
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
  assert.equal(registry.caseStudies.reduce((count, study) => count + study.sections.length, 0), 198);
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
