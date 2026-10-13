import type { Metadata } from 'next';
import { publicDb as db } from '@/lib/db';
import { contentExcerpt } from '@/lib/content';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import styles from './blog.module.css';

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

async function loadWriting(): Promise<{ items: ContentItem[]; unavailable: boolean }> {
  // Writing is optional; a missing connection must not make the portfolio fail.
  if (!process.env.POSTGRES_URL) return { items: [], unavailable: process.env.NODE_ENV === 'production' };
  try {
    const { rows } = await db`
      SELECT id, title, slug, summary, body_markdown, created_at
      FROM content_items
      WHERE type = 'blog' AND status = 'published'
      ORDER BY created_at DESC
    `;
    return { items: rows as ContentItem[], unavailable: false };
  } catch {
    console.error('Published writing could not be loaded.');
    return { items: [], unavailable: true };
  }
}

export default async function BlogPage() {
  const { items, unavailable } = await loadWriting();

  return (
    <PublicShell>
        <Header />

        <main id="main-content" className={styles.page}>
          <header className={styles.intro}>
            <h1>Writing.</h1>
            <p>Product decisions, lessons and the experience behind them.</p>
          </header>

          {unavailable ? (
            <section className={styles.empty} aria-labelledby="writing-unavailable-title">
              <h2 id="writing-unavailable-title">Writing is temporarily unavailable.</h2>
              <p>The articles couldn’t load. You can try again or explore the case studies.</p>
              <div className={styles.actions}>
                <a href="/blog">Try again <span aria-hidden="true">↗</span></a>
                <Link href="/product">Explore my work <span aria-hidden="true">↗</span></Link>
              </div>
            </section>
          ) : items.length === 0 ? (
            <section className={styles.empty} aria-labelledby="writing-empty-title">
              <h2 id="writing-empty-title">No essays to read here yet.</h2>
              <p>For now, my case studies share the thinking behind the work.</p>
              <Link href="/product">Explore my work <span aria-hidden="true">↗</span></Link>
            </section>
          ) : (
            <div className={styles.essays}>
              {items.map((post) => {
                const excerpt = contentExcerpt(post.summary || post.body_markdown, 260);
                const href = `/blog/${encodeURIComponent(post.slug || post.id)}`;
                return (
                  <article key={post.id} className={styles.essay}>
                    <time dateTime={new Date(post.created_at).toISOString()}>
                      {new Date(post.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                    </time>
                    <Link href={href} className={styles.titleLink}>
                      <h2>{post.title} <span aria-hidden="true">↗</span></h2>
                    </Link>
                    {excerpt && <p>{excerpt}</p>}
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
