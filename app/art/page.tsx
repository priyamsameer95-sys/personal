import type { Metadata } from 'next';
import Link from 'next/link';
import { publicDb as db } from '@/lib/db';
import { contentExcerpt } from '@/lib/content';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import ArtGallery from '@/components/art/ArtGallery';
import Media from '@/components/work/Media';
import { artCollections, artworks, portfolioCover } from '@/content/art/works';
import styles from './art.module.css';

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  body_markdown: string | null;
  media: Array<{ blob_url: string; kind: string; alt_text: string | null }>;
}

const description = 'Paintings by Priyam Sameer in oil, acrylic and charcoal. Explore six works, their details and the artist’s original notes.';

export const metadata: Metadata = {
  title: 'Art', description,
  openGraph: {
    title: 'Art — Priyam Sameer', description,
    images: [{ url: '/art/priyam/public-compass-preview.webp', width: 1000, height: 879, alt: 'Public Compass by Priyam Sameer' }],
  },
  twitter: { title: 'Art — Priyam Sameer', description, images: ['/art/priyam/public-compass-preview.webp'] },
};

export const revalidate = 0;

// The supplied portfolio remains available independently of later admin uploads.
async function loadAdditionalArt(): Promise<ContentItem[]> {
  if (!process.env.POSTGRES_URL) return [];
  try {
    const { rows } = await db`
      SELECT ci.id, ci.title, ci.slug, ci.body_markdown,
        COALESCE(json_agg(
          json_build_object('blob_url', ma.blob_url, 'kind', ma.kind, 'alt_text', ma.alt_text)
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
      <Header />
      <main id="main-content" className="animate-fade-in-up">
        <header className={styles.intro}>
          <div>
            <p className={styles.eyebrow}>Priyam Sameer · Paintings</p>
            <h1>Art.</h1>
          </div>
          <div className={styles.introNote}>
            <p>Communicating with one’s soul.</p>
            <span>Oil, acrylic and charcoal. Open a painting to see it up close.</span>
          </div>
        </header>
        <ArtGallery collections={artCollections} works={artworks} />
        <section id="artist-note" className={styles.artistNote} aria-labelledby="artist-note-title">
          <div className={styles.noteText}>
            <p className={styles.eyebrow}>Artist’s note</p>
            <h2 id="artist-note-title">Art is expression.</h2>
            <p className={styles.statement}>Art is emotion. Art is love. Art is life.<br />Art is fear. Art is wisdom. Art is courage.</p>
            <a className={styles.contact} href="mailto:Priyam.Sameer.95@gmail.com?subject=About%20your%20paintings">Talk about a painting <span aria-hidden="true">↗</span></a>
          </div>
          <div className={styles.cover}>
            <Media media={{ id: 'art-portfolio-cover', kind: 'image', ...portfolioCover.image, caption: '' }} previewSrc={portfolioCover.image.previewSrc} />
            <p>From the portfolio cover · Labelled “ANNA”</p>
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
                  {firstImage && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={firstImage.blob_url} alt={firstImage.alt_text || art.title} loading="lazy" />
                  )}
                  <h3>{art.title}</h3>
                  {excerpt && <p>{excerpt}</p>}
                  <span>View artwork <span aria-hidden="true">↗</span></span>
                </Link>
              );
            })}
          </div>
        </section>}
        <p className={styles.sourceNote}>Paintings and artist’s notes from my original art portfolio. Close-ups retain the detail views used in that portfolio.</p>
      </main>
      <Footer />
    </PublicShell>
  );
}
