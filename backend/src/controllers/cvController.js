import { prisma } from '../config/db.js';
import { uploadToS3 } from '../config/s3.js';
import { PDFParse } from 'pdf-parse';

/**
 * Handle CV upload, text extraction and storage.
 */
export async function uploadCvHandler(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'A PDF file is required.' });
    }

    // 1. Extract text from PDF buffer using pdf-parse (ESM)
    let extractedText = '';
    try {
      const parser = new PDFParse({ data: new Uint8Array(req.file.buffer) });
      const parseResult = await parser.getText();
      extractedText = parseResult.text || '';
    } catch (parseErr) {
      console.error('PDF text extraction failed:', parseErr);
      return res.status(500).json({ error: 'Failed to extract text from the PDF file.' });
    }

    // 2. Upload raw file to S3
    let fileUrl = '';
    try {
      fileUrl = await uploadToS3(req.file, 'cvs');
    } catch (s3Err) {
      console.error('S3 upload failed:', s3Err);
      return res.status(500).json({ error: 'Failed to upload PDF file to S3.' });
    }

    // 3. Save to database
    const cvRecord = await prisma.cV.create({
      data: {
        fileUrl,
        extractedText,
      },
    });

    return res.status(201).json({
      message: 'CV uploaded and processed successfully.',
      data: cvRecord,
    });
  } catch (err) {
    console.error('CV upload controller failed:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}

/**
 * Serves the latest extracted CV text directly.
 */
export async function getLatestCvHandler(req, res) {
  try {
    const latestCv = await prisma.cV.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!latestCv) {
      return res.status(404).json({ error: 'No CV has been uploaded yet.' });
    }

    return res.status(200).json({
      extractedText: latestCv.extractedText,
      fileUrl: latestCv.fileUrl,
      createdAt: latestCv.createdAt,
    });
  } catch (err) {
    console.error('Get latest CV controller failed:', err);
    return res.status(500).json({ error: 'An unexpected server error occurred.' });
  }
}
