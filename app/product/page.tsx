import React from 'react';
import db from '@/lib/db';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: 'product';
  file_path: string | null;
  file_type: string | null;
  is_public: number;
  created_at: number;
}

export const revalidate = 0;

export default async function ProductWorkPage() {
  const { rows } = await db`
    SELECT * FROM content WHERE category = 'product' AND is_public = 1 ORDER BY created_at DESC
  `;
  const items = rows as ContentItem[];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-[56rem] mx-auto px-6 py-20 pb-24">
        <Header />

        <main className="animate-[fadeInUp_0.4s_cubic-bezier(0.2,0,0,1)_both]">
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-[#1A1A1A] m-0 mb-3 tracking-tight font-sans">
              Selected Work
            </h2>
            <p className="text-[#525252] text-lg m-0">
              Engineering structural logic into digital products.
            </p>
          </div>

          {items.length === 0 ? (
            <div className="py-20 text-center font-mono text-xs text-[#8C8C8C] border border-dashed border-[#E5E5E5] rounded-2xl bg-white">
              NO PRODUCT WORK PUBLISHED YET
            </div>
          ) : (
            <div className="flex flex-col gap-16 mt-12">
              {items.map((item) => (
                <article key={item.id} className="border-b border-[#E5E5E5] pb-16 last:border-0 last:pb-0">
                  {item.file_path && (
                    <div className="aspect-[16/9] w-full border border-[rgba(229,229,229,0.5)] rounded-2xl mb-8 overflow-hidden relative shadow-[0_1px_2px_rgba(0,0,0,0.05)] bg-[#F5F5F5]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/media/${item.id}`}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    <div className="md:col-span-4">
                      <h3 className="text-xl font-bold text-[#1A1A1A] m-0 mb-2 font-sans">
                        {item.title}
                      </h3>
                      <Link
                        href={`/product/${item.id}`}
                        className="inline-flex items-center gap-1 text-xs font-mono text-[#8C8C8C] hover:text-[#1A1A1A] no-underline"
                      >
                        Read case study <span className="material-symbols-rounded text-sm">arrow_forward</span>
                      </Link>
                    </div>
                    <div className="md:col-span-8 text-[#525252] leading-[1.65] text-sm whitespace-pre-wrap">
                      {item.description}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
