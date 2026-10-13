import type { Metadata } from 'next';
import Link from 'next/link';
import { contentExcerpt } from '@/lib/content';
import { groupCaseStudies, loadPublishedWork } from '@/lib/work';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import WorkExplorer from '@/components/work/WorkExplorer';
import explorerStyles from '@/components/work/work-explorer.module.css';

export const metadata: Metadata = {
  title: 'Work',
  description: 'Explore Priyam Sameer’s product decisions, leadership remit and impact across CashKaro, CredFlow, Absolute and UrbanKhet, with additional community and independent work.',
  openGraph: { title: 'Work — Priyam Sameer', description: 'Product decisions, leadership remit and impact across lending, marketplaces and agritech.' },
  twitter: { title: 'Work — Priyam Sameer', description: 'Product decisions, leadership remit and impact across lending, marketplaces and agritech.' },
};

export const revalidate = 0;

export default async function ProductWorkPage() {
  const groups = groupCaseStudies().map(({ company, studies }) => ({
    company,
    studies: studies.map(({ id, slug, title, summary, role, period, workType, visualSummary, media, heroMediaId, outcomes }) => ({
      id, slug, title, summary, role, period, workType, visualSummary, media, heroMediaId, outcomes,
    })),
  }));
  const additionalWork = await loadPublishedWork();

  return (
    <PublicShell>
      <Header />
      <main id="main-content" className="animate-fade-in-up">
        <header className={explorerStyles.pageIntro}>
          <h1>My work.</h1>
          <p>Lending, marketplaces and agritech. Explore the decisions, the delivery and the evidence behind each product.</p>
        </header>
        <WorkExplorer groups={groups} />
        {additionalWork.length > 0 && (
          <section className={explorerStyles.additionalSection} aria-labelledby="additional-work-title">
            <h2 id="additional-work-title">Additional product work</h2>
            <div className={explorerStyles.additionalGrid}>
              {additionalWork.map(item => {
                const image = item.media.find(media => media.kind === 'image');
                return (
                  <article key={item.id} className={explorerStyles.card}>
                    <h3>{item.title}</h3>
                    <p className={explorerStyles.cardSummary}>{contentExcerpt(item.summary || item.body_markdown, 180)}</p>
                    {image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className={explorerStyles.additionalImage} src={image.blob_url} alt={image.alt_text || item.title} loading="lazy" />
                    )}
                    <Link className={explorerStyles.readCase} href={`/product/${encodeURIComponent(item.slug || item.id)}`}>Read case study <span aria-hidden="true">→</span><span className={explorerStyles.visuallyHidden}>: {item.title}</span></Link>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </PublicShell>
  );
}
