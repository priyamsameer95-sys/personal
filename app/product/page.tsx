import React from 'react';
import db from '@/lib/db';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  body_markdown: string | null;
  type: 'work';
  status: 'draft' | 'published';
  created_at: string;
  media: Array<{
    blob_url: string;
    kind: string;
  }>;
}

export const revalidate = 0;

export default async function ProductWorkPage() {
  const { rows } = await db`
    SELECT
      ci.id, ci.title, ci.slug, ci.body_markdown, ci.type, ci.status, ci.created_at,
      COALESCE(
        json_agg(
          json_build_object(
            'blob_url', ma.blob_url,
            'kind', ma.kind
          ) ORDER BY ma.sort_order
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
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-[56rem] mx-auto px-6 py-20 pb-24">
        <Header />

        <main className="animate-fade-in-up">
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-system-primary mb-3">Selected Work</h2>
            <p className="text-system-secondary text-lg font-serif">
              Engineering structural logic into digital products.
            </p>
          </div>

          {items.length === 0 ? (
            <div className="py-20 text-center font-mono text-xs text-system-tertiary border border-dashed border-system-outline/40 rounded-2xl bg-white">
              NO PRODUCT WORK PUBLISHED YET
            </div>
          ) : (
            <div className="space-y-24">
              {items.map((item) => {
                const firstImage = item.media?.find(m => m.kind === 'image');
                return (
                  <article key={item.id} className="group">
                    <div className="mb-6 flex flex-col md:flex-row md:items-baseline justify-between gap-2 border-b border-system-primary pb-4">
                      <Link href={`/product/${item.slug || item.id}`} className="no-underline">
                        <h3 className="text-2xl font-bold text-system-primary hover:text-system-accent transition-colors duration-200">
                          {item.title}
                        </h3>
                      </Link>
                      <span className="font-mono text-[11px] font-bold text-system-tertiary tracking-widest uppercase">
                        PM · {new Date(item.created_at).getFullYear()}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                      <div className="md:col-span-8 space-y-4">
                        <p className="text-system-secondary leading-relaxed text-lg font-serif">
                          {item.body_markdown ? item.body_markdown.substring(0, 200) + '...' : 'View case study details...'}
                        </p>
                        <Link
                          href={`/product/${item.slug || item.id}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-system-primary hover:text-system-accent transition-colors duration-200 no-underline"
                        >
                          Read case study <span className="material-symbols-rounded text-base">arrow_forward</span>
                        </Link>
                      </div>
                      {firstImage && (
                        <div className="md:col-span-4">
                          <Link href={`/product/${item.slug || item.id}`} className="block overflow-hidden rounded-xl border border-system-outline shadow-material-soft hover:shadow-material-hover transition duration-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={firstImage.blob_url}
                              alt={item.title}
                              className="w-full h-auto object-cover aspect-[4/3]"
                            />
                          </Link>
                        </div>
                      )}
                    </div>
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
