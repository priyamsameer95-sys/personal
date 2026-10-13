import type { Metadata } from 'next';
import { publicDb as db } from '@/lib/db';
import { contentExcerpt } from '@/lib/content';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  body_markdown: string | null;
  created_at: string;
  media: Array<{ blob_url: string; kind: string; alt_text: string | null }>;
}

export const metadata: Metadata = {
  title: 'Art',
  description: 'Paintings and visual expression by Priyam Sameer.',
};

export const revalidate = 0;

export default async function ArtGalleryPage() {
  const { rows } = await db`
    SELECT
      ci.id, ci.title, ci.slug, ci.body_markdown, ci.created_at,
      COALESCE(
        json_agg(
          json_build_object('blob_url', ma.blob_url, 'kind', ma.kind, 'alt_text', ma.alt_text)
          ORDER BY ma.sort_order
        ) FILTER (WHERE ma.id IS NOT NULL),
        '[]'::json
      ) AS media
    FROM content_items ci
    LEFT JOIN media_assets ma ON ma.content_id = ci.id
    WHERE ci.type = 'art' AND ci.status = 'published'
    GROUP BY ci.id
    ORDER BY ci.sort_order ASC, ci.created_at DESC
  `;
  const items = rows as ContentItem[];

  return (
    <div className="min-h-screen bg-system-bg">
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
        <Header />

        <main id="main-content" className="animate-fade-in-up">
          <div className="mb-12 max-w-2xl md:mb-16">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-system-accent">A different kind of making</p>
            <h1 className="mb-5 font-serif text-5xl leading-tight tracking-tight text-system-primary sm:text-6xl">Art.</h1>
            <p className="max-w-xl text-lg leading-relaxed text-system-secondary">Fluid expression as a counterbalance to rigid constraints.</p>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-system-outline bg-system-surface px-6 py-14 sm:px-10">
              <h2 className="mb-3 font-serif text-3xl text-system-primary">The gallery is taking shape.</h2>
              <p className="max-w-lg leading-relaxed text-system-secondary">There are no published paintings here yet. You can explore my work and writing in the meantime.</p>
              <Link href="/product" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-system-accent no-underline">Explore the work <span aria-hidden="true">→</span></Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2">
              {items.map((art) => {
                const firstImage = art.media?.find((media) => media.kind === 'image');
                const excerpt = contentExcerpt(art.body_markdown, 160);
                return (
                  <Link key={art.id} href={`/art/${encodeURIComponent(art.slug || art.id)}`} className="group block no-underline">
                    <div className="mb-5 flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-system-outline bg-system-surface p-4 sm:p-6">
                      {firstImage ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={firstImage.blob_url} alt={firstImage.alt_text || art.title} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]" />
                      ) : (
                        <span className="font-serif text-xl italic text-system-tertiary">{art.title}</span>
                      )}
                    </div>
                    <div className="flex items-baseline justify-between gap-4">
                      <h2 className="font-serif text-2xl text-system-primary transition-colors group-hover:text-system-accent">{art.title}</h2>
                      <span className="shrink-0 text-xs text-system-tertiary">{new Date(art.created_at).getUTCFullYear()}</span>
                    </div>
                    {excerpt && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-system-secondary">{excerpt}</p>}
                  </Link>
                );
              })}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
