import React from 'react';
import db from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body_markdown: string | null;
  type: 'art' | 'work' | 'blog' | 'cv';
  status: 'draft' | 'published';
  downloadable: boolean;
  created_at: string;
  media: Array<{
    blob_url: string;
    kind: string;
  }>;
}

interface DetailPageProps {
  params: {
    category: string;
    id: string; // This can be either id or slug
  };
}

export const revalidate = 0;

export default async function DetailPage({ params }: DetailPageProps) {
  const { category, id } = params;

  // Map route category to schema type
  const typeMap: Record<string, string> = {
    'art': 'art',
    'product': 'work',
    'blog': 'blog',
    'cv': 'cv'
  };

  const schemaType = typeMap[category];
  if (!schemaType) {
    notFound();
  }

  // Query database for public matching content by ID or slug
  const { rows } = await db`
    SELECT
      ci.id, ci.title, ci.slug, ci.summary, ci.body_markdown, ci.type, ci.status, ci.downloadable, ci.created_at,
      COALESCE(
        json_agg(
          json_build_object('blob_url', ma.blob_url, 'kind', ma.kind) ORDER BY ma.sort_order
        ) FILTER (WHERE ma.id IS NOT NULL),
        '[]'::json
      ) AS media
    FROM content_items ci
    LEFT JOIN media_assets ma ON ma.content_id = ci.id
    WHERE ci.type = ${schemaType} 
      AND ci.status = 'published'
      AND (ci.id = ${id} OR ci.slug = ${id})
    GROUP BY ci.id
    LIMIT 1
  `;
  
  const item = rows[0] as ContentItem | undefined;

  if (!item) {
    notFound();
  }

  const isDownloadable = item.downloadable;
  // Get first image and first pdf if available
  const firstImage = item.media.find(m => m.kind === 'image');
  const firstPdf = item.media.find(m => m.kind === 'pdf');

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-[56rem] mx-auto px-6 py-20 pb-24">
        <Header />

        <main className="animate-[fadeInUp_0.4s_cubic-bezier(0.2,0,0,1)_both]">
          {/* Back button */}
          <div className="mb-8">
            <Link
              href={category === 'blog' ? '/blog' : category === 'product' ? '/product' : `/${category}`}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-[#8C8C8C] hover:text-[#1A1A1A] no-underline"
            >
              <span className="material-symbols-rounded text-sm">arrow_back</span>
              Back to {category === 'blog' ? 'writing' : category === 'product' ? 'work' : category.toUpperCase()}
            </Link>
          </div>

          {/* Paintings (Art) details view */}
          {schemaType === 'art' && (
            <article className="space-y-8">
              <div className="aspect-[4/5] md:max-w-2xl mx-auto bg-[#F0EAE1] border border-[rgba(229,229,229,0.4)] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center justify-center relative">
                {firstImage ? (
                  <div className="relative w-full h-full select-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={firstImage.blob_url}
                      alt={item.title}
                      className="w-full h-full object-cover pointer-events-none"
                      draggable={false}
                    />
                    <div className="absolute inset-0 z-10 bg-transparent" title={item.title} />
                  </div>
                ) : (
                  <span className="font-serif italic text-[#1A1A1A]/40">{item.title}</span>
                )}
              </div>
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex justify-between items-baseline gap-4">
                  <h2 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#1A1A1A] m-0">
                    {item.title}
                  </h2>
                  <span className="text-xs text-[#8C8C8C] font-mono">
                    {new Date(item.created_at).getFullYear()}
                  </span>
                </div>
                <p className="text-[#525252] text-sm leading-[1.65]">
                  {item.body_markdown || 'Oil on Canvas'}
                </p>
                {isDownloadable && firstImage && (
                  <div className="pt-4">
                    <a
                      href={firstImage.blob_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white hover:bg-black rounded-lg text-sm font-semibold transition no-underline"
                    >
                      <span className="material-symbols-rounded text-base">download</span> Download High-Res
                    </a>
                  </div>
                )}
              </div>
            </article>
          )}

          {/* Product Case Study details view */}
          {schemaType === 'work' && (
            <article className="space-y-8">
              <header className="space-y-4">
                <div className="inline-flex items-center px-3 py-1 bg-white border border-[rgba(229,229,229,0.5)] rounded-lg text-xs font-mono font-bold uppercase tracking-[0.08em] text-[#525252]">
                  Case Study · {new Date(item.created_at).getFullYear()}
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A] font-sans m-0">
                  {item.title}
                </h2>
              </header>

              {firstImage && (
                <div className="aspect-[16/9] w-full border border-[rgba(229,229,229,0.5)] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] bg-[#F5F5F5]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={firstImage.blob_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="text-[#525252] text-sm leading-[1.7] whitespace-pre-wrap font-sans">
                {item.body_markdown}
              </div>

              {isDownloadable && firstPdf && (
                <div className="pt-6 border-t border-[#E5E5E5]">
                  <a
                    href={firstPdf.blob_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white hover:bg-black rounded-lg text-sm font-semibold transition no-underline"
                  >
                    <span className="material-symbols-rounded text-base">download</span> Download Case Files
                  </a>
                </div>
              )}
            </article>
          )}

          {/* Writing (Blog) details view */}
          {schemaType === 'blog' && (
            <article className="max-w-[48rem] mx-auto space-y-8">
              <header className="space-y-3">
                <div className="flex items-center gap-3">
                  <time className="font-mono text-xs font-bold text-[#8C8C8C] uppercase tracking-[0.14em]">
                    {new Date(item.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </time>
                </div>
                <h2 className="font-serif italic text-3xl font-medium text-[#1A1A1A] leading-tight m-0">
                  {item.title}
                </h2>
              </header>

              {firstImage && (
                <div className="aspect-[16/9] w-full border border-[rgba(229,229,229,0.5)] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] bg-[#F5F5F5]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={firstImage.blob_url}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="font-serif text-[#1A1A1A] text-base leading-[1.75] whitespace-pre-wrap italic">
                {item.body_markdown}
              </div>

              {isDownloadable && firstPdf && (
                <div className="pt-6 border-t border-[#E5E5E5] no-print">
                  <a
                    href={firstPdf.blob_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white hover:bg-black rounded-lg text-sm font-semibold transition no-underline"
                  >
                    <span className="material-symbols-rounded text-base">download</span> Download Essay PDF
                  </a>
                </div>
              )}
            </article>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
