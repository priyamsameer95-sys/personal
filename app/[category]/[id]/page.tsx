import React from 'react';
import db from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: 'art' | 'product' | 'blog' | 'cv';
  file_path: string | null;
  file_type: string | null;
  is_public: number;
  is_downloadable: number;
  created_at: number;
}

interface DetailPageProps {
  params: {
    category: string;
    id: string;
  };
}

export const revalidate = 0; // Prevent stale caching

export default function DetailPage({ params }: DetailPageProps) {
  const { category, id } = params;

  // Ensure category is whitelisted
  if (!['art', 'product', 'blog', 'cv'].includes(category)) {
    notFound();
  }

  // Query database for public matching content
  const item = db
    .prepare('SELECT * FROM content WHERE id = ? AND category = ? AND is_public = 1')
    .get(id, category) as ContentItem | undefined;

  if (!item) {
    notFound();
  }

  const hasFile = !!item.file_path;
  const isDownloadable = hasFile && item.is_downloadable === 1;

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
          {category === 'art' && (
            <article className="space-y-8">
              <div className="aspect-[4/5] md:max-w-2xl mx-auto bg-[#F0EAE1] border border-[rgba(229,229,229,0.4)] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center justify-center relative">
                {item.file_path ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`/api/media/${item.id}`}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
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
                  {item.description || 'Oil on Canvas'}
                </p>
                {isDownloadable && (
                  <div className="pt-4">
                    <a
                      href={`/api/download/${item.id}`}
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
          {category === 'product' && (
            <article className="space-y-8">
              <header className="space-y-4">
                <div className="inline-flex items-center px-3 py-1 bg-white border border-[rgba(229,229,229,0.5)] rounded-lg text-xs font-mono font-bold uppercase tracking-[0.08em] text-[#525252]">
                  Case Study · {new Date(item.created_at).getFullYear()}
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-[#1A1A1A] font-sans m-0">
                  {item.title}
                </h2>
              </header>

              {item.file_path && (
                <div className="aspect-[16/9] w-full border border-[rgba(229,229,229,0.5)] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] bg-[#F5F5F5]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/media/${item.id}`}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="text-[#525252] text-sm leading-[1.7] whitespace-pre-wrap font-sans">
                {item.description}
              </div>

              {isDownloadable && (
                <div className="pt-6 border-t border-[#E5E5E5]">
                  <a
                    href={`/api/download/${item.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white hover:bg-black rounded-lg text-sm font-semibold transition no-underline"
                  >
                    <span className="material-symbols-rounded text-base">download</span> Download Case Files
                  </a>
                </div>
              )}
            </article>
          )}

          {/* Writing (Blog) details view */}
          {category === 'blog' && (
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

              {item.file_path && (
                <div className="aspect-[16/9] w-full border border-[rgba(229,229,229,0.5)] rounded-2xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.05)] bg-[#F5F5F5]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/media/${item.id}`}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="font-serif text-[#1A1A1A] text-base leading-[1.75] whitespace-pre-wrap italic">
                {item.description}
              </div>

              {isDownloadable && (
                <div className="pt-6 border-t border-[#E5E5E5] no-print">
                  <a
                    href={`/api/download/${item.id}`}
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
