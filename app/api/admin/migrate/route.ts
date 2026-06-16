import { NextResponse } from 'next/server';
import db from '@/lib/db';

// POST /api/admin/migrate
// Runs the database migration. Protected by middleware.
// Refuses to run if content_items already exists.
export async function POST() {
  try {
    // Step 1: Check if content_items already exists
    const { rows: existing } = await db`
      SELECT to_regclass('public.content_items') AS tbl
    `;
    if (existing[0]?.tbl) {
      return NextResponse.json(
        { error: 'Migration already applied. Table content_items exists.' },
        { status: 409 }
      );
    }

    const log: string[] = [];

    // Step 2: Rename old tables if they exist
    const { rows: oldContent } = await db`
      SELECT to_regclass('public.content') AS tbl
    `;
    if (oldContent[0]?.tbl) {
      await db`ALTER TABLE content RENAME TO content_old`;
      log.push('Renamed content to content_old.');
    }

    const { rows: oldImages } = await db`
      SELECT to_regclass('public.content_images') AS tbl
    `;
    if (oldImages[0]?.tbl) {
      await db`ALTER TABLE content_images RENAME TO content_images_old`;
      log.push('Renamed content_images to content_images_old.');
    }

    // Step 3: Run the migration DDL

    await db`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;
    log.push('Ensured pgcrypto extension.');

    // Create enums. Use DO block to skip if they already exist.
    await db`
      DO $$ BEGIN
        CREATE TYPE content_type AS ENUM ('cv','art','work','blog');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `;
    log.push('Created enum content_type.');

    await db`
      DO $$ BEGIN
        CREATE TYPE content_status AS ENUM ('draft','published');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `;
    log.push('Created enum content_status.');

    // Create content_items table
    await db`
      CREATE TABLE content_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type content_type NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL,
        summary TEXT,
        body_markdown TEXT,
        meta JSONB NOT NULL DEFAULT '{}'::jsonb,
        status content_status NOT NULL DEFAULT 'draft',
        downloadable BOOLEAN NOT NULL DEFAULT true,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        published_at TIMESTAMPTZ
      )
    `;
    log.push('Created table content_items.');

    await db`
      CREATE UNIQUE INDEX content_items_slug_type_key
      ON content_items (type, slug)
    `;
    log.push('Created unique index content_items_slug_type_key.');

    await db`
      CREATE UNIQUE INDEX one_published_cv
      ON content_items (type)
      WHERE type = 'cv' AND status = 'published'
    `;
    log.push('Created partial unique index one_published_cv.');

    // Create media_assets table
    await db`
      CREATE TABLE media_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
        blob_url TEXT NOT NULL,
        blob_pathname TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('image','pdf')),
        mime_type TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        orientation TEXT CHECK (orientation IN ('landscape','portrait','square')),
        alt_text TEXT,
        protected BOOLEAN NOT NULL DEFAULT false,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    log.push('Created table media_assets.');

    await db`
      CREATE INDEX media_assets_content_id_idx
      ON media_assets (content_id)
    `;
    log.push('Created index media_assets_content_id_idx.');

    return NextResponse.json({ success: true, log });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Migration failed: ${message}` },
      { status: 500 }
    );
  }
}
