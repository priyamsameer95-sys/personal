import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import db from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return new NextResponse('Missing ID', { status: 400 });
    }

    // 1. Fetch metadata and check is_downloadable permission
    const item = db
      .prepare('SELECT title, file_path, file_type, is_downloadable FROM content WHERE id = ?')
      .get(id) as { title: string; file_path: string | null; file_type: string | null; is_downloadable: number } | undefined;

    if (!item || !item.file_path || item.is_downloadable !== 1) {
      return new NextResponse('File is not downloadable or does not exist', { status: 403 });
    }

    // 2. Resolve path and verify file exists on disk
    const absolutePath = path.join(process.cwd(), item.file_path);
    if (!fs.existsSync(absolutePath)) {
      return new NextResponse('File not found', { status: 404 });
    }

    // 3. Stream file as attachment with friendly filename
    const fileBuffer = fs.readFileSync(absolutePath);
    const contentType = item.file_type || 'application/octet-stream';
    
    // Sanitize title for safe header encoding
    const safeTitle = item.title.replace(/[^a-zA-Z0-9\s-_]/g, '').trim();
    const extensions: Record<string, string> = {
      'application/pdf': '.pdf',
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = extensions[item.file_type || ''] || '';
    const filename = `${safeTitle || 'document'}${ext}`;

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'no-store, max-age=0', // Do not cache private downloads
      },
    });
  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
