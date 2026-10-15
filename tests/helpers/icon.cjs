const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const { outputText } = ts.transpileModule(readFileSync(path.join(__dirname, '../../components/Icon.tsx'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
});
const moduleOutput = { exports: {} };
vm.runInNewContext(outputText, { module: moduleOutput, exports: moduleOutput.exports, require });
module.exports = moduleOutput.exports.default;
