const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');
const root = path.join(__dirname, '..');

for (const route of ['analytics', 'cv-leads']) {
  test(`hosted ${route} page is unavailable without reading private records`, () => {
    let notFoundCalls = 0;
    const { outputText } = ts.transpileModule(readFileSync(path.join(root, `app/minforyam/${route}/page.tsx`), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    });
    const module = { exports: {} };
    vm.runInNewContext(outputText, { module, exports: module.exports, require: id => {
      assert.equal(id, 'next/navigation', 'A hosted report must not import auth, a database, or a renderer');
      return { notFound() { notFoundCalls++; throw Error('NEXT_NOT_FOUND'); } };
    } });
    assert.throws(() => module.exports.default(), /NEXT_NOT_FOUND/);
    assert.equal(notFoundCalls, 1);
    assert.equal(module.exports.dynamic, 'force-dynamic');
    assert.equal(module.exports.metadata.robots.index, false);
  });
}
