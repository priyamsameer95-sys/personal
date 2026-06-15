import React from 'react';
import db from '@/lib/db';
import Link from 'next/link';
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

export const revalidate = 0; // Force dynamic fetching on load

export default async function HomePage() {
  // Query public content items for preview feeds
  const { rows: recentWorkRows } = await db`
    SELECT * FROM content WHERE category = 'product' AND is_public = 1 ORDER BY created_at DESC LIMIT 2
  `;
  const recentWork = recentWorkRows as ContentItem[];

  const { rows: recentArtRows } = await db`
    SELECT * FROM content WHERE category = 'art' AND is_public = 1 ORDER BY created_at DESC LIMIT 2
  `;
  const recentArt = recentArtRows as ContentItem[];

  const { rows: recentWritingRows } = await db`
    SELECT * FROM content WHERE category = 'blog' AND is_public = 1 ORDER BY created_at DESC LIMIT 2
  `;
  const recentWriting = recentWritingRows as ContentItem[];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-[56rem] mx-auto px-6 py-20 pb-24">
        <Header />

        <main className="animate-[fadeInUp_0.4s_cubic-bezier(0.2,0,0,1)_both]">
          {/* Elsewhere Section */}
          <section className="mt-6">
            <div className="flex items-center gap-4 mb-8">
              <h3 className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-[#8C8C8C] m-0">
                Elsewhere
              </h3>
              <div className="flex-1 h-[1px] bg-[rgba(229,229,229,0.6)]"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <a
                href="https://linkedin.com/in/priyamsameer"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl border border-[rgba(229,229,229,0.4)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] no-underline transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06),0_12px_32px_-4px_rgba(0,0,0,0.04)]"
              >
                <span className="material-symbols-rounded text-lg text-[#8C8C8C] select-none">open_in_new</span>
                <span className="font-medium text-sm text-[#1A1A1A]">LinkedIn</span>
              </a>
              <a
                href="https://github.com/priyamsameer"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl border border-[rgba(229,229,229,0.4)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] no-underline transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06),0_12px_32px_-4px_rgba(0,0,0,0.04)]"
              >
                <span className="material-symbols-rounded text-lg text-[#8C8C8C] select-none">code</span>
                <span className="font-medium text-sm text-[#1A1A1A]">GitHub</span>
              </a>
              <a
                href="https://heymaya.pro"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl border border-[rgba(229,229,229,0.4)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] no-underline transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06),0_12px_32px_-4px_rgba(0,0,0,0.04)]"
              >
                <span className="material-symbols-rounded text-lg text-[#8C8C8C] select-none">language</span>
                <span className="font-medium text-sm text-[#1A1A1A]">HeyMaya.pro</span>
              </a>
              <a
                href="mailto:Priyam.Sameer.95@gmail.com"
                className="flex items-center gap-3 p-4 rounded-xl border border-[rgba(229,229,229,0.4)] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] no-underline transition hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06),0_12px_32px_-4px_rgba(0,0,0,0.04)]"
              >
                <span className="material-symbols-rounded text-lg text-[#8C8C8C] select-none">mail</span>
                <span className="font-medium text-sm text-[#1A1A1A]">Email</span>
              </a>
            </div>
          </section>

          {/* Previews: Product Work */}
          {recentWork.length > 0 && (
            <section className="mt-24">
              <div className="flex items-center gap-4 mb-8">
                <h3 className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-[#8C8C8C] m-0">
                  Featured Work
                </h3>
                <div className="flex-1 h-[1px] bg-[rgba(229,229,229,0.6)]"></div>
              </div>
              <div className="flex flex-col gap-12">
                {recentWork.map((work) => (
                  <article key={work.id} className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    <div className="md:col-span-4">
                      <h4 className="text-xl font-bold text-[#1A1A1A] m-0 mb-2">
                        {work.title}
                      </h4>
                      <Link
                        href={`/product/${work.id}`}
                        className="inline-flex items-center gap-1 text-xs font-mono text-[#8C8C8C] hover:text-[#1A1A1A] no-underline"
                      >
                        View case study <span className="material-symbols-rounded text-sm">arrow_forward</span>
                      </Link>
                    </div>
                    <div className="md:col-span-8 text-[#525252] leading-[1.65] text-sm">
                      <p className="m-0 line-clamp-3">{work.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Previews: Recent Art */}
          {recentArt.length > 0 && (
            <section className="mt-24">
              <div className="flex items-center gap-4 mb-8">
                <h3 className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-[#8C8C8C] m-0">
                  Recent Canvas
                </h3>
                <div className="flex-1 h-[1px] bg-[rgba(229,229,229,0.6)]"></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                {recentArt.map((art) => (
                  <Link
                    key={art.id}
                    href={`/art/${art.id}`}
                    className="group no-underline block transition hover:-translate-y-0.5"
                  >
                    <div className="aspect-[4/5] bg-[#F0EAE1] border border-[rgba(229,229,229,0.4)] rounded-xl overflow-hidden mb-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center justify-center relative">
                      {art.file_path ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={`/api/media/${art.id}`}
                          alt={art.title}
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <span className="font-serif italic text-sm text-[#1A1A1A]/40">{art.title}</span>
                      )}
                    </div>
                    <h4 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#1A1A1A] m-0">
                      {art.title}
                    </h4>
                    <p className="text-xs text-[#8C8C8C] m-0 mt-1">
                      {art.description ? (art.description.length > 60 ? `${art.description.slice(0, 60)}...` : art.description) : 'Oil on Canvas'}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Previews: Recent Writing */}
          {recentWriting.length > 0 && (
            <section className="mt-24">
              <div className="flex items-center gap-4 mb-8">
                <h3 className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-[#8C8C8C] m-0">
                  Recent Writing
                </h3>
                <div className="flex-1 h-[1px] bg-[rgba(229,229,229,0.6)]"></div>
              </div>
              <div className="flex flex-col gap-10 max-w-[48rem]">
                {recentWriting.map((post) => (
                  <article key={post.id} className="pb-8 border-b border-[rgba(229,229,229,0.4)] last:border-0 last:pb-0">
                    <div className="flex items-center gap-4 mb-3">
                      <time className="font-mono text-[11px] font-bold text-[#8C8C8C] uppercase tracking-[0.14em]">
                        {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </time>
                    </div>
                    <Link href={`/blog/${post.id}`} className="no-underline group">
                      <h4 className="font-serif text-2xl font-medium text-[#1A1A1A] group-hover:text-blue-700 transition duration-200 m-0 mb-3 italic">
                        {post.title}
                      </h4>
                    </Link>
                    <p className="text-[#525252] leading-[1.65] text-sm m-0 mb-4 line-clamp-3">
                      {post.description}
                    </p>
                    <Link
                      href={`/blog/${post.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-[#1A1A1A] hover:text-blue-700 transition duration-200 no-underline"
                    >
                      Read essay <span className="material-symbols-rounded text-lg">arrow_forward</span>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
