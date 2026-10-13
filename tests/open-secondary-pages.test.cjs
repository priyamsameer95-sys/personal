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
const shell = ({ children }) => createElement('div', null, children);
const link = ({ children, ...props }) => createElement('a', props, children);
const empty = () => null;
const json = filename => JSON.parse(readFileSync(path.join(root, filename), 'utf8'));
const career = json('app/cv/content.json');
const art = json('content/art/works.json');
const registry = json('content/work/case-studies.json');
const escapeHtml = text => String(text).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' })[character]);

function load(filename, stubs = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path.join(root, filename), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports, process: { env: {} }, console, URL,
    require: id => Object.hasOwn(stubs, id) ? stubs[id] : require(id),
  }, { filename });
  return module.exports;
}

const brands = load('lib/brands.ts');
const BrandMarks = load('components/BrandMarks.tsx', { '@/lib/brands': brands, './brand-marks.module.css': css }).default;
const companyContext = load('lib/company-context.ts');
const CompanyContext = load('components/CompanyContext.tsx', {
  './BrandMarks': BrandMarks, '@/lib/company-context': companyContext, './company-context.module.css': css,
}).default;
const shared = {
  'next/link': link,
  '@/components/Header': empty,
  '@/components/Footer': empty,
  '@/components/PublicShell': shell,
  '@/components/BrandMarks': BrandMarks,
  '@/components/CompanyContext': CompanyContext,
};

function experienceHtml() {
  const Page = load('app/cv/page.tsx', {
    ...shared, './content.json': career, './cv.module.css': css,
    '@/lib/work': { findCaseStudy: slug => registry.caseStudies.find(study => study.slug === slug) },
    '@/lib/company-context': companyContext,
    '@/components/CvDownload': load('components/CvDownload.tsx').default,
  }).default;
  return renderToStaticMarkup(createElement(Page));
}

