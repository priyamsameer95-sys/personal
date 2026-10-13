import React from 'react';
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
  type: string;
  status: 'draft' | 'published';
  created_at: string;
  media: Array<{
    blob_url: string;
    kind: string;
    alt_text?: string | null;
  }>;
}

export const revalidate = 0; // Force dynamic fetching on load

export default async function HomePage() {
  const { rows: recentWorkRows } = await db`
    SELECT
      ci.id, ci.title, ci.slug, ci.body_markdown, ci.type, ci.created_at,
      COALESCE(
        json_agg(
          json_build_object('blob_url', ma.blob_url, 'kind', ma.kind, 'alt_text', ma.alt_text) ORDER BY ma.sort_order
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
          json_build_object('blob_url', ma.blob_url, 'kind', ma.kind, 'alt_text', ma.alt_text) ORDER BY ma.sort_order
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
    <div className="min-h-screen bg-system-bg">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 md:py-10">
        <Header />
        <main id="main-content" className="animate-fade-in-up">
          <section aria-labelledby="intro-title" className="grid lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-16 items-center pb-16 md:pb-24">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-system-tertiary mb-7 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-system-accent" aria-hidden="true" />
                Product manager · Builder · Painter
              </p>
              <h1 id="intro-title" className="text-[3.25rem] sm:text-6xl lg:text-[4.5rem] leading-[1.06] tracking-[-0.055em] font-medium mb-7">
                Building products.<br />
                <span className="font-serif italic font-normal text-system-accent tracking-[-0.035em]">Making room<br className="hidden sm:block" /> for art.</span>
              </h1>
              <p className="text-system-secondary text-base md:text-lg leading-relaxed max-w-[34rem]">
                I&apos;m Priyam. I build products at the intersection of credit, agriculture, and trade. Away from the screen, you&apos;ll find me at the canvas.
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-9">
                <Link href="/product" className="inline-flex items-center gap-5 bg-system-primary text-white rounded-full px-6 py-3.5 text-sm font-medium hover:bg-system-accent transition-colors">
                  Explore my work <span aria-hidden="true">↗</span>
                </Link>
                <Link href="/cv" className="inline-flex items-center gap-3 rounded-full border border-system-outline px-6 py-3.5 text-sm font-medium hover:border-system-primary transition-colors">
                  Read my CV <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
            <aside aria-label="Current work" className="portfolio-grid relative overflow-hidden rounded-[1.5rem] bg-[#344332] text-[#F8F6F0] px-7 py-8 sm:px-9 sm:py-10 lg:rotate-[2deg]">
              <div className="flex justify-between items-center font-mono text-[10px] uppercase tracking-[0.16em] text-[#D0DBC7]">
                <span>Currently building</span>
                <span aria-hidden="true">01 / Product</span>
              </div>
              <div className="relative h-44 sm:h-52 my-6 flex items-center justify-center" aria-hidden="true">
                <div className="absolute w-32 h-32 border border-[#C1D1B6]/60 rounded-full -translate-x-9" />
                <div className="absolute w-32 h-32 border border-[#C1D1B6]/60 rounded-full translate-x-9" />
                <div className="absolute w-32 h-32 border border-[#C1D1B6]/60 rounded-full translate-y-12" />
                <span className="font-serif italic text-3xl relative -translate-y-2">From 0 to 1.</span>
              </div>
              <div className="border-t border-white/20 pt-6 relative">
                <h2 className="text-2xl font-medium tracking-tight mb-3">CashKaro &amp; Antigravity</h2>
                <p className="text-[#E1E8DC] text-sm leading-relaxed">Owning the Education Loans P&amp;L as a Senior PM and building an education loan platform from scratch.</p>
                <div className="flex items-center justify-between mt-6">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#D0DBC7]">Credit · Education · Systems</span>
                  <Link href="/cv" aria-label="Read about my current work in my CV" className="w-10 h-10 rounded-full border border-white/30 inline-flex items-center justify-center hover:bg-white/10 transition-colors">↗</Link>
                </div>
              </div>
            </aside>
          </section>

          <section aria-labelledby="experience-title" className="py-12 md:py-16 border-t border-system-outline">
            <div className="flex flex-wrap justify-between items-end gap-4 mb-10">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-system-tertiary mb-3">The path so far</p>
                <h2 id="experience-title" className="font-serif text-3xl md:text-4xl tracking-tight">Ideas into working systems.</h2>
              </div>
              <Link href="/cv" className="text-sm inline-flex items-center gap-3 underline underline-offset-4">Full experience <span aria-hidden="true">↗</span></Link>
            </div>
            <div className="grid md:grid-cols-3 gap-7 md:gap-10">
              {[
                { period: '2024 — Present', company: 'CashKaro', role: 'Senior Product Manager', description: 'Education loans, end-to-end P&L ownership, and a new platform built from the ground up.' },
                { period: '2021 — 2024', company: 'Absolute.ag', role: 'Principal Product Manager', description: 'Rural credit using satellite data and a cross-border trade platform spanning 25 countries.' },
                { period: '2019 — 2021', company: 'UrbanKhet', role: 'Founder', description: 'A D2C agritech platform, incubated at IIM Ahmedabad Ventures, serving 3,400 users.' },
              ].map((experience, index) => (
                <article key={experience.company} className="border-t border-system-outline pt-5">
                  <div className="flex justify-between font-mono text-[10px] text-system-tertiary mb-7"><span>{experience.period}</span><span aria-hidden="true">0{index + 1}</span></div>
                  <h3 className="text-xl font-medium tracking-tight mb-1">{experience.company}</h3>
                  <p className="text-sm text-system-accent mb-4">{experience.role}</p>
                  <p className="text-sm text-system-secondary leading-relaxed">{experience.description}</p>
                </article>
              ))}
            </div>
          </section>

          {recentWork.length > 0 && (
            <section aria-labelledby="work-title" className="py-12 md:py-16 border-t border-system-outline">
              <div className="flex justify-between items-center gap-4 mb-9">
                <h2 id="work-title" className="font-serif text-3xl md:text-4xl tracking-tight">Selected work</h2>
                <Link href="/product" className="text-sm underline underline-offset-4">All work ↗</Link>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                {recentWork.map((work) => {
                  const firstImage = work.media?.find(media => media.kind === 'image');
                  return (
                    <Link key={work.id} href={`/product/${work.slug || work.id}`} className="group block rounded-2xl border border-system-outline bg-white overflow-hidden hover:border-system-accent transition-colors">
                      {firstImage && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={firstImage.blob_url} alt={firstImage.alt_text || work.title} className="aspect-[16/10] w-full object-cover" loading="lazy" />
                      )}
                      <div className="p-6">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-system-tertiary mb-3">Product case study</p>
                        <h3 className="text-xl font-medium mb-3 group-hover:text-system-accent">{work.title}</h3>
                        <p className="text-sm leading-relaxed text-system-secondary">{contentExcerpt(work.body_markdown, 180)}</p>
                        <span className="inline-block mt-6 text-sm font-medium">Read case study <span aria-hidden="true">↗</span></span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <section aria-labelledby="about-title" className="grid md:grid-cols-[1fr_1.6fr] gap-8 md:gap-16 py-12 md:py-16 border-t border-system-outline">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-system-tertiary mb-4">Outside the brief</p>
              <h2 id="about-title" className="font-serif text-3xl md:text-4xl leading-tight">Structure meets<br /><span className="italic text-system-accent">expression.</span></h2>
            </div>
            <div className="space-y-5 text-system-secondary text-base md:text-lg leading-relaxed">
              <p>I studied Construction Technology at CEPT University. That architectural background shapes how I approach products: sound foundations, clear logic, and systems that hold up in the real world.</p>
              <p>Painting gives me space for a different kind of thinking. The canvas is a counterbalance to the constraints of software and business.</p>
              <Link href="/art" className="inline-flex items-center gap-3 text-system-primary text-sm font-medium underline underline-offset-4">Visit the art collection <span aria-hidden="true">↗</span></Link>
            </div>
          </section>

          {recentArt.length > 0 && (
            <section aria-labelledby="art-title" className="py-12 md:py-16 border-t border-system-outline">
              <div className="flex justify-between items-center gap-4 mb-9">
                <h2 id="art-title" className="font-serif text-3xl md:text-4xl tracking-tight">From the canvas</h2>
                <Link href="/art" className="text-sm underline underline-offset-4">All paintings ↗</Link>
              </div>
              <div className="grid sm:grid-cols-2 gap-8">
                {recentArt.map((art) => {
                  const firstImage = art.media?.find(media => media.kind === 'image');
                  return (
                    <Link key={art.id} href={`/art/${art.slug || art.id}`} className="group block">
                      <div className="aspect-[4/5] bg-[#E9E6DB] rounded-2xl overflow-hidden mb-4 flex items-center justify-center">
                        {firstImage ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={firstImage.blob_url} alt={firstImage.alt_text || art.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
                        ) : <span className="font-serif italic text-system-secondary">{art.title}</span>}
                      </div>
                      <h3 className="text-lg font-medium group-hover:text-system-accent">{art.title}</h3>
                      <p className="text-sm text-system-secondary mt-1">{contentExcerpt(art.body_markdown, 100)}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {recentWriting.length > 0 && (
            <section aria-labelledby="writing-title" className="py-12 md:py-16 border-t border-system-outline">
              <div className="flex justify-between items-center gap-4 mb-9">
                <h2 id="writing-title" className="font-serif text-3xl md:text-4xl tracking-tight">Notes &amp; observations</h2>
                <Link href="/blog" className="text-sm underline underline-offset-4">All writing ↗</Link>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                {recentWriting.map(post => (
                  <article key={post.id}>
                    <time dateTime={new Date(post.created_at).toISOString()} className="font-mono text-[10px] uppercase tracking-widest text-system-tertiary">{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</time>
                    <Link href={`/blog/${post.slug || post.id}`} className="block group mt-3">
                      <h3 className="font-serif text-2xl mb-3 group-hover:text-system-accent">{post.title}</h3>
                      {post.summary && <p className="text-system-secondary text-sm leading-relaxed">{contentExcerpt(post.summary, 180)}</p>}
                      <span className="inline-block text-sm font-medium mt-5">Read essay <span aria-hidden="true">↗</span></span>
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
