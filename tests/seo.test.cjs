const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const root = path.join(__dirname, '..');
const origin = 'https://www.priyamsameer.com';
const registry = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
const empty = () => null;
const shell = ({ children }) => createElement('div', null, children);
const link = ({ children, ...props }) => createElement('a', props, children);

function fixture({ env = {}, db = async () => ({ rows: [] }) } = {}) {
  const cache = new Map();
  function load(filename) {
    const full = path.join(root, filename);
    if (cache.has(full)) return cache.get(full).exports;
    if (filename.endsWith('.json')) return JSON.parse(readFileSync(full, 'utf8'));
    const { outputText } = ts.transpileModule(readFileSync(full, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    });
    const module = { exports: {} };
    cache.set(full, module);
    const requireLocal = id => {
      if (id.endsWith('.css')) return {};
      if (id === 'next/font/local') return () => ({ variable: 'font' });
      if (id === 'next/link') return link;
      if (id === 'next/navigation') return { notFound() { throw new Error('404'); }, permanentRedirect(url) { throw new Error(`308 ${url}`); }, redirect(url) { throw new Error(`307 ${url}`); } };
      if (id === '@/lib/db') return { publicDb: db };
      if (id.startsWith('@/components/')) return id === '@/components/PublicShell' || id === '@/components/HomeMotion' ? shell : empty;
      if (id.startsWith('@/')) return load(`${id.slice(2)}${id.endsWith('.json') ? '' : '.ts'}`);
      if (id.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(full), id.endsWith('.json') ? id : `${id}.ts`)));
      return require(id);
    };
    vm.runInNewContext(outputText, { module, exports: module.exports, require: requireLocal, process: { env }, console: { error() {} }, URL }, { filename });
    return module.exports;
  }
  return { load };
}

function jsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
}

test('canonical origin is stable in previews and invalid configuration cannot expose local or credential URLs', () => {
  const seo = fixture({ env: { VERCEL_URL: 'branch-preview.vercel.app' } }).load('lib/seo.ts');
  assert.equal(seo.siteOrigin, origin);
  for (const configured of ['not a URL', 'http://localhost:3000', 'https://127.0.0.1', 'https://[::1]', 'https://user:secret@example.com', 'javascript:alert(1)']) assert.equal(seo.resolveSiteOrigin(configured), origin);
  assert.equal(seo.resolveSiteOrigin('https://www.priyamsameer.com/an/old/path?preview=1'), origin);
  assert.equal(seo.absoluteUrl('/cv'), `${origin}/cv`);
  assert.equal(seo.absoluteUrl('/'), `${origin}/`);
});

test('metadata consistently names the person and publishes absolute canonical and social URLs', async () => {
  const { load } = fixture();
  const pages = ['app/page.tsx', 'app/product/page.tsx', 'app/cv/page.tsx', 'app/art/page.tsx'];
  const paths = ['/', '/product', '/cv', '/art'];
  const titles = [];
  const descriptions = [];
  pages.forEach((page, index) => {
    const { metadata } = load(page);
    assert.equal(metadata.alternates.canonical, `${origin}${paths[index]}`);
    assert.equal(metadata.openGraph.url, metadata.alternates.canonical);
    assert.equal(metadata.openGraph.siteName, 'Priyam Sameer');
    assert.match(metadata.title.absolute, /Priyam Sameer/);
    assert.equal(metadata.twitter.title, metadata.title.absolute);
    assert.ok(metadata.description.length > 60 && metadata.description.length < 200);
    for (const image of [...metadata.openGraph.images.map(image => image.url), ...metadata.twitter.images]) assert.ok(image.startsWith(`${origin}/`), image);
    titles.push(metadata.title.absolute);
    descriptions.push(metadata.description);
  });
  assert.equal(new Set(titles).size, paths.length, 'Each primary destination has its own title');
  assert.equal(new Set(descriptions).size, paths.length, 'Each primary destination describes its own content');
  const rootMetadata = load('app/layout.tsx').metadata;
  assert.equal(rootMetadata.metadataBase.origin, origin);
  assert.equal(rootMetadata.authors[0].name, 'Priyam Sameer');
});

