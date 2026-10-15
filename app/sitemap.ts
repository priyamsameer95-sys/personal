import type { MetadataRoute } from 'next';
import { publicDb as db } from '@/lib/db';
import { findCaseStudy, isRetiredWorkSlug, publishedCaseStudies } from '@/lib/work';
import { absoluteUrl } from '@/lib/seo';

export const revalidate = 3600;
type PublishedRecord = { id: string; slug: string | null; type: string; updated_at?: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Only canonical public destinations: aliases, evidence archives and private routes stay out.
  const urls = new Map<string, MetadataRoute.Sitemap[number]>();
  const add = (path: string, modified?: string) => {
    const url = absoluteUrl(path);
    urls.set(url, { url, ...(modified && !Number.isNaN(Date.parse(modified)) ? { lastModified: new Date(modified) } : {}) });
  };
  for (const path of ['/', '/product', '/cv', '/art']) add(path);
  for (const study of publishedCaseStudies()) add(`/product/${encodeURIComponent(study.slug)}`);
  if (process.env.POSTGRES_URL) {
    try {
      const { rows } = await db`SELECT id, slug, type, updated_at FROM content_items WHERE status = 'published' AND type IN ('art', 'blog', 'work')`;
      let hasWriting = false;
      for (const item of rows as PublishedRecord[]) {
        const category = ({ art: 'art', blog: 'blog', work: 'product' } as Record<string, string>)[item.type];
        const identifier = item.slug || item.id;
        if (!category || !identifier || (category === 'product' && (findCaseStudy(identifier) || isRetiredWorkSlug(identifier)))) continue;
        add(`/${category}/${encodeURIComponent(identifier)}`, item.updated_at);
        if (category === 'blog') hasWriting = true;
      }
      if (hasWriting) add('/blog');
    } catch { console.error('Published sitemap additions could not be loaded. Authored portfolio routes remain available.'); }
  }
  return Array.from(urls.values());
}
