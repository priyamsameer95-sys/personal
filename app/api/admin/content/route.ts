import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await db`SELECT * FROM content ORDER BY created_at DESC`;
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}
