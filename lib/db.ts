import { sql } from '@vercel/postgres';

// Ensure the content table exists
export async function initializeDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS content (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL CHECK(category IN ('art', 'product', 'blog', 'cv')),
        file_path TEXT,
        file_type TEXT,
        is_public INTEGER NOT NULL DEFAULT 0,
        is_downloadable INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Export the sql tagged template for executing queries
export default sql;
