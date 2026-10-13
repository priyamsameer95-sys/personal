import type { Metadata } from 'next';
import Link from 'next/link';
import { contentExcerpt } from '@/lib/content';
import { caseStudyPreview, groupCaseStudies, loadPublishedWork, type WorkCompanyGroup } from '@/lib/work';
import { workTypeLabels } from '@/lib/work-types';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import styles from '@/components/work/work.module.css';

export const metadata: Metadata = {
  title: 'Work',
  description: 'Explore Priyam Sameer’s product decisions, leadership remit and impact across CashKaro, CredFlow, Absolute and UrbanKhet, with additional community and independent work.',
  openGraph: { title: 'Work — Priyam Sameer', description: 'Product decisions, leadership remit and impact across lending, marketplaces and agritech.' },
  twitter: { title: 'Work — Priyam Sameer', description: 'Product decisions, leadership remit and impact across lending, marketplaces and agritech.' },
};

export const revalidate = 0;

const primaryCompanyIds = ['cashkaro', 'credflow', 'absolute', 'urbankhet'];
const relationshipLabels: Record<string, string> = {
  cashkaro: 'Employment', credflow: 'Employment', absolute: 'Employment', urbankhet: 'Founder-led venture',
  'founder-programmes': 'Incubation and founder support', 'water-farmers': 'Internship',
  'gujarat-action-group': 'Volunteering', advisory: 'Independent advisory',
  cept: 'University and creative practice', 'independent-exercises': 'Independent exercise',
};

function CompanyWork({ company, studies }: WorkCompanyGroup) {
  return (
    <section id={company.id} aria-labelledby={`${company.id}-title`} className={styles.companySection}>
      <header className={styles.companyHeader}>
        <div>
          <p className={styles.eyebrow}>{company.relationship || relationshipLabels[company.id]}</p>
          <p className={styles.period}>{company.period}</p>
          <h2 id={`${company.id}-title`}>{company.name}</h2>
          <p className={styles.role}>{company.role}</p>
        </div>
        <p className={styles.description}>{company.summary}</p>
      </header>
      {studies.map(study => {
        const image = caseStudyPreview(study);
        const href = `/product/${encodeURIComponent(study.slug)}`;
        const leadingOutcome = study.outcomes[0];
        const impact = study.executiveBrief?.impact || (leadingOutcome && [leadingOutcome.value, leadingOutcome.label].filter(Boolean).join(' · ')) || study.summary;
        const measurementNotes = Array.from(new Set(study.outcomes.flatMap(outcome => outcome.detail ? [outcome.detail] : [])));
        return (
          <article key={study.id} className={`${styles.workRow}${image ? '' : ` ${styles.textOnly}`}`}>
            <div>
              <p className={styles.eyebrow}>{workTypeLabels[study.workType] || 'Product work'} · {study.period}</p>
              <h3><Link href={href}>{study.title}</Link></h3>
              <p className={styles.rowSummary}>{study.summary}</p>
              <p className="mt-4 text-sm leading-relaxed"><span className="font-medium">My role: </span>{study.executiveBrief?.remit || study.role}</p>
              <p className={styles.rowOutcome}><span className="font-medium">Impact: </span>{impact}</p>
              {measurementNotes.length > 0 && <div className="mt-2 space-y-1 text-xs leading-relaxed text-system-secondary">
                {measurementNotes.map(note => <p key={note}>{note}</p>)}
              </div>}
              <div className={styles.rowActions}><Link href={href}>Read case study <span aria-hidden="true">→</span></Link></div>
            </div>
            {image && <Link href={href} className={styles.preview} aria-label={`Read case study: ${study.title}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt={image.alt} loading="lazy" />
            </Link>}
          </article>
        );
      })}
    </section>
  );
}

export default async function ProductWorkPage() {
  const groups = groupCaseStudies();
  const companyWork = primaryCompanyIds.flatMap(id => groups.filter(group => group.company.id === id));
  const otherContexts = groups.filter(group => !primaryCompanyIds.includes(group.company.id));
  const additionalWork = await loadPublishedWork();

  return (
    <PublicShell>
      <Header />
      <main id="main-content" className="animate-fade-in-up">
        <header className={styles.pageIntro}>
          <p className={styles.eyebrow}>Product leadership in practice</p>
          <h1>My work.</h1>
          <p>Explore the problems I worked on, the decisions I made and the teams and operations behind delivery. Start with my company and founder work, then explore internship, community and independent projects.</p>
        </header>

        <nav className={styles.companyNav} aria-label="Explore company and founder work">
          {companyWork.map(({ company, studies }) => <a key={company.id} href={`#${company.id}`}>{company.name}<small>{studies.length} case {studies.length === 1 ? 'study' : 'studies'}</small></a>)}
          {otherContexts.length > 0 && <a href="#other-contexts">Other experience</a>}
        </nav>

        {companyWork.map(group => <CompanyWork key={group.company.id} {...group} />)}

        {otherContexts.length > 0 && <section id="other-contexts" aria-labelledby="other-contexts-title" className="border-t border-system-outline pt-12 md:pt-16">
          <div className="mb-10 max-w-2xl">
            <p className={styles.eyebrow}>Beyond company roles</p>
            <h2 id="other-contexts-title" className="mb-4 text-3xl font-medium tracking-tight md:text-4xl">Additional experience and independent work</h2>
            <p className="leading-relaxed text-system-secondary">Incubation, an internship, volunteering, advisory and independent practice each have their own scope. They are separate from my employment history.</p>
          </div>
          <nav className={styles.companyNav} aria-label="Explore other work contexts">
            {otherContexts.map(({ company }) => <a key={company.id} href={`#${company.id}`}>{company.name}</a>)}
          </nav>
          {otherContexts.map(group => <CompanyWork key={group.company.id} {...group} />)}
        </section>}

        {additionalWork.length > 0 && <section className={styles.additionalSection} aria-labelledby="additional-work-title">
          <h2 id="additional-work-title">Additional product work</h2>
          {additionalWork.map(item => {
            const image = item.media.find(media => media.kind === 'image');
            const href = `/product/${encodeURIComponent(item.slug || item.id)}`;
            return <article key={item.id} className={`${styles.workRow}${image ? '' : ` ${styles.textOnly}`}`}>
              <div><h3><Link href={href}>{item.title}</Link></h3><p className={styles.rowSummary}>{contentExcerpt(item.summary || item.body_markdown, 240)}</p><div className={styles.rowActions}><Link href={href}>Read case study <span aria-hidden="true">→</span></Link></div></div>
              {image && <Link href={href} className={styles.preview} aria-label={`Read case study: ${item.title}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.blob_url} alt={image.alt_text || item.title} loading="lazy" />
              </Link>}
            </article>;
          })}
        </section>}
      </main>
      <Footer />
    </PublicShell>
  );
}
