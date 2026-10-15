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
function load(relativePath, stubs = {}, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path.join(root, relativePath), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { ...globals, module, exports: module.exports, require: id => id === '@/lib/seo' ? require('./helpers/seo.cjs') : id === '@/components/Icon' ? require('./helpers/icon.cjs') : Object.hasOwn(stubs, id) ? stubs[id] : require(id) }, { filename: relativePath });
  return module.exports;
}
const link = ({ children, ...props }) => createElement('a', props, children);
const registry = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
const groups = registry.companies.map(company => ({ company, studies: registry.caseStudies.filter(study => study.companyId === company.id) }));
const presentation = load('lib/work-presentation.ts');
const productLinks = load('lib/product-links.ts');
const brandMarks = load('components/BrandMarks.tsx', { '@/lib/brands': load('lib/brands.ts'), './brand-marks.module.css': css }).default;
const media = load('components/work/Media.tsx', { './work.module.css': css }).default;
const previewModule = load('components/work/WorkPreview.tsx', {
  'next/link': link, '@/lib/work-types': load('lib/work-types.ts'), '@/lib/work-presentation': presentation,
  '@/lib/product-links': productLinks, './Media': media, '@/components/BrandMarks': brandMarks, './work-preview.module.css': css,
});
const preview = previewModule.default;
const fragmentModule = load('components/work/WorkFragmentNavigation.tsx');
const stubs = {
  'next/link': link, '@/lib/work-presentation': presentation, '@/components/BrandMarks': brandMarks,
  './WorkPreview': previewModule, './WorkFragmentNavigation': fragmentModule.default, './work-explorer.module.css': css,
};
const explorer = load('components/work/WorkExplorer.tsx', stubs);
const selected = [
  'cashkaro-college-money-education-loans', 'cashkaro-eduloans-policy-workflow',
  'cashkaro-lending-mcp-feedback', 'cashkaro-lender-integration-operations',
  'absolute-rural-credit-uli', 'absolute-silkroute-marketplace', 'absolute-crop-health-ai', 'urbankhet-farm-to-fork',
];
const supporting = ['absolute-upaj-farmer-experience', 'absolute-farm-os-iot-gis'];
const companyOrder = ['cashkaro', 'absolute', 'urbankhet'];
const legacyTargets = {
  'lending-journeys': selected[0], 'partner-platforms': selected[3],
  'applied-ai': selected[1], 'operating-business': selected[7],
};
const escaped = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
const fragments = [...Object.keys(legacyTargets), 'other-contexts', 'company-index', 'upaj-stack-title', ...groups.map(group => group.company.id), ...selected.map(slug => `project-${slug}`)];
function prepared() { return explorer.prepareWorkGroups(groups); }
function render() { return renderToStaticMarkup(createElement(explorer.default, { groups: prepared() })); }
function previewAt(html, study) { return html.indexOf(`id="preview-${study.id}"`); }
function companySection(html, companyId) {
  const start = html.indexOf(`<section id="${companyId}"`);
  const next = companyOrder.slice(companyOrder.indexOf(companyId) + 1).map(id => html.indexOf(`<section id="${id}"`)).find(position => position > start);
  return html.slice(start, next || html.indexOf('<section id="other-contexts"'));
}

