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

    // 1. Fetch metadata and check public visibility
    const { rows } = await db`SELECT file_path, file_type, is_public FROM content WHERE id = ${id}`;
    const item = rows[0] as { file_path: string | null; file_type: string | null; is_public: number } | undefined;

    if (!item || !item.file_path || item.is_public !== 1) {
      return new NextResponse('File Not Found', { status: 404 });
    }

    // 2. Fetch and stream the private Vercel Blob file
    const blobResult = await get(item.file_path, { access: 'private' });
    if (!blobResult || !blobResult.stream) {
      return new NextResponse('File Not Found', { status: 404 });
    }

    return new NextResponse(blobResult.stream, {
      headers: {
        'Content-Type': item.file_type || blobResult.blob.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('Media fetch error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
