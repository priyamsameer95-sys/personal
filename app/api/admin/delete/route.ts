import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import db from '@/lib/db';

interface DatabaseItem {
  id: string;
  file_path: string | null;
}

interface ImageRow {
  file_path: string;
}

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing item ID' }, { status: 400 });
    }

    // Get item metadata from DB
    const { rows } = await db`SELECT * FROM content WHERE id = ${id}`;
    const item = rows[0] as DatabaseItem | undefined;

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // 1. Delete primary file from Blob (art, cv)
    if (item.file_path) {
      try {
        await del(item.file_path);
      } catch {
        // Log locally if file not found, but proceed with DB delete
      }
    }

    // 2. Delete all associated images from Blob (blog, product)
    const { rows: imageRows } = await db`SELECT file_path FROM content_images WHERE content_id = ${id}`;
    for (const img of imageRows as ImageRow[]) {
      try {
        await del(img.file_path);
      } catch {
        // Proceed even if individual blob deletion fails
      }
    }

    // 3. Delete image records (CASCADE should handle this, but be explicit)
    await db`DELETE FROM content_images WHERE content_id = ${id}`;

    // 4. Delete content record from database
    await db`DELETE FROM content WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
  }
}
