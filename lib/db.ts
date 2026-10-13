import { sql } from '@vercel/postgres';

// The active Next.js application uses @vercel/postgres and POSTGRES_URL.
// Keep admin queries on the real client: preview mode never pretends to save data.
export default sql;

export function isLocalPreview(): boolean {
  const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  const hasDatabase = Boolean(
    process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL
  );

  return isDevelopment && (process.env.LOCAL_PREVIEW === 'true' || !hasDatabase);
}

// Only public reads use this helper. With no credentials, local development
// renders empty collections; configured database failures still surface normally.
export async function publicDb(...args: Parameters<typeof sql>) {
  if (isLocalPreview()) {
    return { rows: [] };
  }

  return sql(...args);
}
