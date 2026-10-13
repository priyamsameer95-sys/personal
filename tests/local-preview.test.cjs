const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadDatabase(env, sql) {
  const source = fs.readFileSync(path.join(__dirname, '../lib/db.ts'), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module,
    exports: module.exports,
    process: { env },
    require: (name) => {
      assert.equal(name, '@vercel/postgres');
      return { sql };
    },
  });
  return module.exports;
}

test('development and unset NODE_ENV preview empty collections without a database', async () => {
  for (const NODE_ENV of [undefined, 'development']) {
    const db = loadDatabase({ NODE_ENV }, () => assert.fail('Must not connect to a database'));
    assert.equal(db.isLocalPreview(), true);
    const result = await db.publicDb`SELECT title FROM content_items`;
    assert.equal(result.rows.length, 0);
  }
});

test('configured URLs prevent an automatic empty fallback', async () => {
  for (const variable of ['POSTGRES_URL', 'POSTGRES_URL_NON_POOLING', 'DATABASE_URL']) {
    const expected = { rows: [{ id: 'published-item' }] };
    const db = loadDatabase({ NODE_ENV: 'development', [variable]: 'configured' }, () => expected);
    assert.equal(db.isLocalPreview(), false);
    assert.equal(await db.publicDb`SELECT id FROM content_items`, expected);
  }
});

test('explicit development preview avoids a configured database', async () => {
  const db = loadDatabase(
    { NODE_ENV: 'development', POSTGRES_URL: 'configured', LOCAL_PREVIEW: 'true' },
    () => assert.fail('Explicit preview must not connect')
  );
  assert.equal(db.isLocalPreview(), true);
  assert.equal((await db.publicDb`SELECT title FROM content_items`).rows.length, 0);
});

test('production cannot enable preview even when explicitly requested', async () => {
  for (const POSTGRES_URL of [undefined, 'configured']) {
    const expected = { rows: [{ id: 'production-item' }] };
    const db = loadDatabase({ NODE_ENV: 'production', LOCAL_PREVIEW: 'true', POSTGRES_URL }, () => expected);
    assert.equal(db.isLocalPreview(), false);
    assert.equal(await db.publicDb`SELECT id FROM content_items`, expected);
  }
});

test('real database errors propagate and query parameters are forwarded', async () => {
  const failure = new Error('Database connection failed');
  const db = loadDatabase({ NODE_ENV: 'development', POSTGRES_URL: 'configured' }, async (strings, ...values) => {
    assert.equal(strings.join('?'), 'SELECT id FROM content_items WHERE slug = ?');
    assert.deepEqual(values, ['case-study']);
    throw failure;
  });
  await assert.rejects(db.publicDb`SELECT id FROM content_items WHERE slug = ${'case-study'}`, failure);
});

test('admin client remains the real SQL client during preview', () => {
  const sql = () => {};
  const db = loadDatabase({ NODE_ENV: 'development', LOCAL_PREVIEW: 'true' }, sql);
  assert.equal(db.default, sql);
});
