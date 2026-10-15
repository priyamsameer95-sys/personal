import type { Metadata } from 'next';
import Link from 'next/link';
import { publicDb as db } from '@/lib/db';
import { contentExcerpt } from '@/lib/content';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import EmailContact from '@/components/EmailContact';
import Icon from '@/components/Icon';
import ArtGallery from '@/components/art/ArtGallery';
import { artCollections, artworks } from '@/content/art/works';
import styles from './art.module.css';
import { creativeWorkStructuredData, pageMetadata, serializeJsonLd } from '@/lib/seo';

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  body_markdown: string | null;
  media: Array<{ blob_url: string; kind: string; alt_text: string | null; width: number | null; height: number | null }>;
}

const description = 'Paintings by Priyam Sameer in oil, acrylic and charcoal. Explore six works, their details and the artist’s original notes.';

export const metadata: Metadata = pageMetadata({ path: '/art', title: 'Paintings in oil, acrylic & charcoal', description, image: { url: '/art/priyam/public-compass-preview.webp', width: 1000, height: 879, alt: 'Public Compass by Priyam Sameer' } });

export const revalidate = 0;

// The supplied portfolio remains available independently of later admin uploads.
async function loadAdditionalArt(): Promise<ContentItem[]> {
  if (!process.env.POSTGRES_URL) return [];
  try {
    const { rows } = await db`
      SELECT ci.id, ci.title, ci.slug, ci.body_markdown,
        COALESCE(json_agg(
          json_build_object('blob_url', ma.blob_url, 'kind', ma.kind, 'alt_text', ma.alt_text, 'width', ma.width, 'height', ma.height)
          ORDER BY ma.sort_order
        ) FILTER (WHERE ma.id IS NOT NULL), '[]'::json) AS media
      FROM content_items ci
      LEFT JOIN media_assets ma ON ma.content_id = ci.id
      WHERE ci.type = 'art' AND ci.status = 'published'
      GROUP BY ci.id
      ORDER BY ci.sort_order ASC, ci.created_at DESC
    `;
    return rows as ContentItem[];
  } catch {
    console.error('Additional art could not be loaded. The supplied painting portfolio remains available.');
    return [];
  }
}

export default async function ArtGalleryPage() {
  const items = await loadAdditionalArt();

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd({ '@context': 'https://schema.org', '@graph': artworks.map(work => creativeWorkStructuredData({ path: `/art#${work.id}`, title: work.title, description: work.statement || work.description, image: work.image.src, author: true })) }) }} />
      <Header />
      <main id="main-content" className={styles.page}>
        <header className={styles.intro}>
          <h1>Paintings.</h1>
          <p>I paint in oil, acrylic and charcoal.</p>
        </header>
        <ArtGallery collections={artCollections} works={artworks} />
        <section id="artist-note" tabIndex={-1} className={styles.artistNote} aria-labelledby="artist-note-title">
          <div className={styles.noteText}>
            <h2 id="artist-note-title">Art is expression.</h2>
            <div>
              <p className={styles.statement}>Art is emotion. Art is love. Art is life.<br />Art is fear. Art is wisdom. Art is courage.</p>
              <EmailContact linkClassName={styles.contact} subject="About your paintings">Talk about a painting <Icon name="arrow-up-right" /></EmailContact>
            </div>
          </div>
        </section>
        {items.length > 0 && <section className={styles.additional} aria-labelledby="additional-art-title">
          <h2 id="additional-art-title">More from the studio</h2>
          <div className={styles.additionalGrid}>
            {items.map((art) => {
              const firstImage = art.media?.find((media) => media.kind === 'image');
              const excerpt = contentExcerpt(art.body_markdown, 160);
              return (
                <Link key={art.id} href={`/art/${encodeURIComponent(art.slug || art.id)}`} className={styles.additionalWork}>
                  {firstImage && <div className={styles.additionalImage} style={firstImage.width && firstImage.height ? { aspectRatio: `${firstImage.width} / ${firstImage.height}` } : undefined}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={firstImage.blob_url} alt={firstImage.alt_text || art.title} width={firstImage.width || undefined} height={firstImage.height || undefined} loading="lazy" decoding="async" />
                  </div>}
                  <h3>{art.title}</h3>
                  {excerpt && <p>{excerpt}</p>}
                  <span>View artwork <Icon name="arrow-up-right" /></span>
                </Link>
              );
            })}
          </div>
        </section>}
      </main>
      <Footer />
    </PublicShell>
  );
}
