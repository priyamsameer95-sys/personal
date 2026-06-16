import db from '@/lib/db';

// Convert a title to a URL-safe slug.
// Lowercase, replace non-alphanumeric with hyphens, collapse runs, trim edges.
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Return a slug unique among content_items of the given type.
// Appends -2, -3, etc. on collision.
export async function deduplicateSlug(
  slug: string,
  type: string,
  excludeId?: string
): Promise<string> {
  let candidate = slug;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { rows } = excludeId
      ? await db`
          SELECT id FROM content_items
          WHERE type = ${type} AND slug = ${candidate} AND id != ${excludeId}
          LIMIT 1
        `
      : await db`
          SELECT id FROM content_items
          WHERE type = ${type} AND slug = ${candidate}
          LIMIT 1
        `;

    if (rows.length === 0) return candidate;

    counter += 1;
    candidate = `${slug}-${counter}`;
  }
}
