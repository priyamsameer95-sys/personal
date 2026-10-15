const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const { outputText } = ts.transpileModule(readFileSync(path.join(__dirname, '../../lib/seo.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const result = { exports: {} };
vm.runInNewContext(outputText, { module: result, exports: result.exports, require, URL, process: { env: {} } });
module.exports = result.exports;
