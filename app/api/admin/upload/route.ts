import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';
import db from '@/lib/db';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

// Validate file type strictly using magic bytes signature
function validateMagicBytes(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }

  // PDF: %PDF (25 50 44 46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf';
  }

  // WEBP: RIFF at 0-3 and WEBP at 8-11
  if (buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'image/webp';
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) || '';
    const category = formData.get('category') as string;
    const isPublicVal = formData.get('is_public') === 'true' ? 1 : 0;
    const isDownloadableVal = formData.get('is_downloadable') === 'true' ? 1 : 0;
    const file = formData.get('file') as File | null;

    // 1. Parameter validation
    if (!title || !category) {
      return NextResponse.json({ error: 'Title and Category are required' }, { status: 400 });
    }

    if (!['art', 'product', 'blog', 'cv'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    let filePath: string | null = null;
    let fileType: string | null = null;

    // 2. File handling and security checks
    if (file && file.size > 0) {
      // Server-side size validation: 20MB max
      const MAX_SIZE = 20 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'File size exceeds 20MB limit' }, { status: 400 });
      }

      // Convert to buffer for byte analysis
      const buffer = Buffer.from(await file.arrayBuffer());
      const detectedMime = validateMagicBytes(buffer);

      if (!detectedMime) {
        return NextResponse.json(
          { error: 'Unsupported file type. Supported types: JPEG, PNG, WEBP, PDF' },
          { status: 415 }
        );
      }

      const ext = ALLOWED_MIME_TYPES[detectedMime];
      
      // Sanitized path: Discard original filename and generate a fresh UUID filename
      const fileId = crypto.randomUUID();
      const filename = `${fileId}${ext}`;
      const relativePath = `/uploads/${category}/${filename}`;
      const absolutePath = path.join(process.cwd(), relativePath);

      // Save file payload to server storage
      await fs.writeFile(absolutePath, buffer);

      filePath = relativePath;
      fileType = detectedMime;
    } else {
      // Art category requires an image file
      if (category === 'art') {
        return NextResponse.json({ error: 'Paintings must include an image file' }, { status: 400 });
      }
    }

    // 3. Database write using parameterized statement
    const id = crypto.randomUUID();
    const createdAt = Date.now();

    const insertStmt = db.prepare(`
      INSERT INTO content (id, title, description, category, file_path, file_type, is_public, is_downloadable, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      id,
      title,
      description,
      category,
      filePath,
      fileType,
      isPublicVal,
      isDownloadableVal,
      createdAt
    );

    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json({ error: 'An error occurred during upload processing' }, { status: 500 });
  }
}
