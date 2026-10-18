const { test } = require('node:test');
const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.join(__dirname, '..');
const snapshot = JSON.parse(readFileSync(path.join(root, 'content/github-projects.json'), 'utf8'));
function fixture(fetcher, options = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    if (file.endsWith('.json')) return JSON.parse(readFileSync(path.join(root, file), 'utf8'));
    const module = { exports: {} };
    const source = ts.transpileModule(readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const requireLocal = id => {
      if (id.endsWith('.css')) return {};
      if (id === 'react' && options.react) return options.react;
      if (id === 'next/link') return ({ children, ...props }) => createElement('a', props, children);
      if (id === '@/components/PublicShell') return ({ children }) => createElement('div', null, children);
      if (id === '@/components/work/Media') return load('components/work/Media.tsx');
      if (id === '@/components/github/DemoLauncher') return load('components/github/DemoLauncher.tsx');
      if (id.startsWith('@/components/')) return () => null;
      if (id.startsWith('@/')) return load(id.slice(2) + (id.endsWith('.json') ? '' : '.ts'));
      return require(id);
    };
    vm.runInNewContext(source, { module, exports: module.exports, require: requireLocal, fetch: fetcher, AbortSignal, URL, document: options.document, window: options.window, process: { env: {} } }, { filename: file });
    cache.set(file, module.exports);
    return module.exports;
  }
  return { load };
}
const repo = (name, extra = {}) => ({ name, owner: { login: snapshot.owner }, private: false, size: 1, language: 'TypeScript', ...extra });

test('the reviewed fallback covers all 17 public repositories with honest empty and prototype status', async () => {
  const { load } = fixture(async () => { throw Error('offline'); });
  const projects = await load('lib/github-projects.ts').getGithubProjects();
  assert.equal(projects.length, 17);
  assert.equal(new Set(projects.map(p => p.name)).size, 17);
  assert.equal(projects.filter(p => p.kind === 'Empty repository').length, 2);
  assert.equal(projects.find(p => p.name === 'mcp-el').kind, 'MCP server prototype');
  for (const project of projects) {
    assert.equal(project.url, `https://github.com/${snapshot.owner}/${encodeURIComponent(project.name)}`);
    assert.ok(snapshot.groups.some(group => group.id === project.group));
    assert.ok(project.description.length > 30);
  }
  assert.doesNotMatch(JSON.stringify(snapshot), /edulaonstest|ANTIGRAVITY|chat-bot-work-flow-for-education-loan/);
});

test('public discovery excludes private and foreign repositories and never trusts remote link destinations', async () => {
  const { load } = fixture(async (url, options) => {
    assert.match(url, /^https:\/\/api.github.com\/users\/priyamsameer95-sys\/repos\?/);
    assert.equal(options.next.revalidate, 3600);
    assert.ok(!('Authorization' in options.headers));
    return { ok: true, json: async () => [repo('mcp-el'), repo('new-tool', { description: 'A new public tool.', html_url: 'javascript:bad()' }), repo('private-project', { private: true }), repo('foreign', { owner: { login: 'someone-else' } }), repo('../unsafe')] };
  });
  const projects = await load('lib/github-projects.ts').getGithubProjects();
  assert.deepEqual(Array.from(projects, p => p.name), ['mcp-el', 'new-tool']);
  assert.equal(projects[1].url, 'https://github.com/priyamsameer95-sys/new-tool');
});

test('discovery reads subsequent pages and falls back atomically on a failed page', async () => {
  const first = Array.from({ length: 100 }, (_, i) => repo(`tool-${i}`));
  let calls = 0;
  const { load } = fixture(async url => { calls++; return { ok: true, json: async () => url.endsWith('page=1') ? first : [repo('last-tool')] }; });
  const projects = await load('lib/github-projects.ts').getGithubProjects();
  assert.equal(calls, 2);
  assert.equal(projects.length, 101);
  assert.ok(projects.some(p => p.name === 'last-tool'));
  const failed = fixture(async url => ({ ok: url.endsWith('page=1'), json: async () => first }));
  assert.equal((await failed.load('lib/github-projects.ts').getGithubProjects()).length, 17);
});

