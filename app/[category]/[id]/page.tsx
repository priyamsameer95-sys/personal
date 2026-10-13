import type { Metadata } from 'next';
import { publicDb as db } from '@/lib/db';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import MarkdownContent from '@/components/MarkdownContent';
import CaseStudy from '@/components/work/CaseStudy';
import Media from '@/components/work/Media';
import { findCaseStudy, findWorkCompany, isRetiredWorkSlug } from '@/lib/work';
import { contentExcerpt } from '@/lib/content';

interface ContentItem {
  id: string;
  title: string;
  summary: string | null;
  body_markdown: string | null;
  created_at: string;
  media: Array<{ blob_url: string; kind: string; alt_text: string | null; width: number | null; height: number | null }>;
}

interface DetailPageProps {
  params: { category: string; id: string };
}

const categories = {
  art: { type: 'art', label: 'art', heading: 'Painting' },
  product: { type: 'work', label: 'work', heading: 'Case study' },
  blog: { type: 'blog', label: 'writing', heading: 'Essay' },
};

export const revalidate = 0;

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  if (params.category === 'product' && isRetiredWorkSlug(params.id)) return {};
  const study = params.category === 'product' ? findCaseStudy(params.id) : undefined;
  if (!study) {
    if (!Object.prototype.hasOwnProperty.call(categories, params.category)) return {};
    const section = categories[params.category as keyof typeof categories];
    const fallback: Metadata = { title: section.heading };
    if (!process.env.POSTGRES_URL) return fallback;
    try {
      const { rows } = await db`
        SELECT title, summary, body_markdown
        FROM content_items
        WHERE type = ${section.type} AND status = 'published'
          AND (id::text = ${params.id} OR slug = ${params.id})
        LIMIT 1
      `;
      const item = rows[0] as Pick<ContentItem, 'title' | 'summary' | 'body_markdown'> | undefined;
      if (!item) return fallback;
      const description = contentExcerpt(item.summary || item.body_markdown, 180);
      return {
        title: item.title,
        description,
        openGraph: { title: `${item.title} — Priyam Sameer`, description, type: 'article' },
      };
    } catch { return fallback; }
  }
  const company = findWorkCompany(study.companyId);
  return {
    title: `${study.title}${company ? ` — ${company.name}` : ''}`,
    description: study.summary,
    alternates: { canonical: `/product/${study.slug}` },
    openGraph: {
      title: `${study.title} — Priyam Sameer`,
      description: study.summary,
      type: 'article',
      url: `/product/${study.slug}`,
    },
  };
}

export default async function DetailPage({ params }: DetailPageProps) {
  const { category, id } = params;
  if (!Object.prototype.hasOwnProperty.call(categories, category)) notFound();
  const section = categories[category as keyof typeof categories];

  if (category === 'product') {
    if (isRetiredWorkSlug(id)) notFound();
    const study = findCaseStudy(id);
    if (study) {
      if (id !== study.slug) permanentRedirect(`/product/${encodeURIComponent(study.slug)}`);
      return (
        <PublicShell>
          <Header />
          <main id="main-content"><CaseStudy study={study} /></main>
          <Footer />
        </PublicShell>
      );
    }
  }

  if (!process.env.POSTGRES_URL) notFound();

  const { rows } = await db`
    SELECT
      ci.id, ci.title, ci.summary, ci.body_markdown, ci.created_at,
      COALESCE(
        json_agg(
          json_build_object('blob_url', ma.blob_url, 'kind', ma.kind, 'alt_text', ma.alt_text, 'width', ma.width, 'height', ma.height)
          ORDER BY ma.sort_order
        ) FILTER (WHERE ma.id IS NOT NULL),
        '[]'::json
      ) AS media
    FROM content_items ci
    LEFT JOIN media_assets ma ON ma.content_id = ci.id
    WHERE ci.type = ${section.type}
      AND ci.status = 'published'
      AND (ci.id::text = ${id} OR ci.slug = ${id})
    GROUP BY ci.id
    LIMIT 1
  `;
  const item = rows[0] as ContentItem | undefined;
  if (!item) notFound();

  const images = item.media.filter((media) => media.kind === 'image');
  const firstImage = images[0];
  const date = new Date(item.created_at);
  const contact = category === 'art'
    ? { heading: 'Talk about this painting', copy: 'Get in touch to ask about the painting or share what it brings to mind.', action: 'Contact Priyam about the painting' }
    : category === 'blog'
      ? { heading: 'Continue the conversation', copy: 'Get in touch to discuss this essay or the ideas behind it.', action: 'Discuss this essay' }
      : { heading: 'Continue the conversation', copy: 'If this work connects with a product leadership opportunity, I would be glad to hear about it.', action: 'Contact Priyam' };

  return (
    <PublicShell>
        <Header />

        <main id="main-content">
          <Link href={`/${category}`} className="mb-8 inline-flex min-h-11 items-center gap-3 text-sm text-system-secondary transition-colors hover:text-system-accent no-underline">
            <span aria-hidden="true">←</span> All {section.label}
          </Link>

          <article className="mx-auto max-w-3xl">
            <header className="mb-10">
              <p className="mb-4 text-sm leading-relaxed text-system-secondary">
                {section.heading} · Published <time dateTime={date.toISOString()}>{date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</time>
              </p>
              <h1 className="font-sans text-4xl leading-tight tracking-tight text-system-primary sm:text-5xl">{item.title}</h1>
              {item.summary && <p className="mt-5 text-lg leading-relaxed text-system-secondary">{item.summary}</p>}
            </header>

            {firstImage && (
              <div className="mb-10">
                <Media media={{ id: 'legacy-hero', kind: 'image', src: firstImage.blob_url, alt: firstImage.alt_text || item.title, width: firstImage.width || undefined, height: firstImage.height || undefined, caption: '' }} priority />
              </div>
            )}

            {item.body_markdown && <MarkdownContent source={item.body_markdown} />}

            {images.length > 1 && (
              <div className="mt-10 grid gap-6">
                {images.slice(1).map((media, index) => (
                  <Media key={`${media.blob_url}-${index}`} media={{ id: `legacy-image-${index}`, kind: 'image', src: media.blob_url, alt: media.alt_text || `${item.title} — image ${index + 2}`, width: media.width || undefined, height: media.height || undefined, caption: '' }} />
                ))}
              </div>
            )}

            <div className="mt-12 border-t border-system-outline pt-6">
              <h2 className="text-xl font-medium">{contact.heading}</h2>
              <p className="mt-3 leading-relaxed text-system-secondary">{contact.copy}</p>
              <a href={`mailto:Priyam.Sameer.95@gmail.com?subject=${encodeURIComponent(item.title)}`} className="mt-3 inline-flex min-h-11 items-center underline underline-offset-4">{contact.action} <span aria-hidden="true" className="ml-2">↗</span></a>
            </div>
          </article>
        </main>

        <Footer />
    </PublicShell>
  );
}
