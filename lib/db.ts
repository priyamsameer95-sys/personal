import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'portfolio.db');

// Ensure db directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Ensure uploads directories exist
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const subdirs = ['art', 'product', 'blog', 'cv'];
for (const sub of subdirs) {
  const dir = path.join(UPLOADS_DIR, sub);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Initialize SQLite database
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Execute migrations to create schema
db.exec(`
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
`);

export default db;
