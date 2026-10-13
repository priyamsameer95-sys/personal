const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync, statSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.join(__dirname, '..');
const css = new Proxy({}, { get: (_, name) => name === '__esModule' ? false : String(name) });
const company = { id: 'company', name: 'A company', period: '2023–2025', role: 'Product manager', summary: 'A product team.', order: 1, relationship: 'Employer' };
const study = {
  id: 'one', slug: 'company-one', aliases: ['older-slug'], companyId: company.id,
  title: 'A product story', summary: 'An evidence-based summary.', role: 'Product manager', period: '2024', order: 1,
  workType: 'delivered',
  executiveBrief: { challenge: 'An application was losing eligible customers.', remit: 'I owned routing and partner operations.', decision: 'I made eligibility part of the shared journey.', impact: 'Reported programme conversion improved; individual contribution was shared.' },
  visualSummary: {
    title: 'A simpler lending journey', summary: 'One application with lender-specific routing.', role: 'Journey and partner operations.',
    challenge: 'Eligible customers were reaching unsuitable lenders.', decision: 'Check lender fit before handoff.', impact: 'Programme-level conversion improved.',
    workflow: { label: 'From application to lender review', steps: [{ title: 'Apply', detail: 'Common borrower inputs' }, { title: 'Match', detail: 'Lender eligibility rules' }, { title: 'Review', detail: 'Lender credit decision' }], note: 'Lenders retain the credit decision.' },
    charts: [{ id: 'conversion', title: 'Reported funnel conversion', kind: 'comparison', unit: '%', values: [{ label: 'Earlier', value: 16 }, { label: 'Later', value: 45 }], note: 'Programme-level report; event definitions are not supplied.' }],
  },
  outcomes: [{ label: 'A documented outcome', value: '10%', detail: 'Measured against the earlier process.' }],
  sections: [
    { id: 'problem', title: 'The problem', body: ['A complete narrative paragraph.'], mediaIds: ['screen', 'demo'] },
    { id: 'operating-model', title: 'How the operating model worked', body: ['The fuller operating detail.'], group: 'detail', anchorAliases: ['story-build'] },
    { id: 'record', title: 'The original project context', body: ['This record describes the original scope.'], group: 'reference', source: { label: 'Project note', range: 'Pages 2–3', date: '2024', version: 'Initial proposal' }, tables: [{ caption: 'Decision comparison', headers: ['Option', 'Tradeoff'], rows: [['Shared form', 'Requires lender rules']], note: 'An illustrative comparison.' }] },
  ],
  media: [
    { id: 'screen', kind: 'image', src: '/work/screen.webp', alt: 'The application flow', caption: 'A flow screenshot.', width: 400, height: 1800, provenance: { kind: 'historical', label: 'Original product capture', date: '2024' } },
    { id: 'demo', kind: 'video', src: '/work/demo.mp4', title: 'Product demonstration', caption: 'A recorded walkthrough.', poster: '/work/poster.webp', transcript: 'A description of the walkthrough.', captions: [{ src: '/work/captions.vtt', language: 'en', label: 'English' }] },
  ],
  sourceNotes: ['The measurement covers the programme; delivery involved a wider team.'],
};
const secondStudy = { ...study, id: 'two', slug: 'company-two', aliases: [], order: 2, featured: true };
const draft = { ...study, id: 'draft', slug: 'draft', aliases: ['draft-alias'], status: 'draft', order: 0 };
const fixture = { companies: [company], caseStudies: [secondStudy, draft, study] };