test('rendered identity schema names the website and links the supported person and profiles without ratings or invented awards', () => {
  const { load } = fixture();
  const Root = load('app/layout.tsx').default;
  const graph = jsonLd(renderToStaticMarkup(createElement(Root, null, 'Page')))[0]['@graph'];
  const site = graph.find(item => item['@type'] === 'WebSite');
  const person = graph.find(item => item['@type'] === 'Person');
  assert.equal(site.name, 'Priyam Sameer');
  assert.equal(site.url, `${origin}/`);
  assert.equal(site.publisher['@id'], person['@id']);
  assert.equal(person.name, 'Priyam Sameer');
  assert.equal(person.worksFor.name, 'CashKaro');
  assert.ok(person.sameAs.every(url => url.startsWith('https://www.linkedin.com/')));
  assert.doesNotMatch(JSON.stringify(graph), /aggregateRating|ratingValue|reviewCount|award|foundingDate/);
  for (const page of ['app/page.tsx', 'app/cv/page.tsx']) {
    const data = jsonLd(renderToStaticMarkup(createElement(load(page).default)))[0];
    assert.equal(data['@type'], 'ProfilePage');
    assert.equal(data.mainEntity['@id'], person['@id']);
  }
});

test('case metadata uses the same canonical title across aliases and rendered schema describes an account, preserving proposal status', async () => {
  const { load } = fixture({ db: () => assert.fail('Authored cases must not need a database') });
  const route = load('app/[category]/[id]/page.tsx');
  const presentation = load('lib/work-presentation.ts');
  for (const study of registry.caseStudies.filter(study => study.status !== 'draft')) {
    const canonical = `${origin}/product/${study.slug}`;
    const metadata = await route.generateMetadata({ params: { category: 'product', id: study.slug } });
    assert.equal(metadata.alternates.canonical, canonical);
    assert.equal(metadata.title.absolute, `${presentation.getCaseDisplayTitle(study)} — Priyam Sameer`);
    assert.equal(metadata.openGraph.url, canonical);
    assert.equal(metadata.description, study.visualSummary?.summary || study.summary);
    for (const alias of study.aliases || []) {
      const aliasMetadata = await route.generateMetadata({ params: { category: 'product', id: alias } });
      assert.equal(aliasMetadata.alternates.canonical, canonical);
      await assert.rejects(route.default({ params: { category: 'product', id: alias } }), /308 /);
    }
  }
  const slug = 'cashkaro-lending-mcp-feedback';
  const data = jsonLd(renderToStaticMarkup(await route.default({ params: { category: 'product', id: slug } })))[0];
  const account = data.find(item => item['@type'] === 'CreativeWork');
  assert.equal(account.creativeWorkStatus, 'proposal');
  assert.match(account.name, /case study$/);
  assert.equal(account.author['@id'], `${origin}/#person`);
  assert.doesNotMatch(JSON.stringify(data), /"@type":"(?:SoftwareApplication|Product)"|ratingValue|datePublished/);
  assert.deepEqual(data.find(item => item['@type'] === 'BreadcrumbList').itemListElement.map(item => item.position), [1, 2, 3]);
});

test('published legacy records prefer their stored slug, retain real publication dates and safely serialize untrusted titles', async () => {
  const title = 'A decision </script><script>alert(1)</script>';
  const item = { id: 'record-id', slug: 'a-decision', title, summary: 'The reasoning behind a product decision.', body_markdown: null, created_at: '2026-10-01T12:00:00Z', media: [] };
  const { load } = fixture({ env: { POSTGRES_URL: 'configured' }, db: async () => ({ rows: [item] }) });
  const route = load('app/[category]/[id]/page.tsx');
  const metadata = await route.generateMetadata({ params: { category: 'blog', id: item.id } });
  assert.equal(metadata.alternates.canonical, `${origin}/blog/a-decision`);
  const html = renderToStaticMarkup(await route.default({ params: { category: 'blog', id: item.id } }));
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  const account = jsonLd(html)[0].find(item => item['@type'] === 'CreativeWork');
  assert.equal(account.name, title);
  assert.equal(account.datePublished, '2026-10-01T12:00:00.000Z');
  assert.equal(account.author, undefined, 'A CMS publication date is not an authorship claim');
  const seo = load('lib/seo.ts');
  const art = seo.creativeWorkStructuredData({ path: '/art#tumult', title: 'Tumult', author: true });
  assert.equal(art['@id'], `${origin}/art#tumult-work`);
  assert.equal(art.mainEntityOfPage, `${origin}/art`);
  assert.equal(art.datePublished, undefined, 'No painting completion date is invented');
});