test('project taxonomy preserves the original category anchors and honest source mechanisms', () => {
  const { classifyGithubProject } = fixture().load('lib/github-projects.ts');
  for (const [name, category] of [['loan-policy', 'decision-systems'], ['podcast-studio', 'ai-lending'], ['json-parser', 'tools-experiments'], ['daily-puzzle', 'creative-web'], ['build-log', 'notes-repositories']]) assert.equal(classifyGithubProject(name), category);
  assert.equal(snapshot.groups.length, 5);
  for (const anchor of ['ai-lending', 'tools-experiments', 'notes-repositories']) assert.ok(snapshot.groups.some(group => group.id === anchor));
  for (const project of snapshot.projects) {
    assert.ok(project.pitch && project.technicalTags?.length, `${project.name} has a value proposition and technical scope`);
    if (project.logic) assert.ok(project.sourcePath || project.casePath, `${project.name} has an inspectable basis for its mechanism`);
  }
  const equity = snapshot.projects.find(p => p.name === '2026-08-22-equity-simulator');
  assert.match(equity.logic.note, /common pool.*conversion, dilution and tax/);
  const csv = snapshot.projects.find(p => p.name === '2026-08-22-csv-streamer');
  assert.match(csv.logic.note, /quoted CSV fields/);
  const mcp = snapshot.projects.find(p => p.name === 'mcp-el');
  assert.match(mcp.logic.label, /Documented/);
  assert.match(mcp.logic.note, /not a loan approval/);
});

test('reviewed archival status is retained and empty future workspaces remain empty when archived', async () => {
  const { load } = fixture(async () => ({ ok: true, json: async () => [
    repo('mcp-el', { archived: true }),
    repo('new-empty', { size: 0, archived: true, language: null }),
    repo('small-tools-', { size: 10, description: 'An implemented new utility.' }),
  ] }));
  const projects = await load('lib/github-projects.ts').getGithubProjects();
  const mcp = projects.find(project => project.name === 'mcp-el');
  assert.equal(mcp.kind, 'MCP server prototype');
  assert.equal(mcp.archived, true);
  const empty = projects.find(project => project.name === 'new-empty');
  assert.equal(empty.kind, 'Empty repository');
  assert.equal(empty.archived, true);
  const implemented = projects.find(project => project.name === 'small-tools-');
  assert.equal(implemented.kind, 'Repository');
  assert.equal(implemented.pitch, undefined, 'A newly populated workspace must not retain its old idea-stage pitch');
  assert.equal(implemented.description, 'An implemented new utility.');
});

test('a successful empty public index does not reintroduce unavailable reviewed repositories', async () => {
  const { load } = fixture(async () => ({ ok: true, json: async () => [] }));
  assert.equal((await load('lib/github-projects.ts').getGithubProjects()).length, 0);
});

test('the showcase groups related EduLoans repositories once and accounts for all 17 public sources', () => {
  const { load } = fixture();
  const input = load('lib/github-projects.ts').reviewedGithubProjects;
  const before = JSON.stringify(input);
  const { projects, supporting } = load('lib/github-showcase.ts').buildGithubShowcase(input);
  assert.equal(projects.length, 12);
  assert.equal(supporting.length, 3);
  assert.equal(new Set(projects.map(project => project.id)).size, projects.length);
  const education = projects.filter(project => project.id === 'eduloans');
  assert.equal(education.length, 1);
  assert.deepEqual(Array.from(education[0].repositoryNames), ['mcp-el', 'V1.03-Chat-eduloans', 'edulaons']);
  assert.deepEqual(Array.from(education[0].repositories, project => project.kind), ['MCP server prototype', 'Interaction prototype', 'Lending prototype']);
  const represented = [...projects.flatMap(project => project.repositories), ...supporting];
  assert.equal(represented.length, input.length);
  assert.equal(new Set(represented.map(repository => repository.name)).size, input.length);
  assert.deepEqual(Array.from(represented, repository => repository.name).sort(), Array.from(input, repository => repository.name).sort());
  for (const repository of represented) assert.equal(repository, input.find(source => source.name === repository.name), 'The original repository record, links and qualifications are retained');
  for (const project of projects) assert.deepEqual(Array.from(project.repositoryNames), Array.from(project.repositories, repository => repository.name));
  assert.deepEqual(Array.from(supporting, repository => repository.name).sort(), ['daily-build-log', 'gpttest', 'small-tools-']);
  assert.ok(projects.some(project => project.id === 'portfolio'), 'The working publishing platform is distinct from build notes');
  assert.equal(JSON.stringify(input), before, 'Grouping must not mutate reviewed content');
});

