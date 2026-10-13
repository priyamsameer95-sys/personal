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
  summary: string | null;
  body_markdown: string | null;
  created_at: string;
  media: Array<{ blob_url: string; kind: string; alt_text: string | null }>;
}

export const metadata: Metadata = {
  title: 'Selected Work',
  description: 'Product work and case studies by Priyam Sameer.',
};

export const revalidate = 0;

export default async function ProductWorkPage() {
  const { rows } = await db`
    SELECT
      ci.id, ci.title, ci.slug, ci.summary, ci.body_markdown, ci.created_at,
      COALESCE(
        json_agg(
          json_build_object('blob_url', ma.blob_url, 'kind', ma.kind, 'alt_text', ma.alt_text)
          ORDER BY ma.sort_order
        ) FILTER (WHERE ma.id IS NOT NULL),
        '[]'::json
      ) AS media
    FROM content_items ci
    LEFT JOIN media_assets ma ON ma.content_id = ci.id
    WHERE ci.type = 'work' AND ci.status = 'published'
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
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-system-accent">Product & practice</p>
            <h1 className="mb-5 font-serif text-5xl leading-tight tracking-tight text-system-primary sm:text-6xl">Selected work.</h1>
            <p className="max-w-xl text-lg leading-relaxed text-system-secondary">Engineering structural logic into digital products.</p>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-system-outline bg-system-surface px-6 py-14 sm:px-10">
              <h2 className="mb-3 font-serif text-3xl text-system-primary">Case studies are on their way.</h2>
              <p className="max-w-lg leading-relaxed text-system-secondary">There are no published case studies here yet. Get in touch to discuss my work.</p>
              <a href="mailto:Priyam.Sameer.95@gmail.com" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-system-accent no-underline">Start a conversation <span aria-hidden="true">↗</span></a>
            </div>
          ) : (
            <div className="space-y-12">
              {items.map((item) => {
                const firstImage = item.media?.find((media) => media.kind === 'image');
                const href = `/product/${encodeURIComponent(item.slug || item.id)}`;
                const excerpt = contentExcerpt(item.summary || item.body_markdown, 240);
                return (
                  <article key={item.id} className="grid gap-6 border-t border-system-outline pt-8 md:grid-cols-12 md:gap-10">
                    <div className={firstImage ? 'md:col-span-7' : 'md:col-span-10'}>
                      <p className="mb-3 text-xs uppercase tracking-[0.12em] text-system-tertiary">Case study · {new Date(item.created_at).getUTCFullYear()}</p>
                      <Link href={href} className="no-underline">
                        <h2 className="mb-4 font-serif text-3xl leading-tight text-system-primary transition-colors hover:text-system-accent sm:text-4xl">{item.title}</h2>
                      </Link>
                      {excerpt && <p className="max-w-xl leading-relaxed text-system-secondary">{excerpt}</p>}
                      <Link href={href} className="mt-5 inline-flex min-h-11 items-center gap-3 text-sm font-medium text-system-accent no-underline">Read case study <span aria-hidden="true">→</span></Link>
                    </div>
                    {firstImage && (
                      <Link href={href} aria-label={`View ${item.title}`} className="block overflow-hidden rounded-xl border border-system-outline bg-system-surface md:col-span-5">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={firstImage.blob_url} alt={firstImage.alt_text || item.title} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                      </Link>
                    )}
                  </article>
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
