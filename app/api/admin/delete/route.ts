import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import db from '@/lib/db';

interface DatabaseItem {
  id: string;
  file_path: string | null;
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

    // 1. Delete associated physical file from Blob
    if (item.file_path) {
      try {
        await del(item.file_path);
      } catch {
        // Log locally if file not found, but proceed with DB delete
      }
    }

    // 2. Delete record from database
    await db`DELETE FROM content WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
  }
}
