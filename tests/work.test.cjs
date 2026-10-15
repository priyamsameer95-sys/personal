const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync, statSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
const ts = require('typescript');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const EmailContact = require('./helpers/email-contact.cjs');
const Icon = require('./helpers/icon.cjs');

const root = path.join(__dirname, '..');
const escaped=text=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
const css = new Proxy({}, { get: (_, name) => name === '__esModule' ? false : String(name) });
const company = { id: 'company', name: 'A company', period: '2023–2025', role: 'Product manager', summary: 'A product team.', order: 1, relationship: 'Employer' };
const study = {
  id: 'one', slug: 'company-one', aliases: ['older-slug'], companyId: company.id,
  title: 'A product story', summary: 'An evidence-based summary.', role: 'Product manager', period: '2024', order: 1,
  workType: 'delivered',
  primaryMediaIds: ['screen'],
  presentation: { decisionBeats: [{ id: 'operation', title: 'The meaningful operating decision', sectionIds: ['operating-model'], body: ['A concise decision account explaining what to inspect.'], mainMediaIds: ['demo'] }], supportingGroups: [{ id: 'record', title: 'Detailed source record', sectionIds: ['record'] }] },
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
    module: moduleContext, exports: moduleContext.exports, URL,
    require: id => Object.prototype.hasOwnProperty.call(stubs, id) ? stubs[id] : id === '@/components/EmailContact' ? EmailContact : id === '@/components/Icon' ? Icon : id === '@/lib/product-links' ? load('lib/product-links.ts') : require(id),
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

function caseRenderer(registry = fixture, references = false, observeNavigation) {
  const media = load('components/work/Media.tsx', { './work.module.css': css }).default;
  const navigation = load('components/work/CaseStudyNavigation.tsx', {
    './work.module.css': css, './anchors': load('components/work/anchors.ts'),
  });
  const visual = load('components/work/VisualStory.tsx', { './visual-story.module.css': css });
  const brands = load('lib/brands.ts');
  const brandMarks = load('components/BrandMarks.tsx', { '@/lib/brands': brands, './brand-marks.module.css': css }).default;
  const rendered = load('components/work/CaseStudy.tsx', {
    '@/lib/work': workModule({ registry }), '@/lib/work-types': load('lib/work-types.ts'),
    '@/lib/work-presentation': load('lib/work-presentation.ts'),
    './work.module.css': css, './Media': media, './CaseStudyNavigation': { ...navigation, __esModule: true, default: props => { observeNavigation?.(props); return createElement(navigation.default, props); } }, './VisualStory': visual,
    '@/components/BrandMarks': brandMarks, '@/lib/brands': brands,
    '@/components/EmailContact': EmailContact,
  }, {}, { URL });
  return references ? rendered.CaseStudyReferences : rendered.default;
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

test('main case presents its selected evidence and a meaningful account without the archive dump', () => {
  const html = renderToStaticMarkup(createElement(caseRenderer(), { study }));
  assert.match(html, /<h1[^>]*>A simpler lending journey<\/h1>/);
  assert.ok(html.indexOf('src="/work/screen.webp"') < html.indexOf('id="full-case-study"'));
  assert.ok(html.includes(study.visualSummary.role));
  assert.match(html, /A concise decision account explaining what to inspect\./);
  assert.match(html, /id="story-operating-model"/);
  assert.match(html, /id="story-build"/);
  assert.match(html, /href="\/product\/company-one\/references"/);
  assert.doesNotMatch(html, /This record describes the original scope|Decision comparison|Project note · Pages/);
  assert.doesNotMatch(html, /<details|<summary|Read more|Show more/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
});

test('reference page retains versioned source descriptions and readable safe links', () => {
  const linkedStudy = { ...study, sections: study.sections.map(section => section.id === 'record' ? {
    ...section, source: { ...section.source, links: [{ label: 'RBI lending framework', href: 'https://www.rbi.org.in/example' }] },
  } : section) };
  const html = renderToStaticMarkup(createElement(caseRenderer(fixture, true), { study: linkedStudy }));
  assert.match(html, /Project note · Pages 2–3 · 2024 · Initial proposal/);
  assert.match(html, /<ul[^>]+aria-label="External source references"/);
  assert.match(html, /href="https:\/\/www\.rbi\.org\.in\/example" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /\(opens in a new tab\)/);
  assert.match(html, /href="\/product\/company-one"/);
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
  const html = renderToStaticMarkup(createElement(caseRenderer(fixture, true), { study: linkedStudy }));
  assert.match(html, /Situation reference/);
  assert.match(html, /Results record/);
  assert.match(html, /href="https:\/\/example\.org\/situation"/);
  assert.match(html, /href="https:\/\/example\.org\/results"/);
  assert.doesNotMatch(html, /Unsafe javascript|Insecure HTTP|Relative protocol|Malformed reference|Credential-bearing|Unsafe data|https:\/\/example\.org\/unlabelled|javascript:|data:text\/html|user:secret/);
  assert.ok(html.includes('An independently qualified result.'));
  assert.ok(html.includes('id="story-results"'));
});

test('only selected main artifacts follow their explanatory account; full tables remain in references', () => {
  const reference = { id: 'contract-diagram', kind: 'image', category: 'diagram', src: '/work/contract-diagram.svg', alt: 'Illustrative contract boundary', width: 1440, height: 760, caption: 'Authored reference design; implementation unverified.', provenance: { kind: 'authored', label: 'Reference explanation' } };
  const item = { ...study, media: [...study.media, reference], presentation: {
    decisionBeats: [{ id: 'contract', title: 'The contract decision', sectionIds: ['record'], body: ['Inspect the handoff boundary in this authored explanation.'], mainMediaIds: ['contract-diagram'], mainTableCaptions: ['Decision comparison'] }], supportingGroups: [{id:'operation',title:'Original operating context',sectionIds:['operating-model']}],
  } };
  const html = renderToStaticMarkup(createElement(caseRenderer(), { study: item }));
  const chapter = html.slice(html.indexOf('id="chapter-contract"'));
  assert.ok(chapter.indexOf('Inspect the handoff boundary') < chapter.indexOf('src="/work/contract-diagram.svg"'));
  assert.ok(chapter.indexOf('src="/work/contract-diagram.svg"') < chapter.indexOf('<table'));
  assert.match(chapter, /Authored reference design; implementation unverified\./);
  const unselected = { ...item, presentation: { ...item.presentation, decisionBeats: [{...item.presentation.decisionBeats[0], mainTableCaptions: [], mainMediaIds: []}] } };
  const main = renderToStaticMarkup(createElement(caseRenderer(), { study: unselected }));
  const references = renderToStaticMarkup(createElement(caseRenderer(fixture, true), { study: unselected }));
  assert.doesNotMatch(main, /src="\/work\/contract-diagram.svg"|Decision comparison/);
  assert.match(references, /src="\/work\/contract-diagram.svg"/);
  assert.match(references, /<caption><span>Decision comparison<\/span><\/caption>/);
});

test('note and archive formats permit variable beats and no fallback hero or empty metric cards', () => {
  const item = { ...study, primaryMediaIds: [], outcomes: [{label:'An empty metric must not render'}], sections: study.sections.filter(section => section.id !== 'results'), presentation: {
    format:'archive', decisionBeats:[], supportingGroups:[{id:'operation',title:'Operating source',sectionIds:['operating-model']},{id:'record',title:'Original record',sectionIds:['record']}],
  } };
  const html = renderToStaticMarkup(createElement(caseRenderer(), { study: item }));
  assert.match(html, /class="caseTitle"><h1[^>]*>A simpler lending journey/);
  assert.match(html, /class="caseRemit"><p class="visualRole"><strong>My role<\/strong>/);
  assert.match(html, /backgroundNote/);
  assert.doesNotMatch(html, /src="\/work\/screen.webp"|An empty metric must not render|class="outcomes"|id="chapter-operation"/);
  assert.match(html, /href="\/product\/company-one\/references"/);
  const refs = renderToStaticMarkup(createElement(caseRenderer(fixture, true), { study:item }));
  assert.match(refs, /The fuller operating detail\./);
  assert.match(refs, /This record describes the original scope\./);
});

test('selected media stays inline with accessible enlargement and user-initiated video', () => {
  const html = renderToStaticMarkup(createElement(caseRenderer(), { study }));
  assert.match(html, /<button[^>]+aria-haspopup="dialog"[^>]+aria-label="Enlarge image: The application flow"/);
  assert.match(html, /aria-expanded="false"[^>]+aria-controls=/);
  assert.match(html, /<dialog[^>]+aria-labelledby=/);
  assert.match(html, /<img[^>]+alt="The application flow"/);
  assert.match(html, /Original product capture · 2024/);
  assert.match(html, /<video[^>]+controls=""[^>]+controlsList="nodownload"[^>]+playsinline=""[^>]+preload="none"/);
  assert.match(html, /<track[^>]+kind="captions"/);
  assert.doesNotMatch(html, /autoplay|<details|<summary|<a[^>]+href="\/work\/(?:screen.webp|demo.mp4)"/i);
});

test('enlarged images expose caption, source and zoom state to keyboard and assistive readers', () => {
  for (const actualSize of [false, true]) {
    let stateIndex = 0;
    const Media = load('components/work/Media.tsx', {
      './work.module.css': css,
      react: { ...require('react'), useState: () => [stateIndex++ === 0 ? true : actualSize, () => {}] },
    }).default;
    const media = { ...study.media[0], provenance: { ...study.media[0].provenance, sourceUrl: 'https://example.org/original' } };
    const html = renderToStaticMarkup(createElement(Media, { media }));
    const dialog = html.match(/<dialog[^>]+aria-describedby="([^"]+)"/);
    assert.ok(dialog, 'The modal is associated with its own caption');
    assert.ok(html.includes(`id="${dialog[1]}"`));
    assert.match(html, /tabindex="0" role="region" aria-label="Image caption and source"/);
    assert.match(html, /href="https:\/\/example.org\/original" target="_blank" rel="noopener noreferrer"/);
    assert.ok(html.includes(`aria-pressed="${actualSize}"`));
    assert.match(html, actualSize ? /Actual size image; scroll to see the full image/ : /Enlarged image, fitted to the screen/);
    assert.match(html, /data-icon="close"/);
    assert.match(html, /Original product capture · 2024/);
  }
});

test('reviewed product destinations are named in their case opening before the primary evidence', () => {
  const registry = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
  const { productLinks } = load('lib/product-links.ts');
  for (const [slug, destination] of Object.entries(productLinks)) {
    const item = registry.caseStudies.find(item => item.slug === slug);
    assert.ok(item, slug);
    const html = renderToStaticMarkup(createElement(caseRenderer(registry), { study: item }));
    const opening = html.slice(html.indexOf('<header'), html.indexOf('id="product-reference"'));
    assert.ok(opening.includes(`href="${destination.href}" target="_blank" rel="noopener noreferrer"`));
    assert.ok(opening.includes(escaped(destination.label)), `${slug}: its actual product name is visible`);
    assert.match(opening, /\(opens in a new tab\)/);
    assert.match(destination.href, /^https:\/\//);
    assert.equal((opening.split(`href="${destination.href}"`).length - 1), 1);
  }
  const unmapped = renderToStaticMarkup(createElement(caseRenderer(), { study }));
  assert.doesNotMatch(unmapped, /class="productLink"/);
});

test('proposal status, custom scope headings and legacy records render without implied deployment', () => {
  const item = { ...study, workType:'proposal', presentation:{...study.presentation,format:'note',resultsTitle:'Workstream status'}, sections:[...study.sections,{id:'results',title:'Status',body:['Product definition is documented; production release is not established.']}] };
  const html = renderToStaticMarkup(createElement(caseRenderer(), {study:item}));
  assert.match(html, /Proposal/);
  assert.match(html, /Workstream status/);
  assert.match(html, /production release is not established/);
  const legacy={...study}; delete legacy.workType; delete legacy.executiveBrief; delete legacy.visualSummary; delete legacy.presentation;
  assert.doesNotThrow(() => renderToStaticMarkup(createElement(caseRenderer(), {study:legacy})));
  assert.match(renderToStaticMarkup(createElement(caseRenderer(), {study:legacy})), /<h1[^>]*>A product story<\/h1>/);
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

test('comparison and part-to-whole charts expose exact labelled values as native table data', () => {
  const { Chart } = visualRenderer();
  for (const chart of [study.visualSummary.charts[0], { id: 'partition', title: 'Application share', kind: 'donut', unit: '%', values: [{ label: 'Application', value: 40 }, { label: 'Remainder (implied)', value: 60 }], note: 'The remainder is implied, not separately measured.' }]) {
    const html = renderToStaticMarkup(createElement(Chart, { chart }));
    assert.match(html, /<table\b/);
    assert.ok(html.includes(`${escaped(chart.title)}: data</caption>`));
    assert.match(html, /<th scope="col">Measure<\/th><th scope="col">Value<\/th>/);
    for (const item of chart.values) {
      assert.ok(html.includes(`scope="row">${item.label}</th>`) || html.includes(`${item.label}</th>`), item.label);
      assert.ok(html.includes(`${item.value}%`), 'Values retain their actual unit');
    }
    assert.ok(html.includes(escaped(chart.note)), 'Data keeps its measurement qualification');
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

test('legacy archived fragments redirect to references while retained main anchors focus locally', () => {
  const navigations=[];
  renderToStaticMarkup(createElement(caseRenderer(fixture,false,props=>navigations.push(props)), {study}));
  const config=navigations[0];
  assert.equal(config.referenceHref,'/product/company-one/references');
  for(const id of ['downloads','evidence','story-record','heading-record','chapter-record']) assert.ok(config.referenceFragments.includes(id), id);
  assert.ok(!config.referenceFragments.includes('story-operating-model'));
  const referenceHtml=renderToStaticMarkup(createElement(caseRenderer(fixture,true), {study}));
  assert.equal((referenceHtml.match(/id="downloads"/g)||[]).length,1);
  for(const hash of ['#story-record','#%73tory-record','#source-2']){
    let effect,removed=false,replaced,revealed=false;
    const nav=load('components/work/CaseStudyNavigation.tsx',{
      'react':{...require('react'),useEffect:callback=>{effect=callback;}},
      './work.module.css':css,'./anchors':{revealCaseStudyAnchor:()=>{revealed=true;}},
    },{},{window:{location:{hash,replace:url=>{replaced=url;}},addEventListener(){},removeEventListener(){removed=true;}},document:{getElementById:()=>({})}}).default;
    renderToStaticMarkup(createElement(nav,config)); const cleanup=effect();
    assert.equal(replaced,`${config.referenceHref}#${encodeURIComponent(decodeURIComponent(hash.slice(1)))}`);
    assert.equal(revealed,false); cleanup(); assert.equal(removed,true);
  }
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

test('registry preserves all 25 retained routes, reference videos and authored diagrams when corrected evidence is added', () => {
  const data = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
  const work = workModule({ registry: data });
  assert.deepEqual(data.caseStudies.map(item => item.slug).sort(), [...expectedSlugs].sort());
  for (const alias of expectedAliases) assert.ok(work.findCaseStudy(alias), `Missing legacy alias: ${alias}`);
  const videos = new Set(data.caseStudies.flatMap(item => item.media).filter(media => media.kind === 'video').map(media => media.src));
  assert.equal(videos.size, 10);
  assert.equal(Array.from(videos).filter(src => !src.startsWith('/work/urbankhet/video/')).length, 9);
  assert.ok(new Set(data.caseStudies.flatMap(item => item.media).filter(media => media.src.startsWith('/work/workflows/')).map(media => media.src)).size >= 17);
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
    assert.ok(Array.isArray(workflow.steps), `${item.slug}: invalid retained workflow`);
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
    const presentation=item.presentation;
    assert.ok(presentation && Array.isArray(presentation.decisionBeats) && Array.isArray(presentation.supportingGroups), `${item.slug}: missing editorial mapping`);
    assert.ok(!presentation.format || ['case','note','archive'].includes(presentation.format), `${item.slug}: invalid format`);
    for(const id of presentation.internalSectionIds||[]) assert.ok(item.sections.some(section=>section.id===id),`${item.slug}: unknown internal section`);
    for(const group of presentation.decisionBeats) {
      assert.ok(group.title?.trim() && group.sectionIds.length, `${item.slug}: empty decision group`);
      for(const id of group.mainMediaIds||[]) assert.ok(item.media.some(media=>media.id===id), `${item.slug}: unknown main media`);
      for(const caption of group.mainTableCaptions||[]) assert.ok(item.sections.filter(section=>group.sectionIds.includes(section.id)).some(section=>section.tables?.some(table=>table.caption===caption)), `${item.slug}: selected main table missing`);
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

test('all retained source sections, table captions, routes and asset bytes match the audit manifest', () => {
  // These four reviewed titles now state proposal/archive status; their source sections remain intact.
  const auditedTableTitles={
    'Revenue-to-bottom-line bridge — amounts are unavailable':'Proposed revenue-to-bottom-line model — no amounts calculated',
    'From student intent to an earned partner outcome':'Proposed cohort model: student intent to an earned partner outcome',
    'Recorded backlog, with completion status preserved':'Archived release backlog — later completion not established',
    'Illustrative tool contract — proposed, not deployed':'Illustrative operations — consumer evaluation and separate administrative approval',
  };
  const data=JSON.parse(readFileSync(path.join(root,'content/work/case-studies.json'),'utf8'));
  const manifest=JSON.parse(readFileSync(path.join(root,'audit/2026-10-15/source-manifest.json'),'utf8'));
  assert.equal(manifest.studies.length,25);
  assert.equal(data.caseStudies.length,25);
  assert.equal(new Set(data.caseStudies.map(item=>item.companyId)).size,9);
  for(const saved of manifest.studies){
    const item=data.caseStudies.find(item=>item.slug===saved.slug); assert.ok(item,saved.slug);
    assert.equal(item.companyId,saved.companyId);
    for(const alias of saved.aliases) assert.ok(item.aliases?.includes(alias),`${item.slug}: lost alias ${alias}`);
    for(const original of saved.sections){
      const section=item.sections.find(section=>section.id===original.id); assert.ok(section,`${item.slug}: lost source section ${original.id}`);
      for(const alias of original.anchorAliases) assert.ok(section.anchorAliases?.includes(alias),`${item.slug}: lost source alias ${alias}`);
      for(const caption of original.tables) assert.ok(section.tables?.some(table=>table.caption===(auditedTableTitles[caption]||caption)),`${item.slug}: lost table ${caption}`);
    }
    for(const asset of saved.media){
      assert.ok(item.media.some(media=>media.id===asset.id&&media.src===asset.src),`${item.slug}: lost original media ${asset.id}`);
      const bytes=readFileSync(path.join(root,'public',decodeURIComponent(asset.src)));
      assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,`${asset.src}: original source bytes changed`);
    }
  }
});

test('main accounts are selective; references retain every public source fact, table, anchor and media once', () => {
  const data=JSON.parse(readFileSync(path.join(root,'content/work/case-studies.json'),'utf8'));
  const Main=caseRenderer(data), References=caseRenderer(data,true);
  const escaped=text=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
  for(const item of data.caseStudies){
    const calls=[];
    const main=renderToStaticMarkup(createElement(caseRenderer(data,false,props=>calls.push(props)),{study:item}));
    const refs=renderToStaticMarkup(createElement(References,{study:item}));
    assert.match(main,/<section id="full-case-study"[^>]+data-case-section="true"/);
    for(const html of [main,refs]){
      assert.doesNotMatch(html,/<details|<summary|Read more|Show more/);
      assert.doesNotMatch(html,/<a[^>]+(?:download=|href="[^"#]*\.(?:pdf|zip|docx?|pptx?|mp4|webm|webp|png|jpe?g|svg)(?:[?"#]))/i);
      const ids=Array.from(html.matchAll(/\bid="([^"]+)"/g),match=>match[1]);
      assert.equal(ids.length,new Set(ids).size,`${item.slug}: duplicate DOM id`);
    }
    assert.ok(main.includes(`href="/product/${item.slug}/references"`));
    assert.ok(refs.includes(`href="/product/${item.slug}"`));
    for(const media of item.media){
      assert.ok(refs.includes(`src="${media.src}"`),`${item.slug}: reference media missing ${media.id}`);
      assert.equal(refs.split(`src="${media.src}"`).length-1,1,`${item.slug}: duplicated reference media ${media.id}`);
    }
    for(const group of [...item.presentation.decisionBeats,...item.presentation.supportingGroups]) assert.ok(refs.includes(`id="chapter-${group.id}"`),`${item.slug}: archived chapter anchor missing ${group.id}`);
    const saved=JSON.parse(readFileSync(path.join(root,'audit/2026-10-15/source-manifest.json'),'utf8')).studies.find(saved=>saved.slug===item.slug);
    for(const chapter of saved.chapterAnchors||[]) {
      assert.ok(refs.includes(`id="${chapter.id}"`),`${item.slug}: original chapter lost ${chapter.id}`);
      if(!main.includes(`id="${chapter.id}"`)) assert.ok(calls[0].referenceFragments.includes(chapter.id),`${item.slug}: original chapter hash has no redirect ${chapter.id}`);
    }
    const internal=new Set(item.presentation.internalSectionIds||[]);
    for(const section of item.sections){
      for(const id of [section.id,`story-${section.id}`,`heading-${section.id}`,...(section.anchorAliases||[])]){
        assert.ok(refs.includes(`id="${id}"`),`${item.slug}: reference anchor missing ${id}`);
        if(!main.includes(`id="${id}"`)) assert.ok(calls[0].referenceFragments.includes(id),`${item.slug}: old hash has no reference destination ${id}`);
      }
      if(internal.has(section.id)) continue;
      for(const paragraph of section.body) assert.ok(refs.includes(escaped(paragraph)),`${item.slug}: reference paragraph lost ${section.id}`);
      for(const bullet of section.bullets||[]) assert.ok(refs.includes(escaped(bullet)),`${item.slug}: reference bullet lost ${section.id}`);
      for(const table of section.tables||[]){
        assert.ok(refs.includes(`<caption><span>${escaped(table.caption)}</span></caption>`),`${item.slug}: reference table lost ${table.caption}`);
        for(const row of table.rows) for(const cell of row) assert.ok(refs.includes(escaped(cell)),`${item.slug}: reference table cell lost`);
      }
      if(section.source){
        const description=[section.source.label,section.source.range,section.source.date,section.source.version].filter(Boolean).join(' · ');
        assert.ok(refs.includes(escaped(description)),`${item.slug}: source version lost ${section.id}`);
      }
    }
    for(const group of item.presentation.decisionBeats){
      assert.ok(group.sectionIds.some(id=>item.sections.some(section=>section.id===id)),`${item.slug}: empty account group`);
      for(const paragraph of group.body||[]) assert.ok(main.includes(escaped(paragraph)),`${item.slug}: decision account omitted ${group.id}`);
    }
  }
});

test('internal claim tables never appear in public main or references while legacy anchors survive',()=>{
  const item={...study,sections:[...study.sections,{id:'private-claim',title:'Unresolved private numbers',body:['INTERNAL_ONLY_998877'],tables:[{caption:'PRIVATE_CLAIM_REGISTER_554433',headers:['Private'],rows:[['UNRESOLVED_443322']]}],source:{label:'PRIVATE_SOURCE_665544'}}],presentation:{...study.presentation,internalSectionIds:['private-claim'],supportingGroups:[...study.presentation.supportingGroups,{id:'private-claim-group',title:'Private claim record',sectionIds:['private-claim']}]}};
  const main=renderToStaticMarkup(createElement(caseRenderer(),{study:item}));
  const refs=renderToStaticMarkup(createElement(caseRenderer(fixture,true),{study:item}));
  for(const html of [main,refs]) assert.doesNotMatch(html,/INTERNAL_ONLY_998877|PRIVATE_CLAIM_REGISTER_554433|UNRESOLVED_443322|PRIVATE_SOURCE_665544/);
  assert.match(refs,/id="story-private-claim"/);
});

test('explicit media selection permits no hero and never falls back to unrelated marketing',()=>{
  const {featuredCaseStudies,getPrimaryMedia,mediaGroupTitle}=load('lib/work-presentation.ts');
  const ranked=featuredCaseStudies([{featuredOrder:3,id:'later'},{featuredOrder:1,id:'first'},{id:'none'},{featuredOrder:0,id:'zero'},{featuredOrder:NaN,id:'invalid'}]);
  assert.deepEqual(Array.from(ranked,item=>item.id),['first','later']);
  assert.equal(getPrimaryMedia({...study,primaryMediaIds:[],heroMediaId:'screen'}).length,0);
  assert.equal(getPrimaryMedia({...study,primaryMediaIds:['missing'],heroMediaId:'screen'}).length,0);
  assert.equal(getPrimaryMedia({...study,primaryMediaIds:undefined,heroMediaId:'screen'})[0].id,'screen');
  assert.equal(getPrimaryMedia({...study,media:[]}).length,0);
  assert.equal(getPrimaryMedia({...study,primaryMediaIds:['screen','screen']}).length,1);
  assert.equal(mediaGroupTitle({kind:'image',category:'prototype-screenshot'}),'Original interaction prototype');
  assert.equal(mediaGroupTitle({kind:'image',category:'photograph'}),'Company photograph');
});

test('all retained cases have concise product display names without rewriting source titles or metadata',()=>{
  const data=JSON.parse(readFileSync(path.join(root,'content/work/case-studies.json'),'utf8'));
  const {getCaseDisplayTitle}=load('lib/work-presentation.ts');
  const before=JSON.stringify(data);
  const Main=caseRenderer(data),References=caseRenderer(data,true);
  for(const item of data.caseStudies){
    const title=getCaseDisplayTitle(item);
    assert.ok(title.trim()&&title.split(/\s+/).length<=6,`${item.slug}: concise title`);
    for(const Component of [Main,References]){
      const html=renderToStaticMarkup(createElement(Component,{study:item}));
      assert.ok(html.includes(`>${escaped(title)}</h1>`),`${item.slug}: consistent display title`);
    }
  }
  assert.equal(JSON.stringify(data),before);
  assert.equal(getCaseDisplayTitle({slug:'unknown',title:'Fallback title'}),'Fallback title');
  assert.equal(getCaseDisplayTitle({slug:'unknown',title:'Fallback title',visualSummary:{title:'Existing visual title'}}),'Existing visual title');
});

test('one selected lead and decision artifacts are visible; unselected archive media stays off main',()=>{
  const data=JSON.parse(readFileSync(path.join(root,'content/work/case-studies.json'),'utf8'));
  const {getPrimaryMedia}=load('lib/work-presentation.ts');
  for(const item of data.caseStudies){
    const html=renderToStaticMarkup(createElement(caseRenderer(data),{study:item}));
    const selected=[...getPrimaryMedia(item).slice(0,1),...item.presentation.decisionBeats.flatMap(group=>(group.mainMediaIds||[]).map(id=>item.media.find(asset=>asset.id===id))).filter(Boolean)];
    const srcs=new Set(selected.map(asset=>asset.src));
    for(const asset of item.media){
      const count=html.split(`src="${asset.src}"`).length-1;
      assert.equal(count,srcs.has(asset.src)?1:0,`${item.slug}: media selection ${asset.id}`);
      if(srcs.has(asset.src)) assert.ok(html.includes(escaped(asset.caption)),`${item.slug}: selected artifact qualification lost`);
    }
    const lead=getPrimaryMedia(item)[0];
    if(lead)assert.ok(html.indexOf(`src="${lead.src}"`)<html.indexOf('id="full-case-study"'),`${item.slug}: lead evidence postponed`);
    assert.doesNotMatch(html,/<details|<summary|\shidden(?:=|[\s>])[^>]*>\s*<(?:img|video)/);
    if(/<h[1-6][^>]*>[^<]*screenshots?/i.test(html)) assert.ok(selected.some(asset=>['product-screenshot','prototype-screenshot'].includes(asset.category)),`${item.slug}: inaccurate screenshot heading`);
  }
});

test('AI validation plans remain proposed while archived software checks retain their precise limits', () => {
  const data = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
  const Component = caseRenderer(data, true);
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
    assert.match(html, /Proposed|proposed/);
  }
  const edu = data.caseStudies.find(item => item.id === 'eduloans-policy-workflow');
  const html = renderToStaticMarkup(createElement(Component, { study: edu }));
  assert.match(html, /Archived unit and regression validation — March 2026/);
  assert.match(html, /145/);
  assert.match(html, /mock|Mock/);
  assert.match(html, /not (?:freshly |independently )?rerun|not a fresh verification|not freshly executed/i);

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

test('detailed evidence exposes video descriptions and puts useful chapter navigation before the records', () => {
  const html = renderToStaticMarkup(createElement(caseRenderer(fixture, true), {study}));
  const video = html.match(/<video[^>]+aria-describedby="([^"]+)"/);
  assert.ok(video, 'video is associated with its caption and visible description');
  for (const id of video[1].split(' ')) assert.ok(html.includes(`id="${id}"`));
  assert.ok(html.includes(study.media[1].transcript));
  assert.ok(html.indexOf('href="#reference-record"') < html.indexOf('id="reference-record"'));
  assert.match(html, /href="#reference-record">Detailed source record<\/a>/);
  assert.match(html, /<table class="narrowTable"><caption><span>Decision comparison/);
  assert.doesNotMatch(html, /<details|<summary/);

  const Media = load('components/work/Media.tsx', {'./work.module.css':css}).default;
  const image = renderToStaticMarkup(createElement(Media, {media:study.media[0],priority:true}));
  assert.match(image, /loading="eager"/);
});


test('references route resolves retained aliases, excludes unknown/draft/retired records and is not separately indexed',()=>{
  const empty=()=>null;
  const module=load('app/product/[slug]/references/page.tsx',{
    '@/lib/work':workModule(),
    'next/navigation':{notFound(){throw new Error('Not found');},redirect(url){throw new Error(`Redirect: ${url}`);}},
    '@/components/work/CaseStudy':{CaseStudyReferences:empty},'@/components/Header':empty,'@/components/Footer':empty,'@/components/PublicShell':empty,
  });
  assert.ok(module.default({params:{slug:'company-one'}}));
  assert.throws(()=>module.default({params:{slug:'older-slug'}}),/Redirect: \/product\/company-one\/references/);
  for(const slug of ['draft','draft-alias','missing','moneylion-wow-strategy','independent-moneylion-wow-strategy']) assert.throws(()=>module.default({params:{slug}}),/Not found/);
  const metadata=module.generateMetadata({params:{slug:'company-one'}});
  assert.equal(metadata.robots.index,false);assert.equal(metadata.robots.follow,true);
});


test('audit copy preserves work maturity and does not promote undefined or unexecuted results',()=>{
 const data=JSON.parse(readFileSync(path.join(root,'content/work/case-studies.json'),'utf8'));
 const render=id=>{const study=data.caseStudies.find(study=>study.id===id);return renderToStaticMarkup(createElement(caseRenderer(data),{study}));};
 const ondc=render('ondc-credit-infrastructure');
 assert.match(ondc,/Proposal/);assert.match(ondc,/Absolute tenure/);assert.match(ondc,/production release[^.]{0,100}not established/);
 const mcp=render('lending-mcp-feedback');assert.match(mcp,/Proposal/);assert.match(mcp,/propos|not deployed|not established/i);
 const crop=render('crop-health-ai');assert.match(crop,/offline/i);assert.match(crop,/reconnect/i);assert.match(crop,/intended/i);
 assert.doesNotMatch(crop,/support.deflection.{0,15}(?:reduced|improved)|precision.{0,10}[0-9]{2}%/i);
 const risk=render('rural-credit-uli');assert.doesNotMatch(risk,/500K\+|500,000|Under 30 min|under.thirty.minute/i);
 const upaj=render('upaj-farmer-experience');assert.doesNotMatch(upaj,/100K\s*→\s*600K|100,000 to 600,000/);
 const payments=render('trade-payments-erp');assert.doesNotMatch(payments,/1 days|24 working days|class="outcomeValue">.*?settlement/i);
 const archive=render('absolute-supporting-portfolio');assert.doesNotMatch(archive,/₹14 crore|₹6 crore|₹60 crore|4,500 crore/);
});
