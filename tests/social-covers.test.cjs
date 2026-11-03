'use strict';

const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const registry = JSON.parse(readFileSync(path.join(root, 'content/work/case-studies.json'), 'utf8'));
const coverMedia = JSON.parse(readFileSync(path.join(root, 'content/social-covers.json'), 'utf8'));
const mainKeys = ['home', 'work', 'experience', 'art', 'github', 'writing'];
const renderedPNGs = new Map();

function fixture({ studies = registry.caseStudies } = {}) {
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename);
    if (filename.endsWith('.json')) return JSON.parse(readFileSync(path.join(root, filename), 'utf8'));
    const output = ts.transpileModule(readFileSync(path.join(root, filename), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    const module = { exports: {} };
    function localRequire(id) {
      if (id === '@/content/work/case-studies') return { caseStudies: studies, companies: registry.companies };
      if (id.startsWith('@/')) return load(id.slice(2) + (id.endsWith('.json') ? '' : '.ts'));
      if (id.startsWith('.')) {
        const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(filename), id));
        const suffix = id.endsWith('.json') ? '' : existsSync(path.join(root, resolved + '.ts')) ? '.ts' : '.tsx';
        return load(resolved + suffix);
      }
      return require(id);
    }
    vm.runInNewContext(output, {
      module, exports: module.exports, require: localRequire, Buffer,
      process: { cwd: () => root, env: {} }, URL, Response, Request, console,
    }, { filename });
    cache.set(filename, module.exports);
    return module.exports;
  }
  return { load };
}

function publishedPaths() {
  return [
    ...mainKeys.map(key => [key, 'cover-v1.png']),
    ...registry.caseStudies.filter(study => study.status !== 'draft').map(study => ['product', study.slug, 'cover-v1.png']),
  ];
}

