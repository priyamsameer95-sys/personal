import React from 'react';
import { publicDb as db } from '@/lib/db';
import { contentExcerpt } from '@/lib/content';
import { featuredWork } from '@/lib/work';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import PeelReveal from '@/components/PeelReveal';
import workStyles from '@/components/work/work.module.css';

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
  const recentWork = await featuredWork(2);

  const { rows: recentArtRows } = process.env.POSTGRES_URL ? await db`
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
  ` : { rows: [] };
  const recentArt = recentArtRows as ContentItem[];

  const { rows: recentWritingRows } = process.env.POSTGRES_URL ? await db`
    SELECT
      id, title, slug, summary, type, created_at
    FROM content_items
    WHERE type = 'blog' AND status = 'published'
    ORDER BY created_at DESC
    LIMIT 2
  ` : { rows: [] };
  const recentWriting = recentWritingRows as ContentItem[];

  return (
    <PublicShell>
        <Header />
        <main id="main-content" className="animate-fade-in-up">
          <section aria-labelledby="intro-title" className="home-peel-hero">
            <div>
              <p className="home-label">Product leader · Builder · Painter</p>
              <h1 id="intro-title">Building products.<br />Making room<br />for art.</h1>
              <p className="intro-copy">I&apos;m Priyam. I build products at the intersection of credit, agriculture, and trade. Away from the screen, you&apos;ll find me at the canvas.</p>
              <div className="home-actions">
                <Link href="/product" className="ink-button">Explore my work <span aria-hidden="true">↗</span></Link>
                <Link href="/cv" className="ink-link">Read my CV <span aria-hidden="true">→</span></Link>
              </div>
              <p className="current-note">Currently leading lending products and P&amp;L at CashKaro.</p>
            </div>
            <PeelReveal />
          </section>

          <section aria-labelledby="experience-title" className="py-12 md:py-16 border-t border-system-outline">
            <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
              <div>
                <p className="text-xs mb-3">The path so far</p>
                <h2 id="experience-title" className="text-3xl md:text-4xl font-medium tracking-tight">Ideas into working systems.</h2>
              </div>
              <Link href="/cv" className="text-sm inline-flex min-h-11 items-center gap-3 underline underline-offset-4">Full experience <span aria-hidden="true">↗</span></Link>
            </div>
            <div>
              {[
                { period: 'Mar 2025 — Present', company: 'CashKaro', role: 'General Manager, Product Management', description: 'Leading lending products, end-to-end P&L ownership, and business growth.' },
                { period: 'Oct 2021 — Nov 2024', company: 'Absolute.ag', role: 'Principal Product Manager', description: 'Satellite-data rural credit and SilkRoute, a B2B trade platform spanning 25+ countries.' },
                { period: 'Jul 2019 — Sep 2021', company: 'UrbanKhet', role: 'Founder & Director', description: 'A D2C agritech platform, incubated at IIM Ahmedabad CIIE.CO, serving 3,600+ buyers.' },
              ].map(experience => (
                <article key={experience.company} className="experience-row">
                  <p className="period">{experience.period}</p>
                  <div>
                    <h3>{experience.company}</h3>
                    <p className="role">{experience.role}</p>
                  </div>
                  <p className="description">{experience.description}</p>
                </article>
              ))}
            </div>
          </section>

          {recentWork.length > 0 && (
            <section aria-labelledby="work-title" className="py-12 md:py-16 border-t border-system-outline">
              <div className="flex justify-between items-center gap-4 mb-9">
                <h2 id="work-title" className="font-sans text-3xl md:text-4xl tracking-tight">Selected work</h2>
                <Link href="/product" className="text-sm underline underline-offset-4">All work ↗</Link>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                {recentWork.map((work) => {
                  return (
                    <Link key={work.id} href={work.href} className="group block rounded-2xl border border-system-outline bg-white overflow-hidden hover:border-system-accent transition-colors">
                      {work.image && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={work.image.src} alt={work.image.alt} className={workStyles.featuredImage} loading="lazy" />
                      )}
                      <div className="p-6">
                        <p className={workStyles.featuredLabel}>{work.company || 'Product case study'}</p>
                        <h3 className="text-xl font-medium mb-3 group-hover:text-system-accent">{work.title}</h3>
                        <p className="text-sm leading-relaxed text-system-secondary">{contentExcerpt(work.summary, 200)}</p>
                        {work.outcome && <p className={workStyles.featuredOutcome}>{work.outcome}</p>}
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
              <p className="text-xs text-system-tertiary mb-4">Outside the brief</p>
              <h2 id="about-title" className="font-sans text-3xl md:text-4xl leading-tight">Structure meets<br /><span className="text-system-primary">expression.</span></h2>
            </div>
            <div className="space-y-5 text-system-secondary text-base md:text-lg leading-relaxed">
              <p>I studied Construction Technology at CEPT University. That construction background shapes how I approach products: sound foundations, clear logic, and systems that hold up in the real world.</p>
              <p>Painting gives me space for a different kind of thinking. The canvas is a counterbalance to the constraints of software and business.</p>
              <Link href="/art" className="inline-flex items-center gap-3 text-system-primary text-sm font-medium underline underline-offset-4">Visit the art collection <span aria-hidden="true">↗</span></Link>
            </div>
          </section>

          {recentArt.length > 0 && (
            <section aria-labelledby="art-title" className="py-12 md:py-16 border-t border-system-outline">
              <div className="flex justify-between items-center gap-4 mb-9">
                <h2 id="art-title" className="font-sans text-3xl md:text-4xl tracking-tight">From the canvas</h2>
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
                        ) : <span className="font-sans italic text-system-secondary">{art.title}</span>}
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
                <h2 id="writing-title" className="font-sans text-3xl md:text-4xl tracking-tight">Notes &amp; observations</h2>
                <Link href="/blog" className="text-sm underline underline-offset-4">All writing ↗</Link>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                {recentWriting.map(post => (
                  <article key={post.id}>
                    <time dateTime={new Date(post.created_at).toISOString()} className="font-mono text-[10px] uppercase tracking-widest text-system-tertiary">{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</time>
                    <Link href={`/blog/${post.slug || post.id}`} className="block group mt-3">
                      <h3 className="font-sans text-2xl mb-3 group-hover:text-system-accent">{post.title}</h3>
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
    </PublicShell>
  );
}
