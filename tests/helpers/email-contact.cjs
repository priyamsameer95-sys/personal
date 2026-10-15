const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const css = new Proxy({}, { get: (_, name) => name === '__esModule' ? false : String(name) });
const filename = path.join(__dirname, '../../components/EmailContact.tsx');
const { outputText } = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
});
const component = { exports: {} };
vm.runInNewContext(outputText, {
  module: component, exports: component.exports,
  require: id => id === './email-contact.module.css' ? css : require(id),
}, { filename });
module.exports = component.exports;