function pngDimensions(bytes) {
  assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(bytes.toString('ascii', 12, 16), 'IHDR');
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

test('social previews cover exactly six main destinations and all 25 published canonical cases', () => {
  const { resolveSocialCover } = fixture().load('lib/social-covers.ts');
  assert.equal(publishedPaths().length, 31);
  const slugs = registry.caseStudies.filter(study => study.status !== 'draft').map(study => study.slug);
  assert.deepEqual(Object.keys(coverMedia).sort(), [...slugs].sort());
  const titles = new Set();
  for (const segments of publishedPaths()) {
    const cover = resolveSocialCover(segments);
    assert.ok(cover, segments.join('/'));
    assert.ok(cover.title && cover.context && cover.label);
    titles.add(cover.title);
    if (cover.asset) assert.ok(existsSync(path.join(root, 'public', cover.asset)), cover.asset);
  }
  assert.equal(titles.size, 31, 'A distinct destination must not silently reuse the generic personal cover');
});

test('unknown, draft, retired, alias, version-mismatched and arbitrary file paths never resolve to a cover', () => {
  const { resolveSocialCover } = fixture().load('lib/social-covers.ts');
  const invalid = [
    [], ['home'], ['home', 'cover-v2.png'], ['constructor', 'cover-v1.png'], ['__proto__', 'cover-v1.png'],
    ['product', 'missing', 'cover-v1.png'], ['product', 'moneylion-wow-strategy', 'cover-v1.png'],
    ['product', 'independent-moneylion-wow-strategy', 'cover-v1.png'],
    ['product', '../.env', 'cover-v1.png'], ['product', '%2e%2e%2f.env', 'cover-v1.png'],
    ['product', '/etc/passwd', 'cover-v1.png'], ['product', 'https://attacker.invalid/image.png', 'cover-v1.png'],
    ['..', 'cover-v1.png'], ['home', '..', 'cover-v1.png'], ['product', 'absolute-silkroute-marketplace', 'cover-v1.png', 'extra'],
  ];
  for (const study of registry.caseStudies) {
    for (const alias of study.aliases || []) invalid.push(['product', alias, 'cover-v1.png']);
  }
  for (const segments of invalid) assert.equal(resolveSocialCover(segments), null, segments.join('/'));
  const draft = { ...registry.caseStudies[0], status: 'draft' };
  const draftResolver = fixture({ studies: [draft] }).load('lib/social-covers.ts');
  assert.equal(draftResolver.resolveSocialCover(['product', draft.slug, 'cover-v1.png']), null);
});

test('each project asset belongs to that project’s own evidence, and no-media projects stay text-only', () => {
  const { resolveSocialCover } = fixture().load('lib/social-covers.ts');
  for (const study of registry.caseStudies.filter(study => study.status !== 'draft')) {
    const cover = resolveSocialCover(['product', study.slug, 'cover-v1.png']);
    const configured = coverMedia[study.slug];
    assert.equal(cover.asset, configured.src);
    if (!cover.asset) {
      assert.equal(cover.style, 'text');
      continue;
    }
    assert.equal(cover.style, 'project');
    if (configured.rasterSrc) {
      assert.ok(cover.asset.endsWith('.svg'), 'Raster evidence must preserve an original SVG source');
      assert.equal(configured.rasterSrc, `/social/evidence/${study.slug}.png`);
      assert.ok(existsSync(path.join(root, 'public', configured.rasterSrc)));
    }
    assert.ok(study.media.some(media => cover.asset === media.src || cover.asset === media.poster), `${study.slug}: substituted another project’s image`);
    assert.ok(cover.asset.startsWith('/') && !cover.asset.includes('..') && !cover.asset.includes('://'));
  }
});

test('important covers preserve prototype, proposal and reconstructed-workflow status', () => {
  const { resolveSocialCover } = fixture().load('lib/social-covers.ts');
  const resolve = slug => resolveSocialCover(['product', slug, 'cover-v1.png']);
  const eduloans = resolve('cashkaro-eduloans-policy-workflow');
  assert.equal(eduloans.asset, '/work/eduloans/prototype/kam-inspector.png');
  assert.match(eduloans.label, /prototype/i);
  assert.match(eduloans.label, /sample data/i);
  assert.match(eduloans.label, /scripted responses/i);
  const mcp = resolve('cashkaro-lending-mcp-feedback');
  assert.equal(mcp.asset, '/work/architecture/lending-mcp-proposal.svg');
  assert.match(mcp.label, /proposal/i);
  const silkroute = resolve('absolute-silkroute-marketplace');
  assert.equal(silkroute.asset, '/work/workflows/absolute-silkroute-marketplace.svg');
  assert.match(silkroute.label, /reconstructed workflow/i);
  assert.match(silkroute.label, /not a product screenshot/i);
  const riskstac = resolve('absolute-rural-credit-uli');
  assert.match(riskstac.asset, /riskstac/);
  assert.match(riskstac.label, /current public/i);
});

test('all 31 actual images render as 1200 × 630 PNGs without external network access', async () => {
  const { load } = fixture();
  const { resolveSocialCover } = load('lib/social-covers.ts');
  const { renderSocialCover } = load('lib/social-cover-image.tsx');
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error('Social covers must not fetch remote content'); };
  try {
    const failures = [];
    for (const segments of publishedPaths()) {
      try {
      const response = await renderSocialCover(resolveSocialCover(segments));
      assert.equal(response.status, 200, segments.join('/'));
      assert.match(response.headers.get('content-type'), /^image\/png/);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      let bytes;
      try { bytes = Buffer.from(await response.arrayBuffer()); }
      catch(error) { error.message = segments.join('/') + ': ' + error.message; throw error; }
      assert.deepEqual(pngDimensions(bytes), [1200, 630], segments.join('/'));
      assert.ok(bytes.length > 1000 && bytes.length < 8 * 1024 * 1024);
      renderedPNGs.set(segments.join('/'), bytes);
      } catch(error) { failures.push(`${segments.join('/')}: ${error.message}`); }
    }
    assert.deepEqual(failures, []);
  } finally { global.fetch = originalFetch; }
});

test('render helper refuses file traversal, unsupported extensions and external URLs', async () => {
  const { renderSocialCover } = fixture().load('lib/social-cover-image.tsx');
  for (const asset of ['/../.env', '/../../etc/passwd', 'https://attacker.invalid/a.png', '/social/untrusted.html']) {
    await assert.rejects(renderSocialCover({ title: 'Synthetic', context: 'Test', label: 'Test', asset, style: 'project' }), /Invalid cover asset|Unsupported cover asset/);
  }
});

