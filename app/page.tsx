import type { Metadata } from 'next';
import Link from 'next/link';
import { caseStudyPreview, findCaseStudy, groupCaseStudies } from '@/lib/work';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import PeelReveal from '@/components/PeelReveal';
import workStyles from '@/components/work/work.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Priyam Sameer — Product Leadership' },
  description: 'Product leadership from strategy to scale. Explore Priyam Sameer’s decisions and experience across lending, marketplaces and agritech.',
  openGraph: { title: 'Priyam Sameer — Product Leadership', description: 'Product leadership from strategy to scale. Explore my work and experience across lending, marketplaces and agritech.' },
  twitter: { title: 'Priyam Sameer — Product Leadership', description: 'Product leadership from strategy to scale. Explore my work and experience across lending, marketplaces and agritech.' },
};

const selectedSlugs = [
  'cashkaro-personal-loan-marketplace',
  'absolute-silkroute-marketplace',
  'absolute-upaj-farmer-experience',
];

const careerContext: Record<string, string> = {
  cashkaro: 'I lead lending products, delivery and business growth. I joined as Senior Manager in March 2025 and became General Manager in April 2026.',
  credflow: 'I led KuberX launch, acquisition and activation work, alongside SME payment journeys and product economics.',
  absolute: 'I progressed from Product Manager to Principal Product Manager across commodity trade, farmer products and agricultural credit.',
  urbankhet: 'I founded a farm-to-customer venture and owned its product, customer offer, sourcing and fulfilment.',
};

export default function HomePage() {
  const selectedWork = selectedSlugs.flatMap(slug => {
    const study = findCaseStudy(slug);
    return study ? [study] : [];
  });
  const career = groupCaseStudies().filter(({ company }) => company.id in careerContext);

  return (
    <PublicShell>
      <Header />
      <main id="main-content" className="animate-fade-in-up">
        <section aria-labelledby="intro-title" className="home-peel-hero">
          <div>
            <p className="home-label">Priyam Sameer · Product leader</p>
            <h1 id="intro-title">Product leadership from strategy to scale.</h1>
            <p className="intro-copy">I lead product strategy, discovery and delivery across lending, marketplaces and agritech. I bring commercial ownership together with the operating detail that makes a product useful.</p>
            <div className="home-actions">
              <Link href="/product" className="ink-button">Explore my work <span aria-hidden="true">↗</span></Link>
              <Link href="/cv" className="ink-link">View experience <span aria-hidden="true">→</span></Link>
            </div>
            <p className="current-note">Currently General Manager, Product Management &amp; Business Growth at CashKaro / BankKaro.</p>
          </div>
          <PeelReveal />
        </section>

        <section aria-labelledby="work-title" className="border-t border-system-outline py-12 md:py-16">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
            <div><p className="mb-3 text-xs">Selected work</p><h2 id="work-title" className="text-3xl font-medium tracking-tight md:text-4xl">Product decisions in practice.</h2></div>
            <Link href="/product" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">View all work <span aria-hidden="true" className="ml-3">→</span></Link>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {selectedWork.map(study => {
              const image = caseStudyPreview(study);
              const company = career.find(group => group.company.id === study.companyId)?.company;
              const href = `/product/${encodeURIComponent(study.slug)}`;
              const leadingOutcome = study.outcomes[0];
              const impact = study.executiveBrief?.impact || (leadingOutcome && [leadingOutcome.value, leadingOutcome.label].filter(Boolean).join(' · ')) || study.summary;
              return (
                <article key={study.id} className="overflow-hidden rounded-2xl border border-system-outline bg-white">
                  {image && <Link href={href} aria-label={`Read case study: ${study.title}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.src} alt={image.alt} className={workStyles.featuredImage} loading="lazy" />
                  </Link>}
                  <div className="p-6">
                    <p className={workStyles.featuredLabel}>{company?.name}</p>
                    <h3 className="mb-3 text-xl font-medium leading-snug"><Link href={href} className="no-underline hover:underline">{study.title}</Link></h3>
                    <p className="text-sm leading-relaxed text-system-secondary">{study.summary}</p>
                    <p className="mt-4 text-sm leading-relaxed"><span className="font-medium">Impact: </span>{impact}</p>
                    {study.outcomes[0]?.detail && <p className="mt-2 text-xs leading-relaxed text-system-secondary">{study.outcomes[0].detail}</p>}
                    <Link href={href} className="mt-5 inline-flex min-h-11 items-center gap-3 text-sm font-medium underline underline-offset-4">Read case study <span aria-hidden="true">→</span></Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="approach-title" className="border-t border-system-outline py-12 md:py-16">
          <p className="mb-3 text-xs">How I lead</p>
          <h2 id="approach-title" className="mb-8 text-3xl font-medium tracking-tight md:text-4xl">Clear choices. Shared accountability.</h2>
          <div className="grid gap-8 text-sm leading-relaxed md:grid-cols-3">
            <div><h3 className="mb-3 text-lg font-medium">Start with the problem</h3><p>I use customer workflows and business economics to decide what matters. I make priorities and trade-offs explicit before expanding the roadmap.</p></div>
            <div><h3 className="mb-3 text-lg font-medium">Connect product and operations</h3><p>I work across engineering, design, commercial and operations teams. Lender policies, payment handoffs and fulfilment constraints are part of the product decision.</p></div>
            <div><h3 className="mb-3 text-lg font-medium">Stay close to delivery</h3><p>I translate strategy into requirements, measurable journeys and team decisions. I use funnel data, partner feedback and operating reviews to shape the next iteration.</p></div>
          </div>
        </section>

        <section aria-labelledby="career-title" className="border-t border-system-outline py-12 md:py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div><p className="mb-3 text-xs">Career context</p><h2 id="career-title" className="text-3xl font-medium tracking-tight md:text-4xl">Founder roots. Product leadership.</h2></div>
            <Link href="/cv" className="inline-flex min-h-11 items-center gap-3 text-sm underline underline-offset-4">View experience <span aria-hidden="true">→</span></Link>
          </div>
          {career.map(({ company }) => <article key={company.id} className="experience-row">
            <p className="period">{company.period}</p>
            <div><h3>{company.name}</h3><p className="role">{company.role}</p></div>
            <p className="description">{careerContext[company.id]}</p>
          </article>)}
        </section>

        <section aria-labelledby="interests-title" className="grid gap-8 border-t border-system-outline py-12 md:grid-cols-[1fr_1.6fr] md:gap-16 md:py-16">
          <div><p className="mb-3 text-xs">Outside work</p><h2 id="interests-title" className="text-3xl font-medium leading-tight tracking-tight md:text-4xl">Painting, football and perspective.</h2></div>
          <div className="space-y-5 text-base leading-relaxed text-system-secondary">
            <p>I studied Construction Technology at CEPT University, where I also captained FC Sparta. I continue to paint alongside my product work.</p>
            <div className="flex flex-wrap gap-x-7 gap-y-2">
              <Link href="/blog" className="inline-flex min-h-11 items-center gap-3 text-sm font-medium underline underline-offset-4">Writing <span aria-hidden="true">→</span></Link>
              <Link href="/art" className="inline-flex min-h-11 items-center gap-3 text-sm font-medium underline underline-offset-4">Art <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </PublicShell>
  );
}
