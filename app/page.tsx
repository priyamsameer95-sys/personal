import type { Metadata } from 'next';
import Link from 'next/link';
import { findCaseStudy } from '@/lib/work';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import PeelReveal from '@/components/PeelReveal';
import CvDownload from '@/components/CvDownload';
import BrandMarks from '@/components/BrandMarks';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Priyam Sameer — Product Leadership' },
  description: 'Product leadership across lending, marketplaces and agritech. Explore Priyam Sameer’s decisions, supported results, career and painting practice.',
  openGraph: { title: 'Priyam Sameer — Product Leadership', description: 'From strategy to scale. My product decisions, work and experience.' },
  twitter: { title: 'Priyam Sameer — Product Leadership', description: 'From strategy to scale. My product decisions, work and experience.' },
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
  return <PublicShell>
    <Header />
    <main id="main-content">
      <section className={styles.hero} aria-labelledby="intro-title">
        <div>
          <p className={styles.label}>Priyam Sameer · Product leader</p>
          <h1 id="intro-title">Product leadership.<br /><em>From strategy<br className={styles.heroBreak} /> to scale.</em></h1>
          <p className={styles.intro}>I build lending, marketplace and agritech products—and the operations that make them work.</p>
          <div className={styles.actions}>
            <Link href="/product" className="ink-button">Explore my work <span aria-hidden="true">↗</span></Link>
            <CvDownload className={styles.download} />
          </div>
          <p className={styles.current}><span>Currently</span> General Manager, Product Management &amp; Business Growth<br />CashKaro / BankKaro</p>
        </div>
        <div className={styles.heroArtwork}><PeelReveal /></div>
      </section>

      <section className={styles.section} aria-labelledby="work-title">
        <div className={styles.sectionHeader}><div><p className={styles.label}>Decisions, delivery and impact</p><h2 id="work-title">Selected work.</h2></div><Link href="/product" className="ink-link">Explore all work <span aria-hidden="true">↗</span></Link></div>
        <div className={styles.selectedWork}>{selected.map(proof => {
          const study = findCaseStudy(proof.slug);
          if (!study) return null;
          return <article key={study.id} className={styles.workItem}>
            <p className={styles.domain}>{proof.domain}</p>
            <BrandMarks companyId={study.companyId} small className={styles.workBrands} />
            <h3>{study.visualSummary?.title || study.title}</h3>
            <p className={styles.workSummary}>{study.visualSummary?.summary || study.summary}</p>
            <div className={styles.proof}><p className={styles.proofValue}>{proof.value}</p><p className={styles.proofMeasure}>{proof.measure}</p><p className={styles.proofNote}>{proof.note}</p></div>
            <Link href={`/product/${encodeURIComponent(study.slug)}`} className="ink-link">Read case study <span aria-hidden="true">→</span><span className="sr-only">: {study.visualSummary?.title || study.title}</span></Link>
          </article>;
        })}</div>
      </section>

      <section className={styles.section} aria-labelledby="career-title">
        <div className={styles.sectionHeader}><div><p className={styles.label}>From founder to product leader</p><h2 id="career-title">A growing scope.</h2></div><Link href="/cv" className="ink-link">View experience <span aria-hidden="true">→</span></Link></div>
        <ol className={styles.career}>{career.map(item => <li key={item.id}>
          <p className={styles.careerDate}>{item.period}</p><h3>{item.name}</h3><p className={styles.careerRole}>{item.role}</p><Link href={`/cv#${item.id}`} className="ink-link">View role <span aria-hidden="true">↗</span><span className="sr-only">: {item.name}</span></Link>
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
