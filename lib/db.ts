import { sql } from '@vercel/postgres';

// Ensure the content table exists with all columns
export async function initializeDatabase() {
  try {
    // Main content table
    await sql`
      CREATE TABLE IF NOT EXISTS content (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        body_text TEXT,
        category TEXT NOT NULL CHECK(category IN ('art', 'product', 'blog', 'cv')),
        file_path TEXT,
        file_type TEXT,
        is_public INTEGER NOT NULL DEFAULT 0,
        is_downloadable INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `;

    // Multi-image table for blog and product content
    await sql`
      CREATE TABLE IF NOT EXISTS content_images (
        id TEXT PRIMARY KEY,
        content_id TEXT NOT NULL REFERENCES content(id) ON DELETE CASCADE,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        label TEXT,
        created_at INTEGER NOT NULL
      );
    `;

    // Ensure body_text column exists (migration for existing DBs)
    try {
      await sql`ALTER TABLE content ADD COLUMN IF NOT EXISTS body_text TEXT;`;
    } catch {
      // Column may already exist, ignore
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Export the sql tagged template for executing queries
export default sql;