test('HTTP cover route returns 404 for unregistered paths and never renders or falls back to a generic image', async () => {
  let renders = 0;
  const routeSource = readFileSync(path.join(root, 'app/social/[...path]/route.ts'), 'utf8');
  const compiled = ts.transpileModule(routeSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const resolver = fixture().load('lib/social-covers.ts');
  vm.runInNewContext(compiled, { module, exports: module.exports, Response,
    require: id => id === '@/lib/social-covers' ? resolver : { renderSocialCover: async () => { renders++; return new Response('image'); } },
  });
  const response = await module.exports.GET(new Request('https://portfolio.invalid/social/missing/cover-v1.png'), { params: Promise.resolve({ path: ['missing', 'cover-v1.png'] }) });
  assert.equal(response.status, 404);
  assert.equal(renders, 0);
});


test('a missing or broken selected asset returns an uncached 503 instead of an unrelated fallback', async () => {
  const compiled = ts.transpileModule(readFileSync(path.join(root, 'app/social/[...path]/route.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const resolver = fixture().load('lib/social-covers.ts');
  vm.runInNewContext(compiled, { module, exports: module.exports, Response,
    require: id => id === '@/lib/social-covers' ? resolver : { renderSocialCover: async () => { throw new Error('Synthetic missing cover asset'); } },
  });
  const response = await module.exports.GET(new Request('https://portfolio.invalid/social/home/cover-v1.png'), { params: Promise.resolve({ path: ['home', 'cover-v1.png'] }) });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), '');
});


async function coverPNG(segments) {
  const key = segments.join('/');
  if (renderedPNGs.has(key)) return renderedPNGs.get(key);
  const { load } = fixture();
  const cover = load('lib/social-covers.ts').resolveSocialCover(segments);
  const response = await load('lib/social-cover-image.tsx').renderSocialCover(cover);
  const bytes = Buffer.from(await response.arrayBuffer());
  renderedPNGs.set(key, bytes);
  return bytes;
}

async function regionPixels(bytes, region) {
  const cropped = sharp(bytes).extract(region).removeAlpha();
  const stats = await cropped.clone().stats();
  const { data, info } = await cropped.raw().toBuffer({ resolveWithObject: true });
  let dark = 0;
  for (let offset = 0; offset < data.length; offset += info.channels) {
    if (data[offset] < 100 && data[offset + 1] < 100 && data[offset + 2] < 100) dark++;
  }
  return {
    standardDeviation: stats.channels.slice(0, 3).reduce((sum, channel) => sum + channel.stdev, 0) / 3,
    darkFraction: dark / (info.width * info.height),
  };
}

test('main-page captures contain visible destination content rather than an empty cream rectangle', async () => {
  // The central panel excludes the outer page frame, so a border alone cannot
  // make a dropped image appear valid. Every supplied capture has real content.
  const center = { left: 120, top: 180, width: 960, height: 320 };
  for (const key of mainKeys) {
    const pixels = await regionPixels(await coverPNG([key, 'cover-v1.png']), center);
    assert.ok(pixels.standardDeviation > 8, `${key}: screenshot content is missing (variation ${pixels.standardDeviation.toFixed(2)})`);
    assert.ok(pixels.darkFraction > 0.003, `${key}: capture has no readable dark content`);
  }
});

test('EduLoans reviewer evidence remains visible inside its image panel', async () => {
  // Ignore the heading, caption and image-panel border. A valid PNG with only
  // the page title or cream placeholder must fail this check.
  const panel = { left: 60, top: 160, width: 1080, height: 360 };
  const pixels = await regionPixels(await coverPNG(['product', 'cashkaro-eduloans-policy-workflow', 'cover-v1.png']), panel);
  assert.ok(pixels.standardDeviation > 12, `Reviewer image is blank (variation ${pixels.standardDeviation.toFixed(2)})`);
  assert.ok(pixels.darkFraction > 0.0015, `Reviewer screenshot text and controls are missing (${pixels.darkFraction.toFixed(4)})`);
});

test('SilkRoute workflow retains its original text as well as its coloured shapes', async () => {
  // The panel excludes the portfolio heading/footer. The original workflow's
  // labels produce substantially more dark pixels than empty SVG boxes alone.
  const panel = { left: 60, top: 160, width: 1080, height: 360 };
  const pixels = await regionPixels(await coverPNG(['product', 'absolute-silkroute-marketplace', 'cover-v1.png']), panel);
  assert.ok(pixels.standardDeviation > 12, 'The workflow evidence is blank');
  assert.ok(pixels.darkFraction > 0.015, `Workflow labels are absent or unreadable (${pixels.darkFraction.toFixed(4)})`);
});
