import React from 'react';
import db from '@/lib/db';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body_markdown: string | null;
  type: string;
  status: 'draft' | 'published';
  created_at: string;
  media: Array<{
    blob_url: string;
    kind: string;
  }>;
}

export const revalidate = 0; // Force dynamic fetching on load

export default async function HomePage() {
  const { rows: recentWorkRows } = await db`
    SELECT
      ci.id, ci.title, ci.slug, ci.body_markdown, ci.type, ci.created_at,
      COALESCE(
        json_agg(
          json_build_object('blob_url', ma.blob_url, 'kind', ma.kind) ORDER BY ma.sort_order
        ) FILTER (WHERE ma.id IS NOT NULL),
        '[]'::json
      ) AS media
    FROM content_items ci
    LEFT JOIN media_assets ma ON ma.content_id = ci.id
    WHERE ci.type = 'work' AND ci.status = 'published'
    GROUP BY ci.id
    ORDER BY ci.sort_order ASC, ci.created_at DESC
    LIMIT 2
  `;
  const recentWork = recentWorkRows as ContentItem[];

  const { rows: recentArtRows } = await db`
    SELECT
      ci.id, ci.title, ci.slug, ci.body_markdown, ci.type, ci.created_at,
      COALESCE(
        json_agg(
          json_build_object('blob_url', ma.blob_url, 'kind', ma.kind) ORDER BY ma.sort_order
        ) FILTER (WHERE ma.id IS NOT NULL),
        '[]'::json
      ) AS media
    FROM content_items ci
    LEFT JOIN media_assets ma ON ma.content_id = ci.id
    WHERE ci.type = 'art' AND ci.status = 'published'
    GROUP BY ci.id
    ORDER BY ci.sort_order ASC, ci.created_at DESC
    LIMIT 2
  `;
  const recentArt = recentArtRows as ContentItem[];

  const { rows: recentWritingRows } = await db`
    SELECT
      id, title, slug, summary, type, created_at
    FROM content_items
    WHERE type = 'blog' AND status = 'published'
    ORDER BY created_at DESC
    LIMIT 2
  `;
  const recentWriting = recentWritingRows as ContentItem[];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-[56rem] mx-auto px-6 py-20 pb-24">
        <Header />

        <main className="animate-fade-in-up">
          <header className="mb-24">
            <h2 className="text-[2.5rem] md:text-[3.5rem] font-bold tracking-tight mb-8 text-system-primary leading-[1.1]">
              Builder. Product manager.<br />Painter.
            </h2>
            <div className="space-y-6 text-system-secondary text-[1.1rem] md:text-[1.2rem] leading-relaxed max-w-[60ch] font-serif">
              <p>
                My bread and butter is building highly scalable products at the intersection of credit, agriculture, and trade. Currently, I am a Senior PM at <strong className="font-semibold text-system-primary">CashKaro</strong>, owning the Education Loans P&amp;L, while simultaneously building <strong className="font-semibold text-system-primary">Antigravity</strong>, an education loan platform from scratch.
              </p>
              <p>
                I studied Construction Technology at CEPT University. I chose it independently over IIT. That rigorous architectural background fundamentally shapes how I approach software engineering as an exercise in structural integrity, load-bearing logic, and elegant systems.
              </p>
              <p>
                Beyond the screen, I am a dedicated painter. The canvas is where I practice fluid expression. It is a necessary counterbalance to the rigid constraints of code and business logic.
              </p>
            </div>
          </header>

          {/* Recognition & Press Section */}
          <section className="mb-24">
            <h3 className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-system-tertiary mb-10 border-b border-system-outline/40 pb-4">
              Recognition & Press
            </h3>
            <div className="flex flex-col">
              <article className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-8 py-6 border-b border-system-outline/30 hover:bg-system-surface/50 transition-colors px-4 -mx-4 rounded-xl">
                <time className="w-24 shrink-0 font-mono text-[11px] text-system-tertiary tracking-widest pt-1">2024</time>
                <div>
                  <h4 className="font-bold text-system-primary text-base tracking-wide mb-1">FinTech Leadership</h4>
                  <p className="text-sm text-system-secondary leading-relaxed">Recognized for architecting rural credit engines via satellite data.</p>
                </div>
              </article>
              <article className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-8 py-6 border-b border-system-outline/30 hover:bg-system-surface/50 transition-colors px-4 -mx-4 rounded-xl">
                <time className="w-24 shrink-0 font-mono text-[11px] text-system-tertiary tracking-widest pt-1">2021</time>
                <div>
                  <h4 className="font-bold text-system-primary text-base tracking-wide mb-1">Economic Times</h4>
                  <p className="text-sm text-system-secondary leading-relaxed">Featured on the evolution of D2C Agritech and farm-to-fork supply chains.</p>
                </div>
              </article>
              <article className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-8 py-6 border-b border-system-outline/30 hover:bg-system-surface/50 transition-colors px-4 -mx-4 rounded-xl">
                <time className="w-24 shrink-0 font-mono text-[11px] text-system-tertiary tracking-widest pt-1">2020</time>
                <div>
                  <h4 className="font-bold text-system-primary text-base tracking-wide mb-1">IIM Ahmedabad Ventures</h4>
                  <p className="text-sm text-system-secondary leading-relaxed">Incubated Startup & Seed Grant recipient for UrbanKhet.</p>
                </div>
              </article>
            </div>
          </section>

          {/* Elsewhere Section */}
          <section className="mb-24">
            <div className="flex items-center gap-4 mb-8">
              <h3 className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-system-tertiary m-0">
                Elsewhere
              </h3>
              <div className="flex-1 h-[1px] bg-system-outline/40"></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <a
                href="https://linkedin.com/in/priyamsameer"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl border border-system-outline/40 bg-white shadow-material-soft no-underline transition duration-200 hover:-translate-y-0.5 hover:shadow-material-hover"
              >
                <span className="material-symbols-rounded text-lg text-system-tertiary select-none">open_in_new</span>
                <span className="font-medium text-sm text-system-primary">LinkedIn</span>
              </a>
              <a
                href="https://github.com/priyamsameer"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl border border-system-outline/40 bg-white shadow-material-soft no-underline transition duration-200 hover:-translate-y-0.5 hover:shadow-material-hover"
              >
                <span className="material-symbols-rounded text-lg text-system-tertiary select-none">code</span>
                <span className="font-medium text-sm text-system-primary">GitHub</span>
              </a>
              <a
                href="https://heymaya.pro"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 rounded-xl border border-system-outline/40 bg-white shadow-material-soft no-underline transition duration-200 hover:-translate-y-0.5 hover:shadow-material-hover"
              >
                <span className="material-symbols-rounded text-lg text-system-tertiary select-none">language</span>
                <span className="font-medium text-sm text-system-primary">HeyMaya.pro</span>
              </a>
              <a
                href="mailto:Priyam.Sameer.95@gmail.com"
                className="flex items-center gap-3 p-4 rounded-xl border border-system-outline/40 bg-white shadow-material-soft no-underline transition duration-200 hover:-translate-y-0.5 hover:shadow-material-hover"
              >
                <span className="material-symbols-rounded text-lg text-system-tertiary select-none">mail</span>
                <span className="font-medium text-sm text-system-primary">Email</span>
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
                {recentWork.map((work) => {
                  return (
                    <article key={work.id} className="grid grid-cols-1 md:grid-cols-12 gap-8">
                      <div className="md:col-span-4">
                        <h4 className="text-xl font-bold text-[#1A1A1A] m-0 mb-2">
                          {work.title}
                        </h4>
                        <Link
                          href={`/product/${work.slug || work.id}`}
                          className="inline-flex items-center gap-1 text-xs font-mono text-[#8C8C8C] hover:text-[#1A1A1A] no-underline"
                        >
                          View case study <span className="material-symbols-rounded text-sm">arrow_forward</span>
                        </Link>
                      </div>
                      <div className="md:col-span-8 text-[#525252] leading-[1.65] text-sm">
                        <p className="m-0 line-clamp-3">
                          {work.body_markdown ? work.body_markdown.substring(0, 150) + '...' : 'View case study details...'}
                        </p>
                      </div>
                    </article>
                  );
                })}
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
                {recentArt.map((art) => {
                  const firstImage = art.media?.find(m => m.kind === 'image');
                  return (
                    <Link
                      key={art.id}
                      href={`/art/${art.slug || art.id}`}
                      className="group no-underline block transition hover:-translate-y-0.5"
                    >
                      <div className="aspect-[4/5] bg-[#F0EAE1] border border-[rgba(229,229,229,0.4)] rounded-xl overflow-hidden mb-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center justify-center relative">
                        {firstImage ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={firstImage.blob_url}
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
                      <p className="text-xs text-[#8C8C8C] m-0 mt-1 line-clamp-2">
                        {art.body_markdown || 'Oil on Canvas'}
                      </p>
                    </Link>
                  );
                })}
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
                    <Link href={`/blog/${post.slug || post.id}`} className="no-underline group">
                      <h4 className="font-serif text-2xl font-medium text-[#1A1A1A] group-hover:text-blue-700 transition duration-200 m-0 mb-3 italic">
                        {post.title}
                      </h4>
                    </Link>
                    {post.summary && (
                      <p className="text-[#525252] leading-[1.65] text-sm m-0 mb-4 line-clamp-3">
                        {post.summary}
                      </p>
                    )}
                    <Link
                      href={`/blog/${post.slug || post.id}`}
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