test('empty Writing and source archives remain crawlable but are not separately indexed', async () => {
  const { load } = fixture();
  const writing = await load('app/blog/page.tsx').generateMetadata();
  assert.equal(writing.robots.index, false);
  assert.equal(writing.robots.follow, true);
  const reference = load('app/product/[slug]/references/page.tsx').generateMetadata({ params: { slug: 'cashkaro-eduloans-policy-workflow' } });
  assert.equal(reference.robots.index, false);
  assert.equal(reference.robots.follow, true);
  assert.equal(reference.alternates.canonical, `${origin}/product/cashkaro-eduloans-policy-workflow/references`);
  const populated = fixture({ env: { POSTGRES_URL: 'configured' }, db: async () => ({ rows: [{ id: 'one', title: 'A decision', slug: 'a-decision' }] }) });
  assert.equal((await populated.load('app/blog/page.tsx').generateMetadata()).robots, undefined);
  const unavailable = fixture({ env: { POSTGRES_URL: 'configured' }, db: async () => { throw new Error('Unavailable'); } });
  assert.equal((await unavailable.load('app/blog/page.tsx').generateMetadata()).robots, undefined, 'A transient connection failure must not add a new noindex directive');
});

test('sitemap exposes every canonical authored case once and excludes aliases, archives, downloads, private routes and empty Writing', async () => {
  const { load } = fixture({ db: () => assert.fail('An unconfigured sitemap must not query') });
  const entries = await load('app/sitemap.ts').default();
  const urls = entries.map(entry => entry.url);
  assert.equal(entries.length, 29, 'Four authored destinations and all 25 canonical cases');
  assert.equal(new Set(urls).size, entries.length);
  for (const study of registry.caseStudies.filter(study => study.status !== 'draft')) {
    assert.ok(urls.includes(`${origin}/product/${study.slug}`));
    for (const alias of study.aliases || []) assert.ok(!urls.includes(`${origin}/product/${alias}`));
  }
  for (const url of urls) assert.doesNotMatch(url, /minforyam|\/api\/|\/references|\.pdf|\.zip|moneylion|\/blog$/i);
  assert.ok(entries.every(entry => entry.lastModified === undefined), 'No build timestamp pretends to be a content edit');
  const robots = load('app/robots.ts').default();
  assert.equal(robots.sitemap, `${origin}/sitemap.xml`);
  assert.equal(robots.host, origin);
  assert.deepEqual(Array.from(robots.rules.disallow), ['/minforyam', '/api/']);
  assert.ok(!robots.rules.disallow.some(path => /cv|references/.test(path)), 'noindex resources must remain crawlable');
});

test('sitemap adds only published CMS destinations using actual update dates and survives an unavailable database', async () => {
  let sql;
  const rows = [
    { id: 'essay-id', slug: 'a-decision', type: 'blog', updated_at: '2026-10-01T12:00:00Z' },
    { id: 'art-id', slug: null, type: 'art', updated_at: 'not-a-date' },
    { id: 'duplicate', slug: registry.caseStudies[0].aliases?.[0] || registry.caseStudies[0].slug, type: 'work' },
    { id: 'retired', slug: 'moneylion-wow-strategy', type: 'work' },
  ];
  const { load } = fixture({ env: { POSTGRES_URL: 'configured' }, db: async strings => { sql = strings.join('?'); return { rows }; } });
  const entries = await load('app/sitemap.ts').default();
  assert.match(sql, /status = 'published'/);
  assert.ok(entries.some(entry => entry.url === `${origin}/blog`));
  assert.equal(entries.find(entry => entry.url === `${origin}/blog/a-decision`).lastModified.toISOString(), '2026-10-01T12:00:00.000Z');
  assert.equal(entries.find(entry => entry.url === `${origin}/art/art-id`).lastModified, undefined);
  assert.equal(entries.filter(entry => entry.url.includes('/product/')).length, 25);
  const failed = fixture({ env: { POSTGRES_URL: 'configured' }, db: async () => { throw new Error('Unavailable'); } });
  assert.equal((await failed.load('app/sitemap.ts').default()).length, 29);
});
