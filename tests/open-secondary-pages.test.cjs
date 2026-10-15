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
const textContent = html => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const occurrences = (html, value) => html.split(value).length - 1;
const originalArtistNotes = {
  'public-compass': 'Social differences are evident when seen from top. Our society is divided in different patches of faith, background or religion. Only thing common between all of us-the golden patches irrespective of gender, color, faith. Gold is the true constant of human history',
  tumult: 'Depends on the perspective of the viewer,\n\nLife keeps moving till it lasts, the movement towards chaos and from chaos. See where are you heading towards it/them/him/her or away from it/them/him/her.',
  celestial: 'Questioning the endless efforts of Humans to make a dent in the universe. A universe with billions and trillions of stars & planets, where we just exist on one tiny planet. Is your life worth as much as you think it is?',
  continual: "A small marble in a bigger picture of life. We were destined to meet-\nif not today, then may be tomorrow,\nIf not here, then maybe somewhere near,\nIf not like, this then maybe like that,\nIf we didn't have a happy ending here, then we will have one there.",
  'live-life': "Depends on the perspective of the viewer,\n\nHappiness/Joy/Fulfillment is always around us, it's always about acknowledgment.",
  reminiscence: 'Inspired by people I met and care about',
};

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
    '@/lib/company-context': companyContext,
    '@/components/CvDownload': load('components/CvDownload.tsx').default,
  }).default;
  return renderToStaticMarkup(createElement(Page));
}

