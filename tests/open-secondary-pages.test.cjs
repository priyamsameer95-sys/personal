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
    module, exports: module.exports, process: { env: {} }, console,
    require: id => Object.hasOwn(stubs, id) ? stubs[id] : require(id),
  }, { filename });
  return module.exports;
}

const brands = load('lib/brands.ts');
const BrandMarks = load('components/BrandMarks.tsx', { '@/lib/brands': brands, './brand-marks.module.css': css }).default;
const shared = {
  'next/link': link,
  '@/components/Header': empty,
  '@/components/Footer': empty,
  '@/components/PublicShell': shell,
  '@/components/BrandMarks': BrandMarks,
};

function experienceHtml() {
  const Page = load('app/cv/page.tsx', {
    ...shared, './content.json': career, './cv.module.css': css,
    '@/lib/work': { findCaseStudy: slug => registry.caseStudies.find(study => study.slug === slug) },
    '@/components/CvDownload': load('components/CvDownload.tsx').default,
  }).default;
  return renderToStaticMarkup(createElement(Page));
}

test('the open Experience account preserves chronology, qualifications and related work without repeating responsibilities', () => {
  const html = experienceHtml();
  assert.doesNotMatch(html, /<details\b|<summary\b/);
  assert.match(html, /href="\/cv\/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf" download="Priyam_Sameer_CV.pdf"/);
  for (const job of career.experience) {
    assert.ok(html.includes(`id="${job.companyId}"`));
    assert.ok(html.includes(`id="${job.companyId}-responsibilities"`));
    assert.ok(html.includes(escapeHtml(job.dates)));
    for (const role of job.progression) assert.ok(html.includes(escapeHtml(role.title)), role.title);
    for (const responsibility of job.responsibilities) {
      const text = escapeHtml(responsibility.text);
      assert.equal(html.split(text).length - 1, 1, `State responsibility once: ${responsibility.text}`);
      for (const slug of responsibility.cases) assert.ok(html.includes(`href="/product/${slug}"`), slug);
      for (const field of ['result', 'note']) if (responsibility[field]) assert.ok(html.includes(escapeHtml(responsibility[field])), responsibility[field]);
    }
    assert.ok(html.includes(escapeHtml(job.leadershipNote)), job.leadershipNote);
  }
  for (const fact of ['MoEngage', 'MIS', 'recruitment', 'payment-failure analysis', 'SOP', 'Jira', 'Brazil and Malaysia']) assert.ok(html.includes(fact), fact);
  assert.ok(html.includes(escapeHtml(career.internship.dates)));
  assert.ok(html.includes(escapeHtml(career.education.degree)));
  for (const skill of career.skills) assert.ok(html.includes(escapeHtml(skill.description)));
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
