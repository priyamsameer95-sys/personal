import type { Metadata } from 'next';
import { groupCaseStudies } from '@/lib/work';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import WorkExplorer from '@/components/work/WorkExplorer';
import explorerStyles from '@/components/work/work-explorer.module.css';

export const metadata: Metadata = {
  title: 'Selected Work',
  description: 'Eight selected projects: College.money, lending MCP design, lender integrations, EduLoans, RiskStac, SilkRoute, crop-health AI and UrbanKhet. See the product, personal decisions and qualified outcomes.',
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
        <h1>Selected work.</h1>
        <p>Eight selected projects across lending, AI, agricultural data and commerce.</p>
      </header>
      <WorkExplorer groups={groups} />
    </main>
    <Footer />
  </PublicShell>;
}