test('group identities and member order remain stable across discovery order and missing variants', () => {
  const { load } = fixture();
  const repositories = load('lib/github-projects.ts').reviewedGithubProjects;
  const { buildGithubShowcase } = load('lib/github-showcase.ts');
  const original = buildGithubShowcase(repositories);
  const reordered = buildGithubShowcase([...repositories].reverse());
  assert.deepEqual(Array.from(reordered.projects, project => [project.id, Array.from(project.repositoryNames)]), Array.from(original.projects, project => [project.id, Array.from(project.repositoryNames)]));
  const subset = buildGithubShowcase(repositories.filter(repository => repository.name === 'V1.03-Chat-eduloans'));
  assert.equal(subset.projects.length, 1);
  assert.equal(subset.projects[0].id, 'eduloans');
  assert.deepEqual(Array.from(subset.projects[0].repositoryNames), ['V1.03-Chat-eduloans']);
  assert.equal(subset.supporting.length, 0);
  assert.equal(buildGithubShowcase([]).projects.length, 0);
});

test('new public repositories remain discoverable without being merged by keyword or rendered as fake products', async () => {
  const { load } = fixture(async () => ({ ok: true, json: async () => [
    repo('mcp-el'), repo('another-education-loan', { description: 'A separate public lending experiment.' }),
    repo('new-build-log', { description: 'A future public project.' }), repo('new-empty', { size: 0 }),
    repo('a.b'), repo('a_2eb'), repo('secret-loan', { private: true }),
  ] }));
  const repositories = await load('lib/github-projects.ts').getGithubProjects();
  const { projects, supporting } = load('lib/github-showcase.ts').buildGithubShowcase(repositories);
  assert.equal(projects.length, 5);
  assert.equal(supporting.length, 1);
  assert.equal(supporting[0].name, 'new-empty');
  assert.equal(projects.find(project => project.id === 'eduloans').repositories.length, 1);
  assert.ok(projects.some(project => project.repositoryNames.includes('another-education-loan')));
  assert.ok(projects.some(project => project.repositoryNames.includes('new-build-log')), 'Unreviewed nonempty repositories must not disappear merely because their taxonomy is notes');
  assert.equal(new Set(projects.map(project => project.id)).size, projects.length, 'Escaped unknown project ids must not collide');
  const represented = [...projects.flatMap(project => project.repositoryNames), ...supporting.map(project => project.name)];
  assert.equal(represented.length, repositories.length);
  assert.equal(new Set(represented).size, repositories.length);
  assert.ok(!represented.includes('secret-loan'));
});

test('repeated case-insensitive repository names cannot create duplicate showcase projects', () => {
  const { load } = fixture();
  const repository = load('lib/github-projects.ts').reviewedGithubProjects.find(project => project.name === 'THEYA.AUDIO');
  const { projects, supporting } = load('lib/github-showcase.ts').buildGithubShowcase([repository, { ...repository, name: 'theya.audio' }]);
  assert.equal(projects.length, 1);
  assert.equal(projects[0].id, 'theya-audio');
  assert.equal(projects[0].repositories.length, 1);
  assert.equal(projects[0].repositories[0], repository);
  assert.equal(supporting.length, 0);
});

