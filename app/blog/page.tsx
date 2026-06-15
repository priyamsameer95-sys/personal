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

        <main className="animate-fade-in-up">
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-system-primary mb-4">Writing</h2>
            <p className="text-system-secondary text-lg max-w-2xl font-serif">
              Thoughts on product management, construction logic in software, and operational integrity.
            </p>
          </div>

          {items.length === 0 ? (
            <div className="py-20 text-center font-mono text-xs text-system-tertiary border border-dashed border-system-outline/40 rounded-2xl bg-white">
              NO ESSAYS PUBLISHED YET
            </div>
          ) : (
            <div className="space-y-16 max-w-3xl">
              {items.map((post) => (
                <article key={post.id} className="group relative pb-8 border-b border-system-outline/40">
                  <div className="flex items-baseline gap-4 mb-3">
                    <time className="font-mono text-[11px] font-semibold text-system-tertiary uppercase tracking-widest">
                      {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </time>
                    <span className="w-8 h-px bg-system-outline/60"></span>
                    <span className="font-mono text-[11px] font-semibold text-system-tertiary uppercase tracking-widest">
                      Product
                    </span>
                  </div>
                  <Link href={`/blog/${post.id}`} className="no-underline">
                    <h3 className="text-2xl font-bold text-system-primary mb-4 font-serif cursor-pointer hover:text-system-accent transition duration-200">
                      {post.title}
                    </h3>
                  </Link>
                  <p className="text-system-secondary leading-relaxed mb-4 text-sm md:text-base">
                    {post.description}
                  </p>
                  <Link
                    href={`/blog/${post.id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-system-primary hover:text-system-accent transition duration-200 no-underline"
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
