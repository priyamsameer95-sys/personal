import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import crypto from 'crypto';
import db from '@/lib/db';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

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

    // 2. File handling using Vercel Blob
    if (file && file.size > 0) {
      // Server-side size validation: 20MB max
      const MAX_SIZE = 20 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'File size exceeds 20MB limit' }, { status: 400 });
      }

      const detectedMime = file.type;

      if (!ALLOWED_MIME_TYPES[detectedMime]) {
        return NextResponse.json(
          { error: 'Unsupported file type. Supported types: JPEG, PNG, WEBP, PDF' },
          { status: 415 }
        );
      }

      const ext = ALLOWED_MIME_TYPES[detectedMime];
      
      const fileId = crypto.randomUUID();
      const filename = `${fileId}${ext}`;
      const relativePath = `uploads/${category}/${filename}`;

      // Save file payload to Vercel Blob
      const blob = await put(relativePath, file, { access: 'public' });

      filePath = blob.url; // Use the Blob URL instead of a local path
      fileType = detectedMime;
    } else {
      // Art category requires an image file
      if (category === 'art') {
        return NextResponse.json({ error: 'Paintings must include an image file' }, { status: 400 });
      }
    }

    // 3. Database write using Vercel Postgres
    const id = crypto.randomUUID();
    const createdAt = Date.now();

    await db`
      INSERT INTO content (id, title, description, category, file_path, file_type, is_public, is_downloadable, created_at)
      VALUES (${id}, ${title}, ${description}, ${category}, ${filePath}, ${fileType}, ${isPublicVal}, ${isDownloadableVal}, ${createdAt})
    `;

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('Upload Error:', err);
    return NextResponse.json({ error: 'An error occurred during upload processing' }, { status: 500 });
  }
}
