const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync, statSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createHash, webcrypto } = require('node:crypto');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.join(__dirname, '..');
const company = { id: 'company', name: 'A company', period: '2023–2025', role: 'Product manager', summary: 'A product team.', order: 1 };
const study = {
  id: 'one', slug: 'company-one', aliases: ['older-slug'], companyId: company.id,
  title: 'A product story', summary: 'An evidence-based summary.', role: 'Product manager', period: '2024', order: 1,
  outcomes: [{ label: 'A documented outcome', value: '10%', detail: 'Measured against the earlier process.' }],
  sections: [{ id: 'problem', title: 'The problem', body: ['A complete narrative paragraph.'], mediaIds: ['screen', 'demo'] }],
  media: [
    { id: 'screen', kind: 'image', src: '/work/screen.webp', alt: 'The application flow', caption: 'A flow screenshot.' },
    { id: 'demo', kind: 'video', src: '/work/demo.mp4', title: 'Product demonstration', caption: 'A recorded walkthrough.', poster: '/work/poster.webp', transcript: 'A supplied transcript.', captions: [{ src: '/work/captions.vtt', language: 'en', label: 'English' }] },
  ],
  downloads: [{ label: 'Case study PDF', url: '/work/story.pdf', filename: 'story.pdf', mime: 'application/pdf', bytes: 2048 }],
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
    process: { env }, console: { error() {} },
    ...globals,
  }, { filename: relativePath });
  return moduleContext.exports;
}

function workModule({ env = {}, db = async () => ({ rows: [] }) } = {}) {
  return load('lib/work.ts', {
    '@/content/work/case-studies': fixture,
    '@/lib/db': { publicDb: db },
    '@/lib/content': { contentExcerpt: value => value || '' },
  }, env);
}

test('curated work excludes drafts, resolves aliases and groups stories in author order', () => {
  const work = workModule();
  assert.deepEqual(Array.from(work.publishedCaseStudies(), item => item.slug), ['company-one', 'company-two']);
  assert.equal(work.findCaseStudy('older-slug').slug, 'company-one');
  assert.equal(work.findCaseStudy('draft-alias'), undefined);
  assert.deepEqual(Array.from(work.groupCaseStudies()[0].studies, item => item.slug), ['company-one', 'company-two']);
  const existing = [
    { id: 'old-one', slug: 'company-one' }, { id: 'old-alias', slug: 'older-slug' },
    { id: 'uuid-route', slug: null }, { id: 'other', slug: 'another-story' },
  ];
  assert.deepEqual(Array.from(work.withoutCuratedDuplicates(existing), item => item.id), ['uuid-route', 'other']);
});

test('authored work and featured stories work without a database in production', async () => {
  let calls = 0;
  const work = workModule({ env: { NODE_ENV: 'production' }, db: async () => { calls += 1; throw new Error('Should not query'); } });
  assert.equal((await work.loadPublishedWork()).length, 0);
  const featured = await work.featuredWork(2);
  assert.deepEqual(Array.from(featured, item => item.href), ['/product/company-two', '/product/company-one']);
  assert.equal(calls, 0);
});

test('optional publishing database failure leaves authored work available', async () => {
  const work = workModule({ env: { POSTGRES_URL: 'configured' }, db: async () => { throw new Error('Database unavailable'); } });
  assert.equal((await work.loadPublishedWork()).length, 0);
  assert.equal(work.findCaseStudy('company-one').title, study.title);
});

test('actual case study renderer includes the narrative, native media and direct downloads', () => {
  const work = workModule();
  const Component = load('components/work/CaseStudy.tsx', {
    '@/lib/work': work,
    './work.module.css': new Proxy({}, { get: (_, name) => name === '__esModule' ? false : String(name) }),
    './DownloadBundle': () => null,
  }).default;
  const html = renderToStaticMarkup(createElement(Component, { study }));
  assert.match(html, /<h1>A product story<\/h1>/);
  assert.match(html, /A complete narrative paragraph\./);
  assert.match(html, /<img[^>]+alt="The application flow"/);
  assert.match(html, /<video[^>]+controls=""[^>]+playsinline=""[^>]+preload="metadata"/);
  assert.match(html, /<track[^>]+kind="captions"/);
  assert.match(html, /A supplied transcript\./);
  assert.match(html, /<summary>Video description<\/summary>/);
  assert.match(html, /href="\/work\/story.pdf" download="story.pdf"/);
  assert.match(html, /2 KB/);
  assert.equal((html.match(/<h1>/g) || []).length, 1);
});

