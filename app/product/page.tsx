import type { Metadata } from 'next';
import { groupCaseStudies } from '@/lib/work';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import WorkExplorer, { prepareWorkGroups } from '@/components/work/WorkExplorer';
import explorerStyles from '@/components/work/work-explorer.module.css';
import { breadcrumbs, pageMetadata, serializeJsonLd } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({ path: '/product', title: 'Product work at CashKaro, Absolute & UrbanKhet', description: 'Explore Priyam Sameer’s lending, AI review, agriculture and founder work: product decisions, personal responsibility and original visual evidence.' });

export const revalidate = 0;

export default function ProductWorkPage() {
  const groups = prepareWorkGroups(groupCaseStudies());
  return <PublicShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs([{ name: 'Home', path: '/' }, { name: 'Work', path: '/product' }])) }} />
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
