const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { PDFParse } = require('pdf-parse');

// Exercise the application's helper against the installed parser and its worker.
const source = fs.readFileSync(path.join(__dirname, '../lib/pdf.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const helperModule = { exports: {} };
vm.runInNewContext(outputText, {
  module: helperModule,
  exports: helperModule.exports,
  require,
}, { filename: 'lib/pdf.ts' });
const { extractPdfText } = helperModule.exports;
const pdfBytes = () => fs.readFileSync(path.join(__dirname, 'fixtures/cv-text.pdf'));

test('actual PDF parser extracts CV text from a Buffer and Uint8Array', async () => {
  for (const data of [pdfBytes(), new Uint8Array(pdfBytes())]) {
    const text = await extractPdfText(data);
    assert.equal(text.trim(), 'Priyam Sameer - Product Manager');
    assert.doesNotMatch(text, /-- \d+ of \d+ --/);
  }
});

test('parser resources are released after extraction and malformed PDF failure', async () => {
  const originalDestroy = PDFParse.prototype.destroy;
  let released = 0;
  PDFParse.prototype.destroy = async function () {
    await originalDestroy.call(this);
    released += 1;
  };

  try {
    await extractPdfText(pdfBytes());
    assert.equal(released, 1);
    await assert.rejects(extractPdfText(Buffer.from('This is not a PDF.')), /Invalid PDF/i);
    assert.equal(released, 2);
    assert.equal((await extractPdfText(pdfBytes())).trim(), 'Priyam Sameer - Product Manager');
    assert.equal(released, 3);
  } finally {
    PDFParse.prototype.destroy = originalDestroy;
  }
});
