import type { Metadata } from 'next';
import { groupCaseStudies } from '@/lib/work';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import WorkExplorer from '@/components/work/WorkExplorer';
import explorerStyles from '@/components/work/work-explorer.module.css';

export const metadata: Metadata = {
  title: 'Selected Work',
  description: 'Choose a product problem: lending journeys, partner platforms, applied AI or operating a business. Eight cases explain Priyam’s responsibility, decisions and what followed.',
  openGraph: { title: 'Selected Work — Priyam Sameer', description: 'Lending journeys, shared policy systems and agricultural products, with visible evidence and personal ownership.' },
  twitter: { title: 'Selected Work — Priyam Sameer', description: 'Lending journeys, shared policy systems and agricultural products, with visible evidence and personal ownership.' },
};

export const revalidate = 0;

export default function ProductWorkPage() {
  const groups = groupCaseStudies().map(({ company, studies }) => ({
    company,
    studies: studies.map(({ id, slug, companyId, title, summary, role, period, workType, visualSummary, media, heroMediaId, primaryMediaIds, featuredOrder, outcomes }) => ({
      id, slug, companyId, title, summary, role, period, workType, visualSummary, media, heroMediaId, primaryMediaIds, featuredOrder, outcomes,
    })),
  }));
  return <PublicShell>
    <Header />
    <main id="main-content" className="animate-fade-in-up">
      <header className={explorerStyles.pageIntro}>
        <h1>The decisions behind the products.</h1>
        <p>Lending, marketplaces and agricultural products. Each case follows a problem, the decisions I contributed to and what happened next. Start with the problem closest to yours.</p>
      </header>
      <WorkExplorer groups={groups} />
    </main>
    <Footer />
  </PublicShell>;
}
