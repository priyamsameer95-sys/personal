import type { Metadata } from 'next';
import Link from 'next/link';
import { findCaseStudy } from '@/lib/work';
import type { CaseStudyMedia } from '@/lib/work-types';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import Media from '@/components/work/Media';
import HomeMotion from '@/components/HomeMotion';
import CvDownload from '@/components/CvDownload';
import BrandMarks from '@/components/BrandMarks';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Priyam Sameer — Product Leader & Former Founder' },
  description: 'I lead lending products, lender partnerships and P&L at CashKaro. Explore my work across education loans, agricultural technology, marketplaces and UrbanKhet.',
  openGraph: { title: 'Priyam Sameer — Product Leader & Former Founder', description: 'Lending products, agricultural technology and a farm-to-customer business. The products, decisions and evidence behind my work.' },
  twitter: { title: 'Priyam Sameer — Product Leader & Former Founder', description: 'Lending products, agricultural technology and a farm-to-customer business. The products, decisions and evidence behind my work.' },
};

function asset(slug: string, id: string): CaseStudyMedia | undefined {
  return findCaseStudy(slug)?.media.find(media => media.id === id);
}

const programmeResults = [
  { slug: 'cashkaro-personal-loan-marketplace', name: 'Personal lending', value: '16% → 45%', measure: 'Reported funnel conversion', note: 'Programme-level result; funnel events and comparison cohorts were not supplied.' },
  { slug: 'absolute-silkroute-marketplace', name: 'SilkRoute trade', value: '$100M', measure: 'Reported GMV over nine months', note: 'Transaction value, not revenue or the effect of one feature.' },
  { slug: 'absolute-upaj-farmer-experience', name: 'Upaj farmer product', value: '100K → 600K', measure: 'Reported active users', note: 'Programme-level result; the cohort definition and comparison period were not supplied.' },
];
const career = [
  { name: 'UrbanKhet', period: '2019–2021', role: 'Founder & Director', id: 'urbankhet', scope: 'Product, sourcing, fulfilment and the operating business.' },
  { name: 'Absolute', period: '2021–2024', role: 'Product Manager → Principal PM', id: 'absolute', scope: 'Commodity trading, farmer products and agricultural risk.' },
  { name: 'CashKaro', period: '2025–Present', role: 'Senior Manager → General Manager', id: 'cashkaro', scope: 'Consumer and education lending, lender partnerships and P&L.' },
];

