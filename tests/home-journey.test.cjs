const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const EmailContact = require('./helpers/email-contact.cjs');

const root = path.join(__dirname, '..');
const css = new Proxy({}, { get: (_, name) => name === '__esModule' ? false : String(name) });
const link = ({ children, ...props }) => createElement('a', props, children);
const registry = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
function load(filename, stubs = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path.join(root, filename), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { module, exports: module.exports, URL,
    require: id => id === '@/lib/seo' ? require('./helpers/seo.cjs') : id === '@/components/Icon' ? require('./helpers/icon.cjs') : Object.hasOwn(stubs, id) ? stubs[id] : require(id),
  }, { filename });
  return module.exports;
}
const CvDownload = require('./helpers/cv-download.cjs');
const BrandMarks = load('components/BrandMarks.tsx', {
  '@/lib/brands': load('lib/brands.ts'), './brand-marks.module.css': css,
}).default;
const ContactChooser = load('components/ContactChooser.tsx', { './contact-chooser.module.css': css, './EmailContact': EmailContact }).default;
const Header = load('components/Header.tsx', {
  'next/link': link, 'next/navigation': { usePathname: () => '/' },
  './CvDownload': CvDownload, './ContactChooser': ContactChooser, './site-chrome.module.css': css,
}).default;
const home = load('app/page.tsx', {
  'next/link': link,
  '@/lib/work': { findCaseStudy: slug => registry.caseStudies.find(study => study.slug === slug) },
  '@/components/Header': Header,
  '@/components/Footer': load('components/Footer.tsx', { './site-chrome.module.css': css, './EmailContact': EmailContact }).default,
  '@/components/PublicShell': load('components/PublicShell.tsx', { '@/components/SiteAnalytics': () => null }).default,
  '@/components/BrandMarks': BrandMarks,
  '@/components/CvDownload': CvDownload,
  '@/components/HomeMotion': load('components/HomeMotion.tsx', { './home-motion.module.css': css }).default,
  '@/lib/work-presentation': load('lib/work-presentation.ts'),
  '@/components/work/Media': load('components/work/Media.tsx', { './work.module.css': css }).default,
  './home.module.css': css,
});

