import type { Metadata } from 'next';
import { groupCaseStudies } from '@/lib/work';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import WorkExplorer, { prepareWorkGroups } from '@/components/work/WorkExplorer';
import explorerStyles from '@/components/work/work-explorer.module.css';

export const metadata: Metadata = {
  title: 'Selected Work',
  description: 'Product work at CashKaro, Absolute and UrbanKhet: lending journeys, AI review, partner APIs, agriculture and founder operations. Decisions, visual evidence and direct product references.',
  openGraph: { title: 'Selected Work — Priyam Sameer', description: 'Lending journeys, shared policy systems and agricultural products, with visible evidence and personal ownership.', images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Priyam Sameer — product leadership' }] },
  twitter: { card: 'summary_large_image', images: ['/twitter-image'], title: 'Selected Work — Priyam Sameer', description: 'Lending journeys, shared policy systems and agricultural products, with visible evidence and personal ownership.' },
};

export const revalidate = 0;

export default function ProductWorkPage() {
  const groups = prepareWorkGroups(groupCaseStudies());
  return <PublicShell>
    <Header />
    <main id="main-content">
      <header className={explorerStyles.pageIntro}>
        <h1>Selected work.</h1>
        <p>Lending, agriculture and founder work.</p>
      </header>
      <WorkExplorer groups={groups} />
    </main>
    <Footer />
  </PublicShell>;
}