test('the CV preserves career facts and inline proof without company scale panels or repeated responsibility chapters', () => {
  const html = experienceHtml();
  assert.doesNotMatch(html, /<details\b|<summary\b/);
  assert.match(html, /<h1>Priyam Sameer<\/h1>/);
  assert.ok(html.includes('href="mailto:Priyam.Sameer.95@gmail.com"'));
  assert.ok(html.includes('href="https://www.linkedin.com/in/priyam-sameer"'));
  assert.match(html, /href="\/cv\/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf" download="Priyam_Sameer_CV.pdf"/);
  assert.doesNotMatch(html, /Across the product lifecycle|What I bring|<figure\b|<video\b/);
  for (const job of career.experience) {
    assert.ok(html.includes(`id="${job.companyId}"`));
    assert.ok(html.includes(`id="${job.companyId}-responsibilities"`));
    assert.ok(html.includes(`id="${job.companyId}-work-title"`));
    assert.ok(html.includes(escapeHtml(job.dates)));
    assert.ok(html.includes(escapeHtml(job.title)), job.title);
    for (const role of job.progression) {
      assert.ok(html.includes(escapeHtml(role.title)), role.title);
      assert.ok(html.includes(escapeHtml(role.dates)), role.dates);
      if (job.progression.length > 1) assert.ok(html.includes(escapeHtml(role.detail)), role.detail);
    }
    const jobStart = html.indexOf(`id="${job.companyId}"`);
    const jobEnd = html.indexOf('</article>', jobStart);
    const account = html.slice(jobStart, jobEnd);
    const responsibilityRows = Array.from(account.matchAll(/<li>([\s\S]*?)<\/li>/g), match => match[1]);
    for (const responsibility of job.responsibilities) {
      // CV sentences omit the opening pronoun while retaining the factual account.
      const text = escapeHtml(responsibility.text.replace(/^I /, '')).toLowerCase();
      assert.equal(account.toLowerCase().split(text).length - 1, 1, `State responsibility once: ${responsibility.text}`);
      const row = responsibilityRows.find(row => row.toLowerCase().includes(text));
      assert.ok(row, responsibility.text);
      for (const slug of responsibility.cases) assert.ok(row.includes(`href="/product/${slug}"`), `Inline proof beside the responsibility: ${slug}`);
      for (const field of ['result', 'note']) if (responsibility[field]) assert.ok(row.includes(escapeHtml(responsibility[field])), `Qualification stays beside its claim: ${responsibility[field]}`);
    }
    assert.ok(html.includes(escapeHtml(job.leadershipNote)), job.leadershipNote);
    const company = companyContext.getCompanyContext(job.companyId);
    for (const website of company.websites) assert.ok(account.includes(`href="${website.href}" target="_blank" rel="noopener noreferrer"`), website.label);
    if (job.companyId === 'urbankhet') assert.doesNotMatch(account, /href="https?:/);
    for (const fact of company.facts) assert.ok(!account.includes(escapeHtml(fact.value)), `Company-wide scale is omitted from the CV: ${fact.value}`);
    assert.equal((account.match(new RegExp(`id="${job.companyId}-title"`, 'g')) || []).length, 1, `One company identity: ${job.company}`);
    for (const brandId of company.brandIds) assert.equal(account.split(`src="${brands.brandAssets[brandId].src}"`).length - 1, 1, `One original logo: ${brandId}`);
  }
  for (const fact of ['MoEngage', 'MIS', 'recruitment', 'payment-failure analysis', 'SOP', 'Jira', 'Brazil and Malaysia']) assert.ok(html.includes(fact), fact);
  assert.ok(html.includes(escapeHtml(career.internship.dates)));
  assert.ok(html.includes('href="https://waterfarmers.com/" target="_blank" rel="noopener noreferrer"'));
  for (const href of ['https://iimaventures.com/', 'https://gusec.edu.in/', 'https://cept.ac.in/']) assert.ok(html.includes(`href="${href}" target="_blank" rel="noopener noreferrer"`), href);
  assert.ok(html.includes('Aquaponics farm design and operations.'));
  assert.ok(html.includes(escapeHtml(career.internship.scope)));
  assert.ok(html.includes(escapeHtml(career.education.degree)));
  assert.ok(html.includes(escapeHtml(career.education.dates)));
  for (const context of career.otherContexts) {
    assert.ok(html.includes(escapeHtml(context.title)), context.title);
    assert.ok(html.includes(escapeHtml(context.dates)), context.dates);
    assert.ok(html.includes(escapeHtml(context.description)), context.description);
  }
  for (const recognition of career.recognitionDetails) {
    assert.ok(html.includes(escapeHtml(recognition.title)), recognition.title);
    assert.ok(html.includes(escapeHtml(recognition.context)), recognition.context);
  }
  for (const skill of career.skills) assert.ok(html.includes(escapeHtml(skill.description)));
  const ids = Array.from(html.matchAll(/\bid="([^"]+)"/g), match => match[1]);
  assert.equal(ids.length, new Set(ids).size, 'Every CV section anchor remains unique');
});

test('both certifications expose their credential IDs, original issuer logos and verification links', () => {
  const html = experienceHtml();
  for (const certification of career.certifications) {
    assert.ok(html.includes(escapeHtml(certification.title)));
    assert.ok(html.includes(escapeHtml(certification.credentialId)));
    assert.ok(html.includes(`href="${escapeHtml(certification.credentialUrl)}" target="_blank" rel="noopener noreferrer"`));
    assert.match(html, new RegExp(`datetime="${certification.issuedDate}"`, 'i'));
    assert.ok(html.includes(`/brands/${certification.brandId}`), certification.brandId);
  }
});

test('contact offers four existing channels in a labelled native dialog', () => {
  const Contact = load('components/ContactChooser.tsx', { './contact-chooser.module.css': css }).default;
  const html = renderToStaticMarkup(createElement(Contact));
  assert.match(html, /<button[^>]+aria-label="Contact Priyam"[^>]+aria-haspopup="dialog"[^>]+aria-expanded="false"/);
  assert.match(html, /<dialog[^>]+aria-labelledby="[^"]+"[^>]+aria-describedby="[^"]+"/);
  assert.match(html, /Choose the channel that works for you\./);
  assert.match(html, /aria-label="Close contact options"/);
  for (const href of ['mailto:Priyam.Sameer.95@gmail.com', 'https://www.linkedin.com/in/priyam-sameer', 'https://wa.me/918238452277', 'tel:+918238452277']) assert.ok(html.includes(`href="${href}"`), href);
  assert.equal((html.match(/<a\b/g) || []).length, 4);
  assert.equal((html.match(/rel="noopener noreferrer"/g) || []).length, 2);
});

test('original media source links retain provenance and reject unsafe source URLs', () => {
  const Media = load('components/work/Media.tsx', { './work.module.css': css }).default;
  const image = { id: 'original-photo', kind: 'image', category: 'photograph', src: '/work/original.jpg', alt: 'Company farm photograph', width: 1280, height: 960, caption: 'Original company image; capture date unspecified.', provenance: { kind: 'historical', label: 'UrbanKhet LinkedIn company page', sourceUrl: 'https://www.linkedin.com/company/khet-inc/' } };
  const html = renderToStaticMarkup(createElement(Media, { media: image }));
  assert.match(html, /href="https:\/\/www.linkedin.com\/company\/khet-inc\/" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /View original source/);
  assert.match(html, /capture date unspecified/);
  for (const sourceUrl of ['javascript:alert(1)', 'data:text/html,hello', 'not-a-url']) {
    const unsafe = renderToStaticMarkup(createElement(Media, { media: { ...image, provenance: { ...image.provenance, sourceUrl } } }));
    assert.doesNotMatch(unsafe, /View original source|href=/);
  }
});

test('all supplied Art notes and close-ups render openly with original image proportions and cover distinction', async () => {
  const Media = load('components/work/Media.tsx', { './work.module.css': css }).default;
  const ArtGallery = load('components/art/ArtGallery.tsx', { '@/components/work/Media': Media, './art-gallery.module.css': css }).default;
  const Page = load('app/art/page.tsx', {
    ...shared, './art.module.css': css,
    '@/lib/db': { publicDb: () => assert.fail('The supplied art portfolio must work without a database') },
    '@/lib/content': { contentExcerpt: value => value || '' },
    '@/components/art/ArtGallery': ArtGallery,
    '@/components/work/Media': Media,
    '@/content/art/works': { artCollections: art.collections, artworks: art.works, portfolioCover: art.portfolioCover },
  }).default;
  const html = renderToStaticMarkup(await Page());
  assert.doesNotMatch(html, /<details\b|<summary\b/);
  assert.equal((html.match(/<article\b/g) || []).length, 6);
  for (const work of art.works) {
    assert.ok(html.includes(`id="${work.id}"`));
    assert.ok(html.includes(escapeHtml(work.medium)));
    assert.ok(html.includes(escapeHtml(work.dimensions)));
    for (const paragraph of work.statement.split(/\n\s*\n/)) assert.ok(html.includes(escapeHtml(paragraph)), work.title);
    for (const image of [work.image, ...work.detailImages]) {
      assert.ok(html.includes(`src="${image.previewSrc || image.src}"`), image.src);
      assert.ok(html.includes(`alt="${escapeHtml(image.alt)}" width="${image.width}" height="${image.height}"`), image.alt);
    }
  }
  assert.ok(html.includes('Not for Sale'));
  assert.ok(html.includes('From the portfolio cover'));
  assert.ok(html.includes('Labelled “ANNA”'));
});
