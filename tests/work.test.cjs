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
  }).default;
  return load('components/work/CaseStudy.tsx', {
    '@/lib/work': workModule({ registry }), '@/lib/work-types': load('lib/work-types.ts'),
    './work.module.css': css, './Media': media, './CaseStudyNavigation': navigation,
  }).default;
}

test('curated work excludes drafts, resolves aliases and groups stories in author order', () => {
  const work = workModule();
  assert.deepEqual(Array.from(work.publishedCaseStudies(), item => item.slug), ['company-one', 'company-two']);
  assert.equal(work.findCaseStudy('older-slug').slug, 'company-one');
  assert.equal(work.findCaseStudy('draft-alias'), undefined);
  assert.deepEqual(Array.from(work.groupCaseStudies()[0].studies, item => item.slug), ['company-one', 'company-two']);
  const existing = [{ id: 'old-one', slug: 'company-one' }, { id: 'old-alias', slug: 'older-slug' }, { id: 'uuid-route', slug: null }, { id: 'other', slug: 'another-story' }];
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

test('case study leads with a leadership brief, preserves full chapters and offers no file actions', () => {
  const Component = caseRenderer();
  const html = renderToStaticMarkup(createElement(Component, { study: { ...study, heroMediaId: 'screen' } }));
  assert.match(html, /<h1>A product story<\/h1>/);
  assert.ok(html.indexOf(study.executiveBrief.challenge) < html.indexOf('<img'));
  assert.ok(html.indexOf('Measured against the earlier process.') < html.indexOf('<img'));
  assert.ok(html.indexOf(study.sourceNotes[0]) < html.indexOf('<img'));
  assert.match(html, /A complete narrative paragraph\./);
  assert.match(html, /<details id="story-operating-model"[^>]+data-case-section="true"/);
  assert.doesNotMatch(html, /<details id="story-operating-model"[^>]+open/);
  assert.match(html, /id="story-build"/);
  assert.match(html, /id="downloads"/);
  assert.match(html, /Project note · Pages 2–3 · 2024 · Initial proposal/);
  assert.match(html, /<caption>Decision comparison<\/caption>/);
  assert.match(html, /<th scope="col">Option<\/th>/);
  assert.match(html, /<td>Requires lender rules<\/td>/);
  assert.match(html, /aria-label="In this case study"/);
  assert.match(html, /Discuss a product leadership role/);
  assert.match(html, /Read case study/);
  assert.doesNotMatch(html, /<a[^>]+(?:download=|href="\/work\/)/);
  assert.doesNotMatch(html, /Downloads|Download this case study|Read story/);
  assert.equal((html.match(/<h1>/g) || []).length, 1);
});

test('media stays inline with accessible image enlargement, provenance and no separate video action', () => {
  const Component = caseRenderer();
  const html = renderToStaticMarkup(createElement(Component, { study }));
  assert.match(html, /<button[^>]+aria-haspopup="dialog"[^>]+aria-label="Enlarge image: The application flow"/);
  assert.match(html, /<dialog[^>]+aria-labelledby=/);
  assert.match(html, /<img[^>]+alt="The application flow"/);
  assert.match(html, /Historical material · Original product capture · 2024/);
  assert.match(html, /<video[^>]+controls=""[^>]+controlsList="nodownload"[^>]+playsinline=""[^>]+preload="metadata"/);
  assert.match(html, /<track[^>]+kind="captions"/);
  assert.match(html, /A description of the walkthrough\./);
  assert.match(html, /<summary>Video description<\/summary>/);
  assert.doesNotMatch(html, /<a[^>]+href="\/work\/(?:screen.webp|demo.mp4)"/);
  assert.doesNotMatch(html, /target="_blank"/);
});

test('proposal cases distinguish their evidence from delivered outcomes and legacy data renders safely', () => {
  const Component = caseRenderer();
  const proposal = renderToStaticMarkup(createElement(Component, { study: { ...study, workType: 'proposal' } }));
  assert.match(proposal, /What I proposed/);
  assert.match(proposal, /Proposal and validation/);
  assert.doesNotMatch(proposal, /Results and scope/);
  const exercise = renderToStaticMarkup(createElement(Component, { study: { ...study, workType: 'independent' } }));
  assert.match(exercise, /What I explored/);
  assert.match(exercise, /Proposal and validation/);
  const legacy = { ...study };
  delete legacy.workType;
  delete legacy.executiveBrief;
  assert.doesNotThrow(() => renderToStaticMarkup(createElement(Component, { study: legacy })));
});

test('former downloads fragments resolve once, whether the case has a reference chapter or an evidence gallery', () => {
  const Component = caseRenderer();
  const explicitAlias = { ...study, sections: study.sections.map(section => section.id === 'operating-model' ? { ...section, anchorAliases: ['story-build', 'downloads'] } : section) };
  const explicitHtml = renderToStaticMarkup(createElement(Component, { study: explicitAlias }));
  assert.equal((explicitHtml.match(/id="downloads"/g) || []).length, 1);
  const gallery = { ...study, sections: [{ id: 'problem', title: 'The problem', body: ['The main narrative.'] }] };
  const galleryHtml = renderToStaticMarkup(createElement(Component, { study: gallery }));
  assert.match(galleryHtml, /<details id="evidence"/);
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
  const outer = node('outer', 'DETAILS', rootElement, true);
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
  const route = routeModule({ findCaseStudy: () => undefined, findWorkCompany: () => undefined }, async (strings, ...values) => {
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

test('curated detail routes bypass the database, publish metadata and redirect old aliases', async () => {
  let calls = 0;
  const route = routeModule(workModule(), async () => { calls += 1; throw new Error('Should not query'); });
  assert.ok(await route.default({ params: { category: 'product', id: 'company-one' } }));
  assert.equal(calls, 0);
  const metadata = await route.generateMetadata({ params: { category: 'product', id: 'company-one' } });
  assert.equal(metadata.description, study.summary);
  assert.equal(metadata.alternates.canonical, '/product/company-one');
  await assert.rejects(route.default({ params: { category: 'product', id: 'older-slug' } }), /Redirect: \/product\/company-one/);
  await assert.rejects(route.default({ params: { category: 'product', id: 'draft' } }), /Not found/);
});

const expectedSlugs = [
  'cashkaro-personal-loan-marketplace', 'cashkaro-college-money-education-loans', 'cashkaro-eduloans-policy-workflow', 'cashkaro-lender-integration-operations', 'cashkaro-lending-mcp-feedback',
  'credflow-kuberx-launch', 'credflow-pay-via-credit-card', 'absolute-silkroute-marketplace', 'absolute-trade-payments-erp', 'absolute-rural-credit-uli', 'absolute-ondc-credit-infrastructure',
  'absolute-upaj-farmer-experience', 'absolute-farm-os-iot-gis', 'absolute-crop-health-ai', 'absolute-rainfall-grid-insurance', 'absolute-upaj-international', 'absolute-agri-input-institutional-commerce',
  'absolute-supporting-portfolio', 'urbankhet-farm-to-fork', 'urbankhet-covid-pivot', 'urbankhet-incubation-funding', 'water-farmers-aquaponics', 'gujarat-action-group-covid-resource-database',
  'independent-founder-advisory', 'cept-football-creative-practice', 'independent-moneylion-wow-strategy',
];
const expectedAliases = [
  'personal-loan-marketplace', 'college-money-education-loans', 'eduloans-policy-workflow', 'lender-integration-operations', 'lending-mcp-feedback', 'kuberx-launch', 'pay-via-credit-card',
  'silkroute-marketplace', 'trade-payments-erp', 'rural-credit-uli', 'ondc-credit-infrastructure', 'upaj-farmer-experience', 'farm-os-iot-gis', 'crop-health-ai', 'rainfall-grid-insurance',
  'upaj-international', 'agri-input-institutional-commerce', 'covid-resource-database', 'founder-advisory', 'football-creative-practice', 'moneylion-wow-strategy',
];

test('registry preserves all 26 case routes, aliases, nine videos and eighteen authored diagrams', () => {
  const data = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
  const work = workModule({ registry: data });
  assert.deepEqual(data.caseStudies.map(item => item.slug).sort(), [...expectedSlugs].sort());
  for (const alias of expectedAliases) assert.ok(work.findCaseStudy(alias), `Missing legacy alias: ${alias}`);
  assert.equal(new Set(data.caseStudies.flatMap(item => item.media).filter(media => media.kind === 'video').map(media => media.src)).size, 9);
  assert.equal(new Set(data.caseStudies.flatMap(item => item.media).filter(media => media.src.startsWith('/work/workflows/')).map(media => media.src)).size, 18);
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
      if (media.provenance) assert.ok(['historical', 'current-public', 'authored', 'proposal'].includes(media.provenance.kind) && media.provenance.label?.trim(), `${item.slug}: invalid provenance`);
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

test('every published case renders all media and useful old anchors without any visitor download options', () => {
  const data = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
  const Component = caseRenderer(data);
  for (const item of data.caseStudies.filter(study => study.status !== 'draft')) {
    const html = renderToStaticMarkup(createElement(Component, { study: item }));
    assert.match(html, /id="downloads"/, `${item.slug}: old evidence link no longer resolves`);
    assert.doesNotMatch(html, /<a[^>]+(?:download=|href="[^"#]*\.(?:pdf|zip|docx?|pptx?|mp4|webm|webp|png|jpe?g|svg)(?:[?"#]))/i, `${item.slug}: visitor file action returned`);
    const navigation = html.match(/<nav class="storyNav"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
    assert.ok(navigation, `${item.slug}: case navigation missing`);
    const mainNavigation = navigation.split('<details')[0];
    assert.equal((mainNavigation.match(/<a /g) || []).length, 5, `${item.slug}: the five main chapter links are not isolated`);
    if (item.sections.some(section => section.group === 'detail' || section.group === 'reference')) {
      assert.match(navigation, /<details class="supportingNav">/, `${item.slug}: optional chapters should start collapsed`);
    }
    for (const section of item.sections) assert.ok(navigation.includes(`href="#story-${section.id}"`), `${item.slug}: chapter missing from navigation`);
    for (const media of item.media) assert.ok(html.includes(`src="${media.src}"`), `${item.slug}: media omitted ${media.id}`);
    for (const section of item.sections) {
      assert.ok(html.includes(`id="story-${section.id}"`), `${item.slug}: chapter anchor missing`);
      for (const alias of section.anchorAliases || []) assert.ok(html.includes(`id="${alias}"`), `${item.slug}: legacy anchor missing ${alias}`);
    }
  }
});