// A minimal tree suffices to test whether initially rendered evidence has been
// put inside hidden/disclosure/modal content, without adding a DOM dependency.
function nodes(html) {
  const rootNode = { tag: 'root', attrs: {}, parent: null };
  const stack = [rootNode], result = [];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  for (const token of html.matchAll(/<\/?([a-z][a-z0-9-]*)([^>]*)>/gi)) {
    const tag = token[1].toLowerCase();
    if (token[0].startsWith('</')) {
      const index = stack.map(node => node.tag).lastIndexOf(tag);
      if (index > 0) stack.length = index;
      continue;
    }
    const attrs = {};
    for (const attr of token[2].matchAll(/([^\s=]+)(?:="([^"]*)")?/g)) attrs[attr[1]] = attr[2] || '';
    const node = { tag, attrs, parent: stack[stack.length - 1] };
    result.push(node);
    if (!voidTags.has(tag)) stack.push(node);
  }
  return result;
}

test('Work presents eight open accounts grouped CashKaro, Absolute and UrbanKhet without company interleaving', () => {
  const html = render();
  assert.deepEqual(Array.from(explorer.selectedWorkSlugs), selected);
  assert.equal((html.match(/id="preview-/g) || []).length, 8);
  let previous = -1;
  for (const id of companyOrder) {
    const position = html.indexOf(`<section id="${id}"`);
    assert.ok(position > previous, `${id}: company sections have one consistent order`);
    previous = position;
    assert.match(html, new RegExp(`href="#${id}"`));
    const section = companySection(html, id);
    for (const study of registry.caseStudies.filter(study => selected.includes(study.slug))) {
      assert.equal(section.includes(`id="preview-${study.id}"`), study.companyId === id, `${study.slug}: stays in its company context`);
    }
  }
  for (const study of registry.caseStudies.filter(study => selected.includes(study.slug))) {
    const ownership = previewModule.selectedProjectOwnership[study.slug];
    assert.match(ownership, /\bI (?:owned|proposed|worked|built|shaped|connected|moved)/, `${study.slug}: personal contribution`);
    assert.ok(html.includes(escaped(ownership)), study.slug);
    assert.ok(ownership.split(/\s+/).length <= 40, `${study.slug}: concise ownership and qualification`);
    assert.ok(previewModule.projectThemes[study.slug], `${study.slug}: useful project category`);
    assert.ok(previewModule.projectDecisions[study.slug], `${study.slug}: consequential choice`);
    assert.ok(html.includes(escaped(previewModule.projectDecisions[study.slug])), `${study.slug}: choice is visible before opening the case`);
  }
  for (const study of registry.caseStudies.filter(study => !selected.includes(study.slug))) assert.ok(!html.includes(`id="preview-${study.id}"`), `${study.slug}: not silently promoted into the main selection`);
  assert.doesNotMatch(html, /<details|<summary|<select|\shidden=|role="tabpanel"|aria-pressed|Read more|How I can help|work-conversation/);
  assert.doesNotMatch(html, /autoplay|<a[^>]+download=/i);
});

test('server preparation keeps eight accounts and two supporting media records while preserving the complete registry', () => {
  const before = JSON.stringify(groups);
  const result = prepared();
  const chosen = result.filter(group => group.studies.length);
  assert.deepEqual(Array.from(chosen, group => group.company.id), companyOrder);
  assert.deepEqual(Array.from(chosen, group => group.studies.length), [4, 5, 1]);
  assert.deepEqual(Array.from(chosen).flatMap(group => Array.from(group.studies, study => study.slug)).sort(), [...selected, ...supporting].sort());
  assert.deepEqual(Array.from(result, group => group.company.id), groups.map(group => group.company.id));
  for (const group of result) {
    assert.deepEqual(Object.keys(group.company).sort(), ['id', 'name']);
    for (const study of group.studies) {
      assert.equal(study.media.length, 1, `${study.slug}: a useful preview is explicitly selected`);
      assert.equal(study.sections, undefined);
      assert.equal(study.outcomes, undefined);
      assert.equal(study.visualSummary?.charts, undefined);
      const original = registry.caseStudies.find(original => original.slug === study.slug);
      const expected = explorer.previewMediaIds[study.slug] || presentation.getPrimaryMedia(original)[0]?.id;
      assert.equal(study.media[0].id, expected);
      assert.equal(study.primaryMediaIds[0], expected);
      assert.ok(original.media.some(asset => asset.id === expected && asset.src === study.media[0].src), 'preview comes from the corresponding case');
    }
  }
  assert.equal(JSON.stringify(groups), before);
  assert.equal(registry.caseStudies.length, 25);
  assert.deepEqual(Array.from(explorer.prepareWorkGroups([])), []);
  const missing = groups.map(group => ({ ...group, studies: group.studies.filter(study => study.slug !== selected[0]) }));
  assert.equal(explorer.prepareWorkGroups(missing).flatMap(group => group.studies).length, 9);
  assert.doesNotMatch(readFileSync(path.join(root, 'components/work/WorkExplorer.tsx'), 'utf8'), /^["']use client["']/);
});

test('RiskStac and Upaj previews use existing dated screenshots instead of an empty primary-media selection', () => {
  const selectedMedia = Object.fromEntries(prepared().flatMap(group => group.studies).map(study => [study.slug, study.media[0]]));
  assert.equal(selectedMedia['absolute-rural-credit-uli'].id, 'upaj-riskstac-monitoring');
  assert.equal(selectedMedia['absolute-upaj-farmer-experience'].id, 'upaj-growstac-personalised');
  assert.equal(selectedMedia['absolute-farm-os-iot-gis'].id, 'upaj-growstac-technology');
  for (const slug of ['absolute-rural-credit-uli', ...supporting]) {
    const asset = selectedMedia[slug];
    assert.equal(asset.category, 'product-screenshot');
    assert.equal(asset.provenance.kind, 'current-public');
    assert.equal(asset.provenance.date, '13 October 2026');
    assert.ok(render().includes(`src="${asset.src}"`), `${slug}: actual visible image exists`);
  }
  const raw = registry.caseStudies.find(study => study.slug === 'absolute-rural-credit-uli');
  assert.equal(raw.primaryMediaIds.length, 0, 'the Work preview does not rewrite the underlying case evidence choice');
});

test('all image and video evidence is rendered outside hidden or folded ancestors', () => {
  const tree = nodes(render());
  const evidence = tree.filter(node => node.tag === 'img' || node.tag === 'video');
  assert.ok(evidence.length >= 10, 'the full project accounts and supporting images are visible without duplicate thumbnails');
  for (const node of evidence) {
    for (let ancestor = node.parent; ancestor; ancestor = ancestor.parent) {
      assert.ok(!['details', 'summary', 'dialog'].includes(ancestor.tag), `${node.attrs.src}: evidence outside a disclosure/modal`);
      assert.equal(Object.hasOwn(ancestor.attrs, 'hidden'), false);
      assert.notEqual(ancestor.attrs['aria-hidden'], 'true');
      assert.notEqual(ancestor.attrs.style?.includes('display:none'), true);
    }
  }
});

test('the opening uses company anchors and each full project visual appears once without a duplicate rail', () => {
  const html = render();
  assert.match(html, /aria-label="Work by company"/);
  assert.doesNotMatch(html, /Project previews|Previous project previews|Next project previews|Find a project/);
  for (const slug of selected) {
    assert.ok(html.includes(`id="project-${slug}"`));
    const study = registry.caseStudies.find(study => study.slug === slug);
    assert.ok(previewAt(html, study) > html.indexOf('aria-label="Work by company"'));
    const primary = prepared().flatMap(group => group.studies).find(item => item.slug === slug).media[0];
    assert.equal(html.split(`src="${primary.src}"`).length - 1, 1, `${slug}: one useful visual rather than an overview duplicate`);
    assert.equal(html.split(`href="/product/${slug}"`).length - 1, 1, `${slug}: one direct case action`);
  }
  let received;
  const component = load('components/work/WorkExplorer.tsx', { ...stubs, './WorkFragmentNavigation': props => { received = props; return null; } });
  renderToStaticMarkup(createElement(component.default, { groups: prepared() }));
  assert.deepEqual(Object.keys(received), ['fragments']);
  assert.ok(received.fragments.every(fragment => typeof fragment === 'string'));
  for (const fragment of fragments) assert.ok(received.fragments.includes(fragment), fragment);
});

test('original company anchors and legacy theme fragments remain unique and keyboard focusable', () => {
  const html = render();
  const tree = nodes(html);
  for (const company of registry.companies) {
    assert.equal(tree.filter(node => node.attrs.id === company.id).length, 1, `${company.id}: unique original anchor`);
    assert.equal(fragmentModule.resolveWorkFragment(`#${company.id}`, fragments), company.id);
  }
  const destinations = { credflow: '/cv#credflow', 'founder-programmes': '/cv#founder-programmes', 'water-farmers': '/cv#internship', 'gujarat-action-group': '/cv#other-contexts', advisory: '/cv#other-contexts', cept: '/cv#education' };
  for (const [id, href] of Object.entries(destinations)) assert.match(html, new RegExp(`<a[^>]+id="${id}"[^>]+href="${href}"`));
  for (const [fragment, slug] of Object.entries(legacyTargets)) {
    const alias = tree.find(node => node.attrs.id === fragment);
    assert.ok(alias, fragment);
    assert.equal(alias.attrs.tabindex, '-1');
    assert.equal(alias.parent.attrs.id, `project-${slug}`);
    assert.equal(fragmentModule.resolveWorkFragment(`#${fragment}`, fragments), fragment);
  }
  for (const fragment of ['other-contexts', 'company-index', 'upaj-stack-title']) assert.equal(fragmentModule.resolveWorkFragment(`#${fragment}`, fragments), fragment);
  assert.equal(fragmentModule.resolveWorkFragment('#%63ashkaro', fragments), 'cashkaro');
  for (const hash of ['', '#', '#%E0%A4', '#missing-company', '#story-build']) assert.equal(fragmentModule.resolveWorkFragment(hash, fragments), null);
});

test('fragment navigation cancels stale work and restores focus before scrolling', () => {
  const frames = new Map(), events = []; let nextFrame = 0, effect, hashChange;
  const location = { hash: '#absolute' };
  const target = { focus: options => events.push(['focus', options.preventScroll]), scrollIntoView: options => events.push(['scroll', options.block, options.behavior]) };
  const component = load('components/work/WorkFragmentNavigation.tsx', { react: { ...require('react'), useEffect: callback => { effect = callback; } } }, {
    window: { location, addEventListener: (_, callback) => { hashChange = callback; }, removeEventListener: (_, callback) => { assert.equal(callback, hashChange); hashChange = undefined; } },
    document: { getElementById: id => { events.push(['target', id]); return target; } },
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; }, cancelAnimationFrame: id => frames.delete(id),
  });
  renderToStaticMarkup(createElement(component.default, { fragments })); const cleanup = effect();
  assert.equal(frames.size, 1); location.hash = '#applied-ai'; hashChange(); assert.equal(frames.size, 1);
  frames.values().next().value(); assert.deepEqual(events, [['target', 'applied-ai'], ['focus', true], ['scroll', 'start', 'instant']]);
  cleanup(); assert.equal(frames.size, 0); assert.equal(hashChange, undefined);
});

test('preview media follows explicit editorial selection and never substitutes unrelated fallback evidence', () => {
  for (const study of prepared().flatMap(group => group.studies).filter(study => selected.includes(study.slug))) {
    const html = renderToStaticMarkup(createElement(preview, { study }));
    const primary = presentation.getPrimaryMedia(study)[0];
    assert.ok(html.includes(`src="${primary.src}"`), study.slug);
    assert.ok(html.includes(escaped(primary.caption)), `${study.slug}: evidence qualification`);
    assert.match(html, new RegExp(`href="/product/${study.slug}"`));
    assert.match(html, /Full case study/);
    if (primary.category === 'diagram') assert.match(html, primary.provenance?.kind === 'proposal' ? /Authored architecture proposal; deployment not verified/ : /Authored explanation; not a product screen/);
    if (primary.provenance?.kind === 'current-public') assert.match(html, /Current public reference/);
    assert.doesNotMatch(html, /autoplay|<details|<summary/i);
  }
  const college = registry.caseStudies.find(study => study.slug === selected[0]);
  const forced = { ...college, primaryMediaIds: [], heroMediaId: college.media[0]?.id };
  assert.doesNotMatch(renderToStaticMarkup(createElement(preview, { study: forced })), /<figure|<video|aria-haspopup="dialog"/);
});

test('work types and nearby qualifications distinguish delivered flow, scripted prototype and MCP proposal', () => {
  const lookup = slug => prepared().flatMap(group => group.studies).find(study => study.slug === slug);
  const proposal = renderToStaticMarkup(createElement(preview, { study: lookup('cashkaro-lending-mcp-feedback') }));
  assert.match(proposal, /Proposal/); assert.match(proposal, /proposed/i); assert.match(proposal, /approval before policy changes/);
  const prototype = renderToStaticMarkup(createElement(preview, { study: lookup('cashkaro-eduloans-policy-workflow') }));
  assert.match(prototype, /Prototype/); assert.match(prototype, /sample records and scripted responses/);
  const historical = renderToStaticMarkup(createElement(preview, { study: lookup('absolute-crop-health-ai') }));
  assert.match(historical, /Historical product delivery/); assert.match(historical, /intended conversational-advisory layer/);
  assert.match(historical, /Current public reference/);
});

test('company context and named external product links remove the ambiguous Company website action', () => {
  const html = render();
  assert.doesNotMatch(html, /Company website|Company-reported|Company milestone|Shopping network|Sources ·|Reviewed 14 October/);
  for (const [id, href] of [['cashkaro', 'https://cashkaro.com/'], ['absolute', 'https://www.absolute.bio/']]) {
    const section = companySection(html, id);
    const firstStudy = registry.caseStudies.find(study => study.slug === selected.find(slug => slug.startsWith(`${id}-`)));
    assert.ok(section.indexOf('companyHeader') < section.indexOf(`id="preview-${firstStudy.id}"`));
    assert.ok(section.includes(`href="${href}"`));
  }
  for (const slug of ['cashkaro-college-money-education-loans', 'absolute-rural-credit-uli', 'absolute-crop-health-ai']) {
    const study = prepared().flatMap(group => group.studies).find(study => study.slug === slug);
    const previewHtml = renderToStaticMarkup(createElement(preview, { study }));
    const destination = productLinks.productLinks[slug];
    assert.ok(previewHtml.includes(`href="${destination.href}"`));
    assert.ok(previewHtml.includes(destination.label));
    assert.match(previewHtml, /target="_blank" rel="noopener noreferrer"/);
  }
  assert.doesNotMatch(companySection(html, 'urbankhet'), /https:\/\/(?:www\.)?urbankhet/);
});

test('Upaj supporting images stay inside Absolute before UrbanKhet and link to the original cases', () => {
  const html = render();
  const absolute = companySection(html, 'absolute');
  const stack = absolute.slice(absolute.indexOf('id="upaj-stack-title"'));
  assert.ok(absolute.includes('id="upaj-stack-title"'));
  for (const slug of supporting) {
    assert.ok(stack.includes(`href="/product/${slug}"`));
    assert.ok(registry.caseStudies.some(study => study.slug === slug));
  }
  assert.equal((stack.match(/<img/g) || []).length, 2);
  assert.match(stack, /Current public reference/);
  assert.ok(html.indexOf('id="upaj-stack-title"') < html.indexOf('<section id="urbankhet"'));
});

test('Work retains brand identities with an ink Absolute wordmark and no retired extra marks', () => {
  const html = render();
  assert.doesNotMatch(html, /src="\/brands\/bankkaro\.png"|src="\/brands\/upaj-black\.svg"/);
  for (const src of ['/brands/cashkaro.svg', '/brands/absolute.svg', '/brands/urbankhet.png']) assert.ok(html.includes(`src="${src}"`));
  assert.doesNotMatch(html, /100K\s*→\s*600K|100,000 to 600,000|500K\+.*Under 30|1 days|Reported settlement cycle/);
  assert.equal((html.match(/Full case study/g) || []).length, 8);
  const sample = prepared().flatMap(group => group.studies).find(study => study.slug === selected[0]);
  assert.doesNotMatch(renderToStaticMarkup(createElement(preview, { study: sample, showBrand: false })), /src="\/brands\//);
  const brandCss = readFileSync(path.join(root, 'components/brand-marks.module.css'), 'utf8');
  const absoluteInk = brandCss.match(/\.absolute img\s*\{[^}]+\}/)?.[0];
  assert.ok(absoluteInk, 'The transparent black treatment is scoped to Absolute');
  assert.doesNotMatch(brandCss.replace(absoluteInk, ''), /grayscale\(|filter\s*:\s*(?:brightness|invert)/, 'Other original brand colours remain untouched');
  const absolute = renderToStaticMarkup(createElement(brandMarks, { companyId: 'absolute' }));
  assert.match(absolute, /class="mark absolute"/);
  assert.doesNotMatch(absolute, /class="[^"]*\bdark\b/);
});

test('Work has a short introduction and does not append an uncurated duplicate project list', () => {
  const source = readFileSync(path.join(root, 'app/product/page.tsx'), 'utf8');
  assert.match(source, /<h1>Selected work\.<\/h1>/);
  const intro = source.match(/<p>([^<]+)<\/p>/)?.[1];
  assert.ok(intro && intro.split(/\s+/).length <= 24);
  assert.doesNotMatch(source, /loadPublishedWork|additionalWork|Additional product work|complete company index/);
});

test('previews name the product before evidence and keep ownership readable without opening the case', () => {
  for (const study of prepared().flatMap(group => group.studies).filter(study => selected.includes(study.slug))) {
    const html = renderToStaticMarkup(createElement(preview, { study }));
    const title = presentation.getCaseDisplayTitle(study);
    assert.ok(html.includes(`<h3 id="preview-${study.id}">${escaped(title)}</h3>`));
    const evidence = html.indexOf('<figure');
    assert.ok(html.indexOf('</h3>') < evidence, `${study.slug}: title before evidence`);
    assert.ok(evidence < html.indexOf('<p class="summary">'), `${study.slug}: evidence before ownership account`);
  }
  const college = prepared().flatMap(group => group.studies).find(study => study.slug === selected[0]);
  const html = renderToStaticMarkup(createElement(preview, { study: college }));
  assert.match(html, /src="\/work\/college-money\/screenshots\/abroad-hero-final\.webp"/);
  assert.match(html, /Current public reference/);
  assert.equal(presentation.getPrimaryMedia(registry.caseStudies.find(study => study.slug === college.slug))[0].id, 'college-money-abroad-readiness');
});
