/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import db from '@/lib/db';
import { slugify, deduplicateSlug } from '@/lib/slugify';
import {
  isValidType,
  validateMediaCount,
  validateFileMime,
  type ContentType,
  type MediaPayload,
} from '@/lib/validation';

interface RouteParams {
  params: { id: string };
}

// GET /api/admin/content/[id]
// Returns a single content_item with its media_assets.
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    const { rows } = await db`
      SELECT
        ci.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ma.id,
              'blob_url', ma.blob_url,
              'blob_pathname', ma.blob_pathname,
              'kind', ma.kind,
              'mime_type', ma.mime_type,
              'width', ma.width,
              'height', ma.height,
              'orientation', ma.orientation,
              'alt_text', ma.alt_text,
              'protected', ma.protected,
              'sort_order', ma.sort_order
            ) ORDER BY ma.sort_order
          ) FILTER (WHERE ma.id IS NOT NULL),
          '[]'::json
        ) AS media
      FROM content_items ci
      LEFT JOIN media_assets ma ON ma.content_id = ci.id
      WHERE ci.id = ${id}
      GROUP BY ci.id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Content not found.' }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch content.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/admin/content/[id]
// Updates a content_item. Handles media additions and removals.
// Expects JSON body with the full set of fields + media array.
// Media items with existing IDs are kept. New items (no id) are inserted.
// Old items not in the new array are deleted (blob + row).
export async function PUT(request: NextRequest, { params }: RouteParams) {
  let newBlobUrls: string[] = [];

  try {
    const { id } = params;
    const body = await request.json();

    // Verify item exists
    const { rows: existing } = await db`
      SELECT id, type FROM content_items WHERE id = ${id}
    `;
    if (existing.length === 0) {
      return NextResponse.json({ error: 'Content not found.' }, { status: 404 });
    }

    const itemType = (body.type || existing[0].type) as ContentType;
    if (!isValidType(itemType)) {
      return NextResponse.json(
        { error: `Invalid type "${itemType}".` },
        { status: 400 }
      );
    }

    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
    }

    // Validate media
    const media: MediaPayload[] = body.media || [];
    const mediaCountError = validateMediaCount(media.length, itemType);
    if (mediaCountError) {
      return NextResponse.json({ error: mediaCountError }, { status: 400 });
    }
    for (const m of media) {
      if (!m.blob_url || !m.blob_pathname) {
        return NextResponse.json(
          { error: 'Each media item must have blob_url and blob_pathname.' },
          { status: 400 }
        );
      }
      const mimeErr = validateFileMime(m.mime_type, itemType);
      if (mimeErr) {
        return NextResponse.json({ error: mimeErr }, { status: 400 });
      }
    }

    // Regenerate slug if title changed
    const baseSlug = slugify(body.title);
    if (!baseSlug) {
      return NextResponse.json(
        { error: 'Title must contain at least one alphanumeric character.' },
        { status: 400 }
      );
    }
    const slug = await deduplicateSlug(baseSlug, itemType, id);

    // Determine downloadable
    let downloadable = body.downloadable ?? true;
    if (itemType === 'art') downloadable = false;

    // CV Auto-Extraction: If CV, media contains PDF, and body_markdown is empty
    let body_markdown = body.body_markdown || null;
    if (itemType === 'cv' && !body_markdown && media.length > 0) {
      const pdfMedia = media.find(m => m.kind === 'pdf' || m.blob_url.endsWith('.pdf'));
      if (pdfMedia) {
        try {
          const pdfParseModule = await import('pdf-parse');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const pdfParse = (pdfParseModule as any).default || pdfParseModule;
          const res = await fetch(pdfMedia.blob_url);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const data = await pdfParse(buffer);
            body_markdown = data.text;
          }
        } catch (parseErr) {
          console.error('PDF parsing failed:', parseErr);
        }
      }
    }

    // Meta
    const metaJson = JSON.stringify(body.meta || {});

    // Update content_item
    await db`
      UPDATE content_items SET
        title = ${body.title},
        slug = ${slug},
        summary = ${body.summary || null},
        body_markdown = ${body_markdown},
        meta = ${metaJson}::jsonb,
        status = ${body.status || 'draft'},
        downloadable = ${downloadable},
        sort_order = ${body.sort_order ?? 0},
        updated_at = now(),
        published_at = CASE
          WHEN ${body.status || 'draft'} = 'published' AND published_at IS NULL THEN now()
          WHEN ${body.status || 'draft'} = 'draft' THEN NULL
          ELSE published_at
        END
      WHERE id = ${id}
    `;

    // Diff media: find which old media to remove
    const { rows: oldMedia } = await db`
      SELECT id, blob_url FROM media_assets WHERE content_id = ${id}
    `;
    const newMediaIds = new Set(
      media.filter((m: MediaPayload & { id?: string }) => m.id).map((m: MediaPayload & { id?: string }) => m.id)
    );
    const toDelete = oldMedia.filter(
      (om: any) => !newMediaIds.has(om.id)
    );

    // Delete removed media blobs and rows
    for (const om of toDelete) {
      try { await del(om.blob_url); } catch { /* swallow */ }
      await db`DELETE FROM media_assets WHERE id = ${om.id}`;
    }

    // Upsert media: update existing, insert new
    for (const m of media) {
      const isProtected = itemType === 'art' ? true : (m.protected ?? false);
      const mWithId = m as MediaPayload & { id?: string };

      if (mWithId.id && newMediaIds.has(mWithId.id)) {
        // Update existing
        await db`
          UPDATE media_assets SET
            blob_url = ${m.blob_url},
            blob_pathname = ${m.blob_pathname},
            kind = ${m.kind},
            mime_type = ${m.mime_type},
            width = ${m.width ?? null},
            height = ${m.height ?? null},
            orientation = ${m.orientation ?? null},
            alt_text = ${m.alt_text ?? null},
            protected = ${isProtected},
            sort_order = ${m.sort_order}
          WHERE id = ${mWithId.id}
        `;
      } else {
        // Insert new
        newBlobUrls.push(m.blob_url);
        await db`
          INSERT INTO media_assets (
            content_id, blob_url, blob_pathname, kind, mime_type,
            width, height, orientation, alt_text, protected, sort_order
          )
          VALUES (
            ${id}, ${m.blob_url}, ${m.blob_pathname}, ${m.kind},
            ${m.mime_type}, ${m.width ?? null}, ${m.height ?? null},
            ${m.orientation ?? null}, ${m.alt_text ?? null},
            ${isProtected}, ${m.sort_order}
          )
        `;
      }
    }

    newBlobUrls = [];
    return NextResponse.json({ success: true, slug });
  } catch (err) {
    // Orphan cleanup for newly uploaded blobs
    for (const url of newBlobUrls) {
      try { await del(url); } catch { /* swallow */ }
    }

    const message = err instanceof Error ? err.message : 'Failed to update content.';
    if (message.includes('one_published_cv')) {
      return NextResponse.json(
        { error: 'Another CV is already published. Unpublish it first.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/content/[id]
// Deletes the content_item, cascades media_assets, and removes all blobs.
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;

    // Get all media blob URLs before deleting
    const { rows: mediaRows } = await db`
      SELECT blob_url FROM media_assets WHERE content_id = ${id}
    `;

    // Delete all blobs
    for (const row of mediaRows) {
      try { await del(row.blob_url); } catch { /* swallow */ }
    }

    // Delete the content_item (media_assets cascade)
    const { rowCount } = await db`
      DELETE FROM content_items WHERE id = ${id}
    `;

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Content not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete content.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
