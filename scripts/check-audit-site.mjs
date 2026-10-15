#!/usr/bin/env node
/**
 * Verify the locally served production portfolio without a browser or dependencies.
 * Run after `next build` and `next start`:
 *   node scripts/check-audit-site.mjs http://127.0.0.1:3000
 *   node scripts/check-audit-site.mjs --report /private/tmp/audit-check.json
 *
 * A case's main and /references pages form one preservation boundary. The private
 * supporting-scope register keeps its anchors, but its editorial table is excluded.
 * This checks HTTP/HTML and bytes, not browser layout, playback or keyboard behavior.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(repo, 'public');
const args = process.argv.slice(2);
let originArgument = 'http://127.0.0.1:3000';
let reportPath = path.join(repo, 'audit/2026-10-15/check-report.json');
for (let index = 0; index < args.length; index++) {
  if (args[index] === '--report' && args[index + 1]) reportPath = path.resolve(args[++index]);
  else if (/^http:\/\//.test(args[index])) originArgument = args[index];
  else throw new Error(`Unknown argument: ${args[index]}`);
}
const origin = new URL(originArgument);
if (origin.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname) || origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password) {
  throw new Error('Use a loopback HTTP origin without credentials, a path, query or fragment.');
}
const readJSON = filename => JSON.parse(fs.readFileSync(path.join(repo, filename), 'utf8'));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = readJSON('audit/2026-10-15/source-manifest.json');
const registry = readJSON('content/work/case-studies.json');
const studies = registry.caseStudies.filter(study => study.status !== 'draft');
const studiesBySlug = new Map(studies.map(study => [study.slug, study]));
const art = readJSON('content/art/works.json');
const cv = readJSON('app/cv/content.json');
const cvPath = '/cv/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf';
const publicPages = ['/', '/product', '/cv', '/blog', '/art'];
const canonicalPaths = studies.map(study => `/product/${study.slug}`);
const referencePaths = studies.map(study => `/product/${study.slug}/references`);
const failures = [];
const notices = [];
const assets = new Map();
const htmlPages = new Map();
const navigation = new Map();
const aliases = new Map();
const ownSiteHosts = new Set([origin.hostname, 'priyamsameer.com', 'www.priyamsameer.com']);
const stats = { baselineSections: 0, publicSections: 0, internalSectionsExcluded: 0, baselineSectionFragments: 0, legacyChapterFragments: 0, currentSectionFragments: 0, legacyStructuralFragments: 0, mediaEntries: 0, baselineMediaEntries: 0, mediaCaptionEntries: 0, videoPosters: 0, captionTracks: 0, bytesVerified: 0, videos: 0, artworkDetails: 0 };
function fail(category, target, message, detail) {
  failures.push({ category, target, message, ...(detail === undefined ? {} : { detail }) });
}
function requireThat(condition, category, target, message, detail) {
  if (!condition) fail(category, target, message, detail);
}
function decodeHTML(value = '') {
  return value.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, entity => {
    const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const number = entity[2]?.toLowerCase() === 'x' ? parseInt(entity.slice(3, -1), 16) : parseInt(entity.slice(2, -1), 10);
    return Number.isFinite(number) && number <= 0x10ffff ? String.fromCodePoint(number) : entity;
  });
}
const normalizeText = value => decodeHTML(value).replace(/\s+/g, ' ').trim();
function parseHTML(html) {
  // Ignore JavaScript payload text, while retaining script src attributes.
  const markup = html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi, '$1</script>');
  const tags = [...markup.matchAll(/<([a-z][\w:-]*)\b([^<>]*?)>/gi)].map(match => {
    const attrs = {};
    for (const attr of match[2].matchAll(/([^\s=/'"<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
      attrs[attr[1].toLowerCase()] = decodeHTML(attr[2] ?? attr[3] ?? attr[4] ?? '');
    }
    return { name: match[1].toLowerCase(), attrs };
  });
  const ids = tags.filter(tag => Object.hasOwn(tag.attrs, 'id')).map(tag => tag.attrs.id);
  return {
    tags, ids: new Set(ids), duplicateIds: [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))],
    text: normalizeText(markup.replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '').replace(/<[^>]*>/g, ' ')),
    media: new Set(tags.filter(tag => ['img', 'source'].includes(tag.name)).map(tag => tag.attrs.src).filter(Boolean)),
    posters: new Set(tags.filter(tag => tag.name === 'video').map(tag => tag.attrs.poster).filter(Boolean)),
    tracks: new Set(tags.filter(tag => tag.name === 'track').map(tag => tag.attrs.src).filter(Boolean)),
  };
}
function localURL(value, base = '/') {
  try {
    const url = new URL(value, new URL(base, origin));
    if (!['http:', 'https:'].includes(url.protocol) || !ownSiteHosts.has(url.hostname) || url.username || url.password) return null;
    // Explicit loopback URLs on another port are not this production service.
    if (['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && url.port !== origin.port) return null;
    return new URL(`${url.pathname}${url.search}${url.hash}`, origin);
  } catch { return null; }
}
function addAsset(value, context, base = '/') {
  if (!value || /^(?:data:|blob:)/i.test(value)) return;
  const url = localURL(value, base);
  if (!url) return;
  const key = `${url.pathname}${url.search}`;
  if (!assets.has(key)) assets.set(key, { contexts: new Set(), expectedHashes: new Set(), checked: false });
  assets.get(key).contexts.add(context);
}
function addNavigation(value, source) {
  const url = localURL(value, source);
  if (!url) return;
  const key = `${url.pathname}${url.search}${url.hash}`;
  if (!navigation.has(key)) navigation.set(key, new Set());
  navigation.get(key).add(source);
}
const assetExtension = /\.(?:avif|webp|png|jpe?g|gif|svg|ico|mp4|webm|mov|mp3|wav|vtt|pdf|zip|docx?|pptx?|xlsx?|woff2?|ttf|otf|css|m?js|map|json|webmanifest)(?:$|[?#])/i;
const documentOrVideo = /\.(?:pdf|zip|7z|rar|docx?|pptx?|xlsx?|csv|mp4|webm|mov)(?:$|[?#])/i;
const safeHTTPS = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
};
function inspectPage(route, html) {
  const parsed = parseHTML(html);
  htmlPages.set(route, { html, ...parsed });
  requireThat(parsed.tags.filter(tag => tag.name === 'h1').length === 1, 'html', route, 'Expected exactly one h1.');
  requireThat(parsed.ids.has('main-content'), 'html', route, 'Missing main content landmark.');
  requireThat(!parsed.duplicateIds.length, 'html', route, 'Duplicate IDs.', parsed.duplicateIds);
  requireThat(!parsed.tags.some(tag => tag.name === 'details'), 'html', route, 'A public details disclosure remains.');
  const links = parsed.tags.filter(tag => tag.name === 'a');
  requireThat(links.some(tag => tag.attrs.href === cvPath && Object.hasOwn(tag.attrs, 'download')), 'downloads', route, 'Current CV download action is missing.');
  for (const tag of parsed.tags) {
    for (const name of ['src', 'poster']) if (tag.attrs[name]) addAsset(tag.attrs[name], `${route}: ${tag.name}[${name}]`, route);
    for (const candidate of (tag.attrs.srcset || '').split(',')) if (candidate.trim()) addAsset(candidate.trim().split(/\s+/)[0], `${route}: srcset`, route);
    if (tag.attrs.href && (assetExtension.test(tag.attrs.href) || tag.attrs.href.startsWith('/_next/static/'))) addAsset(tag.attrs.href, `${route}: ${tag.name}[href]`, route);
    if (tag.name !== 'a') continue;
    const href = tag.attrs.href || '';
    const local = localURL(href, route);
    requireThat(!/^[a-z][a-z\d+.-]*:/i.test(href.trim()) || /^(?:https?|mailto|tel):/i.test(href.trim()), 'links', route, 'Unsafe anchor protocol.', href);
    if (/^(?:https?:)?\/\//i.test(href) && !local) requireThat(safeHTTPS(href), 'links', route, 'External/source link must use HTTPS without embedded credentials.', href);
    if (tag.attrs.target === '_blank') requireThat(/\bnoopener\b/.test(tag.attrs.rel || '') && /\bnoreferrer\b/.test(tag.attrs.rel || ''), 'links', route, 'New-tab link lacks safe rel attributes.', href);
    const isCV = local?.pathname === cvPath;
    if (Object.hasOwn(tag.attrs, 'download') || documentOrVideo.test(href)) requireThat(isCV, 'downloads', route, 'A separate document/video download action remains.', href);
    if (href && local && !assetExtension.test(href) && !href.startsWith('/_next/')) addNavigation(href, route);
  }
  for (const match of html.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi)) addAsset(decodeHTML(match[1]), `${route}: CSS url`, route);
}
async function request(value, options = {}) {
  return fetch(new URL(value, origin), { ...options, headers: { 'Accept-Encoding': 'identity', ...options.headers }, redirect: 'manual', signal: AbortSignal.timeout(30000) });
}
async function pool(items, callback, concurrency = 4) {
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      try { await callback(item); } catch (error) { fail('request', typeof item === 'string' ? item : Array.isArray(item) ? String(item[0]) : JSON.stringify(item), 'Request/verification failed.', [String(error), error?.cause?.code, error?.cause?.message].filter(Boolean).join(' · ')); }
    }
  }));
}
function sectionFragments(study) {
  return [...new Set(study.sections.flatMap(section => [section.id, `story-${section.id}`, `heading-${section.id}`, ...(section.anchorAliases || [])]))];
}
function fallbackPresentation(study) {
  if (study.presentation) return study.presentation;
  const detail = study.sections.filter(section => section.group === 'detail');
  return {
    decisionBeats: [{ id: 'decision' }, { id: 'delivery' }, { id: 'judgment' }],
    supportingGroups: study.sections.filter(section => section.group === 'reference' || (section.group === 'detail' && !detail.slice(0, 2).includes(section))).map(section => ({ id: section.id })),
  };
}
// Source-manifest chapter IDs are portable; compare with the private pre-audit
// registry too when available, without requiring that private archive to run.
const backupFile = path.resolve(repo, '../priyam-audit-source-backup-20261015/content/work/case-studies.json');
let legacyStudies;
if (fs.existsSync(backupFile)) legacyStudies = JSON.parse(fs.readFileSync(backupFile, 'utf8')).caseStudies.filter(study => study.status !== 'draft');
const legacyBySlug = new Map((legacyStudies || []).map(study => [study.slug, study]));
function legacyChapters(slug) {
  const portable = (manifest.studies.find(study => study.slug === slug)?.chapterAnchors || []).map(chapter => chapter.id);
  requireThat(portable.length > 0, 'registry', slug, 'Pre-audit chapter anchors are missing from the source manifest.');
  const old = legacyBySlug.get(slug);
  const presentation = old && fallbackPresentation(old);
  const backup = presentation ? [...new Set([...presentation.decisionBeats, ...presentation.supportingGroups].map(group => `chapter-${group.id}`))] : [];
  if (old) requireThat(backup.length === portable.length && backup.every(id => portable.includes(id)), 'registry', slug, 'Manifest chapter anchors differ from the original private backup.', { manifest: portable, backup });
  return [...new Set([...portable, ...backup])];
}
const legacyStructural = ['product-reference', 'full-case-study', 'story-title', 'brief-title', 'product-workflow', 'decision-chapters', 'decision-chapters-title', 'responsibility-and-results', 'outcomes-title', 'reference-chapters', 'reference-chapters-title', 'evidence', 'downloads'];

// Validate the registry's preservation contract before using its asset paths.
requireThat(studies.length === 25 && manifest.studies.length === 25, 'registry', 'cases', 'Expected 25 canonical studies.');
for (const old of manifest.studies) {
  const study = studiesBySlug.get(old.slug);
  requireThat(Boolean(study), 'registry', old.slug, 'Baseline canonical study is missing.');
  if (!study) continue;
  for (const alias of old.aliases || []) {
    requireThat(study.aliases?.includes(alias), 'registry', alias, 'Baseline alias was removed.');
    aliases.set(`/product/${alias}`, `/product/${old.slug}`);
  }
  const internal = new Set(study.presentation?.internalSectionIds || []);
  for (const section of old.sections) {
    stats.baselineSections++;
    requireThat(study.sections.some(item => item.id === section.id), 'registry', `${old.slug}#${section.id}`, 'Original section record was removed.');
    if (internal.has(section.id)) stats.internalSectionsExcluded++;
    else stats.publicSections++;
  }
  for (const media of old.media) {
    stats.baselineMediaEntries++;
    requireThat(study.media.some(item => item.id === media.id && item.src === media.src), 'registry', `${old.slug}/${media.id}`, 'Original media ID/path was removed or changed.');
    addAsset(media.src, 'immutable source manifest');
    assets.get(media.src)?.expectedHashes.add(media.sha256);
  }
}
requireThat(aliases.size === 20, 'registry', 'aliases', 'Expected 20 original canonical aliases.');
requireThat(stats.baselineMediaEntries === 121, 'registry', 'media', 'Expected 121 baseline media entries.');
for (const study of studies) {
  for (const media of study.media) {
    stats.mediaEntries++;
    addAsset(media.src, `${study.slug}/${media.id}`);
    if (media.poster) { stats.videoPosters++; addAsset(media.poster, `${study.slug}/${media.id}: poster`); }
    for (const track of media.captions || []) { stats.captionTracks++; addAsset(track.src, `${study.slug}/${media.id}: caption track`); }
    if (media.caption) stats.mediaCaptionEntries++;
    const old = manifest.studies.find(item => item.slug === study.slug)?.media || [];
    if (!old.some(item => item.id === media.id && item.src === media.src)) requireThat(media.kind === 'image' && media.category === 'diagram' && media.provenance?.kind === 'authored' && media.id === 'crop-delivery-boundary', 'registry', `${study.slug}/${media.id}`, 'Unexpected additional media; only the approved authored delivery-boundary diagram is exempt from the baseline.');
    if (media.provenance?.sourceUrl) requireThat(safeHTTPS(media.provenance.sourceUrl), 'sources', `${study.slug}/${media.id}`, 'Unsafe registry provenance URL.', media.provenance.sourceUrl);
  }
  for (const section of study.sections) for (const source of section.source?.links || []) requireThat(safeHTTPS(source.href), 'sources', `${study.slug}#${section.id}`, 'Unsafe source reference URL.', source.href);
}
for (const work of art.works) {
  addAsset(work.image.src, `${work.id}: full artwork`);
  addAsset(work.image.previewSrc, `${work.id}: artwork preview`);
  for (const image of work.detailImages || []) { stats.artworkDetails++; addAsset(image.src, `${work.id}: artwork detail`); }
}
for (const match of fs.readFileSync(path.join(repo, 'lib/brands.ts'), 'utf8').matchAll(/\bsrc:\s*['"]([^'"]+)['"]/g)) addAsset(match[1], 'brand registry');
addAsset(cvPath, 'current CV download');

const forbiddenFiles = /\.(?:pdf|docx?|pptx?|xlsx?|zip|7z|rar|tar|gz|csv|sqlite|db|env|txt)(?:\.part-\d+)?$/i;
const originalUrbanHash = '183cf980176ce7ec09d0b74859f69b53526791370f6340b9e8bdd6813ac6f4d3';
let publicFiles = 0;
function auditPublicDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    const relative = `/${path.relative(publicRoot, filename).split(path.sep).join('/')}`;
    requireThat(!entry.isSymbolicLink(), 'private-files', relative, 'Public symlink could expose a private source.');
    if (entry.isDirectory()) { auditPublicDirectory(filename); continue; }
    if (!entry.isFile()) continue;
    publicFiles++;
    requireThat(!forbiddenFiles.test(relative) || relative === cvPath || relative === '/robots.txt', 'private-files', relative, 'Source document/archive is hosted publicly.');
    requireThat(!/archive-members|source-extraction|original-ui-verification|private-source-archive|original-runtime-config/i.test(relative), 'private-files', relative, 'Private source/configuration filename is publicly hosted.');
    const hash = sha256(fs.readFileSync(filename));
    requireThat(hash !== originalUrbanHash, 'private-files', relative, 'Unredacted original UrbanKhet video is publicly hosted.');
    requireThat(hash !== art.source.sha256, 'private-files', relative, 'Original source Art PDF is publicly hosted.');
  }
}
auditPublicDirectory(publicRoot);

await pool([...publicPages, ...canonicalPaths, ...referencePaths], async route => {
  const response = await request(route);
  const html = await response.text();
  requireThat(response.status === 200, 'routes', route, 'Expected public page HTTP 200.', response.status);
  requireThat(/^text\/html\b/i.test(response.headers.get('content-type') || ''), 'routes', route, 'Expected HTML content type.', response.headers.get('content-type'));
  if (response.status === 200) inspectPage(route, html);
});

for (const study of studies) {
  const main = htmlPages.get(`/product/${study.slug}`);
  const references = htmlPages.get(`/product/${study.slug}/references`);
  if (!main || !references) continue;
  const union = new Set([...main.ids, ...references.ids]);
  const old = manifest.studies.find(item => item.slug === study.slug);
  const baselineFragments = old ? sectionFragments(old) : [];
  const currentFragments = sectionFragments(study);
  const chapters = legacyChapters(study.slug);
  stats.baselineSectionFragments += baselineFragments.length;
  stats.currentSectionFragments += currentFragments.length;
  stats.legacyChapterFragments += chapters.length;
  stats.legacyStructuralFragments += legacyStructural.length;
  for (const [label, fragments] of [['original section', baselineFragments], ['current section', currentFragments], ['pre-audit chapter', chapters], ['legacy structural', legacyStructural]]) {
    const missing = fragments.filter(id => !union.has(id));
    requireThat(!missing.length, 'anchors', study.slug, `Missing ${label} fragments across main/reference pages.`, missing);
  }
  const renderedMedia = new Set([...main.media, ...references.media]);
  const posters = new Set([...main.posters, ...references.posters]);
  const tracks = new Set([...main.tracks, ...references.tracks]);
  const text = `${main.text} ${references.text}`;
  for (const media of study.media) {
    requireThat(renderedMedia.has(media.src), 'media', `${study.slug}/${media.id}`, 'Media is absent from rendered img/source attributes.', media.src);
    if (media.poster) requireThat(posters.has(media.poster), 'media', `${study.slug}/${media.id}`, 'Video poster is absent from rendered video attributes.', media.poster);
    for (const track of media.captions || []) requireThat(tracks.has(track.src), 'media', `${study.slug}/${media.id}`, 'Caption track is absent from rendered track attributes.', track.src);
    if (media.caption) requireThat(text.includes(normalizeText(media.caption)), 'media', `${study.slug}/${media.id}`, 'Media caption is missing from visible HTML text.');
    if (media.kind === 'video') {
      const source = [...main.tags, ...references.tags].find(tag => tag.name === 'source' && tag.attrs.src === media.src);
      requireThat(source?.attrs.type === (media.mime || 'video/mp4'), 'media', `${study.slug}/${media.id}`, 'Rendered video source MIME differs from the registry.', source?.attrs.type);
    }
  }
  for (const section of study.sections) {
    if (study.presentation?.internalSectionIds?.includes(section.id)) {
      for (const table of section.tables || []) requireThat(!text.includes(normalizeText(table.caption)), 'tables', `${study.slug}#${section.id}`, 'Internal editorial table was published.', table.caption);
      continue;
    }
    for (const table of section.tables || []) requireThat(references.text.includes(normalizeText(table.caption)), 'tables', `${study.slug}#${section.id}`, 'Public supporting table caption is absent.', table.caption);
  }
}
const cvPage = htmlPages.get('/cv');
if (cvPage) {
  const cvLinks = cvPage.tags.filter(tag => tag.name === 'a').map(tag => tag.attrs.href);
  for (const route of canonicalPaths) requireThat(cvLinks.filter(href => href === route).length === 1, 'cv', route, 'CV must link to every canonical case exactly once.');
  const contextIds = ['career', 'internship', 'other-contexts', 'education', 'recognition', 'certifications', 'skills', ...cv.experience.flatMap(job => [job.companyId, `${job.companyId}-responsibilities`, ...(job.ventureSupport?.id ? [job.ventureSupport.id] : [])]), 'water-farmers', ...cv.otherContexts.map(context => context.id), 'cept'];
  for (const id of contextIds) requireThat(cvPage.ids.has(id), 'cv', `#${id}`, 'CV context/compatibility anchor is missing.');
}
const artPage = htmlPages.get('/art');
requireThat(art.works.length === 6, 'art', 'registry', 'Expected six paintings.');
if (artPage) for (const work of art.works) {
  requireThat(artPage.ids.has(work.id), 'art', work.id, 'Painting anchor is missing.');
  requireThat(artPage.media.has(work.image.previewSrc || work.image.src), 'art', work.id, 'Painting preview is missing.');
  for (const image of work.detailImages || []) requireThat(artPage.media.has(image.src), 'art', work.id, 'Painting detail thumbnail is missing.', image.src);
  requireThat(artPage.text.includes(normalizeText(work.medium)) && artPage.text.includes(normalizeText(work.dimensions)), 'art', work.id, 'Artwork medium/dimensions are missing.');
}

await pool([...aliases], async ([alias, canonical]) => {
  const response = await request(alias);
  const location = response.headers.get('location');
  requireThat(response.status === 308, 'aliases', alias, 'Expected permanent canonical redirect (308).', response.status);
  requireThat(Boolean(location) && localURL(location)?.pathname === canonical, 'aliases', alias, 'Redirect does not resolve to its original canonical case.', { location, canonical });
  await response.body?.cancel();
});

// Follow navigation URLs found in actual anchor attributes. Main-page fragments
// delegated to /references remain valid; references are not accepted for arbitrary
// unrelated routes. An HTTP checker cannot execute the client-side hash forwarding.
const extraRoutes = [...new Set([...navigation.keys()].map(value => new URL(value, origin).pathname))].filter(route => !htmlPages.has(route) && !aliases.has(route));
await pool(extraRoutes, async route => {
  const response = await request(route);
  const html = await response.text();
  requireThat(response.status === 200, 'links', route, 'Linked internal route is unavailable.', response.status);
  if (response.status === 200 && /^text\/html\b/i.test(response.headers.get('content-type') || '')) inspectPage(route, html);
});
for (const [value, sources] of navigation) {
  const target = new URL(value, origin);
  const canonical = aliases.get(target.pathname) || target.pathname;
  const page = htmlPages.get(canonical);
  requireThat(Boolean(page), 'links', value, 'Internal link has no successfully checked HTML target.', [...sources]);
  if (!target.hash || !page) continue;
  let fragment;
  try { fragment = decodeURIComponent(target.hash.slice(1)); } catch { fragment = null; }
  const reference = /^\/product\/[^/]+$/.test(canonical) ? htmlPages.get(`${canonical}/references`) : undefined;
  requireThat(fragment && (page.ids.has(fragment) || reference?.ids.has(fragment)), 'links', value, 'Internal link fragment is missing from the page and its references.', [...sources]);
}

function localFile(value) {
  const url = new URL(value, origin);
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return null; }
  const root = pathname.startsWith('/_next/static/') ? path.join(repo, '.next', 'static') : publicRoot;
  const relative = pathname.startsWith('/_next/static/') ? pathname.slice('/_next/static/'.length) : pathname.slice(1);
  const filename = path.resolve(root, relative);
  // Next App Router serves this conventional icon route directly from app/.
  if (pathname === '/favicon.ico' && fs.existsSync(path.join(repo, 'app', 'favicon.ico'))) return path.join(repo, 'app', 'favicon.ico');
  return filename.startsWith(`${root}${path.sep}`) && fs.existsSync(filename) && fs.statSync(filename).isFile() ? filename : null;
}
const mimeTypes = {
  '.avif': ['image/avif'], '.webp': ['image/webp'], '.svg': ['image/svg+xml'], '.png': ['image/png'], '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.gif': ['image/gif'], '.ico': ['image/x-icon', 'image/vnd.microsoft.icon'],
  '.mp4': ['video/mp4'], '.webm': ['video/webm'], '.pdf': ['application/pdf'], '.vtt': ['text/vtt'], '.css': ['text/css'], '.js': ['application/javascript', 'text/javascript'], '.mjs': ['application/javascript', 'text/javascript'], '.woff': ['font/woff', 'application/font-woff'], '.woff2': ['font/woff2'], '.ttf': ['font/ttf', 'application/x-font-ttf'], '.otf': ['font/otf'], '.json': ['application/json'], '.webmanifest': ['application/manifest+json', 'application/json'],
};
while ([...assets.values()].some(asset => !asset.checked)) {
  const batch = [...assets].filter(([, asset]) => !asset.checked);
  await pool(batch, async ([value, asset]) => {
    asset.checked = true;
    const response = await request(value);
    const bytes = Buffer.from(await response.arrayBuffer());
    const filename = localFile(value);
    const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const extension = path.extname(new URL(value, origin).pathname).toLowerCase();
    requireThat(response.status === 200 && bytes.length > 0, 'assets', value, 'Expected a nonempty HTTP 200 asset.', { status: response.status, bytes: bytes.length });
    if (mimeTypes[extension]) requireThat(mimeTypes[extension].includes(contentType), 'assets', value, 'Asset MIME type is incorrect.', { expected: mimeTypes[extension], actual: contentType });
    asset.bytes = bytes.length;
    asset.sha256 = sha256(bytes);
    asset.contentType = contentType;
    stats.bytesVerified += bytes.length;
    if (!filename && !value.startsWith('/_next/image?')) fail('assets', value, 'No matching current local file exists.');
    if (filename) {
      const localBytes = fs.readFileSync(filename);
      asset.localSha256 = sha256(localBytes);
      requireThat(bytes.length === localBytes.length && asset.sha256 === asset.localSha256, 'assets', value, 'Served bytes differ from the current local file.', { httpBytes: bytes.length, localBytes: localBytes.length, servedSHA256: asset.sha256, localSHA256: asset.localSha256 });
      for (const expected of asset.expectedHashes) requireThat(asset.localSha256 === expected && asset.sha256 === expected, 'source-hashes', value, 'Original asset differs from the immutable source manifest.', { expected, local: asset.localSha256, served: asset.sha256 });
      if (extension === '.mp4') {
        stats.videos++;
        requireThat(bytes.subarray(4, 8).toString() === 'ftyp', 'video', value, 'MP4 container signature is missing.');
        const partial = await request(value, { headers: { Range: 'bytes=0-31' } });
        const head = Buffer.from(await partial.arrayBuffer());
        requireThat(partial.status === 206 && head.length === 32 && head.equals(localBytes.subarray(0, 32)) && partial.headers.get('content-range') === `bytes 0-31/${localBytes.length}`, 'video', value, 'Video byte-range delivery is incorrect.', { status: partial.status, bytes: head.length, contentRange: partial.headers.get('content-range') });
      }
    }
    if (value === cvPath) {
      requireThat(bytes.subarray(0, 5).toString() === '%PDF-' && bytes.length > 8000, 'cv', value, 'CV is not a nonempty PDF.');
      asset.updatedFromArchivedOriginal = asset.sha256 !== manifest.originalCvSha256;
    }
    if (extension === '.css' && response.status === 200) {
      const css = bytes.toString('utf8');
      for (const match of css.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi)) addAsset(match[1], `${value}: CSS url`, value);
      for (const match of css.matchAll(/@import\s+["']([^"']+)["']/gi)) addAsset(match[1], `${value}: CSS import`, value);
    }
  });
}
requireThat(stats.videos === 10, 'video', 'inventory', 'Expected ten distinct playable MP4 assets.', stats.videos);
const unavailable = [
  '/product/independent-moneylion-wow-strategy', '/product/moneylion-wow-strategy', '/product/independent-moneylion-wow-strategy/references', '/product/unknown-private-case', '/product/unknown-private-case/references',
  '/V1.03-Chat-eduloans-main.zip', '/Priyam%20Art.pdf', '/private-source-archive/Urbankhet%20Demo%20original.mp4', '/work/urbankhet/video/Urbankhet%20Demo.mp4', '/work/urbankhet/video/urbankhet-demo-original.mp4', '/original-runtime-config/public/index.html', '/api/download',
];
await pool(unavailable, async route => {
  const response = await request(route);
  requireThat(response.status === 404, 'private-routes', route, 'Expected retired/private/unknown route HTTP 404.', response.status);
  await response.body?.cancel();
});
if (!legacyStudies) notices.push('Private pre-audit backup absent; chapter IDs checked using source-manifest chapterAnchors.');
notices.push('HTTP checks cannot verify browser layout, client-side fragment forwarding, playback, focus or keyboard interaction.');
const baselineAssetPaths = new Set(manifest.studies.flatMap(study => study.media.map(media => media.src)));
const summary = {
  status: failures.length ? 'failed' : 'passed', checkedAt: new Date().toISOString(), origin: origin.origin,
  routes: { publicPages: publicPages.length, canonicalCases: canonicalPaths.length, referencePages: referencePaths.length, permanentAliases: aliases.size, linkedAdditionalPages: extraRoutes.length, expected404: unavailable.length },
  anchors: { baselineSections: stats.baselineSections, publicSections: stats.publicSections, internalSectionsExcluded: stats.internalSectionsExcluded, baselineSectionFragments: stats.baselineSectionFragments, currentSectionFragments: stats.currentSectionFragments, preAuditChapterFragments: stats.legacyChapterFragments, legacyStructuralFragments: stats.legacyStructuralFragments, uniqueInternalLinkTargets: navigation.size },
  evidence: { baselineMediaEntries: stats.baselineMediaEntries, baselineUniqueAssets: baselineAssetPaths.size, currentMediaEntries: stats.mediaEntries, mediaCaptions: stats.mediaCaptionEntries, videoPosters: stats.videoPosters, captionTracks: stats.captionTracks, distinctVideos: stats.videos, paintings: art.works.length, paintingDetails: stats.artworkDetails },
  assets: { uniqueURLs: assets.size, totalBytesVerified: stats.bytesVerified, publicFilesInspected: publicFiles, cvSHA256: assets.get(cvPath)?.sha256, cvMatchesCurrentLocalBinary: Boolean(assets.get(cvPath)?.sha256) && assets.get(cvPath)?.sha256 === assets.get(cvPath)?.localSha256, cvUpdatedFromArchivedOriginal: assets.get(cvPath)?.updatedFromArchivedOriginal },
  failureCount: failures.length,
};
const report = {
  ...summary,
  provenance: { sourceManifest: 'audit/2026-10-15/source-manifest.json', sourceManifestSHA256: sha256(fs.readFileSync(path.join(repo, 'audit/2026-10-15/source-manifest.json'))), preAuditChapterSource: 'source-manifest chapterAnchors', privateBackupCompared: Boolean(legacyStudies) },
  notices, failures,
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...summary, report: reportPath, ...(failures.length ? { failures } : {}) }, null, 2));
process.exitCode = failures.length ? 1 : 0;
