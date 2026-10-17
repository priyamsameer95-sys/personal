const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.join(__dirname, '..');
const snapshot = JSON.parse(readFileSync(path.join(root, 'content/github-projects.json'), 'utf8'));
function fixture(fetcher) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    if (file.endsWith('.json')) return JSON.parse(readFileSync(path.join(root, file), 'utf8'));
    const module = { exports: {} };
    const source = ts.transpileModule(readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    const requireLocal = id => {
      if (id.endsWith('.css')) return {};
      if (id === 'next/link') return ({ children, ...props }) => createElement('a', props, children);
      if (id === '@/components/PublicShell') return ({ children }) => createElement('div', null, children);
      if (id.startsWith('@/components/')) return () => null;
      if (id.startsWith('@/')) return load(id.slice(2) + (id.endsWith('.json') ? '' : '.ts'));
      return require(id);
    };
    vm.runInNewContext(source, { module, exports: module.exports, require: requireLocal, fetch: fetcher, AbortSignal, URL, process: { env: {} } }, { filename: file });
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

test('the page exposes every repository openly with canonical metadata and real actions', async () => {
  const { load } = fixture(async () => { throw Error('offline'); });
  const page = load('app/github/page.tsx');
  const html = renderToStaticMarkup(await page.default());
  assert.equal(page.metadata.alternates.canonical, 'https://www.priyamsameer.com/github');
  assert.equal((html.match(/<article/g) || []).length, 17);
  assert.match(html, /17 public repositories/);
  assert.match(html, /Try the tool/);
  assert.match(html, /See the walkthrough/);
  assert.match(html, /Inspect the logic/);
  assert.equal((html.match(/<dl/g) || []).length, 15, 'Implemented/documented projects expose their mechanisms; empty workspaces do not invent one');
  assert.doesNotMatch(html, /<details|hidden=|aria-hidden="true"/);
  for (const project of snapshot.projects) assert.ok(html.includes(`href="https://github.com/${snapshot.owner}/${encodeURIComponent(project.name)}"`));
  const data = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  assert.equal(data[0].mainEntity.numberOfItems, 17);
});

test('project taxonomy follows product type while preserving the original category anchors', () => {
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