export default function HomePage() {
  const college = asset('cashkaro-college-money-education-loans', 'college-money-abroad-country-selector');
  const crop = asset('absolute-crop-health-ai', 'upaj-growstac-advisory');
  const farm = asset('urbankhet-farm-to-fork', 'urbankhet-linkedin-company-farm-cover');
  const prototype = asset('cashkaro-eduloans-policy-workflow', 'eduloans-prototype-inspector');
  const mcp = asset('cashkaro-lending-mcp-feedback', 'lending-mcp-proposal');
  return <PublicShell>
    <Header />
    <main id="main-content">
      <HomeMotion>
        <section className={styles.introduction} aria-labelledby="intro-title" data-entry="first">
          <div>
            <p className={styles.byline}>Priyam Sameer / Product leader &amp; former founder</p>
            <h1 id="intro-title">I build products and the business around them.</h1>
          </div>
          <div className={styles.introCopy}>
            <p>I lead lending products, lender partnerships and P&amp;L at CashKaro as General Manager. Before that: agricultural products at Absolute, and UrbanKhet, the farm-to-customer business I founded.</p>
            <div className={styles.actions}>
              <Link href="/product" className="ink-button">Explore my work <span aria-hidden="true">↗</span></Link>
              <CvDownload className={styles.download} />
            </div>
          </div>
        </section>

        <section className={styles.selected} aria-labelledby="selected-work-title">
          <header className={styles.sectionHeading}><h2 id="selected-work-title">Selected work</h2><Link href="/product" className="ink-link">All selected work <span aria-hidden="true">↗</span></Link></header>
          <article className={styles.leadWork} aria-labelledby="college-title">
            <div className={styles.leadMedia}>{college && <Media media={college} priority compact />}</div>
            <div className={styles.leadAccount}>
              <BrandMarks companyId="cashkaro" small />
              <h3 id="college-title">College.money education loans</h3>
              <p>I owned the education-loan journey, lender commercials and operations. The product connects student intent, document preparation and a case a lender can assess.</p>
              <div className={styles.result}><strong>40%</strong><span>Reported enquiry-to-application conversion</span></div>
              <p className={styles.qualification}>Launch-year report; the enquiry cohort definition was not supplied.</p>
              <Link href="/product/cashkaro-college-money-education-loans" className="ink-link">Full case study <span aria-hidden="true">↗</span></Link>
            </div>
          </article>
          <div className={styles.workPair}>
            <article className={styles.cropWork} aria-labelledby="crop-title">
              {crop && <Media media={crop} compact />}
              <div className={styles.pairAccount}>
                <p className={styles.workContext}>Absolute / Historical product delivery</p>
                <h3 id="crop-title">Crop-health AI, from capture to advice</h3>
                <p>I brought engineering, modelling and agronomy together around image capture and useful farmer guidance.</p>
                <p className={styles.qualification}>The reported dataset spans 500K+ images and 14 crops. Model accuracy was not supplied; the visual is a current public reference.</p>
                <Link href="/product/absolute-crop-health-ai" className="ink-link">Full case study <span aria-hidden="true">↗</span></Link>
              </div>
            </article>
            <article className={styles.founderWork} aria-labelledby="urban-title">
              {farm && <Media media={farm} compact />}
              <div className={styles.pairAccount}>
                <p className={styles.workContext}>UrbanKhet / Founder, 2019–2021</p>
                <h3 id="urban-title">The storefront and the farm behind it</h3>
                <p>I built a farm-to-customer venture: the web product, farmer sourcing, subscriptions, delivery and the team operating them.</p>
                <p className={styles.qualification}>3,600+ customers reported in the career record. Earlier snapshots use different customer counts.</p>
                <Link href="/product/urbankhet-farm-to-fork" className="ink-link">Full case study <span aria-hidden="true">↗</span></Link>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.experiments} aria-labelledby="experiments-title">
          <header className={styles.sectionHeading}><h2 id="experiments-title">Prototypes &amp; system design</h2><p>Interaction prototypes and proposed lending architecture.</p></header>
          <div className={styles.experimentPair}>
            <article aria-labelledby="eduloans-title">
              {prototype && <Media media={prototype} compact />}
              <div className={styles.experimentAccount}><h3 id="eduloans-title">EduLoans interaction prototype</h3><p>AI-assisted delivery, deterministic lender rules and human verification. Original interface with synthetic records and scripted responses.</p><Link href="/product/cashkaro-eduloans-policy-workflow" className="ink-link">Full case study <span aria-hidden="true">↗</span></Link></div>
            </article>
            <article aria-labelledby="mcp-title">
              {mcp && <Media media={mcp} compact />}
              <div className={styles.experimentAccount}><h3 id="mcp-title">MCP for lending policy</h3><p>A proposed shared evaluation service for two policy engines. Human approval stays separate from evaluating a case; live deployment is unconfirmed.</p><Link href="/product/cashkaro-lending-mcp-feedback" className="ink-link">Full case study <span aria-hidden="true">↗</span></Link></div>
            </article>
          </div>
        </section>

        <section className={styles.results} aria-labelledby="results-title">
          <header className={styles.sectionHeading}><h2 id="results-title">Results in context</h2><p>Programme outcomes, with the scope kept beside each figure.</p></header>
          <dl className={styles.resultLedger}>{programmeResults.map(result => <div key={result.slug}>
            <dt><Link href={`/product/${result.slug}`}>{result.name}<span aria-hidden="true"> ↗</span></Link></dt>
            <dd className={styles.resultValue}>{result.value}</dd>
            <dd className={styles.resultMeaning}><span>{result.measure}</span><small>{result.note}</small></dd>
          </div>)}</dl>
        </section>

        <section className={styles.careerSection} aria-labelledby="career-title">
          <header className={styles.sectionHeading}><h2 id="career-title">Career highlights</h2><Link href="/cv" className="ink-link">View experience <span aria-hidden="true">↗</span></Link></header>
          <ol className={styles.career}>{career.map(item => <li key={item.id}>
            <p className={styles.careerDate}>{item.period}</p><div className={styles.careerBrand}><BrandMarks companyId={item.id} small /><span>{item.name}</span></div>
            <div className={styles.careerRemit}><h3>{item.role}</h3><p>{item.scope}</p></div>
          </li>)}</ol>
        </section>

        <section className={styles.paintingSection} aria-labelledby="painting-title">
          <div><h2 id="painting-title">Away from product, I paint.</h2><p>Oil, colour and a different kind of attention. My paintings and artist notes are collected here.</p><Link href="/art" className="ink-link">Explore my paintings <span aria-hidden="true">↗</span></Link></div>
          <Link href="/art#public-compass" className={styles.painting}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/art/priyam/public-compass-preview.webp" alt="Public Compass, my oil painting in red, green and gold" width={1000} height={879} loading="lazy" />
            <span>Public Compass / Oil on canvas</span>
          </Link>
        </section>
      </HomeMotion>
    </main>
    <Footer />
  </PublicShell>;
}
