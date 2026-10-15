const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '../..');
const css = new Proxy({}, { get: (_, name) => name === '__esModule' ? false : String(name) });
function load(filename, stubs = {}) {
  const { outputText } = ts.transpileModule(readFileSync(path.join(root, filename), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { module, exports: module.exports,
    require: id => Object.hasOwn(stubs, id) ? stubs[id] : require(id),
  }, { filename });
  return module.exports;
}
const constants = load('lib/cv-download.ts', { '../content/cv-download.json': require('../../content/cv-download.json') });
module.exports = load('components/CvDownload.tsx', {
  '@/lib/cv-download': constants, '@/components/Icon': require('./icon.cjs'), './cv-download.module.css': css,
});
