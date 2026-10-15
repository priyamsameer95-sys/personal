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
  '@/lib/work-presentation': load('lib/work-presentation.ts'),
  '@/components/HowICanHelp': load('components/HowICanHelp.tsx', { 'next/link': link, './how-i-can-help.module.css': css }).default,
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

test('the first read states a professional remit and a useful next step without ambiguous metric headlines', () => {
  const heading = nodes.find(node => node.tag === 'h1');
  assert.match(content(heading), /I build products and the business around them/);
  const introduction = ancestor(heading, 'section');
  for (const meaning of [/General Manager/, /CashKaro/, /Bengaluru/, /lending/, /partnerships/, /P&amp;L/, /Absolute/, /founded UrbanKhet/]) assert.match(content(introduction), meaning);
  assert.match(content(introduction), /href="\/product"/);
  assert.match(content(introduction), /href="\/cv\/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf" download="Priyam_Sameer_CV.pdf"/);
  assert.match(content(introduction), /href="#how-i-can-help"/);
  assert.ok(nodes.some(node => node.tag === 'a' && node.attributes.href === '/cv'));
  assert.ok(nodes.some(node => node.tag === 'button' && node.attributes['aria-label'] === 'Contact Priyam' && node.attributes['aria-haspopup'] === 'dialog'));
  assert.doesNotMatch(html, /40%|500K|3,600|145 passing|16%|45%|CredFlow|src="\/brands\/bankkaro\.png"|src="\/brands\/upaj-black\.svg"/);
  assert.ok(!nodes.some(node => node.tag === 'a' && node.attributes.href === '/blog'), 'An empty Writing destination is not in primary navigation');
});

test('three delivered stories precede explicitly separate prototype and proposal accounts, with contribution before evidence', () => {
  const projects = [...delivered, ...exploration].map(project);
  assert.ok(projects[2].start < projects[3].start && projects[3].start < projects[4].start);
  for (const article of projects) {
    const figure = nodes.find(node => node.tag === 'figure' && descendant(node, article));
    const heading = nodes.find(node => /^h[2-4]$/.test(node.tag) && descendant(node, article));
    assert.ok(figure && heading && heading.start < figure.start);
    assert.match(html.slice(article.start, figure.start), /\bI (?:owned|worked|built|proposed)\b/);
  }
  assert.match(content(project(exploration[0])), /Interaction prototype/);
  assert.match(content(project(exploration[0])), /sample records and scripted responses/);
  assert.match(content(project(exploration[1])), /Design proposal/);
  assert.match(content(project(exploration[1])), /approval of policy changes separate/);
  assert.match(html, /\$100M GMV in nine months/);
  assert.ok(html.includes('href="/product/absolute-silkroute-marketplace"'));
  const evidence = nodes.filter(node => ['img', 'video'].includes(node.tag) && ancestor(node, 'figure'));
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

test('the help module offers bounded work with supporting cases, and art keeps a separate personal meaning', () => {
  const help = nodes.find(node => node.attributes.id === 'how-i-can-help');
  assert.ok(help);
  assert.match(content(help), /Where my experience may be useful/);
  for (const slug of ['cashkaro-college-money-education-loans', 'cashkaro-lender-integration-operations', 'cashkaro-eduloans-policy-workflow', 'absolute-silkroute-marketplace']) assert.ok(content(help).includes(`href="/product/${slug}"`));
  assert.match(content(help), /mailto:Priyam.Sameer.95@gmail.com\?subject=/);
  assert.doesNotMatch(content(help), /guarantee|book a package|available immediately|day sprint|\$\d/);
  const painting = nodes.find(node => node.tag === 'img' && node.attributes.src.startsWith('/art/priyam/'));
  assert.ok(painting && existsSync(path.join(root, 'public', painting.attributes.src)));
  assert.equal(ancestor(painting, 'a').attributes.href, '/art#tumult');
  assert.match(html, /I also paint/);
  assert.ok(html.indexOf('A role, a product problem, or a difficult handoff?') > painting.start, 'Professional invitation follows the personal art ending');
});
