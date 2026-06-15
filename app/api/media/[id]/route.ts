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

    // 1. Fetch metadata and check public visibility
    const item = db
      .prepare('SELECT file_path, file_type, is_public FROM content WHERE id = ?')
      .get(id) as { file_path: string | null; file_type: string | null; is_public: number } | undefined;

    if (!item || !item.file_path || item.is_public !== 1) {
      return new NextResponse('File Not Found', { status: 404 });
    }

    // 2. Resolve absolute path and verify file exists on disk
    const absolutePath = path.join(process.cwd(), item.file_path);
    if (!fs.existsSync(absolutePath)) {
      return new NextResponse('File Not Found', { status: 404 });
    }

    // 3. Stream file contents with appropriate MIME type and caching
    const fileBuffer = fs.readFileSync(absolutePath);
    const contentType = item.file_type || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // Optimize performance (LCP)
      },
    });
  } catch {
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
