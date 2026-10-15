import type { MetadataRoute } from 'next';
import { absoluteUrl, siteOrigin } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/minforyam', '/api/'] }, sitemap: absoluteUrl('/sitemap.xml'), host: siteOrigin };
}