test('the page presents one visible stage per project while retaining every public repository link', async () => {
  const { load } = fixture(async () => { throw Error('offline'); });
  const page = load('app/github/page.tsx');
  const html = renderToStaticMarkup(await page.default());
  const { projects, supporting } = load('lib/github-showcase.ts').buildGithubShowcase(load('lib/github-projects.ts').reviewedGithubProjects);
  assert.equal(page.metadata.alternates.canonical, 'https://www.priyamsameer.com/github');
  const stages = [...html.matchAll(/<article\b([^>]*)>([\s\S]*?)<\/article>/g)]
    .filter(([, attributes]) => /\bdata-github-project="[^"]+"/.test(attributes));
  assert.equal(stages.length, projects.length, 'Products, rather than individual source repositories, define the main showcase stages');
  assert.equal(stages.filter(([, attributes]) => /data-github-project="eduloans"/.test(attributes)).length, 1);
  assert.doesNotMatch(html, /<details\b/, 'The work and its source links remain visible without successive disclosure controls');
  for (const project of projects) {
    const stage = stages.find(([, attributes]) => attributes.includes(`data-github-project="${project.id}"`));
    assert.ok(stage, `${project.id} has one visible project stage`);
    assert.ok(stage[1].includes(`id="project-${project.id}"`));
    assert.doesNotMatch(stage[1], /\bhidden(?:\s|=|$)|aria-hidden="true"/);
    for (const repository of project.repositories) assert.ok(stage[2].includes(`href="${repository.url}"`), `${repository.name} remains linked from its project`);
  }
  for (const repository of supporting) {
    assert.ok(html.includes(`href="${repository.url}"`), `${repository.name} remains discoverable as supporting material`);
    assert.ok(!stages.some(([, , content]) => content.includes(`href="${repository.url}"`)), `${repository.name} does not become a fake product stage`);
  }
  for (const repository of snapshot.projects) assert.ok(html.includes(`href="https://github.com/${snapshot.owner}/${encodeURIComponent(repository.name)}"`));
  for (const group of snapshot.groups) assert.ok(html.includes(`id="${group.id}"`), `The existing #${group.id} category link remains compatible`);
  const structuredData = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  const collection = structuredData.find(data => data['@type'] === 'CollectionPage');
  assert.equal(collection.mainEntity.numberOfItems, projects.length);
  assert.equal(collection.mainEntity.itemListElement.length, projects.length);
  assert.doesNotMatch(html, /<iframe\b/, 'Demo code is not loaded until the visitor chooses to try a tool');
  const editorial = load('lib/github-editorial.ts').githubEditorial;
  for (const project of projects) {
    const stage = stages.find(([, attributes]) => attributes.includes(`data-github-project="${project.id}"`));
    for (const screen of editorial[project.id].images) assert.ok(stage[2].includes(`src="${screen.src}"`), `${project.id} exposes its original images openly`);
  }
});

test('demo launchers accept only reviewed local paths and use an opaque-origin sandbox', () => {
  const { load } = fixture();
  const DemoLauncher = load('components/github/DemoLauncher.tsx').default;
  const safe = renderToStaticMarkup(createElement(DemoLauncher, { title: 'JSON Atlas', path: '/github-demos/json-atlas/index.html' }));
  assert.match(safe, /<button[^>]*type="button"[^>]*aria-haspopup="dialog"[^>]*aria-expanded="false"/);
  assert.match(safe, /Try JSON Atlas/);
  assert.doesNotMatch(safe, /<iframe\b/);
  for (const path of ['https://example.com/demo', '//example.com/demo', '/github-demos/../index.html', '/github-demos/json-atlas/index.html?x=1', '/api/admin']) {
    assert.equal(renderToStaticMarkup(createElement(DemoLauncher, { title: 'Unsafe', path })), '', path);
  }
  const opened = fixture(undefined, { react: {
    useState: () => [true, () => {}], useRef: () => ({ current: null }), useEffect: () => {}, useId: () => 'demo-fixture',
  } }).load('components/github/DemoLauncher.tsx').default;
  const openHtml = renderToStaticMarkup(opened({ title: 'JSON Atlas', path: '/github-demos/json-atlas/index.html' }));
  assert.match(openHtml, /<iframe[^>]*src="\/github-demos\/json-atlas\/index.html"/);
  assert.match(openHtml, /title="JSON Atlas interactive demonstration"/);
  assert.match(openHtml, /referrerPolicy="no-referrer"/);
  const sandbox = openHtml.match(/\bsandbox="([^"]+)"/)[1].split(/\s+/);
  assert.ok(sandbox.includes('allow-scripts'));
  assert.ok(!sandbox.includes('allow-same-origin'));
  assert.ok(!sandbox.includes('allow-top-navigation'));
  assert.ok(!sandbox.includes('allow-popups'));
  assert.match(openHtml, /<h2 id="demo-fixture-title">JSON Atlas<\/h2>/);
  assert.match(openHtml, /aria-labelledby="demo-fixture-title"/);
});

