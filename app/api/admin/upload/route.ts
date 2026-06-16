import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import crypto from 'crypto';
import db from '@/lib/db';

const IMAGE_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const ALL_MIME_TYPES: Record<string, string> = {
  ...IMAGE_MIME_TYPES,
  'application/pdf': '.pdf',
};

// Category-specific constraints
const CATEGORY_CONFIG = {
  cv: { maxFiles: 1, maxFileSize: 20 * 1024 * 1024, allowedMimes: { 'application/pdf': '.pdf' }, requireFile: true, hasBodyText: true },
  art: { maxFiles: 1, maxFileSize: 50 * 1024 * 1024, allowedMimes: IMAGE_MIME_TYPES, requireFile: true, hasBodyText: false },
  blog: { maxFiles: 3, maxFileSize: 20 * 1024 * 1024, allowedMimes: IMAGE_MIME_TYPES, requireFile: false, hasBodyText: true },
  product: { maxFiles: 7, maxFileSize: 20 * 1024 * 1024, allowedMimes: IMAGE_MIME_TYPES, requireFile: false, hasBodyText: true },
} as const;

type Category = keyof typeof CATEGORY_CONFIG;

// Extract text from a PDF buffer using pdf-parse
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid issues during build
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const data = await parser.getText();
    return data.text || '';
  } catch (err) {
    console.error('PDF text extraction failed:', err);
    return '';
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = (formData.get('description') as string) || '';
    const bodyText = (formData.get('body_text') as string) || '';
    const category = formData.get('category') as string;
    const isPublicVal = formData.get('is_public') === 'true' ? 1 : 0;
    const isDownloadableVal = formData.get('is_downloadable') === 'true' ? 1 : 0;

    // 1. Parameter validation
    if (!title || !category) {
      return NextResponse.json({ error: 'Title and Category are required' }, { status: 400 });
    }

    if (!['art', 'product', 'blog', 'cv'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const config = CATEGORY_CONFIG[category as Category];

    // Collect all uploaded files
    const files: File[] = [];
    // Support both 'file' (single) and 'files' (multiple) field names
    const singleFile = formData.get('file') as File | null;
    const multiFiles = formData.getAll('files') as File[];

    if (singleFile && singleFile.size > 0) {
      files.push(singleFile);
    }
    for (const f of multiFiles) {
      if (f && f.size > 0) {
        files.push(f);
      }
    }

    // 2. Validate file count
    if (config.requireFile && files.length === 0) {
      const fileTypeMsg = category === 'cv' ? 'a PDF file' : 'an image file';
      return NextResponse.json({ error: `${category.toUpperCase()} uploads require ${fileTypeMsg}` }, { status: 400 });
    }

    if (files.length > config.maxFiles) {
      return NextResponse.json({ error: `Maximum ${config.maxFiles} file(s) allowed for ${category}` }, { status: 400 });
    }

    // 3. Validate all files before uploading any
    for (const file of files) {
      if (file.size > config.maxFileSize) {
        const maxMB = Math.round(config.maxFileSize / (1024 * 1024));
        return NextResponse.json({ error: `File "${file.name}" exceeds ${maxMB}MB limit` }, { status: 400 });
      }

      if (!config.allowedMimes[file.type as keyof typeof config.allowedMimes]) {
        const allowed = Object.values(config.allowedMimes).map(e => e.replace('.', '').toUpperCase()).join(', ');
        return NextResponse.json({ error: `File "${file.name}" has unsupported type. Allowed: ${allowed}` }, { status: 415 });
      }
    }

    // 4. Upload files to Vercel Blob
    let primaryFilePath: string | null = null;
    let primaryFileType: string | null = null;
    let extractedText = '';

    const contentId = crypto.randomUUID();
    const createdAt = Date.now();
    const uploadedImages: { id: string; filePath: string; fileType: string; sortOrder: number; label: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = ALL_MIME_TYPES[file.type] || '';
      const fileId = crypto.randomUUID();
      const filename = `${fileId}${ext}`;
      const relativePath = `uploads/${category}/${filename}`;

      const blob = await put(relativePath, file, { access: 'private' });

      if (category === 'cv' || category === 'art') {
        // Single file categories: store in content.file_path
        primaryFilePath = blob.url;
        primaryFileType = file.type;

        // Extract text from PDF for CV
        if (category === 'cv' && file.type === 'application/pdf') {
          const buffer = Buffer.from(await file.arrayBuffer());
          extractedText = await extractPdfText(buffer);
        }
      } else {
        // Multi-file categories (blog, product): store in content_images
        const label = i === 0 ? 'banner' : `inline-${i}`;
        uploadedImages.push({
          id: fileId,
          filePath: blob.url,
          fileType: file.type,
          sortOrder: i,
          label,
        });
      }
    }

    // 5. Determine body_text
    let finalBodyText: string | null = null;
    if (category === 'cv') {
      finalBodyText = extractedText || bodyText || null;
    } else if (config.hasBodyText) {
      finalBodyText = bodyText || null;
    }

    // 6. Database write — insert content row
    await db`
      INSERT INTO content (id, title, description, body_text, category, file_path, file_type, is_public, is_downloadable, created_at)
      VALUES (${contentId}, ${title}, ${description}, ${finalBodyText}, ${category}, ${primaryFilePath}, ${primaryFileType}, ${isPublicVal}, ${isDownloadableVal}, ${createdAt})
    `;

    // 7. Insert image rows for multi-image categories
    for (const img of uploadedImages) {
      await db`
        INSERT INTO content_images (id, content_id, file_path, file_type, sort_order, label, created_at)
        VALUES (${img.id}, ${contentId}, ${img.filePath}, ${img.fileType}, ${img.sortOrder}, ${img.label}, ${createdAt})
      `;
    }

    return NextResponse.json({ success: true, id: contentId, imageCount: uploadedImages.length });
  } catch (err) {
    console.error('Upload Error:', err);
    return NextResponse.json({ error: 'An error occurred during upload processing' }, { status: 500 });
  }
}