function load(relativePath, stubs = {}, env = {}, globals = {}) {
  const source = readFileSync(path.join(root, relativePath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const moduleContext = { exports: {} };
  vm.runInNewContext(outputText, {
    module: moduleContext, exports: moduleContext.exports,
    require: id => Object.prototype.hasOwnProperty.call(stubs, id) ? stubs[id] : require(id),
    process: { env }, console: { error() {} }, ...globals,
  }, { filename: relativePath });
  return moduleContext.exports;
}

function workModule({ env = {}, db = async () => ({ rows: [] }), registry = fixture } = {}) {
  return load('lib/work.ts', {
    '@/content/work/case-studies': registry, '@/lib/db': { publicDb: db },
    '@/lib/content': { contentExcerpt: value => value || '' },
  }, env);
}

function caseRenderer(registry = fixture) {
  const media = load('components/work/Media.tsx', { './work.module.css': css }).default;
  const navigation = load('components/work/CaseStudyNavigation.tsx', {
    './work.module.css': css, './anchors': load('components/work/anchors.ts'),
  });
  const visual = load('components/work/VisualStory.tsx', { './visual-story.module.css': css });
  const brands = load('lib/brands.ts');
  const brandMarks = load('components/BrandMarks.tsx', { '@/lib/brands': brands, './brand-marks.module.css': css }).default;
  return load('components/work/CaseStudy.tsx', {
    '@/lib/work': workModule({ registry }), '@/lib/work-types': load('lib/work-types.ts'),
    '@/lib/work-presentation': load('lib/work-presentation.ts'),
    './work.module.css': css, './Media': media, './CaseStudyNavigation': navigation, './VisualStory': visual,
    '@/components/BrandMarks': brandMarks, '@/lib/brands': brands,
  }, {}, { URL }).default;
}

test('curated work excludes drafts, resolves aliases and groups stories in author order', () => {
  const work = workModule();
  assert.deepEqual(Array.from(work.publishedCaseStudies(), item => item.slug), ['company-one', 'company-two']);
  assert.equal(work.findCaseStudy('older-slug').slug, 'company-one');
  assert.equal(work.findCaseStudy('draft-alias'), undefined);
  assert.deepEqual(Array.from(work.groupCaseStudies()[0].studies, item => item.slug), ['company-one', 'company-two']);
  const existing = [{ id: 'old-one', slug: 'company-one' }, { id: 'old-alias', slug: 'older-slug' }, { id: 'retired-case', slug: 'independent-moneylion-wow-strategy' }, { id: 'retired-alias', slug: 'moneylion-wow-strategy' }, { id: 'uuid-route', slug: null }, { id: 'other', slug: 'another-story' }];
  assert.deepEqual(Array.from(work.withoutCuratedDuplicates(existing), item => item.id), ['uuid-route', 'other']);
});

test('authored work works without a production database and teasers retain scoped impact', async () => {
  let calls = 0;
  const work = workModule({ env: { NODE_ENV: 'production' }, db: async () => { calls += 1; throw new Error('Should not query'); } });
  assert.equal((await work.loadPublishedWork()).length, 0);
  const featured = await work.featuredWork(2);
  assert.deepEqual(Array.from(featured, item => item.href), ['/product/company-two', '/product/company-one']);
  assert.equal(featured[0].outcome, study.executiveBrief.impact);
  assert.equal(featured[0].workType, 'delivered');
  assert.equal(calls, 0);
});

test('optional publishing database failure leaves authored work available', async () => {
  const work = workModule({ env: { POSTGRES_URL: 'configured' }, db: async () => { throw new Error('Database unavailable'); } });
  assert.equal((await work.loadPublishedWork()).length, 0);
  assert.equal(work.findCaseStudy('company-one').title, study.title);
});

test('case study shows original media first, three open decisions and consolidated supporting context', () => {
  const Component = caseRenderer();
  const html = renderToStaticMarkup(createElement(Component, { study: { ...study, primaryMediaIds: ['screen'] } }));
  assert.match(html, /<h1>A simpler lending journey<\/h1>/);
  assert.ok(html.indexOf('src="/work/screen.webp"') < html.indexOf('id="full-case-study"'));
  assert.ok(html.includes(study.executiveBrief.remit));
  assert.match(html, /<section id="full-case-study"[^>]+data-case-section="true"/);
  assert.doesNotMatch(html, /<details|<summary/);
  assert.ok(html.includes(study.sourceNotes[0]));
  assert.match(html, /A complete narrative paragraph\./);
  assert.match(html, /id="story-operating-model"/);
  assert.match(html, /id="story-build"/);
  assert.match(html, /id="downloads"/);
  assert.match(html, /Project note · Pages 2–3 · 2024 · Initial proposal/);
  assert.match(html.replace(/<\/?span[^>]*>/g, ''), /<caption>Decision comparison<\/caption>/);
  assert.match(html, /<th scope="col">Option<\/th>/);
  assert.match(html, /<td>Requires lender rules<\/td>/);
  assert.match(html, /aria-label="In this case study"/);
  assert.match(html, /Results and scope/);
  assert.match(html, /Read case study/);
  assert.doesNotMatch(html, /<a[^>]+(?:download=|href="\/work\/)/);
  assert.doesNotMatch(html, /Downloads|Download this case study|Read more|Reference context/);
  assert.equal((html.match(/<h1>/g) || []).length, 1);
});

test('source references remain readable, deduplicated HTTPS links beside original context', () => {
  const linkedStudy = {
    ...study,
    presentation: {
      decisionBeats: [{ id: 'operation', title: 'Operating decisions', sectionIds: ['operating-model'] }],
      supportingGroups: [{ id: 'references', title: 'Official reference context', sectionIds: ['record', 'additional-record'] }],
    },
    sections: [
      ...study.sections.map(section => section.id === 'record' ? {
        ...section,
        source: { ...section.source, links: [{ label: ' RBI lending framework ', href: 'https://www.rbi.org.in/example' }] },
      } : section),
      { id: 'additional-record', title: 'Protocol reference', body: ['A separate protocol boundary remains visible.'], source: { label: 'Protocol documentation', links: [
        { label: 'Duplicate RBI reference', href: ' https://www.rbi.org.in/example ' },
        { label: 'MCP tool documentation', href: 'https://modelcontextprotocol.io/specification/tools' },
      ] } },
    ],
  };
  const Component = caseRenderer();
  const html = renderToStaticMarkup(createElement(Component, { study: linkedStudy }));
  assert.match(html, /Project note · Pages 2–3 · 2024 · Initial proposal/);
  assert.match(html, /Protocol documentation/);
  assert.match(html, /<ul[^>]+aria-label="External source references"/);
  assert.match(html, /<a href="https:\/\/www\.rbi\.org\.in\/example" target="_blank" rel="noopener noreferrer">RBI lending framework/);
  assert.match(html, /<a href="https:\/\/modelcontextprotocol\.io\/specification\/tools" target="_blank" rel="noopener noreferrer">MCP tool documentation/);
  assert.match(html, /<span class="sr-only"> \(opens in a new tab\)<\/span>/);
  assert.equal((html.match(/href="https:\/\/www\.rbi\.org\.in\/example"/g) || []).length, 1);
  assert.doesNotMatch(html, /Duplicate RBI reference|<p[^>]*>https:\/\//);
  for (const id of ['story-record', 'heading-record', 'story-additional-record', 'heading-additional-record', 'story-build']) assert.ok(html.includes(`id="${id}"`));
  const work = workModule({ registry: { companies: [company], caseStudies: [linkedStudy] } });
  assert.equal(work.findCaseStudy(linkedStudy.slug).sections[2].source.links, linkedStudy.sections[2].source.links);
});

test('unsafe or unlabelled source URLs are omitted while situation and result references stay accessible', () => {
  const linkedStudy = {
    ...study,
    sections: [
      { ...study.sections[0], source: { label: 'Situation reference', links: [{ label: 'Official situation context', href: 'https://example.org/situation' }] } },
      ...study.sections.slice(1),
      { id: 'results', title: 'Results', body: ['An independently qualified result.'], source: { label: 'Results record', links: [
        { label: 'Official measurement context', href: 'https://example.org/results' },
        { label: 'Unsafe javascript reference', href: 'javascript:alert(1)' },
        { label: 'Insecure HTTP reference', href: 'http://example.org/insecure' },
        { label: 'Relative protocol reference', href: '//example.org/relative' },
        { label: 'Malformed reference', href: 'not a URL' },
        { label: 'Credential-bearing reference', href: 'https://user:secret@example.org/private' },
        { label: 'Unsafe data reference', href: 'data:text/html,example' },
        { label: '   ', href: 'https://example.org/unlabelled' },
        null,
      ] } },
    ],
  };
  const html = renderToStaticMarkup(createElement(caseRenderer(), { study: linkedStudy }));
  assert.match(html, /Situation reference/);
  assert.match(html, /Results record/);
  assert.match(html, /href="https:\/\/example\.org\/situation"/);
  assert.match(html, /href="https:\/\/example\.org\/results"/);
  assert.doesNotMatch(html, /Unsafe javascript|Insecure HTTP|Relative protocol|Malformed reference|Credential-bearing|Unsafe data|https:\/\/example\.org\/unlabelled|javascript:|data:text\/html|user:secret/);
  assert.ok(html.includes('An independently qualified result.'));
  assert.ok(html.includes('id="story-results"'));
});

test('supporting diagrams lead their open chapter before prose and technical tables', () => {
  const Component = caseRenderer();
  const reference = { id: 'contract-diagram', kind: 'image', category: 'diagram', src: '/work/contract-diagram.svg', alt: 'Illustrative contract boundary', width: 1440, height: 760, caption: 'Authored reference design; implementation unverified.', provenance: { kind: 'authored', label: 'Reference explanation' } };
  const withReference = { ...study, primaryMediaIds: ['screen'], media: [...study.media, reference], sections: study.sections.map(section => section.id === 'record' ? { ...section, mediaIds: ['contract-diagram'] } : section) };
  const html = renderToStaticMarkup(createElement(Component, { study: withReference }));
  const chapter = html.slice(html.indexOf('id="chapter-record"'));
  const diagramAt = chapter.indexOf('src="/work/contract-diagram.svg"');
  const paragraphAt = chapter.indexOf('<p>This record describes the original scope.</p>');
  const tableAt = chapter.indexOf('<table>');
  assert.ok(diagramAt >= 0 && diagramAt < paragraphAt && paragraphAt < tableAt);
  assert.match(chapter, /Authored reference design; implementation unverified\./);
  assert.doesNotMatch(html, /<details\b|<summary\b/);
});

test('media stays inline with accessible image enlargement, provenance and no separate video action', () => {
  const Component = caseRenderer();
  const html = renderToStaticMarkup(createElement(Component, { study }));
  assert.match(html, /<button[^>]+aria-haspopup="dialog"[^>]+aria-label="Enlarge image: The application flow"/);
  assert.match(html, /<dialog[^>]+aria-labelledby=/);
  assert.match(html, /<img[^>]+alt="The application flow"/);
  assert.match(html, /Original product capture · 2024/);
  assert.match(html, /<video[^>]+controls=""[^>]+controlsList="nodownload"[^>]+playsinline=""[^>]+preload="none"/);
  assert.match(html, /<track[^>]+kind="captions"/);
  assert.match(html, /A description of the walkthrough\./);
  assert.match(html, /Walkthrough description/);
  assert.doesNotMatch(html, /<details|<summary/);
  assert.doesNotMatch(html, /<a[^>]+href="\/work\/(?:screen.webp|demo.mp4)"/);
  assert.doesNotMatch(html, /target="_blank"/);
});

test('proposal cases distinguish their evidence from delivered outcomes and legacy data renders safely', () => {
  const Component = caseRenderer();
  const proposal = renderToStaticMarkup(createElement(Component, { study: { ...study, workType: 'proposal' } }));
  assert.match(proposal, /The proposed product approach/);
  assert.match(proposal, /Proposed approach and validation/);
  assert.doesNotMatch(proposal, /Results and scope/);
  const exercise = renderToStaticMarkup(createElement(Component, { study: { ...study, workType: 'independent' } }));
  assert.match(exercise, /The proposed product approach/);
  assert.match(exercise, /Proposed approach and validation/);
  const legacy = { ...study };
  delete legacy.workType;
  delete legacy.executiveBrief;
  delete legacy.visualSummary;
  assert.doesNotThrow(() => renderToStaticMarkup(createElement(Component, { study: legacy })));
  assert.match(renderToStaticMarkup(createElement(Component, { study: legacy })), /<h1>A product story<\/h1>/);
});

function visualRenderer() {
  return load('components/work/VisualStory.tsx', { './visual-story.module.css': css });
}

test('comparison charts use a zero baseline, fixed percent scale and explicit same-unit values', () => {
  const { Chart } = visualRenderer();
  const percent = renderToStaticMarkup(createElement(Chart, { chart: study.visualSummary.charts[0] }));
  assert.match(percent, /width:16%/);
  assert.match(percent, /width:45%/);
  assert.match(percent, /<strong>16%<\/strong>/);
  assert.match(percent, /<strong>45%<\/strong>/);
  assert.ok(percent.includes(study.visualSummary.charts[0].note));
  const hours = renderToStaticMarkup(createElement(Chart, { chart: { id: 'effort', title: 'Processing effort', kind: 'comparison', unit: 'hours', values: [{ label: 'Earlier', value: 9 }, { label: 'Later', value: 4 }], note: 'Programme-level processing, not an OCR benchmark.' } }));
  assert.match(hours, /width:100%/);
  assert.match(hours, /width:44\.444/);
  assert.match(hours, /9 hours/);
  assert.match(hours, /4 hours/);
  assert.match(hours, /not an OCR benchmark/);
});

test('donuts render only explicit percent partitions and retain their implied-remainder qualification', () => {
  const { Chart } = visualRenderer();
  const chart = { id: 'share', title: 'Application share', kind: 'donut', unit: '%', values: [{ label: 'Application', value: 40 }, { label: 'Remainder (implied)', value: 60 }], note: 'The remainder is implied, not separately measured.' };
  const html = renderToStaticMarkup(createElement(Chart, { chart }));
  assert.match(html, /<svg[^>]+aria-hidden="true"/);
  assert.match(html, /stroke-dasharray="40 60"/);
  assert.match(html, /stroke-dasharray="60 40"/);
  assert.match(html, /stroke-dashoffset="-40"/);
  assert.match(html, /Remainder \(implied\)/);
  assert.match(html, /not separately measured/);
  for (const invalid of [{ ...chart, values: [{ label: 'Retention lift', value: 40 }] }, { ...chart, unit: 'users' }, { ...chart, values: [{ label: 'One', value: -40 }, { label: 'Other', value: 140 }] }]) {
    assert.doesNotMatch(renderToStaticMarkup(createElement(Chart, { chart: invalid })), /<circle|<svg/);
  }
});

test('chart safety handles nonfinite values and negative comparisons without invalid geometry', () => {
  const { Chart, formatChartValue } = visualRenderer();
  const chart = { id: 'safe', title: 'A measure', kind: 'comparison', unit: '%', values: [{ label: 'Change', value: -5 }, { label: 'Later', value: 20 }], note: 'A signed change rather than a share.' };
  const negative = renderToStaticMarkup(createElement(Chart, { chart }));
  assert.match(negative, /-5%/);
  assert.doesNotMatch(negative, /class="barTrack"|width:-/);
  const nonfinite = renderToStaticMarkup(createElement(Chart, { chart: { ...chart, values: [{ label: 'Invalid', value: NaN }, { label: 'Invalid too', value: Infinity }] } }));
  assert.equal(nonfinite, '');
  const mixed = renderToStaticMarkup(createElement(Chart, { chart: { ...chart, values: [{ label: 'Missing', value: NaN }, { label: 'Valid', value: 20 }] } }));
  assert.doesNotMatch(mixed, /NaN|Infinity|width:undefined/);
  assert.doesNotMatch(mixed, /class="barTrack"/);
  assert.match(mixed, /20%/);
  assert.equal(formatChartValue(100000000, 'USD'), '$100,000,000');
});

test('visual workflows stay semantic and compact previews retain the representative chart note', () => {
  const { VisualStory } = visualRenderer();
  const full = renderToStaticMarkup(createElement(VisualStory, { summary: study.visualSummary }));
  const compact = renderToStaticMarkup(createElement(VisualStory, { summary: study.visualSummary, compact: true }));
  for (const html of [full, compact]) {
    assert.match(html, /<ol>/);
    for (const step of study.visualSummary.workflow.steps) assert.ok(html.includes(step.title));
    assert.ok(html.includes(study.visualSummary.workflow.note));
    assert.ok(html.includes(study.visualSummary.charts[0].note));
  }
  assert.match(full, /Lender eligibility rules/);
  assert.doesNotMatch(compact, /Lender eligibility rules|The challenge|My decision/);
  assert.match(full, /Eligible customers were reaching unsuitable lenders\./);
});

test('former downloads fragments resolve once, whether the case has a reference chapter or an evidence gallery', () => {
  const Component = caseRenderer();
  const explicitAlias = { ...study, sections: study.sections.map(section => section.id === 'operating-model' ? { ...section, anchorAliases: ['story-build', 'downloads'] } : section) };
  const explicitHtml = renderToStaticMarkup(createElement(Component, { study: explicitAlias }));
  assert.equal((explicitHtml.match(/id="downloads"/g) || []).length, 1);
  const gallery = { ...study, sections: [{ id: 'problem', title: 'The problem', body: ['The main narrative.'] }] };
  const galleryHtml = renderToStaticMarkup(createElement(Component, { study: gallery }));
  assert.match(galleryHtml, /<section id="evidence"/);
  assert.equal((galleryHtml.match(/id="downloads"/g) || []).length, 1);
});

test('deep links and old fragment aliases open their owning chapters and move focus safely', () => {
  const { revealCaseStudyAnchor } = load('components/work/anchors.ts');
  const nodes = new Map();
  let focused;
  let scrolled;
  function node(id, tagName, parentElement, chapter = false) {
    const element = {
      id, tagName, parentElement, chapter, open: false,
      ownerDocument: { getElementById: key => nodes.get(key) || null },
      contains(target) { for (let cursor = target; cursor; cursor = cursor.parentElement) if (cursor === this) return true; return false; },
      closest() { for (let cursor = this; cursor; cursor = cursor.parentElement) if (cursor.chapter) return cursor; return null; },
      querySelector() { return this.heading || null; },
      scrollIntoView() { scrolled = this.id; }, focus() { focused = this.id; },
    };
    nodes.set(id, element);
    return element;
  }
  const rootElement = node('case', 'ARTICLE', null);
  const outer = node('full-case-study', 'DETAILS', rootElement, true);
  const inner = node('story-reference', 'DETAILS', outer, true);
  inner.heading = node('reference-summary', 'SUMMARY', inner);
  node('story-old-reference', 'SPAN', inner);
  node('outside', 'SECTION', null);
  assert.equal(revealCaseStudyAnchor('#story-old-reference', rootElement), true);
  assert.equal(outer.open, true);
  assert.equal(inner.open, true);
  assert.equal(scrolled, 'story-reference');
  assert.equal(focused, 'reference-summary');
  assert.equal(revealCaseStudyAnchor('#story-reference', rootElement), true);
  assert.equal(revealCaseStudyAnchor('#outside', rootElement), false);
  assert.equal(revealCaseStudyAnchor('#missing', rootElement), false);
  assert.equal(revealCaseStudyAnchor('#%E0%A4', rootElement), false);
  assert.equal(revealCaseStudyAnchor('#', rootElement), false);
});

function routeModule(work, db, env = {}) {
  const empty = () => null;
  return load('app/[category]/[id]/page.tsx', {
    '@/lib/work': work, '@/lib/db': { publicDb: db }, '@/lib/content': { contentExcerpt: value => value || '' },
    'next/navigation': { notFound() { throw new Error('Not found'); }, permanentRedirect(url) { throw new Error(`Redirect: ${url}`); } },
    '@/components/Header': empty, '@/components/Footer': empty, '@/components/PublicShell': empty,
    '@/components/MarkdownContent': empty, '@/components/work/CaseStudy': empty, '@/components/work/Media': empty,
  }, env);
}

test('legacy product UUID and unregistered slug routes retain a published-only lookup', async () => {
  let query;
  const route = routeModule({ findCaseStudy: () => undefined, findWorkCompany: () => undefined, isRetiredWorkSlug: () => false }, async (strings, ...values) => {
    query = { sql: strings.join('?'), values };
    return { rows: [{ id: 'legacy-id', title: 'Legacy story', summary: 'Published entry', body_markdown: null, created_at: '2024-01-01', media: [] }] };
  }, { POSTGRES_URL: 'configured' });
  for (const id of ['a1aa8888-4444-4444-8888-aaaaaaaaaaaa', 'legacy-story']) {
    await route.default({ params: { category: 'product', id } });
    assert.match(query.sql, /ci\.status = 'published'/);
    assert.match(query.sql, /ci\.id::text = \? OR ci\.slug = \?/);
    assert.deepEqual(Array.from(query.values), ['work', id, id]);
  }
});

test('curated detail routes bypass the database, publish metadata, redirect old aliases and block retired studies', async () => {
  let calls = 0;
  const route = routeModule(workModule(), async () => { calls += 1; throw new Error('Should not query'); });
  assert.ok(await route.default({ params: { category: 'product', id: 'company-one' } }));
  assert.equal(calls, 0);
  const metadata = await route.generateMetadata({ params: { category: 'product', id: 'company-one' } });
  assert.equal(metadata.description, study.visualSummary.summary);
  assert.equal(metadata.alternates.canonical, '/product/company-one');
  await assert.rejects(route.default({ params: { category: 'product', id: 'older-slug' } }), /Redirect: \/product\/company-one/);
  await assert.rejects(route.default({ params: { category: 'product', id: 'draft' } }), /Not found/);
  const retiredRoute = routeModule(workModule(), async () => { calls += 1; throw new Error('Should not query'); }, { POSTGRES_URL: 'configured' });
  for (const id of ['independent-moneylion-wow-strategy', 'moneylion-wow-strategy']) {
    await assert.rejects(retiredRoute.default({ params: { category: 'product', id } }), /Not found/);
    assert.equal(Object.keys(await retiredRoute.generateMetadata({ params: { category: 'product', id } })).length, 0);
  }
  assert.equal(calls, 0);
});

const expectedSlugs = [
  'cashkaro-personal-loan-marketplace', 'cashkaro-college-money-education-loans', 'cashkaro-eduloans-policy-workflow', 'cashkaro-lender-integration-operations', 'cashkaro-lending-mcp-feedback',
  'credflow-kuberx-launch', 'credflow-pay-via-credit-card', 'absolute-silkroute-marketplace', 'absolute-trade-payments-erp', 'absolute-rural-credit-uli', 'absolute-ondc-credit-infrastructure',
  'absolute-upaj-farmer-experience', 'absolute-farm-os-iot-gis', 'absolute-crop-health-ai', 'absolute-rainfall-grid-insurance', 'absolute-upaj-international', 'absolute-agri-input-institutional-commerce',
  'absolute-supporting-portfolio', 'urbankhet-farm-to-fork', 'urbankhet-covid-pivot', 'urbankhet-incubation-funding', 'water-farmers-aquaponics', 'gujarat-action-group-covid-resource-database',
  'independent-founder-advisory', 'cept-football-creative-practice',
];
const expectedAliases = [
  'personal-loan-marketplace', 'college-money-education-loans', 'eduloans-policy-workflow', 'lender-integration-operations', 'lending-mcp-feedback', 'kuberx-launch', 'pay-via-credit-card',
  'silkroute-marketplace', 'trade-payments-erp', 'rural-credit-uli', 'ondc-credit-infrastructure', 'upaj-farmer-experience', 'farm-os-iot-gis', 'crop-health-ai', 'rainfall-grid-insurance',
  'upaj-international', 'agri-input-institutional-commerce', 'covid-resource-database', 'founder-advisory', 'football-creative-practice',
];

test('registry preserves all 25 retained routes, nine reference videos, the original storefront excerpt and seventeen authored diagrams', () => {
  const data = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
  const work = workModule({ registry: data });
  assert.deepEqual(data.caseStudies.map(item => item.slug).sort(), [...expectedSlugs].sort());
  for (const alias of expectedAliases) assert.ok(work.findCaseStudy(alias), `Missing legacy alias: ${alias}`);
  const videos = new Set(data.caseStudies.flatMap(item => item.media).filter(media => media.kind === 'video').map(media => media.src));
  assert.equal(videos.size, 10);
  assert.equal(Array.from(videos).filter(src => !src.startsWith('/work/urbankhet/video/')).length, 9);
  assert.equal(new Set(data.caseStudies.flatMap(item => item.media).filter(media => media.src.startsWith('/work/workflows/')).map(media => media.src)).size, 17);
});

test('published registry validates briefs, accessible chapter sources and every hosted media asset', () => {
  const data = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
  const types = load('lib/work-types.ts');
  const companyIds = new Set(data.companies.map(item => item.id));
  assert.equal(companyIds.size, data.companies.length);
  const routes = new Set();
  for (const item of data.caseStudies) {
    assert.ok(companyIds.has(item.companyId), `${item.slug}: unknown company`);
    for (const field of ['id', 'title', 'summary', 'role', 'period']) assert.ok(typeof item[field] === 'string' && item[field].trim(), `${item.slug}: missing ${field}`);
    assert.ok(Object.hasOwn(types.workTypeLabels, item.workType), `${item.slug}: invalid work type`);
    for (const field of ['challenge', 'remit', 'decision', 'impact']) assert.ok(typeof item.executiveBrief?.[field] === 'string' && item.executiveBrief[field].trim(), `${item.slug}: missing brief ${field}`);
    for (const field of ['title', 'summary', 'challenge', 'role', 'decision', 'impact']) assert.ok(typeof item.visualSummary?.[field] === 'string' && item.visualSummary[field].trim(), `${item.slug}: missing visual ${field}`);
    const workflow = item.visualSummary.workflow;
    assert.ok(workflow.label?.trim() && workflow.note?.trim(), `${item.slug}: workflow needs context`);
    assert.ok(workflow.steps.length >= 3 && workflow.steps.length <= 5, `${item.slug}: workflow should have 3–5 supported stages`);
    assert.ok(workflow.steps.every(step => step.title?.trim()), `${item.slug}: unnamed workflow stage`);
    const chartIds = new Set();
    for (const chart of item.visualSummary.charts || []) {
      assert.ok(!chartIds.has(chart.id), `${item.slug}: duplicate chart ID`);
      chartIds.add(chart.id);
      assert.ok(chart.title?.trim() && chart.note?.trim(), `${item.slug}: chart needs a title and qualification`);
      assert.ok(['comparison', 'donut', 'metric'].includes(chart.kind), `${item.slug}: unsupported chart kind`);
      assert.ok(chart.values.length > 0 && chart.values.every(value => value.label?.trim() && Number.isFinite(value.value)), `${item.slug}: invalid chart values`);
      if (chart.kind === 'comparison') assert.ok(chart.unit?.trim() && chart.values.length >= 2 && chart.values.every(value => value.value >= 0), `${item.slug}: comparison must share a unit and zero baseline`);
      if (chart.kind === 'donut') {
        assert.equal(chart.unit, '%', `${item.slug}: donut needs percentage shares`);
        assert.ok(chart.values.length > 1 && chart.values.every(value => value.value >= 0 && value.value <= 100), `${item.slug}: invalid donut partition`);
        assert.ok(Math.abs(chart.values.reduce((sum, value) => sum + value.value, 0) - 100) < .01, `${item.slug}: explicit donut shares must total 100`);
        if (chart.values.some(value => /implied/i.test(value.label))) assert.match(chart.note, /implied|computed|not separately measured/i, `${item.slug}: remainder needs qualification`);
      }
    }
    assert.equal(Object.hasOwn(item, 'downloads'), false, `${item.slug}: obsolete downloads model`);
    for (const route of [item.slug, ...(item.aliases || [])]) {
      assert.match(route, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(!routes.has(route), `Duplicate route: ${route}`);
      routes.add(route);
    }
    if (item.status === 'draft') continue;
    assert.ok(item.sections.length > 0, `${item.slug}: missing story`);
    const fragments = new Set(['brief-title', 'outcomes-title', 'evidence', 'materials-title', `case-${item.id}`]);
    for (const section of item.sections) {
      assert.match(section.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      for (const fragment of [`story-${section.id}`, `heading-${section.id}`, ...(section.anchorAliases || [])]) {
        assert.ok(!fragments.has(fragment), `${item.slug}: duplicate fragment ${fragment}`);
        fragments.add(fragment);
      }
      assert.ok(!section.group || ['story', 'detail', 'reference'].includes(section.group), `${item.slug}: invalid chapter group`);
      assert.ok(section.title && (section.body.length > 0 || section.tables?.length || section.mediaIds?.length), `${item.slug}: empty section ${section.id}`);
      assert.ok(section.body.every(paragraph => typeof paragraph === 'string' && paragraph.trim()), `${item.slug}: empty paragraph`);
      if (section.source) assert.ok(section.source.label?.trim(), `${item.slug}: source missing label`);
      for (const table of section.tables || []) {
        assert.ok(table.caption?.trim() && table.headers.length > 0, `${item.slug}: table missing description or headers`);
        assert.ok(table.rows.every(row => row.length === table.headers.length), `${item.slug}: table column mismatch`);
      }
    }
    const mediaIds = new Set(item.media.map(media => media.id));
    assert.equal(mediaIds.size, item.media.length, `${item.slug}: duplicate media ID`);
    for (const id of [item.heroMediaId, ...item.sections.flatMap(section => section.mediaIds || [])].filter(Boolean)) assert.ok(mediaIds.has(id), `${item.slug}: unknown media ${id}`);
    for (const media of item.media) {
      assert.ok(['image', 'video'].includes(media.kind), `${item.slug}: invalid media kind`);
      assert.ok(media.kind === 'image' ? media.alt : media.title, `${item.slug}: unnamed media`);
      assert.ok(media.caption, `${item.slug}: media missing context`);
      if (media.provenance) assert.ok(['historical', 'current-public', 'authored', 'proposal', 'prototype'].includes(media.provenance.kind) && media.provenance.label?.trim(), `${item.slug}: invalid provenance`);
    }
    for (const relatedSlug of item.relatedSlugs || []) assert.ok(data.caseStudies.some(other => other.slug === relatedSlug && other.status !== 'draft'), `${item.slug}: unknown related case ${relatedSlug}`);
    const assets = [...item.media.map(media => media.src), ...item.media.map(media => media.poster).filter(Boolean), ...item.media.flatMap(media => (media.captions || []).map(track => track.src))];
    for (const url of assets) {
      assert.match(url, /^(\/(?!\/)|https:\/\/)/, `Unsupported asset URL: ${url}`);
      if (!url.startsWith('/')) continue;
      const assetPath = path.resolve(root, 'public', `.${decodeURIComponent(url)}`);
      assert.ok(assetPath.startsWith(path.join(root, 'public') + path.sep), `Invalid path: ${url}`);
      assert.ok(existsSync(assetPath), `Missing asset: ${url}`);
      assert.ok(statSync(assetPath).size > 0, `Empty asset: ${url}`);
    }
  }
});

test('every published case is open, preserves substance and mapped anchors, and deduplicates media', () => {
  const data = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
  const Component = caseRenderer(data);
  const escaped = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;');
  for (const item of data.caseStudies.filter(study => study.status !== 'draft')) {
    const html = renderToStaticMarkup(createElement(Component, { study: item }));
    assert.match(html, /<section id="full-case-study"[^>]+data-case-section="true"/);
    assert.doesNotMatch(html, /<details|<summary/, `${item.slug}: public content hidden`);
    assert.doesNotMatch(html, /Read more|Show more/);
    assert.match(html, /id="downloads"/);
    assert.equal((html.match(/id="downloads"/g) || []).length, 1);
    assert.doesNotMatch(html, /<a[^>]+(?:download=|href="[^"#]*\.(?:pdf|zip|docx?|pptx?|mp4|webm|webp|png|jpe?g|svg)(?:[?"#]))/i);
    for (const chart of item.visualSummary.charts || []) assert.ok(html.includes(escaped(chart.note)), `${item.slug}: chart qualification omitted`);
    for (const media of item.media) {
      assert.ok(html.includes(`src="${media.src}"`), `${item.slug}: media omitted ${media.id}`);
      assert.equal(html.split(`src="${media.src}"`).length - 1, 1, `${item.slug}: duplicated media ${media.id}`);
    }
    for (const section of item.sections) {
      for (const id of [`story-${section.id}`, `heading-${section.id}`, ...(section.anchorAliases || [])]) assert.ok(html.includes(`id="${id}"`), `${item.slug}: anchor omitted ${id}`);
      const editedGroup = [...item.presentation.decisionBeats,...item.presentation.supportingGroups].find(group => group.body && group.sectionIds.includes(section.id));
      for (const paragraph of editedGroup ? editedGroup.body : section.body) assert.ok(html.includes(escaped(paragraph)), `${item.slug}: account omitted in ${section.id}`);
      for (const bullet of section.bullets || []) assert.ok(html.includes(escaped(bullet)), `${item.slug}: bullet omitted in ${section.id}`);
      for (const table of section.tables || []) {
        assert.ok(html.replace(/<\/?span[^>]*>/g, '').includes(`<caption>${escaped(table.caption)}</caption>`), `${item.slug}: table omitted`);
        for (const row of table.rows) for (const cell of row) assert.ok(html.includes(escaped(cell)), `${item.slug}: table evidence omitted`);
      }
    }
    const presentation = item.presentation;
    assert.equal(presentation.decisionBeats.length, 3);
    const mapped = new Set(['problem','results',...presentation.decisionBeats.flatMap(group => group.sectionIds),...presentation.supportingGroups.flatMap(group => group.sectionIds)]);
    for (const section of item.sections) assert.ok(mapped.has(section.id), `${item.slug}: unmapped section`);
  }
});

test('ranked featured stories and explicit primary media preserve intentional ordering', () => {
  const { featuredCaseStudies, getPrimaryMedia, mediaGroupTitle } = load('lib/work-presentation.ts');
  const data = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
  assert.deepEqual(Array.from(featuredCaseStudies(data.caseStudies), item => item.slug), ['cashkaro-eduloans-policy-workflow','absolute-crop-health-ai','cashkaro-lending-mcp-feedback','cashkaro-college-money-education-loans','absolute-silkroute-marketplace','urbankhet-farm-to-fork']);
  assert.equal(featuredCaseStudies([{featuredOrder:undefined},{featuredOrder:0},{featuredOrder:NaN}]).length,0);
  const edu = data.caseStudies.find(item => item.id === 'eduloans-policy-workflow');
  assert.deepEqual(Array.from(getPrimaryMedia(edu), media => media.id), ['eduloans-prototype-inspector','eduloans-prototype-student','eduloans-prototype-partner','eduloans-prototype-kam']);
  assert.ok(getPrimaryMedia(edu).every(media => media.category === 'prototype-screenshot' && media.provenance.kind === 'prototype'));
  assert.equal(mediaGroupTitle(getPrimaryMedia(edu)[0]), 'Original interaction prototype');
  assert.equal(getPrimaryMedia({...study,primaryMediaIds:['missing'],heroMediaId:'screen'})[0].id,'screen');
  assert.equal(getPrimaryMedia({...study,media:[]}).length,0);
  const urban = data.caseStudies.find(item => item.id === 'urbankhet-farm-to-fork');
  assert.deepEqual(Array.from(getPrimaryMedia(urban), media => media.id), ['urbankhet-linkedin-company-farm-cover', 'urbankhet-storefront-excerpt']);
  assert.equal(getPrimaryMedia(urban)[0].category, 'photograph');
  assert.equal(mediaGroupTitle(getPrimaryMedia(urban)[0]), 'Company photograph');
  assert.equal(getPrimaryMedia(urban)[0].provenance.sourceUrl, 'https://www.linkedin.com/company/khet-inc/');
  assert.equal(getPrimaryMedia(urban)[1].provenance.kind, 'historical');
  const urbanCovid = data.caseStudies.find(item => item.id === 'urbankhet-covid-pivot');
  assert.equal(getPrimaryMedia(urbanCovid)[0].id, 'urbankhet-linkedin-sorted-packs');
  assert.equal(getPrimaryMedia(urbanCovid)[0].provenance.sourceUrl, 'https://www.linkedin.com/feed/update/urn:li:activity:6654457549527584768/');
  const mcp = data.caseStudies.find(item => item.id === 'lending-mcp-feedback');
  assert.equal(getPrimaryMedia(mcp)[0].id, 'lending-mcp-proposal');
  assert.equal(getPrimaryMedia(mcp)[0].provenance.kind, 'proposal');
});

test('every primary asset is visible before the main account with accurate screenshot categories', () => {
  const data = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
  const Component = caseRenderer(data);
  const { getPrimaryMedia } = load('lib/work-presentation.ts');
  for (const item of data.caseStudies) {
    const html = renderToStaticMarkup(createElement(Component, { study: item }));
    const main = html.indexOf('id="full-case-study"');
    for (const asset of getPrimaryMedia(item)) assert.ok(html.indexOf(`src="${asset.src}"`) < main, `${item.slug}: primary evidence postponed`);
    const primary = html.slice(html.indexOf('id="product-reference"'), main);
    assert.doesNotMatch(primary, /<details|\shidden(?:=|[\s>])|aria-hidden="true"[^>]*>\s*<(?:img|video)/);
    if (/<h[1-6][^>]*>[^<]*screenshots?/i.test(html)) assert.ok(item.media.some(asset => ['product-screenshot','prototype-screenshot'].includes(asset.category)), `${item.slug}: screenshot heading without screenshots`);
  }
});

test('AI validation plans remain proposed while archived software checks retain their precise limits', () => {
  const data = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
  const Component = caseRenderer(data);
  for (const id of ['eduloans-policy-workflow','crop-health-ai','lending-mcp-feedback']) {
    const item = data.caseStudies.find(item => item.id === id);
    const section = item.sections.find(section => section.id === 'evaluation-plan');
    const html = renderToStaticMarkup(createElement(Component, { study: item }));
    assert.ok(html.includes('Proposed evaluation plan — no measured results claimed'));
    for (const table of section.tables) {
      assert.deepEqual(table.headers, ['Scenario','Expected behaviour','Available evidence','Status']);
      assert.ok(table.rows.length >= 5);
      assert.ok(table.rows.every(row => row[3] === 'Proposed — not executed'));
      assert.ok(table.rows.every(row => row[2].startsWith('Existing:') && row[2].includes('Proposed:')), `${id}: available and proposed evidence must remain distinct`);
      for (const header of table.headers) assert.ok(html.includes(`<th scope="col">${header}</th>`));
    }
    assert.match(html, /Proposed — not executed/);
    assert.match(html, /not executed results/);
  }
  const edu = data.caseStudies.find(item => item.id === 'eduloans-policy-workflow');
  const html = renderToStaticMarkup(createElement(Component, { study: edu }));
  assert.match(html, /Archived unit and regression validation — March 2026/);
  for (const text of ['145 passing assertions across ten files','5 March 2026 at 06:51 UTC','not a fresh verification or a model-quality score','not independently rerun','Admin smoke tests mock Supabase','Local test helpers; not the deployed edge function','No labelled-document model evaluation','thirteen-step counter']) assert.ok(html.includes(text), `Archived validation limit omitted: ${text}`);
  const expectedScenarios = {
    'eduloans-policy-workflow': ['Missing lender thresholds','Verification bypass','Deterministic repeatability','Score boundaries','Uncertain documents'],
    'lending-mcp-feedback': ['Tool selection','Arguments and schema versions','Malformed or unauthorised requests','Failure handling','Unapproved policy changes'],
    'crop-health-ai': ['Representative labelled images','Crop coverage','Poor image quality','Expert agreement','Uncertainty handling'],
  };
  for (const [id, scenarios] of Object.entries(expectedScenarios)) {
    const item = data.caseStudies.find(item => item.id === id);
    const section = item.sections.find(section => section.id === 'evaluation-plan');
    const scenarioNames = section.tables.flatMap(table => table.rows.map(row => row[0]));
    for (const scenario of scenarios) assert.ok(scenarioNames.includes(scenario), `${id}: missing concrete scenario ${scenario}`);
  }
});

test('compact shared media omits long descriptions without hiding controls or provenance', () => {
  const Media = load('components/work/Media.tsx', { './work.module.css': css }).default;
  const html = renderToStaticMarkup(createElement(Media, {media:study.media[1],compact:true}));
  assert.match(html, /<video/);
  assert.match(html, /A recorded walkthrough/);
  assert.doesNotMatch(html, /A description of the walkthrough|<details|<summary/);
});