test('the native demo dialog focuses its close action and restores scrolling and its launcher on close', () => {
  const transitions = [];
  let shown = 0, closed = 0, closeFocused = 0, triggerFocused = 0;
  const dialog = { open: false, showModal() { this.open = true; shown++; }, close() { this.open = false; closed++; } };
  const trigger = { focus(options) { assert.equal(options.preventScroll, true); triggerFocused++; } };
  const close = { focus() { closeFocused++; } };
  const contentWindow = {};
  const refs = [dialog, trigger, close, { contentWindow }];
  const effects = [];
  const listeners = new Map();
  const removed = [];
  const window = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { removed.push({ type, listener }); assert.equal(listeners.get(type), listener); listeners.delete(type); },
  };
  const document = { body: { style: { overflow: 'clip' } } };
  const { load } = fixture(undefined, { document, window, react: {
    useState: () => [true, value => transitions.push(value)], useRef: () => ({ current: refs.shift() }),
    useEffect: effect => effects.push(effect), useId: () => 'native-demo',
  } });
  const output = load('components/github/DemoLauncher.tsx').default({ title: 'StreamCSV', path: '/github-demos/csv-streamer/index.html' });
  const cleanup = effects[0]();
  assert.equal(shown, 1);
  assert.equal(dialog.open, true);
  assert.equal(document.body.style.overflow, 'hidden');
  assert.equal(closeFocused, 1);
  const onMessage = listeners.get('message');
  assert.equal(typeof onMessage, 'function');
  for (const event of [
    { source: {}, data: { type: 'priyam-demo-close' } },
    { source: null, data: { type: 'priyam-demo-close' } },
    { source: contentWindow, data: { type: 'another-message' } },
    { source: contentWindow, data: null },
    { source: contentWindow },
    { source: contentWindow, data: 'priyam-demo-close' },
  ]) onMessage(event);
  assert.equal(closed, 0, 'Messages from unrelated frames or with other payloads cannot close the dialog');
  onMessage({ source: contentWindow, data: { type: 'priyam-demo-close' } });
  assert.equal(closed, 1, 'Only the exact displayed frame can request closure with the defined payload');
  const nativeDialog = output.props.children.find(child => child?.type === 'dialog');
  nativeDialog.props.onClose();
  assert.deepEqual(transitions, [false], 'Native close, including Escape, updates the expanded state');
  assert.equal(triggerFocused, 1);
  cleanup();
  assert.equal(document.body.style.overflow, 'clip');
  assert.equal(dialog.open, false);
  assert.equal(closed, 1);
  assert.equal(listeners.size, 0, 'Cleanup removes the cross-frame message listener');
  assert.equal(removed[0].type, 'message');
  assert.equal(removed[0].listener, onMessage);
});

test('reviewed showcase entries retain explicit source qualifications and complete media descriptions', () => {
  const { load } = fixture();
  const { projects } = load('lib/github-showcase.ts').buildGithubShowcase(load('lib/github-projects.ts').reviewedGithubProjects);
  const editorial = load('lib/github-editorial.ts').githubEditorial;
  assert.deepEqual(Object.keys(editorial).sort(), Array.from(projects, project => project.id).sort());
  assert.equal(Object.values(editorial).filter(project => project.demoPath).length, 7);
  for (const project of projects) {
    const entry = editorial[project.id];
    assert.ok(entry.images.length > 0, `${project.id} has an original interface preview`);
    assert.ok(entry.decisions.length > 0 && entry.stack.length > 0, `${project.id} explains a choice and implementation`);
    assert.ok(entry.mechanism.label && entry.mechanism.expression && entry.mechanism.note);
    assert.ok(entry.status, `${project.id} qualifies its preview or delivery status`);
    for (const image of entry.images) {
      assert.match(image.src, /^\/(?:github\/screens|work\/eduloans\/prototype)\/[a-z0-9-]+\.(?:png|webp)$/);
      assert.ok(image.alt.length > 20 && image.caption.length > 20);
      assert.ok(Number.isInteger(image.width) && image.width > 0 && Number.isInteger(image.height) && image.height > 0);
    }
    if (entry.demoPath) assert.match(entry.demoPath, /^\/github-demos\/[a-z0-9-]+\/index\.html$/);
  }
  assert.equal(editorial.eduloans.tools.length, 9);
  assert.equal(new Set(editorial.eduloans.tools).size, 9);
  assert.match(editorial.eduloans.status, /sample data; scripted responses/);
  assert.match(editorial.eduloans.status, /145 assertions; not rerun.*mocks/);
  assert.match(JSON.stringify(editorial.eduloans.decisions), /separate experiments.*without implying one connected production system/);
  assert.match(editorial['voice-screening'].status, /synthetic records.*No calls/);
  assert.match(editorial['rocket-card'].status, /illustrative|sample/);
  assert.match(editorial['rocket-card'].status, /financial APIs disabled/);
  assert.match(editorial['equity-simulator'].mechanism.note, /Excludes preferred conversion, dilution and tax/);
  assert.match(editorial['csv-streamer'].mechanism.note, /quoted CSV fields are unsupported.*does not mean constant-memory/);
  assert.match(editorial['tv-surf'].status, /external playback disabled/);
});

