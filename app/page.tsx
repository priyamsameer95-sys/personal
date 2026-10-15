import Icon from '@/components/Icon';
import type { Metadata } from 'next';
import Link from 'next/link';
import { findCaseStudy } from '@/lib/work';
import type { CaseStudyMedia } from '@/lib/work-types';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import Media from '@/components/work/Media';
import HomeMotion from '@/components/HomeMotion';
import BrandMarks from '@/components/BrandMarks';
import styles from './home.module.css';

const description = 'From founding UrbanKhet to leading lending products at CashKaro. Explore Priyam Sameer’s product work, decisions, prototypes and paintings.';
export const metadata: Metadata = {
  title: { absolute: 'Priyam Sameer — Product leader & founder' }, description,
  openGraph: { title: 'Priyam Sameer — Product leader & founder', description, images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Priyam Sameer — product leadership' }] },
  twitter: { card: 'summary_large_image', images: ['/twitter-image'], title: 'Priyam Sameer — Product leader & founder', description },
};
function asset(slug: string, id: string): CaseStudyMedia | undefined {
  return findCaseStudy(slug)?.media.find(media => media.id === id);
}

export default function HomePage() {
  const college = asset('cashkaro-college-money-education-loans', 'college-money-abroad-hero-final');
  const crop = asset('absolute-crop-health-ai', 'upaj-growstac-advisory');
  const storefront = asset('urbankhet-farm-to-fork', 'urbankhet-storefront-excerpt');
  const prototype = asset('cashkaro-eduloans-policy-workflow', 'eduloans-prototype-inspector');
  const mcp = asset('cashkaro-lending-mcp-feedback', 'lending-mcp-proposal');
  return <PublicShell>
    <Header wordmarkOnly />
    <main id="main-content"><HomeMotion>
      <section className={styles.hero} aria-labelledby="intro-title">
        <div className={styles.introduction}>
          <h1 id="intro-title" data-entry>From fresh produce<br />to lending products.</h1>
          <p>I’m General Manager at CashKaro, leading lending products, partnerships and P&amp;L. I founded UrbanKhet.</p>
          <a href="#selected-work" className={styles.workAction}>Explore my work <span aria-hidden="true"><Icon name="arrow-down" /></span></a>
        </div>
        <figure className={styles.personalArt}>
          <Link href="/art#tumult" className={styles.painting} aria-label="View Tumult and my paintings">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/art/priyam/tumult-preview.webp" alt="Tumult — my painting in yellow, teal and black" width={785} height={1000} loading="eager" decoding="async" />
          </Link>
          <figcaption>I also paint. <Link href="/art#tumult">Tumult</Link>.</figcaption>
        </figure>
        <p className={styles.location}>Based in Bengaluru.</p>
      </section>

      <section id="selected-work" tabIndex={-1} className={styles.selected} aria-labelledby="selected-work-title">
        <header className={styles.sectionHeader}><h2 id="selected-work-title">Selected work</h2><Link href="/product" className="ink-link">All selected work <span aria-hidden="true"><Icon name="arrow-up-right" /></span></Link></header>
        <nav className={styles.workPaths} aria-label="Work by context">
          <a href="#home-lending">Lending &amp; AI workflows</a>
          <a href="#home-agriculture">Agriculture</a>
          <a href="#home-founder">Founder work</a>
        </nav>
        <article id="home-lending" tabIndex={-1} className={`${styles.projectCard} ${styles.collegeCard}`} aria-labelledby="college-title">
          <div className={styles.account}>
            <div className={styles.projectMeta}><BrandMarks companyId="cashkaro" small /><span>Delivered work</span></div><h3 id="college-title">College.money</h3>
            <p className={styles.decision}>Prepare a case a lender can assess.</p>
            <p>I connected student information, documents, pre-checks and routing. I owned the lending journey, partner commercials and operations.</p>
            <Link href="/product/cashkaro-college-money-education-loans" className={styles.caseLink}>Read the case <span aria-hidden="true"><Icon name="arrow-up-right" /></span></Link>
          </div>
          <div className={styles.collegeEvidence}>{college && <Media media={{ ...college, caption: 'Public student-loan entry point.' }} compact />}</div>
        </article>
        <div className={styles.experimentPair}>
          <article className={`${styles.projectCard} ${styles.prototypeCard}`} aria-labelledby="prototype-title">
            <header className={styles.projectHeading}><p>Interaction prototype</p><h3 id="prototype-title">EduLoans reviewer workspace</h3></header>
            <p className={styles.decision}>Missing policy must stay visible.</p>
            <p>I authored the rule model and review journeys. Unconfirmed thresholds remain release restrictions; uncertain documents require human verification. It uses sample records and scripted responses.</p>
            {prototype && <Media media={prototype} compact />}
            <Link href="/product/cashkaro-eduloans-policy-workflow" className={styles.caseLink}>Inspect the prototype <span aria-hidden="true"><Icon name="arrow-up-right" /></span></Link>
          </article>
          <article className={`${styles.projectCard} ${styles.mcpCard}`} aria-labelledby="mcp-title">
            <header className={styles.projectHeading}><p>Design proposal</p><h3 id="mcp-title">Lending policy through MCP</h3></header>
            <p className={styles.decision}>Separate evaluation from policy changes.</p>
            <p>I proposed shared, versioned evaluation for two rule engines. Feedback enters review; policy changes require separate approval. A conventional service API remains an alternative.</p>
            {mcp && <Media media={mcp} compact />}
            <Link href="/product/cashkaro-lending-mcp-feedback" className={styles.caseLink}>Read the proposed design <span aria-hidden="true"><Icon name="arrow-up-right" /></span></Link>
          </article>
        </div>

        <div className={styles.companyPair}>
          <article id="home-agriculture" tabIndex={-1} className={`${styles.projectCard} ${styles.absoluteCard}`} aria-labelledby="crop-title">
            <header className={styles.projectHeading}><BrandMarks companyId="absolute" small /><h3 id="crop-title">Crop-health AI</h3><p>Product delivery at Absolute, 2021–2024</p></header>
            <div className={styles.cropEvidence}>{crop && <Media media={{ ...crop, caption: 'GrowStac’s current page; not the historical diagnosis interface.' }} compact />}</div>
            <div className={styles.account}>
              <p className={styles.decision}>Capture offline. Diagnose after reconnection.</p>
              <p>I worked with engineering, modelling and agronomy to separate field capture from network availability.</p>
              <Link href="/product/absolute-crop-health-ai" className={styles.caseLink}>Read the case <span aria-hidden="true"><Icon name="arrow-up-right" /></span></Link>
            </div>
          </article>
          <article id="home-founder" tabIndex={-1} className={`${styles.projectCard} ${styles.urbanCard}`} aria-labelledby="urban-title">
            <header className={styles.projectHeading}><BrandMarks companyId="urbankhet" small /><h3 id="urban-title">UrbanKhet</h3><p>My founder venture, 2019–2021</p></header>
            <div className={styles.urbanContent}>
              <div className={styles.account}>
                <p className={styles.decision}>From terrace farming to direct produce supply.</p>
                <p>I built household subscriptions and business supply around sourcing and delivery, owning the customer offer, operation and P&amp;L.</p>
                <Link href="/product/urbankhet-farm-to-fork" className={styles.caseLink}>Read the case <span aria-hidden="true"><Icon name="arrow-up-right" /></span></Link>
              </div>
              <div className={styles.storefront}>{storefront && <Media media={{ ...storefront, caption: 'Original storefront walkthrough.', provenance: { kind: 'historical', label: 'Silent recording; date unrecorded.' } }} compact />}</div>
            </div>
          </article>
        </div>
        <aside className={styles.tradeNote}>
          <div><h3>SilkRoute commodity trading</h3><p>I connected discovery and negotiation with ordering, payments and trade operations at Absolute.</p></div>
          <p className={styles.tradeResult}><strong>$100M GMV</strong><span>Programme-reported scale in nine months.</span></p>
          <Link href="/product/absolute-silkroute-marketplace" className={styles.caseLink}>Explore SilkRoute <span aria-hidden="true"><Icon name="arrow-up-right" /></span></Link>
        </aside>
      </section>

      <div className={styles.experienceBridge}>
        <p>Full career, responsibilities, education and certifications.</p>
        <Link href="/cv" className={styles.caseLink}>View experience <span aria-hidden="true"><Icon name="arrow-up-right" /></span></Link>
      </div>
    </HomeMotion></main>
    <Footer />
  </PublicShell>;
}
