import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

interface RouteParams {
  params: { id: string };
}

// PUT /api/admin/content/[id]/status
// Toggles publish/unpublish. Handles the one-published-CV constraint.
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    const { status } = await request.json();

    if (!status || !['draft', 'published'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "draft" or "published".' },
        { status: 400 }
      );
    }

    // Verify item exists
    const { rows: existing } = await db`
      SELECT id, type, status FROM content_items WHERE id = ${id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Content not found.' }, { status: 404 });
    }

    if (status === 'published') {
      await db`
        UPDATE content_items SET
          status = 'published',
          published_at = COALESCE(published_at, now()),
          updated_at = now()
        WHERE id = ${id}
      `;
    } else {
      await db`
        UPDATE content_items SET
          status = 'draft',
          published_at = NULL,
          updated_at = now()
        WHERE id = ${id}
      `;
    }

    return NextResponse.json({ success: true, status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update status.';

    if (message.includes('one_published_cv')) {
      return NextResponse.json(
        { error: 'Another CV is already published. Unpublish it first.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