test('published showcase media and demos resolve to local files with source provenance and network isolation', () => {
  const { load } = fixture();
  const editorial = load('lib/github-editorial.ts').githubEditorial;
  const publicFile = pathname => path.join(root, 'public', pathname.slice(1));
  for (const [id, entry] of Object.entries(editorial)) {
    for (const image of entry.images) {
      assert.ok(existsSync(publicFile(image.src)), `${id} image exists: ${image.src}`);
      const bytes = readFileSync(publicFile(image.src));
      assert.ok(bytes.length > 100, `${id} media is a real captured file`);
      if (image.src.endsWith('.webp')) {
        assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
        assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
      } else assert.ok(bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' || bytes.subarray(0, 3).toString('hex') === 'ffd8ff', 'Retained original interface captures contain PNG or JPEG image data');
    }
    if (!entry.demoPath) continue;
    const htmlFile = publicFile(entry.demoPath);
    assert.ok(existsSync(htmlFile), `${id} interactive demo exists`);
    const html = readFileSync(htmlFile, 'utf8');
    const csp = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1];
    assert.ok(csp, `${id} defines a restrictive document CSP`);
    for (const directive of ["default-src 'none'", "connect-src 'none'", "frame-src 'none'", "media-src 'none'", "form-action 'none'", "object-src 'none'", "base-uri 'none'"]) assert.ok(csp.includes(directive), `${id}: ${directive}`);
    assert.doesNotMatch(html, /<(?:script|iframe)\b[^>]*src=["']https?:\/\//i);
    const provenance = JSON.parse(readFileSync(path.join(path.dirname(htmlFile), 'source-provenance.json'), 'utf8'));
    assert.match(provenance.repository, new RegExp(`^https://github\\.com/${snapshot.owner}/[A-Za-z0-9_.-]+$`));
    assert.match(provenance.sourceCommit, /^[a-f0-9]{40}$/);
    assert.equal(provenance.indexSha256, createHash('sha256').update(html).digest('hex'), `${id} provenance identifies the exact published preview`);
    assert.ok(provenance.sourceFiles.length > 0);
    assert.ok(provenance.changes.length > 0, `${id} records preview-only adjustments`);
  }
});

test('all seven opaque demo frames send only the Escape close contract to their parent', () => {
  const editorial = fixture().load('lib/github-editorial.ts').githubEditorial;
  let checked = 0;
  for (const [id, entry] of Object.entries(editorial)) {
    if (!entry.demoPath) continue;
    const html = readFileSync(path.join(root, 'public', entry.demoPath.slice(1)), 'utf8');
    const bridge = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]).find(script => script.includes('priyam-demo-close'));
    assert.ok(bridge, `${id} defines an Escape bridge for its opaque-origin frame`);
    const listeners = new Map();
    const messages = [];
    vm.runInNewContext(bridge, {
      document: { addEventListener(type, listener) { listeners.set(type, listener); } },
      window: { parent: { postMessage(data, target) { messages.push({ data, target }); } } },
    });
    const keydown = listeners.get('keydown');
    assert.equal(typeof keydown, 'function');
    keydown({ key: 'Enter' });
    assert.equal(messages.length, 0);
    keydown({ key: 'Escape' });
    assert.equal(messages.length, 1);
    assert.equal(messages[0].data.type, 'priyam-demo-close');
    assert.deepEqual(Object.keys(messages[0].data), ['type'], 'The bridge sends no input, file or tool data');
    assert.equal(messages[0].target, '*', 'An opaque sandbox cannot address the parent through a same-origin contract');
    checked++;
  }
  assert.equal(checked, 7);
});
