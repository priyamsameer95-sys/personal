import React from 'react';
import db from '@/lib/db';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: 'blog';
  file_path: string | null;
  file_type: string | null;
  is_public: number;
  created_at: number;
}

export const revalidate = 0;

export default async function BlogPage() {
  const { rows } = await db`
    SELECT * FROM content WHERE category = 'blog' AND is_public = 1 ORDER BY created_at DESC
  `;
  const items = rows as ContentItem[];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-[56rem] mx-auto px-6 py-20 pb-24">
        <Header />

        <main className="animate-[fadeInUp_0.4s_cubic-bezier(0.2,0,0,1)_both]">
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-[#1A1A1A] m-0 mb-4 tracking-tight font-sans">
              Writing
            </h2>
            <p className="text-[#525252] text-lg m-0 max-w-[42rem]">
              Thoughts on product management, construction logic in software, and operational integrity.
            </p>
          </div>

          {items.length === 0 ? (
            <div className="py-20 text-center font-mono text-xs text-[#8C8C8C] border border-dashed border-[#E5E5E5] rounded-2xl bg-white">
              NO ESSAYS PUBLISHED YET
            </div>
          ) : (
            <div className="flex flex-col gap-16 max-w-[48rem]">
              {items.map((post) => (
                <article key={post.id} className="pb-12 border-b border-[rgba(229,229,229,0.4)] last:border-0 last:pb-0">
                  <div className="flex items-center gap-4 mb-4">
                    <time className="font-mono text-[11px] font-bold text-[#8C8C8C] uppercase tracking-[0.14em]">
                      {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </time>
                  </div>
                  <Link href={`/blog/${post.id}`} className="no-underline group">
                    <h3 className="font-serif text-2xl font-medium text-[#1A1A1A] group-hover:text-blue-700 transition duration-200 m-0 mb-4 italic">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="text-[#525252] leading-[1.65] text-sm m-0 mb-6 line-clamp-4">
                    {post.description}
                  </p>
                  <Link
                    href={`/blog/${post.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#1A1A1A] hover:text-blue-700 transition duration-200 no-underline"
                  >
                    Read full essay <span className="material-symbols-rounded text-lg">arrow_forward</span>
                  </Link>
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
