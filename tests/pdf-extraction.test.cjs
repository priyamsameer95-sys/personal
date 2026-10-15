const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash } = require('node:crypto');
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

test('the downloadable CV preserves the uploaded single-page file and can still be read by the parser', async () => {
  const supplied = JSON.parse(fs.readFileSync(path.join(__dirname, '../content/cv-download.json')));
  const bytes = fs.readFileSync(path.join(__dirname, '../public/cv/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), supplied.sha256);
  assert.equal(bytes.length,supplied.bytes);
  const text = await extractPdfText(bytes);
  assert.match(text,/PRIYAM\s+SAMEER/i);
  assert.ok(text.includes('PriyamSameer.com'));
  assert.ok(text.includes('SUMMARY'));
  const parser = new PDFParse({ data: bytes });
  try {
    const info = await parser.getInfo();
    assert.equal(info.total, 1, 'The supplied CV remains its original single page');
    assert.equal(info.total, supplied.pageCount);
  } finally { await parser.destroy(); }
});
