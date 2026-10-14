const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

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
    require: id => Object.hasOwn(stubs, id) ? stubs[id] : require(id),
  }, { filename });
  return module.exports;
}
const CvDownload = load('components/CvDownload.tsx');
const BrandMarks = load('components/BrandMarks.tsx', {
  '@/lib/brands': load('lib/brands.ts'), './brand-marks.module.css': css,
}).default;
const ContactChooser = load('components/ContactChooser.tsx', { './contact-chooser.module.css': css }).default;
const Header = load('components/Header.tsx', {
  'next/link': link, 'next/navigation': { usePathname: () => '/' },
  './CvDownload': CvDownload, './ContactChooser': ContactChooser, './site-chrome.module.css': css,
}).default;
const home = load('app/page.tsx', {
  'next/link': link,
  '@/lib/work': { findCaseStudy: slug => registry.caseStudies.find(study => study.slug === slug) },
  '@/components/Header': Header,
  '@/components/Footer': load('components/Footer.tsx', { './site-chrome.module.css': css }).default,
  '@/components/PublicShell': load('components/PublicShell.tsx').default,
  '@/components/BrandMarks': BrandMarks,
  '@/components/CvDownload': CvDownload,
  '@/components/HomeMotion': load('components/HomeMotion.tsx', { './home-motion.module.css': css }).default,
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
const study = slug => registry.caseStudies.find(item => item.slug === slug);
const source = (slug, id) => study(slug).media.find(media => media.id === id).src;
const image = src => nodes.find(node => node.tag === 'img' && node.attributes.src === src);

test('the first work encounter shows a real lending interface before prototype and proposal evidence, with all evidence open', () => {
  const college = image(source('cashkaro-college-money-education-loans', 'college-money-abroad-country-selector'));
  const prototype = image(source('cashkaro-eduloans-policy-workflow', 'eduloans-prototype-inspector'));
  const proposal = image(source('cashkaro-lending-mcp-feedback', 'lending-mcp-proposal'));
  assert.ok(college && prototype && proposal, 'Delivered interface, original prototype and architecture are available on first render');
  assert.ok(college.start < prototype.start && college.start < proposal.start, 'Delivered work leads the journey');
  assert.equal(college.attributes.loading, 'eager', 'The lead evidence loads with the introduction');
  const evidence = nodes.filter(node => node.tag === 'img' && ancestor(node, 'main') && ancestor(node, 'figure'));
  assert.ok(evidence.length >= 5, 'Original project evidence remains visible on the page');
  for (const media of evidence) {
    assert.ok(existsSync(path.join(root, 'public', media.attributes.src)), `${media.attributes.src}: real hosted asset`);
    assert.ok(Number(media.attributes.width) > 0 && Number(media.attributes.height) > 0, 'Media reserves its original proportions');
    assert.equal(ancestor(media, 'button')?.attributes['aria-haspopup'], 'dialog', 'Images enlarge directly');
    for (let current = media; current; current = current.parent) {
      assert.ok(!Object.hasOwn(current.attributes, 'hidden') && current.attributes['aria-hidden'] !== 'true', 'Evidence has no hidden ancestor');
      assert.ok(!['details', 'dialog'].includes(current.tag), 'Evidence is outside disclosure and modal content');
      assert.ok(!Object.hasOwn(current.attributes, 'data-reveal'), 'Scroll reveal does not hide the evidence');
    }
  }
});

test('prototype, proposed architecture and reported outcomes retain their limits beside the relevant evidence', () => {
  const account = (slug, id) => content(ancestor(image(source(slug, id)), 'article'));
  const college = account('cashkaro-college-money-education-loans', 'college-money-abroad-country-selector');
  assert.match(college, /40%/);
  assert.match(college, /Reported enquiry-to-application conversion/);
  assert.match(college, /enquiry cohort definition was not supplied/);
  const prototype = account('cashkaro-eduloans-policy-workflow', 'eduloans-prototype-inspector');
  assert.match(prototype, /prototype/i);
  assert.match(prototype, /synthetic records and scripted responses/);
  assert.match(prototype, /deterministic lender rules and human verification/);
  const proposal = account('cashkaro-lending-mcp-feedback', 'lending-mcp-proposal');
  assert.match(proposal, /proposed shared evaluation service/);
  assert.match(proposal, /Human approval stays separate/);
  assert.match(proposal, /live deployment is unconfirmed/);
  const crop = account('absolute-crop-health-ai', 'upaj-growstac-advisory');
  assert.match(crop, /500K\+ images and 14 crops/);
  assert.match(crop, /Model accuracy was not supplied/);
  assert.match(crop, /current public reference/);
  const ledger = nodes.find(node => node.tag === 'dl');
  assert.ok(ledger, 'Results have a readable, semantic comparison');
  const results = content(ledger);
  assert.match(results, /16% → 45%/);
  assert.match(results, /Programme-level result; funnel events and comparison cohorts were not supplied/);
  assert.match(results, /\$100M/);
  assert.match(results, /Reported GMV over nine months/);
  assert.match(results, /Transaction value, not revenue or the effect of one feature/);
  assert.match(results, /100K → 600K/);
  assert.match(results, /the cohort definition and comparison period were not supplied/);
});

test('a first-time visitor can reach work, the complete experience, the original CV and contact without generic AI positioning', () => {
  const introduction = nodes.find(node => node.tag === 'section' && node.attributes['aria-labelledby'] === 'intro-title');
  assert.match(content(introduction), /lending products, lender partnerships and P&amp;L at CashKaro/);
  assert.match(content(introduction), /General Manager/);
  assert.match(content(introduction), /UrbanKhet, the farm-to-customer business I founded/);
  assert.match(content(introduction), /href="\/product"/);
  assert.match(content(introduction), /href="\/cv\/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf" download="Priyam_Sameer_CV.pdf"/);
  assert.ok(nodes.some(node => node.tag === 'a' && node.attributes.href === '/cv'), 'Full career chronology remains one direct action away');
  assert.ok(nodes.some(node => node.tag === 'button' && node.attributes['aria-label'] === 'Contact Priyam' && node.attributes['aria-haspopup'] === 'dialog'), 'Contact channels have a visible chooser');
  assert.ok(nodes.some(node => node.tag === 'a' && node.attributes.href === 'mailto:Priyam.Sameer.95@gmail.com'), 'Contact also works as a direct email action');
  assert.doesNotMatch(html, /CredFlow|src="\/brands\/bankkaro\.png"|src="\/brands\/upaj-black\.svg"/);
  assert.doesNotMatch(content(introduction), /AI product thinking|AI \+ business leadership/);
  assert.match(home.metadata.title.absolute, /Product Leader & Former Founder/);
});
