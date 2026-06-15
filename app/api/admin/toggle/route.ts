import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { id, field, value } = await req.json();

    if (!id || !field || value === undefined) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Strict whitelisting of the column name to prevent SQL Injection
    if (field !== 'is_public' && field !== 'is_downloadable') {
      return NextResponse.json({ error: 'Invalid field to toggle' }, { status: 400 });
    }

    const numericVal = value ? 1 : 0;

    if (field === 'is_public') {
      await db`UPDATE content SET is_public = ${numericVal} WHERE id = ${id}`;
    } else {
      await db`UPDATE content SET is_downloadable = ${numericVal} WHERE id = ${id}`;
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update toggle' }, { status: 500 });
  }
}
