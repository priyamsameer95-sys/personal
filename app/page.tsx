import type { Metadata } from 'next';
import Link from 'next/link';
import { findCaseStudy } from '@/lib/work';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import WorkPreview from '@/components/work/WorkPreview';
import HomeMotion from '@/components/HomeMotion';
import CvDownload from '@/components/CvDownload';
import BrandMarks from '@/components/BrandMarks';
import { CompanyDescription } from '@/components/CompanyContext';
import { getCompanyContext } from '@/lib/company-context';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Priyam Sameer — AI + Business Leadership' },
  description: 'AI product thinking and business ownership. Selected work across education lending, lender integrations, MCP architecture, agricultural data and commodity marketplaces. View Priyam Sameer’s CV and product evidence.',
  openGraph: { title: 'Priyam Sameer — AI + Business Leadership', description: 'AI product thinking. Business ownership. Interfaces, decisions and evidence from my work.' },
  twitter: { title: 'Priyam Sameer — AI + Business Leadership', description: 'AI product thinking. Business ownership. Interfaces, decisions and evidence from my work.' },
};

const selected = [
  { slug: 'cashkaro-personal-loan-marketplace', domain: 'Lending', value: '16% → 45%', measure: 'Reported funnel conversion', note: 'Programme report; funnel events and comparison cohorts unavailable.' },
  { slug: 'absolute-silkroute-marketplace', domain: 'Commodity trading', value: '$100M', measure: 'Reported GMV in nine months', note: 'Transaction value, not revenue. Source cohorts vary.' },
  { slug: 'absolute-upaj-farmer-experience', domain: 'Farmer products', value: '100K → 600K', measure: 'Reported active users', note: 'Programme report; cohort definition and comparison period unavailable.' },
];
const career = [
  { name: 'UrbanKhet', period: '2019–2021', role: 'Founder & Director', id: 'urbankhet' },
  { name: 'Absolute / Upaj', period: '2021–2024', role: 'Product Manager → Principal PM', id: 'absolute' },
  { name: 'CashKaro / BankKaro', period: '2025–Present', role: 'Senior Manager → General Manager', id: 'cashkaro' },
];

export default function HomePage() {
  const previews = ['cashkaro-college-money-education-loans', 'cashkaro-lending-mcp-feedback', 'absolute-crop-health-ai'];
  return <PublicShell>
    <Header />
    <main id="main-content">
      <HomeMotion>
      <section className={styles.hero} aria-labelledby="intro-title">
        <div className={styles.heroCopy} data-entry="first">
          <p className={styles.label}>Priyam Sameer · AI + business leadership</p>
          <h1 id="intro-title">AI product thinking.<br /><em>Business ownership.</em></h1>
          <p className={styles.intro}>I build lending, marketplace and agritech products—with AI-assisted workflows, deliberate decision systems and clear business ownership.</p>
          <div className={styles.actions}>
            <Link href="/product" className="ink-button">Explore my work <span aria-hidden="true">↗</span></Link>
            <CvDownload className={styles.download} />
          </div>
        </div>
          <div className={styles.current} data-entry="second">
            <p className={styles.currentLabel}>Current role</p>
            <p className={styles.currentTitle}>General Manager</p>
            <p>Product Management &amp; Business Growth</p>
            <Link href="/cv#cashkaro">CashKaro / BankKaro <span aria-hidden="true">↗</span></Link>
          </div>
      </section>

      <section className={styles.section} aria-labelledby="work-title">
        <div className={styles.sectionHeader} data-reveal=""><div><p className={styles.label}>Selected work</p><h2 id="work-title">Decisions worth looking at.</h2></div><Link href="/product" className="ink-link">Explore selected work <span aria-hidden="true">↗</span></Link></div>
        {previews.map(slug => { const study = findCaseStudy(slug); return study ? <WorkPreview key={study.id} study={study} reveal /> : null; })}
      </section>

      <section className={styles.section} aria-labelledby="impact-title">
        <div className={styles.sectionHeader} data-reveal=""><div><p className={styles.label}>Commercial ownership</p><h2 id="impact-title">The business behind the product.</h2></div></div>
        <div className={styles.selectedWork}>{selected.map(proof => {
          const study = findCaseStudy(proof.slug);
          if (!study) return null;
          return <article key={study.id} className={styles.workItem} data-reveal="">
            <p className={styles.domain}>{proof.domain}</p>
            <p className={styles.proofValue}>{proof.value}</p>
            <p className={styles.proofMeasure}>{proof.measure}</p>
            <p className={styles.proofNote}>{proof.note}</p>
            <Link href={`/product/${encodeURIComponent(study.slug)}`} className="ink-link">{study.visualSummary?.title || study.title} <span aria-hidden="true">↗</span></Link>
          </article>;
        })}</div>
      </section>

      <section className={styles.section} aria-labelledby="career-title">
        <div className={styles.sectionHeader} data-reveal=""><div><p className={styles.label}>Career at a glance</p><h2 id="career-title">From founder to product leader.</h2></div><Link href="/cv" className="ink-link">View CV <span aria-hidden="true">→</span></Link></div>
        <ol className={styles.career}>{career.map(item => {
          const company = getCompanyContext(item.id);
          return <li key={item.id} data-reveal="">
            <p className={styles.careerDate}>{item.period}</p>
            <BrandMarks companyId={item.id} className={styles.careerBrands} />
            <h3>{item.name}</h3>
            {company && <CompanyDescription company={company} className={styles.careerAbout} />}
            {company && !company.abstract && <p className={styles.careerScale}>20M users reported in 2023. Backed by Ratan Tata, Kalaari and Affle.</p>}
            <div className={styles.careerWebsites}>{company?.websites.map(website => <a key={website.href} href={website.href} target="_blank" rel="noopener noreferrer">{website.label} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>)}</div>
            <p className={styles.careerRole}><span>My role</span>{item.role}</p>
          </li>;
        })}</ol>
      </section>

      <section className={`${styles.section} ${styles.personal}`} aria-labelledby="interests-title">
        <div data-reveal="">
          <p className={styles.label}>Beyond product</p>
          <h2 id="interests-title">A little colour.<br /><em>A wider perspective.</em></h2>
          <p>I paint alongside my product work. At CEPT, I studied construction technology and captained FC Sparta.</p>
          <BrandMarks companyId="cept" small />
          <div className={styles.personalLinks}><Link href="/art" className="ink-link">Explore my paintings <span aria-hidden="true">↗</span></Link><Link href="/blog" className="ink-link">Writing <span aria-hidden="true">↗</span></Link></div>
        </div>
        <Link href="/art#public-compass" className={styles.painting}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/priyam/public-compass-preview.webp" alt="Public Compass, my oil painting in red, green and gold" width={1000} height={879} loading="lazy" />
          <span>Public Compass · Oil on canvas <span aria-hidden="true">↗</span></span>
        </Link>
      </section>
      </HomeMotion>
    </main>
    <Footer />
  </PublicShell>;
}
