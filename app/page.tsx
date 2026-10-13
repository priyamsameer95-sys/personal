import type { Metadata } from 'next';
import Link from 'next/link';
import { findCaseStudy } from '@/lib/work';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import PeelReveal from '@/components/PeelReveal';
import CvDownload from '@/components/CvDownload';
import { Chart } from '@/components/work/VisualStory';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Priyam Sameer — Product Leadership' },
  description: 'Priyam Sameer: product leadership across lending, marketplaces and agritech. Explore visual case studies, experience and the downloadable CV.',
  openGraph: { title: 'Priyam Sameer — Product Leadership', description: 'From strategy to scale. Explore my product decisions, work and experience.' },
  twitter: { title: 'Priyam Sameer — Product Leadership', description: 'From strategy to scale. Explore my product decisions, work and experience.' },
};

const selectedSlugs = ['cashkaro-personal-loan-marketplace', 'absolute-silkroute-marketplace', 'absolute-upaj-farmer-experience'];
const productLoop = [
  { title: 'Understand', detail: 'Customer needs + business economics' },
  { title: 'Choose', detail: 'Priorities + trade-offs' },
  { title: 'Deliver', detail: 'Product + partners + operations' },
  { title: 'Learn', detail: 'Funnel data + feedback' },
];
const career = [
  { name: 'UrbanKhet', period: '2019–2021', role: 'Founder & Director', id: 'urbankhet' },
  { name: 'Absolute / Upaj', period: '2021–2024', role: 'PM → Principal PM', id: 'absolute' },
  { name: 'CredFlow', period: '2024–2025', role: 'Senior Product Manager', id: 'credflow' },
  { name: 'CashKaro / BankKaro', period: '2025–Present', role: 'Senior Manager → General Manager', id: 'cashkaro' },
];

export default function HomePage() {
  const selectedWork = selectedSlugs.flatMap(slug => {
    const study = findCaseStudy(slug);
    return study ? [study] : [];
  });

  return <PublicShell>
    <Header />
    <main id="main-content">
      <section className={styles.hero} aria-labelledby="intro-title">
        <div>
          <p className={styles.label}>Priyam Sameer · Product leader</p>
          <h1 id="intro-title">Product leadership.<br />From strategy to scale.</h1>
          <p className={styles.intro}>I build lending, marketplace and agritech products—and the operations behind them.</p>
          <div className={styles.actions}>
            <Link href="/product" className="ink-button">Explore my work <span aria-hidden="true">↗</span></Link>
            <CvDownload className={styles.download} />
          </div>
          <p className={styles.current}>General Manager, Product &amp; Business Growth<br />CashKaro / BankKaro</p>
        </div>
        <figure className={styles.productLoop}>
          <figcaption>How I move a product forward</figcaption>
          <ol>{productLoop.map((step, index) => <li key={step.title}>
            <span className={styles.stepNumber} aria-hidden="true">0{index + 1}</span>
            <div><h2>{step.title}</h2><p>{step.detail}</p></div>
            {index < productLoop.length - 1 && <span className={styles.loopArrow} aria-hidden="true">↓</span>}
          </li>)}</ol>
        </figure>
      </section>

      <section className={styles.section} aria-labelledby="work-title">
        <div className={styles.sectionHeader}><div><p className={styles.label}>Selected work</p><h2 id="work-title">Three problems. Three product stories.</h2></div><Link href="/product">All work <span aria-hidden="true">↗</span></Link></div>
        <div className={styles.selectedWork}>{selectedWork.map(study => {
          const visual = study.visualSummary;
          const href = `/product/${encodeURIComponent(study.slug)}`;
          return <article key={study.id} className={styles.workItem}>
            <div className={styles.workCopy}>
              <p className={styles.label}>{study.companyId === 'cashkaro' ? 'CashKaro / BankKaro' : 'Absolute / Upaj'}</p>
              <h3>{visual?.title || study.title}</h3>
              <p>{visual?.summary || study.summary}</p>
              <Link href={href}>Read case study <span aria-hidden="true">→</span></Link>
            </div>
            <div className={styles.workVisual}>{visual?.charts?.[0] ? <Chart chart={visual.charts[0]} compact /> : <p>{visual?.impact || study.executiveBrief.impact}</p>}</div>
          </article>;
        })}</div>
      </section>

      <section className={styles.section} aria-labelledby="career-title">
        <div className={styles.sectionHeader}><div><p className={styles.label}>Experience</p><h2 id="career-title">Founder roots. Growing responsibility.</h2></div><Link href="/cv">Full experience <span aria-hidden="true">→</span></Link></div>
        <ol className={styles.career}>{career.map(item => <li key={item.id}>
          <span className={styles.careerDot} aria-hidden="true" /><p>{item.period}</p><h3>{item.name}</h3><p className={styles.careerRole}>{item.role}</p><Link href={`/cv#${item.id}`}>Explore role <span aria-hidden="true">↗</span></Link>
        </li>)}</ol>
      </section>

      <section className={`${styles.section} ${styles.personal}`} aria-labelledby="interests-title">
        <div><p className={styles.label}>Outside work</p><h2 id="interests-title">A little colour. A wider perspective.</h2><p>CEPT graduate. FC Sparta captain. A continuing painting practice.</p><div className={styles.personalLinks}><Link href="/art">Art <span aria-hidden="true">↗</span></Link><Link href="/blog">Writing <span aria-hidden="true">↗</span></Link></div></div>
        <PeelReveal />
      </section>
    </main>
    <Footer />
  </PublicShell>;
}
