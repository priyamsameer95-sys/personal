import type { Metadata } from 'next';
import Link from 'next/link';
import { findCaseStudy } from '@/lib/work';
import { getPrimaryMedia } from '@/lib/work-presentation';
import type { CaseStudyMedia } from '@/lib/work-types';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import Media from '@/components/work/Media';
import HomeMotion from '@/components/HomeMotion';
import CvDownload from '@/components/CvDownload';
import BrandMarks from '@/components/BrandMarks';
import HowICanHelp from '@/components/HowICanHelp';
import styles from './home.module.css';
export const metadata: Metadata = {
  title:{absolute:'Priyam Sameer — Product leader & former founder'},
  description:'I build products and the business around them. Lending journeys, lender partnerships, marketplaces and operating delivery, with clear responsibility and inspectable work.',
  openGraph:{title:'Priyam Sameer — Product leader & former founder',description:'The decisions behind lending journeys, partner integrations and operating businesses.'},
  twitter:{title:'Priyam Sameer — Product leader & former founder',description:'The decisions behind lending journeys, partner integrations and operating businesses.'},
};
function asset(slug:string,id:string):CaseStudyMedia|undefined { return findCaseStudy(slug)?.media.find(media=>media.id===id); }
const stories = [
  { slug:'cashkaro-college-money-education-loans',company:'cashkaro',title:'From a student enquiry to a complete loan application',status:'Delivered work',body:'An interested student still needs documents, lender matching and follow-through before a lender can review the application. I owned the education-loan journey, lender commercials and operations.',notice:'The case follows the choice to connect intake, document preparation and lender routing.' },
  { slug:'absolute-crop-health-ai',company:'absolute',title:'Making crop diagnosis usable in the field',status:'Historical product delivery',body:'A farmer could photograph a leaf offline and receive diagnosis after reconnection. I worked with engineering, modelling and agronomy on that journey, including what happened between capture and useful guidance.',notice:'The case separates the delivered capture flow from the intended conversational-advisory layer.' },
  { slug:'urbankhet-farm-to-fork',company:'urbankhet',title:'Owning the promise after a customer placed an order',status:'Founder venture · 2019–2021',body:'At UrbanKhet, I owned the storefront and what happened after the order: farmer sourcing, subscriptions, packing, delivery and the economics of keeping the promise.',notice:'The case follows the move from terrace farming to a produce service, and the operating choices behind it.' },
];
export default function HomePage() {
  const prototype=asset('cashkaro-eduloans-policy-workflow','eduloans-prototype-inspector');
  const mcp=asset('cashkaro-lending-mcp-feedback','lending-mcp-proposal');
  return <PublicShell><Header /><main id="main-content"><HomeMotion>
    <section className={styles.hero} aria-labelledby="intro-title">
      <div data-entry><p className={styles.role}>Priyam Sameer · General Manager at CashKaro · Bengaluru</p><h1 id="intro-title">I build products and the business around them.</h1></div>
      <div className={styles.heroCopy}><p>I lead lending products, lender partnerships and P&amp;L at CashKaro. Before that, I worked on agricultural products at Absolute and founded UrbanKhet, a fresh-produce business.</p><p>My work connects the customer experience to the rules, partners and operations that make it possible.</p><div className={styles.actions}><Link href="/product" className="ink-button">Explore my work <span aria-hidden="true">↗</span></Link><CvDownload className="ink-link" /></div><p className={styles.smallInvitation}>Have a product or operating problem that sounds similar? <a href="#how-i-can-help">Start a conversation <span aria-hidden="true">↗</span></a></p></div>
    </section>
    <section className={styles.selected} aria-labelledby="selected-work-title"><header className={styles.sectionHeader}><div><h2 id="selected-work-title">The interface was only part of the problem.</h2><p>Three decisions across lending, crop-health and fresh-food delivery: each connects a customer promise to the system behind it.</p></div><Link href="/product" className="ink-link">Selected work <span aria-hidden="true">↗</span></Link></header>
      {stories.map((story,index)=>{
        const study=findCaseStudy(story.slug);
        const media=story.slug==='urbankhet-farm-to-fork' ? asset(story.slug,'urbankhet-storefront-excerpt') : story.slug==='absolute-crop-health-ai' ? asset(story.slug,'crop-delivery-boundary') : study ? getPrimaryMedia(study)[0] : undefined;
        return <article key={story.slug} className={styles.story} aria-labelledby={`home-story-${index}`}><div className={styles.account}><div className={styles.brand}><BrandMarks companyId={story.company} small /><span>{story.status}</span></div><h3 id={`home-story-${index}`}>{story.title}</h3><p>{story.body}</p><p className={styles.notice}>{story.notice}</p><Link href={`/product/${story.slug}`} className="ink-link">Read the case <span aria-hidden="true">↗</span></Link></div><div className={`${styles.evidence}${story.company==='urbankhet'?` ${styles.storefront}`:''}`}>{media&&<Media media={media} compact priority={index===0}/>}</div></article>;
      })}
      <aside className={styles.tradeNote}><h3>Connecting a marketplace to the trade itself</h3><p>At Absolute, my SilkRoute remit joined discovery and negotiation with ordering, payments and trade operations. The programme reported <strong>$100M GMV in nine months</strong>.</p><Link href="/product/absolute-silkroute-marketplace" className="ink-link">Explore SilkRoute <span aria-hidden="true">↗</span></Link></aside>
    </section>
    <section className={styles.exploration} aria-labelledby="experiments-title"><header className={styles.sectionHeader}><div><h2 id="experiments-title">Making a lending decision inspectable</h2><p>How should a review workflow explain its rules and handle uncertain information? These artifacts explore that question.</p></div></header><div className={styles.experimentPair}>
      <article><p className={styles.status}>Interaction prototype</p><h3>EduLoans: what does the reviewer need to decide?</h3><p>I built a prototype for inspecting lender rules, checking documents and deciding what needs human verification. It uses sample records and scripted responses.</p>{prototype&&<Media media={prototype} compact/>}<Link href="/product/cashkaro-eduloans-policy-workflow" className="ink-link">Inspect the prototype <span aria-hidden="true">↗</span></Link></article>
      <article><p className={styles.status}>Design proposal</p><h3>One evaluation interface, separate policy approval</h3><p>I proposed a shared way for two lending rule engines to evaluate a case, keeping approval of policy changes separate. The design uses the Model Context Protocol (MCP).</p>{mcp&&<Media media={mcp} compact/>}<Link href="/product/cashkaro-lending-mcp-feedback" className="ink-link">Read the proposed design <span aria-hidden="true">↗</span></Link></article>
    </div></section>
    <HowICanHelp />
    <section className={styles.career} aria-labelledby="career-title"><header className={styles.sectionHeader}><h2 id="career-title">Selected career progression</h2><Link href="/cv" className="ink-link">Full experience <span aria-hidden="true">↗</span></Link></header><div>{[
      {id:'cashkaro',name:'CashKaro',period:'March 2025–Present',role:'Senior Manager → General Manager',scope:'Lending product, lender partnerships and P&L.'},
      {id:'absolute',name:'Absolute',period:'October 2021–November 2024',role:'Product Manager → Principal Product Manager',scope:'Commerce, farmer products and institutional risk information.'},
      {id:'urbankhet',name:'UrbanKhet',period:'July 2019–September 2021',role:'Founder & Director',scope:'The customer offer, web product and physical operation.'},
    ].map(job=><article key={job.id}><BrandMarks companyId={job.id} small/><h3>{job.name}</h3><p className={styles.status}>{job.period}</p><p>{job.role}</p><p className={styles.notice}>{job.scope}</p></article>)}</div></section>
    <section className={styles.art} aria-labelledby="painting-title"><div><h2 id="painting-title">I also paint.</h2><p>Six paintings, and the notes I wrote alongside them.</p><Link href="/art" className="ink-link">View the paintings <span aria-hidden="true">↗</span></Link></div><Link href="/art#tumult">
{/* eslint-disable-next-line @next/next/no-img-element */}
<img src="/art/priyam/tumult-preview.webp" alt="Tumult — my painting in yellow, teal and black" width={785} height={1000} loading="lazy"/><span>Tumult · Oil and acrylic on canvas</span></Link></section>
    <section className={styles.closing}><h2>A role, a product problem, or a difficult handoff?</h2><p>Tell me what you are working through. We can start with the relevant case and the decision in front of your team.</p><a href="mailto:Priyam.Sameer.95@gmail.com?subject=Role%20or%20product%20conversation" className="ink-link">Start a conversation <span aria-hidden="true">↗</span></a></section>
  </HomeMotion></main><Footer /></PublicShell>;
}
