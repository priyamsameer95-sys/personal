const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = readFileSync(path.join(__dirname, '../components/work/WorkFragmentNavigation.tsx'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function fixture(hash = '', fragments = [], elements = {}) {
  let effect, nextFrame = 0;
  const frames = new Map(), listeners = new Map(), events = [];
  const location = { hash, replace: destination => events.push(['replace', destination]) };
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports,
    require: id => id === 'react' ? { useEffect: callback => { effect = callback; } } : require(id),
    window: { location, addEventListener: (event, callback) => listeners.set(event, callback), removeEventListener: (event, callback) => { assert.equal(listeners.get(event), callback); listeners.delete(event); } },
    document: { getElementById: id => { events.push(['target', id]); return elements[id] || null; } },
    requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame: id => frames.delete(id),
  }, { filename: 'components/work/WorkFragmentNavigation.tsx' });
  return {
    exports: module.exports, location, events, frames, listeners,
    mount() { assert.equal(module.exports.default({ fragments }), null); return effect(); },
    change(hash) { location.hash = hash; listeners.get('hashchange')(); },
    flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback()); },
  };
}

test('six former Work context hashes resolve only to their exact internal CV destinations', () => {
  const { resolveCareerFragment, resolveWorkFragment } = fixture().exports;
  const destinations = {
    credflow: '/cv#credflow', 'founder-programmes': '/cv#founder-programmes',
    'water-farmers': '/cv#internship', 'gujarat-action-group': '/cv#gujarat-action-group',
    advisory: '/cv#advisory', cept: '/cv#education',
  };
  for (const [fragment, destination] of Object.entries(destinations)) {
    assert.equal(resolveCareerFragment(`#${fragment}`), destination);
    assert.match(destination, /^\/cv#[a-z-]+$/);
    assert.equal(new URL(destination, 'https://www.priyamsameer.com').origin, 'https://www.priyamsameer.com');
  }
  assert.equal(resolveCareerFragment('#%67ujarat-action-group'), destinations['gujarat-action-group']);
  assert.equal(resolveWorkFragment('#%63ashkaro', ['cashkaro']), 'cashkaro');
  for (const hash of ['', '#', '#%E0%A4', '#unknown', '#__proto__', '#constructor', '#toString', '#https://example.com', '#//example.com', '#gujarat-action-group?next=//example.com']) {
    assert.equal(resolveCareerFragment(hash), null, hash);
    assert.equal(resolveWorkFragment(hash, ['cashkaro']), null, hash);
  }
});

test('career hash redirection precedes footer-anchor lookup, including hashes in the old allowlist', () => {
  const f = fixture('#gujarat-action-group', ['gujarat-action-group']);
  const cleanup = f.mount();
  assert.deepEqual(f.events, [['replace', '/cv#gujarat-action-group']]);
  assert.equal(f.frames.size, 0);
  assert.equal(f.listeners.size, 1);
  f.change('#advisory');
  assert.deepEqual(f.events.at(-1), ['replace', '/cv#advisory']);
  cleanup();
  assert.equal(f.listeners.size, 0);
});

test('company and project jumps focus their heading while scrolling the original destination', () => {
  for (const id of ['absolute', 'project-example']) {
    let f;
    const heading = { focus: options => f.events.push(['heading-focus', options.preventScroll]) };
    const target = {
      querySelector: () => heading,
      focus: () => assert.fail('The whole company or project container must not receive focus'),
      scrollIntoView: options => f.events.push(['scroll', options.block, options.behavior]),
    };
    f = fixture(`#${id}`, [id], { [id]: target });
    const cleanup = f.mount();
    f.flush();
    assert.deepEqual(f.events, [['target', id], ['heading-focus', true], ['scroll', 'start', 'instant']]);
    cleanup();
  }
});

test('a legacy theme span focuses the surrounding project heading and keeps its own scroll position', () => {
  let f;
  const heading = { focus: options => f.events.push(['heading-focus', options.preventScroll]) };
  const project = { querySelector: () => heading };
  const alias = {
    closest: () => project,
    querySelector: () => null,
    focus: () => assert.fail('A zero-size theme alias must not take focus instead of its project heading'),
    scrollIntoView: options => f.events.push(['alias-scroll', options.block]),
  };
  f = fixture('#applied-ai', ['applied-ai'], { 'applied-ai': alias });
  const cleanup = f.mount(); f.flush();
  assert.deepEqual(f.events, [['target', 'applied-ai'], ['heading-focus', true], ['alias-scroll', 'start']]);
  cleanup();
});

test('navigation and missing destinations retain safe fallback behaviour', () => {
  let f;
  const nav = { focus: options => f.events.push(['nav-focus', options.preventScroll]), scrollIntoView: options => f.events.push(['scroll', options.block]) };
  f = fixture('#company-index', ['company-index', 'missing'], { 'company-index': nav });
  const cleanup = f.mount(); f.flush();
  assert.deepEqual(f.events, [['target', 'company-index'], ['nav-focus', true], ['scroll', 'start']]);
  f.change('#missing'); f.flush();
  assert.deepEqual(f.events.at(-1), ['target', 'missing']);
  cleanup();
});

test('a new career, unknown or malformed hash cancels a previously queued project jump', () => {
  for (const hash of ['#credflow', '#unknown', '#%E0%A4']) {
    const f = fixture('#project-example', ['project-example']);
    const cleanup = f.mount();
    assert.equal(f.frames.size, 1);
    f.change(hash); f.flush();
    assert.equal(f.frames.size, 0);
    assert.deepEqual(f.events, hash === '#credflow' ? [['replace', '/cv#credflow']] : []);
    cleanup();
    assert.equal(f.listeners.size, 0);
  }
});
