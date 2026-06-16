import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';
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
    const { rows } = await db`SELECT title, file_path, file_type, is_downloadable FROM content WHERE id = ${id}`;
    const item = rows[0] as { title: string; file_path: string | null; file_type: string | null; is_downloadable: number } | undefined;

    if (!item || !item.file_path || item.is_downloadable !== 1) {
      return new NextResponse('File is not downloadable or does not exist', { status: 403 });
    }

    // 2. Fetch the file from Vercel Blob
    const blobResult = await get(item.file_path, { access: 'private' });
    if (!blobResult || !blobResult.stream) {
       return new NextResponse('File not found', { status: 404 });
    }

    // 3. Stream file as attachment with friendly filename
    const contentType = item.file_type || blobResult.blob.contentType || 'application/octet-stream';
    
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

    return new NextResponse(blobResult.stream, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    console.error('Download fetch error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