test('split archive renderer provides a single download button and live status without a broken archive link', () => {
  const css = new Proxy({}, { get: (_, name) => name === '__esModule' ? false : String(name) });
  const Bundle = load('components/work/DownloadBundle.tsx', {
    './work.module.css': css,
    '@/lib/download-bundle': { assembleDownload() {}, DownloadBundleError: Error },
  }).default;
  const Component = load('components/work/CaseStudy.tsx', {
    '@/lib/work': workModule(), './work.module.css': css, './DownloadBundle': Bundle,
  }).default;
  const html = renderToStaticMarkup(createElement(Component, { study: {
    ...study,
    downloads: [{ label: 'Source archive', url: '/work/original.zip', filename: 'original.zip', mime: 'application/zip', bytes: 12, parts: ['/work/part-01', '/work/part-02'] }],
  } }));
  assert.match(html, /<button[^>]+type="button"[^>]+aria-busy="false"/);
  assert.match(html, /<strong>Source archive<\/strong>/);
  assert.match(html, /aria-live="polite" role="status"/);
  assert.doesNotMatch(html, /href="\/work\/original.zip"/);
});

test('split archive assembly preserves byte order, checks size and source hash, and respects cancellation', async () => {
  const chunks = { '/part-01': 'first-', '/part-02': 'second' };
  const expected = 'first-second';
  const hash = createHash('sha256').update(expected).digest('hex');
  const requested = [];
  const progress = [];
  const helpers = load('lib/download-bundle.ts', {}, {}, {
    Blob, Uint8Array, ArrayBuffer, crypto: webcrypto,
    fetch: async url => { requested.push(url); return new Response(chunks[url]); },
  });
  const download = { label: 'Source archive', url: '/logical.zip', filename: 'original.zip', mime: 'application/zip', parts: ['/part-01', '/part-02'], bytes: expected.length, sha256: hash };
  const blob = await helpers.assembleDownload(download, { signal: new AbortController().signal, onProgress: bytes => progress.push(bytes) });
  assert.equal(await blob.text(), expected);
  assert.equal(blob.type, 'application/zip');
  assert.deepEqual(requested, ['/part-01', '/part-02']);
  assert.equal(progress.at(-1), expected.length);
  await assert.rejects(helpers.assembleDownload({ ...download, bytes: expected.length + 1 }, { signal: new AbortController().signal }), error => error.reason === 'incomplete');
  await assert.rejects(helpers.assembleDownload({ ...download, sha256: '0'.repeat(64) }, { signal: new AbortController().signal }), error => error.reason === 'integrity');
  const controller = new AbortController();
  controller.abort();
  const previousCalls = requested.length;
  await assert.rejects(helpers.assembleDownload(download, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(requested.length, previousCalls);
  const unavailable = load('lib/download-bundle.ts', {}, {}, { fetch: async () => new Response('', { status: 404 }) });
  await assert.rejects(unavailable.assembleDownload(download, { signal: new AbortController().signal }), error => error.reason === 'fetch');
});

test('legacy product UUID and unregistered slug routes keep the published-only database lookup', async () => {
  let query;
  const empty = () => null;
  const route = load('app/[category]/[id]/page.tsx', {
    '@/lib/work': { findCaseStudy: () => undefined, findWorkCompany: () => undefined },
    '@/lib/db': { publicDb: async (strings, ...values) => {
      query = { sql: strings.join('?'), values };
      return { rows: [{ id: 'legacy-id', title: 'Legacy story', summary: null, body_markdown: null, downloadable: false, created_at: '2024-01-01', media: [] }] };
    } },
    'next/navigation': { notFound() { throw new Error('Not found'); }, permanentRedirect() { throw new Error('Redirect'); } },
    '@/components/Header': empty, '@/components/Footer': empty,
    '@/components/PublicShell': empty, '@/components/MarkdownContent': empty,
    '@/components/work/CaseStudy': empty,
  }, { POSTGRES_URL: 'configured' });
  for (const id of ['a1aa8888-4444-4444-8888-aaaaaaaaaaaa', 'legacy-story']) {
    await route.default({ params: { category: 'product', id } });
    assert.match(query.sql, /ci\.status = 'published'/);
    assert.match(query.sql, /ci\.id::text = \? OR ci\.slug = \?/);
    assert.deepEqual(Array.from(query.values), ['work', id, id]);
  }
});

test('curated detail routes bypass the database, publish metadata and redirect aliases', async () => {
  const work = workModule();
  let calls = 0;
  const empty = () => null;
  const route = load('app/[category]/[id]/page.tsx', {
    '@/lib/work': work,
    '@/lib/db': { publicDb: async () => { calls += 1; throw new Error('Should not query'); } },
    'next/navigation': { notFound() { throw new Error('Not found'); }, permanentRedirect(url) { throw new Error(`Redirect: ${url}`); } },
    '@/components/Header': empty, '@/components/Footer': empty,
    '@/components/PublicShell': empty, '@/components/MarkdownContent': empty,
    '@/components/work/CaseStudy': empty,
  });
  assert.ok(await route.default({ params: { category: 'product', id: 'company-one' } }));
  assert.equal(calls, 0);
  const metadata = route.generateMetadata({ params: { category: 'product', id: 'company-one' } });
  assert.equal(metadata.description, study.summary);
  assert.equal(metadata.alternates.canonical, '/product/company-one');
  await assert.rejects(route.default({ params: { category: 'product', id: 'older-slug' } }), /Redirect: \/product\/company-one/);
  await assert.rejects(route.default({ params: { category: 'product', id: 'draft' } }), /Not found/);
});

test('published registry has unique routes and every local media/download exists with matching size', () => {
  const data = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
  const companies = data.companies;
  const studies = data.caseStudies;
  assert.ok(Array.isArray(companies) && companies.length > 0);
  assert.ok(Array.isArray(studies) && studies.length > 0);
  const companyIds = new Set(companies.map(item => item.id));
  assert.equal(companyIds.size, companies.length);
  const routes = new Set();
  const verifiedBundles = new Set();
  for (const item of studies) {
    assert.ok(companyIds.has(item.companyId), `${item.slug}: unknown company`);
    for (const field of ['id', 'title', 'summary', 'role', 'period']) assert.ok(typeof item[field] === 'string' && item[field].trim(), `${item.slug}: missing ${field}`);
    for (const route of [item.slug, ...(item.aliases || [])]) {
      assert.match(route, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(!routes.has(route), `Duplicate route: ${route}`);
      routes.add(route);
    }
    if (item.status === 'draft') continue;
    assert.ok(item.sections.length > 0, `${item.slug}: missing story`);
    const sectionIds = new Set(item.sections.map(section => section.id));
    assert.equal(sectionIds.size, item.sections.length, `${item.slug}: duplicate section ID`);
    for (const section of item.sections) {
      assert.match(section.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(section.title && section.body.length > 0, `${item.slug}: incomplete section ${section.id}`);
      assert.ok(section.body.every(paragraph => typeof paragraph === 'string' && paragraph.trim()), `${item.slug}: empty narrative paragraph`);
    }
    const mediaIds = new Set(item.media.map(media => media.id));
    assert.equal(mediaIds.size, item.media.length, `${item.slug}: duplicate media ID`);
    for (const id of [item.heroMediaId, ...item.sections.flatMap(section => section.mediaIds || [])].filter(Boolean)) {
      assert.ok(mediaIds.has(id), `${item.slug}: unknown media ${id}`);
    }
    assert.ok(item.downloads.length > 0, `${item.slug}: missing downloadable study`);
    for (const media of item.media) {
      assert.ok(['image', 'video'].includes(media.kind), `${item.slug}: invalid media kind`);
      assert.ok(media.kind === 'image' ? media.alt : media.title, `${item.slug}: media missing accessible name`);
      assert.ok(media.caption, `${item.slug}: media missing context caption`);
    }
    for (const relatedSlug of item.relatedSlugs || []) assert.ok(studies.some(other => other.slug === relatedSlug && other.status !== 'draft'), `${item.slug}: unknown related story ${relatedSlug}`);
    const assets = [
      ...item.media.map(media => ({ url: media.src })),
      ...item.media.filter(media => media.poster).map(media => ({ url: media.poster })),
      ...item.media.flatMap(media => (media.captions || []).map(track => ({ url: track.src }))),
      ...item.downloads.flatMap(download => download.parts?.length ? download.parts.map(url => ({ url })) : [download]),
    ];
    for (const asset of assets) {
      assert.match(asset.url, /^(\/(?!\/)|https:\/\/)/, `Unsupported asset URL: ${asset.url}`);
      if (!asset.url.startsWith('/')) continue;
      const assetPath = path.resolve(root, 'public', `.${decodeURIComponent(asset.url)}`);
      assert.ok(assetPath.startsWith(path.join(root, 'public') + path.sep), `Invalid path: ${asset.url}`);
      assert.ok(existsSync(assetPath), `Missing asset: ${asset.url}`);
      const size = statSync(assetPath).size;
      assert.ok(size > 0, `Empty asset: ${asset.url}`);
      if (asset.bytes !== undefined) assert.equal(size, asset.bytes, `Incorrect byte count: ${asset.url}`);
    }
    for (const download of item.downloads.filter(download => download.parts?.length)) {
      assert.ok(download.bytes > 0, `${item.slug}: split download needs its total size`);
      if (download.sha256) assert.match(download.sha256, /^[a-f0-9]{64}$/i);
      if (!download.parts.every(part => part.startsWith('/'))) continue;
      const paths = download.parts.map(part => path.resolve(root, 'public', `.${decodeURIComponent(part)}`));
      assert.equal(paths.reduce((sum, part) => sum + statSync(part).size, 0), download.bytes, `${item.slug}: incorrect combined archive bytes`);
      const bundleKey = paths.join('|');
      if (download.sha256 && !verifiedBundles.has(bundleKey)) {
        const hash = createHash('sha256');
        for (const part of paths) hash.update(readFileSync(part));
        assert.equal(hash.digest('hex'), download.sha256.toLowerCase(), `${item.slug}: incorrect combined archive SHA-256`);
        verifiedBundles.add(bundleKey);
      }
    }
  }
});
