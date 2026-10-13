import type { Metadata } from 'next';
import { publicDb as db } from '@/lib/db';
import { contentExcerpt } from '@/lib/content';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  body_markdown: string | null;
  created_at: string;
}

export const metadata: Metadata = {
  title: 'Writing',
  description: 'Published writing by Priyam Sameer about product decisions and operating experience, alongside his product leadership portfolio.',
  openGraph: { title: 'Writing — Priyam Sameer', description: 'My published writing about product decisions and operating experience.' },
  twitter: { title: 'Writing — Priyam Sameer', description: 'My published writing about product decisions and operating experience.' },
};

export const revalidate = 0;

export default async function BlogPage() {
  const { rows } = await db`
    SELECT id, title, slug, summary, body_markdown, created_at
    FROM content_items
    WHERE type = 'blog' AND status = 'published'
    ORDER BY created_at DESC
  `;
  const items = rows as ContentItem[];

  return (
    <PublicShell>
        <Header />

        <main id="main-content" className="animate-fade-in-up">
          <div className="mb-12 max-w-2xl md:mb-16">
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-system-accent">Ideas from product work</p>
            <h1 className="mb-5 font-sans text-5xl leading-tight tracking-tight text-system-primary sm:text-6xl">Writing.</h1>
            <p className="max-w-xl text-lg leading-relaxed text-system-secondary">My published writing about product decisions and the experience behind them.</p>
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-system-outline bg-system-surface px-6 py-14 sm:px-10">
              <h2 className="mb-3 font-sans text-3xl text-system-primary">No writing published yet.</h2>
              <p className="max-w-lg leading-relaxed text-system-secondary">There are no published articles here. My case studies explain the decisions, delivery and impact behind my product work.</p>
              <Link href="/product" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-system-accent no-underline">Explore my work <span aria-hidden="true">→</span></Link>
            </div>
          ) : (
            <div className="max-w-3xl space-y-10">
              {items.map((post) => {
                const excerpt = contentExcerpt(post.summary || post.body_markdown, 260);
                const href = `/blog/${encodeURIComponent(post.slug || post.id)}`;
                return (
                  <article key={post.id} className="border-t border-system-outline pt-7">
                    <time dateTime={new Date(post.created_at).toISOString()} className="mb-3 block text-xs uppercase tracking-[0.12em] text-system-tertiary">
                      {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                    </time>
                    <Link href={href} className="no-underline">
                      <h2 className="mb-4 font-sans text-3xl leading-tight text-system-primary transition-colors hover:text-system-accent sm:text-4xl">{post.title}</h2>
                    </Link>
                    {excerpt && <p className="leading-relaxed text-system-secondary">{excerpt}</p>}
                    <Link href={href} className="mt-4 inline-flex min-h-11 items-center gap-3 text-sm font-medium text-system-accent no-underline">Read essay <span aria-hidden="true">→</span></Link>
                  </article>
                );
              })}
            </div>
          )}
        </main>

        <Footer />
    </PublicShell>
  );
}
