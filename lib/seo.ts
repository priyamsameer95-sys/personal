import type { Metadata } from 'next';

const productionOrigin = 'https://www.priyamsameer.com';

/** Use the reviewed public address; never infer a canonical host from preview URLs. */
export function resolveSiteOrigin(configured = process.env.NEXT_PUBLIC_SITE_URL): string {
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'https:' && !url.username && !url.password && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return url.origin;
    } catch { /* Keep the reviewed production address when configuration is invalid. */ }
  }
  return productionOrigin;
}

export const siteOrigin = resolveSiteOrigin();
export function absoluteUrl(path = '/'): string { return new URL(path, `${siteOrigin}/`).href; }

export function pageMetadata({ path, title, description, image, noIndex = false }: {
  path: string; title: string; description: string; image?: { url: string; width?: number; height?: number; alt?: string }; noIndex?: boolean;
}): Metadata {
  const fullTitle = title.includes('Priyam Sameer') ? title : `${title} — Priyam Sameer`;
  return {
    title: { absolute: fullTitle }, description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title: fullTitle, description, url: absoluteUrl(path), type: 'website', locale: 'en_IN', siteName: 'Priyam Sameer',
      images: [{ ...(image || { url: '/opengraph-image', width: 1200, height: 630, alt: 'Priyam Sameer — product leadership' }), url: absoluteUrl(image?.url || '/opengraph-image') }],
    },
    twitter: { card: 'summary_large_image', title: fullTitle, description, images: [absoluteUrl(image?.url || '/twitter-image')] },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Escape HTML-significant characters even when a CMS title contains a script terminator. */
export function serializeJsonLd(value: unknown): string { return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }

export const personId = absoluteUrl('/#person');
export const websiteId = absoluteUrl('/#website');
export function siteStructuredData() {
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Person', '@id': personId, name: 'Priyam Sameer', url: absoluteUrl('/'), jobTitle: 'General Manager, Product Management & Business Growth', worksFor: { '@type': 'Organization', name: 'CashKaro', url: 'https://cashkaro.com/' }, homeLocation: { '@type': 'Place', name: 'Bengaluru, India' }, sameAs: ['https://www.linkedin.com/in/priyam-sameer'] },
    { '@type': 'WebSite', '@id': websiteId, name: 'Priyam Sameer', url: absoluteUrl('/'), inLanguage: 'en-IN', publisher: { '@id': personId } },
  ] };
}
export function profileStructuredData(path: string, name: string, description: string) {
  return { '@context': 'https://schema.org', '@type': 'ProfilePage', '@id': absoluteUrl(`${path}#webpage`), url: absoluteUrl(path), name, description, mainEntity: { '@id': personId }, isPartOf: { '@id': websiteId } };
}
export function breadcrumbs(items: readonly { name: string; path: string }[]) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: absoluteUrl(item.path) })) };
}
export function creativeWorkStructuredData({ path, title, description, status, image, publishedAt, author = false }: {
  path: string; title: string; description?: string; status?: string; image?: string; publishedAt?: string; author?: boolean;
}) {
  return { '@context': 'https://schema.org', '@type': 'CreativeWork', '@id': absoluteUrl(`${path}${path.includes('#') ? '-work' : '#account'}`), name: title, url: absoluteUrl(path), mainEntityOfPage: absoluteUrl(path.split('#')[0]), isPartOf: { '@id': websiteId },
    ...(description ? { description } : {}), ...(status ? { creativeWorkStatus: status } : {}), ...(image ? { image: absoluteUrl(image) } : {}),
    ...(publishedAt && !Number.isNaN(Date.parse(publishedAt)) ? { datePublished: new Date(publishedAt).toISOString() } : {}),
    ...(author ? { author: { '@id': personId } } : {}),
  };
}
