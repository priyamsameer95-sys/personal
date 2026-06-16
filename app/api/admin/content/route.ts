import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import db from '@/lib/db';
import { slugify, deduplicateSlug } from '@/lib/slugify';
import {
  isValidType,
  validateContentPayload,
  type ContentPayload,
  type MediaPayload,
} from '@/lib/validation';

// GET /api/admin/content?type=cv|art|work|blog
// Returns content_items with joined media_assets for the given type.
export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get('type');

    if (!type || !isValidType(type)) {
      return NextResponse.json(
        { error: 'Query parameter "type" is required and must be cv, art, work, or blog.' },
        { status: 400 }
      );
    }

    const { rows: items } = await db`
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
      WHERE ci.type = ${type}
      GROUP BY ci.id
      ORDER BY ci.sort_order ASC, ci.created_at DESC
    `;

    return NextResponse.json(items);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch content.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Helper: delete a list of blobs by URL. Swallows individual errors.
async function deleteBlobs(urls: string[]) {
  for (const url of urls) {
    try {
      await del(url);
    } catch {
      // Swallow. Blob may already be gone.
    }
  }
}

// POST /api/admin/content
// Creates a new content_item with media_assets.
// Expects JSON body (no file bytes). Blob URLs come from prior client upload.
export async function POST(request: NextRequest) {
  let uploadedBlobUrls: string[] = [];

  try {
    const body = (await request.json()) as ContentPayload;

    // Validate payload
    const validationError = validateContentPayload(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Collect blob URLs for orphan cleanup on failure
    uploadedBlobUrls = (body.media || []).map((m: MediaPayload) => m.blob_url);

    // Generate and deduplicate slug
    const baseSlug = slugify(body.title);
    if (!baseSlug) {
      return NextResponse.json(
        { error: 'Title must contain at least one alphanumeric character.' },
        { status: 400 }
      );
    }
    const slug = await deduplicateSlug(baseSlug, body.type);

    // Determine downloadable value
    let downloadable = body.downloadable ?? true;
    if (body.type === 'art') downloadable = false;

    // Determine published_at
    const publishedAt = body.status === 'published' ? new Date().toISOString() : null;

    // CV Auto-Extraction: If CV, media contains PDF, and body_markdown is empty
    let body_markdown = body.body_markdown || null;
    if (body.type === 'cv' && !body_markdown && body.media && body.media.length > 0) {
      const pdfMedia = body.media.find(m => m.kind === 'pdf' || m.blob_url.endsWith('.pdf'));
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

    // Serialize meta
    const metaJson = JSON.stringify(body.meta || {});

    // Insert content_item
    const { rows } = await db`
      INSERT INTO content_items (
        type, title, slug, summary, body_markdown, meta,
        status, downloadable, sort_order, published_at
      )
      VALUES (
        ${body.type}, ${body.title}, ${slug}, ${body.summary || null},
        ${body_markdown}, ${metaJson}::jsonb,
        ${body.status}, ${downloadable}, ${body.sort_order ?? 0},
        ${publishedAt}
      )
      RETURNING id, slug
    `;

    const contentId = rows[0].id;

    // Insert media_assets
    for (const m of body.media || []) {
      const isProtected = body.type === 'art' ? true : (m.protected ?? false);
      await db`
        INSERT INTO media_assets (
          content_id, blob_url, blob_pathname, kind, mime_type,
          width, height, orientation, alt_text, protected, sort_order
        )
        VALUES (
          ${contentId}, ${m.blob_url}, ${m.blob_pathname}, ${m.kind},
          ${m.mime_type}, ${m.width ?? null}, ${m.height ?? null},
          ${m.orientation ?? null}, ${m.alt_text ?? null},
          ${isProtected}, ${m.sort_order}
        )
      `;
    }

    // Success. Clear the orphan list so we do not delete them.
    uploadedBlobUrls = [];

    return NextResponse.json({
      success: true,
      id: contentId,
      slug: rows[0].slug,
    });
  } catch (err) {
    // Orphan cleanup: delete blobs that were uploaded before the DB insert failed
    if (uploadedBlobUrls.length > 0) {
      await deleteBlobs(uploadedBlobUrls);
    }

    const message = err instanceof Error ? err.message : 'Failed to create content.';

    // Check for the partial unique index violation (one published CV)
    if (message.includes('one_published_cv')) {
      return NextResponse.json(
        { error: 'Another CV is already published. Unpublish it first.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
