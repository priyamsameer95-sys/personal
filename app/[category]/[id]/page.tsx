import { publicDb as db } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import MarkdownContent from '@/components/MarkdownContent';

interface ContentItem {
  id: string;
  title: string;
  summary: string | null;
  body_markdown: string | null;
  downloadable: boolean;
  created_at: string;
  media: Array<{ blob_url: string; kind: string; alt_text: string | null }>;
}

interface DetailPageProps {
  params: { category: string; id: string };
}

const categories = {
  art: { type: 'art', label: 'art', heading: 'Painting' },
  product: { type: 'work', label: 'work', heading: 'Case study' },
  blog: { type: 'blog', label: 'writing', heading: 'Essay' },
};

export const revalidate = 0;

export default async function DetailPage({ params }: DetailPageProps) {
  const { category, id } = params;
  if (!Object.prototype.hasOwnProperty.call(categories, category)) notFound();
  const section = categories[category as keyof typeof categories];

  const { rows } = await db`
    SELECT
      ci.id, ci.title, ci.summary, ci.body_markdown, ci.downloadable, ci.created_at,
      COALESCE(
        json_agg(
          json_build_object('blob_url', ma.blob_url, 'kind', ma.kind, 'alt_text', ma.alt_text)
          ORDER BY ma.sort_order
        ) FILTER (WHERE ma.id IS NOT NULL),
        '[]'::json
      ) AS media
    FROM content_items ci
    LEFT JOIN media_assets ma ON ma.content_id = ci.id
    WHERE ci.type = ${section.type}
      AND ci.status = 'published'
      AND (ci.id::text = ${id} OR ci.slug = ${id})
    GROUP BY ci.id
    LIMIT 1
  `;
  const item = rows[0] as ContentItem | undefined;
  if (!item) notFound();

  const images = item.media.filter((media) => media.kind === 'image');
  const firstImage = images[0];
  const firstPdf = item.media.find((media) => media.kind === 'pdf');
  const downloadableMedia = firstPdf || (category === 'art' ? firstImage : undefined);
  const date = new Date(item.created_at);

  return (
    <PublicShell>
        <Header />

        <main id="main-content" className="animate-fade-in-up">
          <Link href={`/${category}`} className="mb-8 inline-flex min-h-11 items-center gap-3 text-sm text-system-secondary transition-colors hover:text-system-accent no-underline">
            <span aria-hidden="true">←</span> Back to {section.label}
          </Link>

          <article className="mx-auto max-w-3xl">
            <header className="mb-10">
              <p className="mb-4 text-xs uppercase tracking-[0.14em] text-system-accent">
                {section.heading} · <time dateTime={date.toISOString()}>{category === 'blog' ? date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : date.getUTCFullYear()}</time>
              </p>
              <h1 className="font-sans text-4xl leading-tight tracking-tight text-system-primary sm:text-5xl">{item.title}</h1>
              {item.summary && <p className="mt-5 text-lg leading-relaxed text-system-secondary">{item.summary}</p>}
            </header>

            {firstImage && (
              <figure className={`mb-10 overflow-hidden rounded-xl border border-system-outline bg-system-surface ${category === 'art' ? 'p-4 sm:p-6' : ''}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={firstImage.blob_url} alt={firstImage.alt_text || item.title} className="max-h-[44rem] w-full object-contain" />
              </figure>
            )}

            {item.body_markdown && <MarkdownContent source={item.body_markdown} />}

            {images.length > 1 && (
              <div className="mt-10 grid gap-6">
                {images.slice(1).map((media, index) => (
                  <figure key={`${media.blob_url}-${index}`} className="overflow-hidden rounded-xl border border-system-outline bg-system-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={media.blob_url} alt={media.alt_text || `${item.title} — image ${index + 2}`} loading="lazy" className="max-h-[44rem] w-full object-contain" />
                  </figure>
                ))}
              </div>
            )}

            {item.downloadable && downloadableMedia && (
              <div className="no-print mt-10 border-t border-system-outline pt-6">
                <a href={downloadableMedia.blob_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-3 rounded-full bg-system-primary px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-system-accent no-underline">
                  {firstPdf ? 'Open PDF' : 'Open full-size image'} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span>
                </a>
              </div>
            )}
          </article>
        </main>

        <Footer />
    </PublicShell>
  );
}
