const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '..');
const policy = import(pathToFileURL(path.join(root, 'backend/src/legacy-read-only.js')).href);

test('archived backend rejects all mutation and preflight methods before handlers', async () => {
  const { blockLegacyMutations } = await policy;
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'CONNECT', 'TRACE', 'UNKNOWN', undefined]) {
    let nextCalled = false;
    const response = {
      headers: {},
      set(name, value) { this.headers[name] = value; return this; },
      status(value) { this.statusCode = value; return this; },
      json(value) { this.body = value; return this; },
    };
    blockLegacyMutations({ method }, response, () => { nextCalled = true; });
    assert.equal(nextCalled, false, `${method} reached a downstream handler`);
    assert.equal(response.statusCode, 410);
    assert.equal(response.headers['Cache-Control'], 'no-store');
    assert.match(response.body.error, /read-only/);
  }
});

test('archived backend permits only local read methods', async () => {
  const { blockLegacyMutations, LEGACY_BACKEND_HOST } = await policy;
  assert.equal(LEGACY_BACKEND_HOST, '127.0.0.1');
  for (const method of ['GET', 'HEAD']) {
    let nextCalled = false;
    blockLegacyMutations({ method }, {}, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
  }
});

test('archived app installs rejection before every route and binds only to loopback', () => {
  const source = fs.readFileSync(path.join(root, 'backend/src/app.js'), 'utf8');
  const gate = source.indexOf('app.use(blockLegacyMutations)');
  assert.ok(gate > -1);
  for (const route of ['/api/cv', '/api/paintings', '/api/blogs', '/api/portfolio']) {
    assert.ok(source.indexOf(`app.use('${route}'`) > gate, route);
  }
  assert.match(source, /app\.listen\(PORT, LEGACY_BACKEND_HOST,/);
  assert.doesNotMatch(source, /app\.use\(cors\(/);
});
