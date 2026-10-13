import type { Metadata } from 'next';
import Link from 'next/link';
import { findCaseStudy } from '@/lib/work';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import Media from '@/components/work/Media';
import WorkPreview from '@/components/work/WorkPreview';
import { getPrimaryMedia } from '@/lib/work-presentation';
import CvDownload from '@/components/CvDownload';
import BrandMarks from '@/components/BrandMarks';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Priyam Sameer — AI + Business Leadership' },
  description: 'AI product thinking and business ownership. Explore original prototypes, crop-health AI, lending MCP architecture and commercial outcomes from Priyam Sameer’s work.',
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
  { name: 'CredFlow', period: '2024–2025', role: 'Senior Product Manager', id: 'credflow' },
  { name: 'CashKaro / BankKaro', period: '2025–Present', role: 'Senior Manager → General Manager', id: 'cashkaro' },
];

export default function HomePage() {
  const prototype = findCaseStudy('cashkaro-eduloans-policy-workflow');
  const heroMedia = prototype ? getPrimaryMedia(prototype)[0] : undefined;
  const previews = ['absolute-crop-health-ai', 'cashkaro-lending-mcp-feedback', 'cashkaro-college-money-education-loans'];
  return <PublicShell>
    <Header />
    <main id="main-content">
      <section className={styles.hero} aria-labelledby="intro-title">
        <div className={styles.heroCopy}>
          <p className={styles.label}>Priyam Sameer · AI + business leadership</p>
          <h1 id="intro-title">AI product thinking.<br /><em>Business ownership.</em></h1>
          <p className={styles.intro}>I build lending, marketplace and agritech products—with AI-assisted workflows, deliberate decision systems and clear business ownership.</p>
          <div className={styles.actions}>
            <Link href="/product" className="ink-button">Explore my work <span aria-hidden="true">↗</span></Link>
            <CvDownload className={styles.download} />
          </div>
          <p className={styles.current}><span>Currently</span> General Manager, Product Management &amp; Business Growth<br />CashKaro / BankKaro</p>
        </div>
        {heroMedia && <div className={styles.heroEvidence}>
          <div className={styles.prototypeHeading}><span>EduLoans</span><span>Working interaction prototype</span></div>
          <Media media={heroMedia} priority compact />
          <p className={styles.heroDecision}>AI-assisted delivery. Deterministic lender rules. Human verification before policy matching.</p>
          <Link href="/product/cashkaro-eduloans-policy-workflow" className="ink-link">Full case study <span aria-hidden="true">↗</span></Link>
        </div>}
      </section>

      <section className={styles.section} aria-labelledby="work-title">
        <div className={styles.sectionHeader}><div><p className={styles.label}>The work, up close</p><h2 id="work-title">AI judgment. Real-world stakes.</h2></div><Link href="/product" className="ink-link">All 25 projects <span aria-hidden="true">↗</span></Link></div>
        {previews.map(slug => { const study = findCaseStudy(slug); return study ? <WorkPreview key={study.id} study={study} /> : null; })}
      </section>

      <section className={styles.section} aria-labelledby="impact-title">
        <div className={styles.sectionHeader}><div><p className={styles.label}>Commercial ownership</p><h2 id="impact-title">The business behind the product.</h2></div></div>
        <div className={styles.selectedWork}>{selected.map(proof => {
          const study = findCaseStudy(proof.slug);
          if (!study) return null;
          return <article key={study.id} className={styles.workItem}>
            <p className={styles.domain}>{proof.domain}</p>
            <p className={styles.proofValue}>{proof.value}</p>
            <p className={styles.proofMeasure}>{proof.measure}</p>
            <p className={styles.proofNote}>{proof.note}</p>
            <Link href={`/product/${encodeURIComponent(study.slug)}`} className="ink-link">{study.visualSummary?.title || study.title} <span aria-hidden="true">↗</span></Link>
          </article>;
        })}</div>
      </section>

      <section className={styles.section} aria-labelledby="career-title">
        <div className={styles.sectionHeader}><div><p className={styles.label}>From founder to product leader</p><h2 id="career-title">A growing scope.</h2></div><Link href="/cv" className="ink-link">View experience <span aria-hidden="true">→</span></Link></div>
        <ol className={styles.career}>{career.map(item => <li key={item.id}>
          <p className={styles.careerDate}>{item.period}</p><h3>{item.name}</h3><p className={styles.careerRole}>{item.role}</p>
        </li>)}</ol>
      </section>

      <section className={`${styles.section} ${styles.personal}`} aria-labelledby="interests-title">
        <div>
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
    </main>
    <Footer />
  </PublicShell>;
}
