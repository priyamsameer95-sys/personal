import { sql } from '@vercel/postgres';

// Single database client via @vercel/postgres.
// Reads DATABASE_URL (or POSTGRES_URL) from process.env automatically.
// All queries use parameterized tagged templates to prevent SQL injection.
export default sql;
