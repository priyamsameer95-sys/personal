// Imported lazily so routes that do not extract a PDF avoid loading the parser.
export async function extractPdfText(data: Uint8Array): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data });

  try {
    // Keep stored CV text free of the parser's default page-number decorations.
    const result = await parser.getText({ pageJoiner: '' });
    return result.text;
  } finally {
    await parser.destroy();
  }
}