test('the compact CV preserves the full chronology, 25 proof links and accurate work status without unresolved metric headlines', () => {
  const html = experienceHtml();
  const visible = textContent(html);
  assert.doesNotMatch(html, /<details\b|<summary\b/);
  assert.match(html, /<h1>Priyam Sameer<\/h1>/);
  assert.ok(html.includes(escapeHtml(career.profession)));
  assert.ok(html.includes(escapeHtml(career.location)));
  assert.ok(html.includes(escapeHtml(career.summary)));
  for (const href of [`mailto:${career.contacts.email}`, career.contacts.phoneHref, career.contacts.websiteUrl, career.contacts.linkedinUrl]) assert.ok(html.includes(`href="${escapeHtml(href)}"`), href);
  for (const value of [career.contacts.email, career.contacts.phone, career.contacts.website]) assert.ok(visible.includes(escapeHtml(value)), value);
  assert.match(html, /href="\/cv\/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf" download="Priyam_Sameer_CV.pdf"/);
  assert.doesNotMatch(html, /Across the product lifecycle|What I bring|<figure\b|<video\b/);
  assert.doesNotMatch(visible, /Dates not specified|supplied material|source-reported|direct-report counts|16%|45%|40%|66%|₹5\.5|₹1\.2|3,600\+/i);
  assert.deepEqual(career.experience.map(job => [job.companyId, job.dates]), [
    ['cashkaro', 'March 2025–Present'],
    ['credflow', 'December 2024–March 2025'],
    ['absolute', 'October 2021–November 2024'],
    ['urbankhet', 'July 2019–September 2021'],
  ]);
  let previousPosition = -1;
  for (const job of career.experience) {
    const jobStart = html.indexOf(`id="${job.companyId}"`);
    assert.ok(jobStart > previousPosition, `Reverse career chronology: ${job.company}`);
    previousPosition = jobStart;
    const jobEnd = html.indexOf('</article>', jobStart);
    const account = html.slice(jobStart, jobEnd);
    assert.ok(html.includes(`id="${job.companyId}-responsibilities"`));
    assert.ok(account.includes(escapeHtml(job.dates)));
    assert.ok(account.includes(escapeHtml(job.title)), job.title);
    for (const role of job.progression) {
      assert.ok(account.includes(escapeHtml(role.title)), role.title);
      assert.ok(account.includes(escapeHtml(role.dates)), role.dates);
    }
    assert.ok(account.includes(escapeHtml(job.companyDescription)));
    for (const responsibility of job.responsibilities) {
      assert.equal(occurrences(account, escapeHtml(responsibility.text)), 1, `State responsibility once: ${responsibility.text}`);
    }
    const workSection = account.slice(account.indexOf(`id="${job.companyId}-responsibilities"`));
    assert.match(workSection, /aria-label="Related work"/);
    for (const proof of job.cases) {
      assert.ok(workSection.includes(`href="/product/${proof.slug}"`), `Proof stays with the role: ${proof.slug}`);
      assert.ok(workSection.includes(escapeHtml(proof.label)), proof.label);
    }
    const company = companyContext.getCompanyContext(job.companyId);
    for (const website of company.websites) assert.ok(account.includes(`href="${website.href}" target="_blank" rel="noopener noreferrer"`), website.label);
    if (job.companyId === 'urbankhet') assert.doesNotMatch(account, /href="https?:/);
    for (const fact of company.facts) assert.ok(!account.includes(escapeHtml(fact.value)), `Company-wide scale is omitted from the CV: ${fact.value}`);
    assert.equal((account.match(new RegExp(`id="${job.companyId}-title"`, 'g')) || []).length, 1, `One company identity: ${job.company}`);
    for (const brandId of company.brandIds) assert.equal(account.split(`src="${brands.brandAssets[brandId].src}"`).length - 1, 1, `One original logo: ${brandId}`);
  }
  assert.equal(career.experience.reduce((count, job) => count + job.progression.length, 0), 7, 'All seven dated roles remain');
  for (const expectedRole of ['Senior Manager, Product Management', 'General Manager, Product Management & Business Growth', 'Senior Product Manager', 'Product Manager', 'Principal Product Manager', 'Founder & Director']) assert.ok(visible.includes(escapeHtml(expectedRole)), expectedRole);
  for (const expectedDate of ['March 2025–March 2026', 'April 2026–Present', 'October 2021–March 2023', 'April 2023–March 2024', 'April–November 2024']) assert.ok(visible.includes(escapeHtml(expectedDate)), expectedDate);
  for (const [slug, status, label] of [
    ['cashkaro-eduloans-policy-workflow', 'prototype', 'EduLoans prototype'],
    ['cashkaro-lending-mcp-feedback', 'proposal', 'MCP proposal'],
    ['absolute-ondc-credit-infrastructure', 'proposal', 'ONDC proposal'],
  ]) {
    const study = registry.caseStudies.find(study => study.slug === slug);
    assert.equal(study?.workType, status, `Underlying work status: ${slug}`);
    assert.ok(html.includes(`href="/product/${slug}" class="caseLink">${label}</a>`), `Status visible in proof link: ${label}`);
  }
  assert.match(visible, /scripted interaction prototypes/);
  assert.match(visible, /62 rules, eight lender configurations and 23 workflow states/);
  assert.match(visible, /separate MCP policy-service proposal/);
  assert.match(visible, /separate ONDC credit proposal; lenders retained credit decisions/);
  assert.match(visible, /\$100M GMV within nine months; this is transaction value, not platform revenue/);
  const published = registry.caseStudies.filter(study => study.status !== 'draft');
  assert.equal(published.length, 25);
  for (const study of published) assert.equal(occurrences(html, `href="/product/${study.slug}"`), 1, `One on-site proof destination: ${study.slug}`);
  assert.ok(html.includes(escapeHtml(career.internship.dates)));
  assert.equal(career.internship.dates, 'May–July 2018');
  assert.ok(html.includes(escapeHtml(career.internship.title)));
  assert.ok(html.includes(escapeHtml(career.internship.description)));
  assert.ok(html.includes('href="https://waterfarmers.com/" target="_blank" rel="noopener noreferrer"'));
  assert.ok(html.includes('href="https://cept.ac.in/" target="_blank" rel="noopener noreferrer"'));
  assert.ok(html.includes(escapeHtml(career.education.degree)));
  assert.ok(html.includes(escapeHtml(career.education.dates)));
  assert.equal(career.education.dates, '2014–2019');
  assert.ok(html.includes('href="/art"'));
  for (const context of career.otherContexts) {
    assert.ok(html.includes(`id="${context.id}"`), context.id);
    assert.ok(html.includes(escapeHtml(context.title)), context.title);
    if (context.dates) assert.ok(html.includes(escapeHtml(context.dates)), context.dates);
    assert.ok(html.includes(escapeHtml(context.description)), context.description);
  }
  const support = career.experience.find(job => job.companyId === 'urbankhet').ventureSupport;
  assert.ok(html.includes(`id="${support.id}"`));
  assert.equal(occurrences(html, escapeHtml(support.text)), 1, 'Founder support is stated once with the venture');
  for (const grant of ['TIDE 2.0', 'Gujarat SSIP']) assert.equal(occurrences(visible, grant), 1, `One grant mention: ${grant}`);
  for (const recognition of career.recognitionDetails) {
    assert.equal(occurrences(visible, escapeHtml(recognition.title)), 1, recognition.title);
    assert.ok(html.includes(escapeHtml(recognition.context)), recognition.context);
  }
  for (const skill of career.skills) assert.ok(html.includes(escapeHtml(skill.description)));
  const ids = Array.from(html.matchAll(/\bid="([^"]+)"/g), match => match[1]);
  assert.equal(ids.length, new Set(ids).size, 'Every CV section anchor remains unique');
});

test('both learning entries retain issuer, dates and verification links without printing credential identifiers', () => {
  const html = experienceHtml();
  const visible = textContent(html);
  assert.equal(career.certifications.length, 2);
  for (const certification of career.certifications) {
    assert.ok(html.includes(escapeHtml(certification.title)));
    assert.ok(visible.includes(escapeHtml(certification.issuer)));
    assert.ok(html.includes(`href="${escapeHtml(certification.credentialUrl)}" target="_blank" rel="noopener noreferrer"`));
    assert.match(html, new RegExp(`datetime="${certification.issuedDate}"`, 'i'));
  }
  assert.doesNotMatch(visible, /Credential ID|UC-[a-f\d-]+|[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}/i);
});

test('contact offers four existing channels in a labelled native dialog', () => {
  const Contact = load('components/ContactChooser.tsx', { './contact-chooser.module.css': css }).default;
  const html = renderToStaticMarkup(createElement(Contact));
  assert.match(html, /<button[^>]+aria-label="Contact Priyam"[^>]+aria-haspopup="dialog"[^>]+aria-expanded="false"/);
  assert.match(html, /<dialog[^>]+aria-labelledby="[^"]+"[^>]+aria-describedby="[^"]+"/);
  assert.match(html, /Tell me about the role or product problem you have in mind\./);
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
  for (const sourceUrl of ['javascript:alert(1)', 'data:text/html,hello', 'not-a-url', 'http://example.org/source', '//example.org/source', 'https://user:secret@example.org/source']) {
    const unsafe = renderToStaticMarkup(createElement(Media, { media: { ...image, provenance: { ...image.provenance, sourceUrl } } }));
    assert.doesNotMatch(unsafe, /View original source|href=/);
  }
});

test('six paintings retain original source notes while edited public notes and detail thumbnails stay accessible', async () => {
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
  assert.equal(art.works.length, 6);
  assert.deepEqual(art.works.map(work => work.id), Object.keys(originalArtistNotes));
  for (const work of art.works) {
    assert.ok(html.includes(`id="${work.id}"`));
    assert.ok(html.includes(escapeHtml(work.medium)));
    assert.ok(html.includes(escapeHtml(work.dimensions)));
    assert.equal(work.originalStatement, originalArtistNotes[work.id], `Unedited source note is retained: ${work.title}`);
    assert.ok(work.statement.trim(), `Readable public note: ${work.title}`);
    for (const paragraph of work.statement.split(/\n\s*\n/)) assert.ok(html.includes(escapeHtml(paragraph)), work.title);
    if (work.originalStatement !== work.statement) assert.ok(!html.includes(escapeHtml(work.originalStatement)), `Do not repeat the unedited source note in public: ${work.title}`);
    assert.ok(html.includes(`href="#${work.id}"`), `Painting index reaches the work: ${work.title}`);
    for (const image of [work.image, ...work.detailImages]) {
      assert.ok(html.includes(`src="${image.previewSrc || image.src}"`), image.src);
      assert.ok(html.includes(`alt="${escapeHtml(image.alt)}" width="${image.width}" height="${image.height}"`), image.alt);
      assert.ok(html.includes(`aria-label="Enlarge image: ${escapeHtml(image.alt)}"`), `Enlargement for ${image.alt}`);
    }
  }
  assert.equal((html.match(/>Detail<\/figcaption>/g) || []).length, 6, 'Each painting has a labelled detail thumbnail');
  assert.match(html, /Talk about a painting/);
  assert.doesNotMatch(html, /ANNA|anna-cover|From the portfolio cover|Not for Sale/);
});