// A small markup tree lets these checks inspect actual ancestor relationships,
// rather than mistaking a sibling icon's aria-hidden attribute for hidden media.
function markupTree(html) {
  const nodes = [], stack = [];
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  for (const match of html.matchAll(/<(\/?)([a-z][\w-]*)\b([^>]*)>/gi)) {
    const tag = match[2].toLowerCase();
    if (match[1]) {
      const index = stack.findLastIndex(node => node.tag === tag);
      if (index >= 0) { stack[index].end = match.index + match[0].length; stack.length = index; }
      continue;
    }
    const attributes = Object.fromEntries(Array.from(match[3].matchAll(/([\w:-]+)(?:="([^"]*)"|'([^']*)'|=([^\s>]+))?/g), attribute => [attribute[1], attribute[2] ?? attribute[3] ?? attribute[4] ?? '']));
    const node = { tag, attributes, parent: stack.at(-1), start: match.index, end: match.index + match[0].length };
    nodes.push(node);
    if (!voidTags.has(tag) && !match[3].endsWith('/')) stack.push(node);
  }
  return nodes;
}
function ancestor(node, tag) {
  for (let current = node.parent; current; current = current.parent) if (current.tag === tag) return current;
}
const html = renderToStaticMarkup(createElement(home.default));
const nodes = markupTree(html);
const content = node => html.slice(node.start, node.end);
const textContent = node => content(node).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const study = slug => registry.caseStudies.find(item => item.slug === slug);
const source = (slug, id) => study(slug).media.find(media => media.id === id).src;
const image = src => nodes.find(node => node.tag === 'img' && node.attributes.src === src);
const project = slug => {
  const action = nodes.find(node => node.tag === 'a' && node.attributes.href === `/product/${slug}` && ancestor(node, 'article'));
  assert.ok(action, `${slug}: its essential story and optional case action are on Home`);
  return ancestor(action, 'article');
};
const descendant = (node, parent) => {
  for (let current = node.parent; current; current = current.parent) if (current === parent) return true;
  return false;
};
const delivered = ['cashkaro-college-money-education-loans', 'absolute-crop-health-ai', 'urbankhet-farm-to-fork'];
const exploration = ['cashkaro-eduloans-policy-workflow', 'cashkaro-lending-mcp-feedback'];

test('the opening establishes agriculture, AI and fintech without a repeated biography or project cards', () => {
  const heading = nodes.find(node => node.tag === 'h1');
  assert.match(textContent(heading), /Agriculture\.\s*AI\.\s*Fintech\./);
  assert.doesNotMatch(textContent(heading), /fresh produce|lending products/);
  const introduction = ancestor(heading, 'section');
  assert.match(textContent(introduction), /Bengaluru/);
  assert.doesNotMatch(textContent(introduction), /I’m|General Manager|I founded|I build/);
  assert.ok(textContent(introduction).split(/\s+/).length < 70, 'The first read stays concise');
  assert.doesNotMatch(textContent(introduction), /Priyam Sameer|Product leader|\bps\./);
  assert.doesNotMatch(html, />ps\.</, 'Home uses the wordmark without a competing monogram');
  assert.match(content(introduction), /href="#selected-work"/);
  assert.ok(!nodes.some(node => node.tag === 'article' && descendant(node, introduction)), 'Project accounts begin after the introduction');
  assert.ok(!nodes.some(node => node.tag === 'a' && node.attributes.href?.startsWith('/product') && descendant(node, introduction)), 'The hero introduces the person rather than a case study');
  const selected = nodes.find(node => node.tag === 'section' && node.attributes.id === 'selected-work');
  assert.ok(selected && selected.start >= introduction.end, 'Selected work has its own section after the hero');
  assert.equal(selected.attributes.tabindex, '-1', 'The work jump can transfer keyboard focus');
  const downloads = nodes.filter(node => node.tag === 'button' && node.attributes['aria-label'] === 'Download CV');
  assert.equal(downloads.length, 1, 'A single prominent CV download remains in the header');
  assert.equal(downloads[0].attributes['aria-haspopup'], 'dialog');
  const cvDialog = nodes.find(node => node.tag === 'dialog' && node.attributes.id === downloads[0].attributes['aria-controls']);
  assert.ok(cvDialog, 'The CV button opens its labelled email request dialog');
  assert.ok(!nodes.some(node => node.tag === 'a' && node.attributes.href === CvDownload.CV_DOWNLOAD_URL), 'The file is not linked before email capture');
  assert.equal(ancestor(downloads[0], 'header')?.attributes.id, 'nav-header');
  assert.doesNotMatch(html, /How I can help|Where I can help|how-i-can-help|work-conversation/);
  assert.ok(nodes.some(node => node.tag === 'a' && node.attributes.href === '/cv'));
  assert.ok(nodes.some(node => node.tag === 'button' && node.attributes['aria-label'] === 'Contact Priyam' && node.attributes['aria-haspopup'] === 'dialog'));
  assert.doesNotMatch(html, /40%|500K|3,600|145 passing|16%|45%|CredFlow|src="\/brands\/bankkaro\.png"|src="\/brands\/upaj-black\.svg"/);
  assert.ok(!nodes.some(node => node.tag === 'a' && node.attributes.href === '/blog'), 'An empty Writing destination is not in primary navigation');
});

test('the shared header uses the same quiet wordmark on Home and inner pages', () => {
  for (const props of [{}, { wordmarkOnly: true }]) {
    const header = renderToStaticMarkup(createElement(Header, props));
    assert.doesNotMatch(header, />ps\.</, 'An inner page must not restore a competing identity mark');
    assert.equal((header.match(/aria-label="Priyam Sameer — home"/g) || []).length, 1);
    assert.match(header, /Download CV/);
    assert.match(header, /Contact Priyam/);
  }
});

test('the compact CV footer does not repeat its already complete contact record', () => {
  const Footer = load('components/Footer.tsx', { './site-chrome.module.css': css, './EmailContact': EmailContact }).default;
  const compact = renderToStaticMarkup(createElement(Footer, { compact: true }));
  assert.match(compact, /Priyam Sameer/);
  assert.doesNotMatch(compact, /mailto:|tel:|Copy email|Let’s talk|linkedin/);
  const normal = renderToStaticMarkup(createElement(Footer));
  assert.match(normal, /Let’s talk/);
  assert.match(normal, /mailto:Priyam.Sameer.95@gmail.com/);
});

test('native context jumps reach open, focusable project accounts without filtering out other work', () => {
  const navigation = nodes.find(node => node.tag === 'nav' && node.attributes['aria-label'] === 'Work by context');
  assert.ok(navigation, 'Readers can jump to their relevant context');
  const paths = nodes.filter(node => node.tag === 'a' && descendant(node, navigation));
  assert.equal(paths.length, 3);
  assert.ok(!nodes.some(node => node.tag === 'button' && descendant(node, navigation)), 'Context choices are navigation rather than visibility controls');
  for (const [label, slug] of [
    [/Lending/, 'cashkaro-college-money-education-loans'],
    [/Agriculture/, 'absolute-crop-health-ai'],
    [/Founder/, 'urbankhet-farm-to-fork'],
  ]) {
    const action = paths.find(node => label.test(textContent(node)));
    assert.ok(action?.attributes.href?.startsWith('#'), `${slug}: uses an ordinary same-page anchor`);
    const target = nodes.find(node => node.attributes.id === action.attributes.href.slice(1));
    assert.equal(target, project(slug), `${slug}: reaches its own account`);
    assert.equal(target.attributes.tabindex, '-1', `${slug}: can receive keyboard focus`);
    assert.ok(!Object.hasOwn(action.attributes, 'aria-controls') && action.attributes.role !== 'tab');
  }
});

test('the lending sequence connects delivered work to distinct prototype and proposal accounts before agriculture and founder work', () => {
  const journey = [delivered[0], ...exploration, delivered[1], delivered[2]];
  const projects = journey.map(project);
  assert.equal(new Set(projects).size, 5, 'The five projects have separate article boundaries');
  for (let index = 1; index < projects.length; index++) assert.ok(projects[index - 1].end <= projects[index].start, `${journey[index]} follows the preceding account without nesting it`);
  const selected = nodes.find(node => node.tag === 'section' && node.attributes.id === 'selected-work');
  for (const article of projects) {
    assert.ok(descendant(article, selected), 'The complete accounts stay together in the visible work section');
    const figure = nodes.find(node => node.tag === 'figure' && descendant(node, article));
    const heading = nodes.find(node => /^h[2-4]$/.test(node.tag) && descendant(node, article));
    assert.ok(figure && heading && heading.start < figure.start);
    assert.equal(article.attributes['aria-labelledby'], heading.attributes.id, 'Each project is labelled by its own visible heading');
    assert.match(textContent(article), /\bI (?:owned|worked|built|authored|proposed|connected)\b/);
  }
  for (const [slug, consequentialChoice] of [
    [delivered[0], /case.*lender.*assess/i],
    [exploration[0], /missing policy.*visible/i],
    [exploration[1], /separate evaluation.*policy changes/i],
    [delivered[1], /capture offline.*diagnose after reconnection/i],
    [delivered[2], /terrace farming.*direct produce supply/i],
  ]) assert.match(textContent(project(slug)), consequentialChoice, `${slug}: the choice is inspectable without opening the case`);
  for (const slug of delivered) assert.equal(study(slug).workType, 'delivered');
  assert.equal(study(exploration[0]).workType, 'prototype');
  assert.equal(study(exploration[1]).workType, 'proposal');
  const collegeArticle = project(delivered[0]);
  assert.match(textContent(collegeArticle), /Delivered work/);
  assert.match(textContent(collegeArticle), /student information, documents, pre-checks and routing/);
  assert.match(textContent(collegeArticle), /owned the lending journey, partner commercials and operations/);
  const cropArticle = project('absolute-crop-health-ai');
  const cropFigure = nodes.find(node => node.tag === 'figure' && descendant(node, cropArticle));
  const cropAsset = study('absolute-crop-health-ai').media.find(media => media.id === 'upaj-growstac-advisory');
  assert.equal(cropAsset.category, 'product-screenshot');
  assert.equal(cropAsset.provenance.kind, 'current-public');
  assert.ok(image(cropAsset.src) && descendant(image(cropAsset.src), cropFigure), 'Absolute uses the reviewed public product capture');
  assert.match(content(cropFigure), /GrowStac.*current page/);
  assert.match(content(cropFigure), /not the historical diagnosis interface/);
  assert.match(content(cropFigure), /Current public reference/);
  assert.match(textContent(cropArticle), /Absolute, 2021–2024/);
  assert.match(textContent(cropArticle), /Capture offline.*Diagnose after reconnection/);
  assert.match(textContent(cropArticle), /engineering, modelling and agronomy.*field capture.*network availability/);
  assert.ok(cropFigure.end < html.indexOf('I worked with', cropArticle.start), 'The company introduction and visual precede the historical responsibility account');
  const urbanArticle = project('urbankhet-farm-to-fork');
  const urbanVideo = nodes.find(node => node.tag === 'video' && descendant(node, urbanArticle));
  assert.match(textContent(urbanArticle), /founder venture, 2019–2021/);
  assert.match(textContent(urbanArticle), /household subscriptions and business supply.*sourcing and delivery/);
  assert.match(textContent(urbanArticle), /owning the customer offer, operation and P&amp;L/);
  assert.ok(html.indexOf('I built', urbanArticle.start) < urbanVideo.start, 'UrbanKhet explains founder ownership before its walkthrough');
  for (const [slug, id] of [
    ['cashkaro-college-money-education-loans', 'college-money-abroad-hero-final'],
    ['cashkaro-eduloans-policy-workflow', 'eduloans-prototype-inspector'],
    ['cashkaro-lending-mcp-feedback', 'lending-mcp-proposal'],
  ]) {
    const preview = image(source(slug, id));
    assert.ok(preview && descendant(preview, project(slug)), `${slug}: reviewed primary evidence stays with its account`);
  }
  assert.match(content(project(exploration[0])), /Interaction prototype/);
  assert.match(content(project(exploration[0])), /sample records and scripted responses/);
  assert.match(content(project(exploration[0])), /Unconfirmed thresholds.*release restrictions/);
  assert.match(content(project(exploration[0])), /uncertain documents require human verification/);
  assert.match(content(project(exploration[1])), /Design proposal/);
  assert.match(content(project(exploration[1])), /shared, versioned evaluation for two rule engines/);
  assert.match(content(project(exploration[1])), /policy changes require separate approval/);
  assert.match(content(project(exploration[1])), /conventional service API.*alternative/);
  const programmeResult = nodes.find(node => node.tag === 'aside' && /\$100M GMV/.test(content(node)));
  assert.ok(programmeResult);
  assert.ok(programmeResult.start > projects.at(-1).end, 'The qualified trading result follows the primary accounts');
  assert.match(content(programmeResult), /Programme-reported scale in nine months/);
  assert.ok(html.includes('href="/product/absolute-silkroute-marketplace"'));
  const evidence = nodes.filter(node => ['img', 'video'].includes(node.tag) && ancestor(node, 'figure') && ancestor(node, 'article'));
  assert.ok(evidence.length >= 5);
  for (const media of evidence) {
    if (media.tag === 'img') {
      assert.ok(existsSync(path.join(root, 'public', media.attributes.src)));
      assert.ok(Number(media.attributes.width) > 0 && Number(media.attributes.height) > 0);
      assert.equal(ancestor(media, 'button')?.attributes['aria-haspopup'], 'dialog');
    } else {
      assert.ok(Object.hasOwn(media.attributes, 'controls') && Object.hasOwn(media.attributes, 'playsinline'));
      assert.ok(!Object.hasOwn(media.attributes, 'autoplay'));
      assert.ok(existsSync(path.join(root, 'public', media.attributes.poster)));
      const file = nodes.find(node => node.tag === 'source' && descendant(node, media));
      assert.ok(file && existsSync(path.join(root, 'public', file.attributes.src)));
    }
    for (let current = media; current; current = current.parent) {
      assert.ok(!Object.hasOwn(current.attributes, 'hidden') && current.attributes['aria-hidden'] !== 'true');
      assert.ok(!['details', 'dialog'].includes(current.tag));
      assert.ok(!Object.hasOwn(current.attributes, 'data-reveal'));
    }
  }
});

test('the hero shows a full original painting and the shared footer offers direct email and copying', () => {
  const painting = nodes.find(node => node.tag === 'img' && node.attributes.src.startsWith('/art/priyam/'));
  assert.ok(painting && existsSync(path.join(root, 'public', painting.attributes.src)));
  assert.equal(painting.attributes.src, '/art/priyam/tumult-preview.webp');
  assert.equal(Number(painting.attributes.width), 785);
  assert.equal(Number(painting.attributes.height), 1000);
  assert.equal(ancestor(painting, 'a').attributes.href, '/art#tumult');
  const introduction = ancestor(nodes.find(node => node.tag === 'h1'), 'section');
  assert.ok(descendant(painting, introduction), 'The painting is part of the introduction rather than another work card');
  assert.ok(ancestor(painting, 'figure'), 'The full painting keeps its visible caption');
  assert.match(html, /Original painting/);
  const footer = nodes.find(node => node.tag === 'footer');
  assert.ok(footer && footer.start > projectsEnd(), 'The contact invitation follows the work and experience');
  assert.match(content(footer), /mailto:Priyam.Sameer.95@gmail.com/);
  assert.match(content(footer), /aria-label="Copy email address"/);
  assert.equal(nodes.filter(node => node.tag === 'footer').length, 1);
  const experienceLink = nodes.find(node => node.tag === 'a' && node.attributes.href === '/cv' && ancestor(node, 'main'));
  assert.ok(experienceLink && experienceLink.start > projectsEnd() && experienceLink.start < footer.start, 'The full career remains accessible after the work, before contact');
  assert.equal(nodes.filter(node => node.tag === 'article').length, 5, 'The homepage does not repeat the project organizations as another career grid');
});

function projectsEnd() {
  return Math.max(...[...delivered, ...exploration].map(slug => project(slug).end));
}
