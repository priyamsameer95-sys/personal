import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
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
    const item = db.prepare('SELECT * FROM content WHERE id = ?').get(id) as DatabaseItem | undefined;

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // 1. Delete associated physical file from disk
    if (item.file_path) {
      const fullPath = path.join(process.cwd(), item.file_path);
      try {
        await fs.unlink(fullPath);
      } catch {
        // Log locally if file not found, but proceed with DB delete
      }
    }

    // 2. Delete record from database
    db.prepare('DELETE FROM content WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete content' }, { status: 500 });
  }
}
