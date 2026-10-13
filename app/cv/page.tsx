import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { findCaseStudy } from '@/lib/work';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import CvDownload from '@/components/CvDownload';
import BrandMarks from '@/components/BrandMarks';
import content from './content.json';
import styles from './cv.module.css';

export const metadata: Metadata = {
  title: 'Experience',
  description: 'Priyam Sameer’s career and progression: product leadership at CashKaro, CredFlow and Absolute, founding UrbanKhet, education and certifications. Read the timeline or download the original CV.',
  openGraph: { title: 'Experience — Priyam Sameer', description: 'My career in product leadership, with role progression, responsibilities, case studies and the original CV.' },
  twitter: { title: 'Experience — Priyam Sameer', description: 'My career in product leadership, with role progression, responsibilities, case studies and the original CV.' },
};

function Section({ id, title, children, eyebrow }: { id: string; title: string; children: ReactNode; eyebrow?: string }) {
  return <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
    <div className={styles.sectionHeading}>
      {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
      <h2 id={`${id}-title`} className={styles.sectionTitle}>{title}</h2>
    </div>
    {children}
  </section>;
}

function CaseLink({ slug, label }: { slug: string; label?: string }) {
  const study = findCaseStudy(slug);
  return study ? <Link href={`/product/${encodeURIComponent(study.slug)}`} className={styles.caseLink}>{label || study.title} <span aria-hidden="true">↗</span></Link> : null;
}

type CareerEvidence = {
  slug: string;
  label: string;
  remit: string;
  result?: string;
  qualification?: string;
};

// The first-read evidence is a selection. The complete source account and all
// related studies remain in each role's single responsibilities chapter below.
const careerEvidence: Record<string, { summary: string; work: CareerEvidence[] }> = {
  cashkaro: {
    summary: content.experience[0].responsibilities[0].text,
    work: [
      { slug: 'cashkaro-personal-loan-marketplace', label: 'Personal-loan marketplace', remit: 'Application capture, lender matching and partner operations.', result: '16% → 45% reported funnel conversion', qualification: 'The original funnel-event definitions and comparison cohorts are not available.' },
      { slug: 'cashkaro-college-money-education-loans', label: 'Education-loan journeys', remit: 'Student applications, lender commercials and operating handoffs.' },
    ],
  },
  credflow: {
    summary: 'I connected SME product journeys with launch, acquisition, activation and the economics of serving customers.',
    work: [
      { slug: 'credflow-kuberx-launch', label: 'KuberX launch & activation', remit: 'Acquisition, onboarding and lifecycle communication.', result: '45% reported reduction in acquisition cost', qualification: 'First-month report; the original spend and cohort records are not attached.' },
      { slug: 'credflow-pay-via-credit-card', label: 'Pay via Credit Card', remit: 'The customer offer, payment infrastructure and operating handoffs.', result: '₹10 crore reported first-week transaction value', qualification: 'Transaction value is separate from revenue or reconciled settled funds.' },
    ],
  },
  absolute: {
    summary: 'I led product work across commodity trade, recurring farmer needs, agricultural data and rural-credit products.',
    work: [
      { slug: 'absolute-silkroute-marketplace', label: 'SilkRoute commodity trading', remit: 'Discovery through ordering, negotiation and settlement.', result: '$100 million reported transaction value in nine months', qualification: 'Programme transaction value is distinct from platform revenue.' },
      { slug: 'absolute-upaj-farmer-experience', label: 'Upaj farmer experience', remit: 'Monitoring, market information, content and useful notifications.', result: '100,000 → 600,000 reported active users', qualification: 'The original active-user definition and cohort records are not supplied.' },
      { slug: 'absolute-rural-credit-uli', label: 'Agricultural data & rural credit', remit: 'Lender-facing products and adaptation for ULI and ONDC.', qualification: 'National infrastructure and partner lending results are separate from my personal remit.' },
    ],
  },
  urbankhet: {
    summary: content.experience[3].responsibilities[0].text,
    work: [
      { slug: 'urbankhet-farm-to-fork', label: 'Building UrbanKhet', remit: 'The customer proposition, sourcing and a farm-to-customer operating model.' },
      { slug: 'urbankhet-covid-pivot', label: 'The COVID delivery pivot', remit: 'Reworking logistics under changing demand and supply constraints, followed by the decision to wind down.' },
    ],
  },
};

export default function ExperiencePage() {
  return (
    <PublicShell className={styles.shell}>
      <Header />
      <main id="main-content" className={styles.document}>
        <header className={styles.identity}>
          <div>
            <p className={styles.eyebrow}>{content.name} · {content.location}</p>
            <h1>Experience.</h1>
            <p className={styles.intro}>{content.intro}</p>
          </div>
          <div className={styles.identityAction}>
            <CvDownload className="ink-button" />
            <p>The original CV, alongside the fuller story below.</p>
          </div>
        </header>

        <nav className={styles.pageNav} aria-label="On this page">
          <a href="#career">Career</a><a href="#internship">Internship</a><a href="#other-contexts">Other experience</a><a href="#education">Education</a><a href="#recognition">Recognition</a><a href="#certifications">Certifications</a>
        </nav>

        <Section id="career" title="Roles & responsibility" eyebrow="Employment and founder work">
          <ol className={styles.timeline}>
            {content.experience.map((job, jobIndex) => {
              const evidence = careerEvidence[job.companyId];
              return <li key={job.companyId} id={job.companyId} className={styles.timelineItem}>
                <div className={styles.timelineDate}>
                  <span className={styles.timelineDot} aria-hidden="true" />
                  {jobIndex === 0 && <span className={styles.currentLabel}>Current role</span>}
                  <p>{job.dates}</p><span className={styles.relationship}>{job.relationship}</span>
                </div>
                <article className={styles.job} aria-labelledby={`${job.companyId}-title`}>
                  <header className={styles.company}>
                    <BrandMarks companyId={job.companyId} small className={styles.companyMarks} />
                    <h3 id={`${job.companyId}-title`}>{job.company}</h3>
                    <p className={styles.roleTitle}>{job.title}</p>
                    <p className={styles.context}>{job.context}</p>
                    <p className={styles.ownership}>{evidence.summary}</p>
                  </header>

                  {job.progression.length > 1 && <div className={styles.progressionChapter}>
                    <h4 className={styles.detailTitle}>Role progression</h4>
                    <ol className={styles.progression} aria-label={`Role progression at ${job.company}`}>
                      {job.progression.map(role => <li key={role.title}>
                        <p className={styles.progressionRole}>{role.title}</p>
                        <p className={styles.progressionDate}>{role.dates}</p>
                        <p className={styles.progressionDetail}>{role.detail}</p>
                      </li>)}
                    </ol>
                  </div>}

                  <div className={styles.evidence}>
                    <h4 className={styles.detailTitle}>Selected work</h4>
                    <ul className={styles.evidenceList}>
                      {evidence.work.map(work => <li key={work.slug}>
                        <div><CaseLink slug={work.slug} label={work.label} /><p className={styles.evidenceRemit}>{work.remit}</p></div>
                        {(work.result || work.qualification) && <div className={styles.evidenceOutcome}>
                          {work.result && <p className={styles.evidenceResult}>{work.result}</p>}
                          {work.qualification && <p className={styles.note}>{work.qualification}</p>}
                        </div>}
                      </li>)}
                    </ul>
                  </div>

                  <details className={styles.disclosure} id={`${job.companyId}-responsibilities`}>
                    <summary>Full responsibilities & related work<span aria-hidden="true" className={styles.toggle} /></summary>
                    <div className={styles.disclosureBody}>
                      <h4 className={styles.detailTitle}>Scope and collaboration</h4>
                      <dl className={styles.scope}>{job.scope.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.text}</dd></div>)}</dl>
                      <p className={styles.sourceNote}>{job.leadershipNote}</p>
                      <h4 className={styles.detailTitle}>Work and outcomes</h4>
                      <ul className={styles.responsibilities}>
                        {job.responsibilities.map(responsibility => <li key={responsibility.text}>
                          <p>{responsibility.text}</p>
                          {'result' in responsibility && <p className={styles.result}>{responsibility.result}</p>}
                          {'note' in responsibility && <p className={styles.note}>{responsibility.note}</p>}
                          <div className={styles.caseLinks}>{responsibility.cases.map(slug => <CaseLink key={slug} slug={slug} />)}</div>
                        </li>)}
                      </ul>
                    </div>
                  </details>
                </article>
              </li>;
            })}
          </ol>
        </Section>

        <Section id="internship" title="An early grounding in operations" eyebrow={`Internship · ${content.internship.dates}`}>
          <article className={styles.internship}>
            <div><BrandMarks companyId="water-farmers" small /><h3>{content.internship.company}</h3><p className={styles.roleTitle}>{content.internship.title}</p></div>
            <div>
              <p>{content.internship.description}</p>
              <p className={styles.note}>{content.internship.scope}</p>
              <CaseLink slug={content.internship.caseSlug} />
            </div>
          </article>
        </Section>

        <Section id="other-contexts" title="Beyond employment" eyebrow="Incubation, community and independent work">
          <div className={styles.contextGrid}>{content.otherContexts.map(context => <article key={context.caseSlug} className={styles.contextEntry}>
            <BrandMarks companyId={findCaseStudy(context.caseSlug)?.companyId} small />
            <p className={styles.eyebrow}>{context.title}</p>
            <h3>{context.organisation}</h3><p className={styles.dates}>{context.dates}</p>
            <p className={styles.contextDescription}>{context.description}</p>
            <CaseLink slug={context.caseSlug} />
          </article>)}</div>
        </Section>

        <div className={styles.foundationGrid}>
          <Section id="education" title="Education" eyebrow="Academic background">
            <BrandMarks companyId="cept" small />
            <h3 className={styles.foundationTitle}>{content.education.institution}</h3>
            <p className={styles.roleTitle}>{content.education.degree}</p><p className={styles.dates}>{content.education.dates}</p>
            <p className={styles.educationCopy}>{content.education.description}</p><CaseLink slug={content.education.caseSlug} />
          </Section>
          <Section id="recognition" title="Recognition" eyebrow="Awards and venture support">
            <ul className={styles.recognition}>{content.recognitionDetails.map(item => <li key={item.title}><h3>{item.title}</h3><p>{item.context}</p></li>)}</ul>
          </Section>
        </div>

        <Section id="certifications" title="Certifications" eyebrow="Continued learning">
          <ul className={styles.certifications}>
            {content.certifications.map(certification => <li key={certification.credentialId}>
              <BrandMarks brandIds={[certification.brandId]} small className={styles.certificationBrand} />
              <div>
                <h3 className={styles.certificationTitle}>{certification.title}</h3>
                <p className={styles.certificationMeta}>{certification.issuer} <span aria-hidden="true">·</span> Issued <time dateTime={certification.issuedDate}>{certification.issued}</time></p>
                <div className={styles.certificationActions}>
                  <a href={certification.credentialUrl} target="_blank" rel="noopener noreferrer" className={styles.caseLink}>View credential <span aria-hidden="true">↗</span><span className="sr-only"> for {certification.title} (opens in a new tab)</span></a>
                  <details className={styles.certificationCredential}>
                    <summary>Credential ID</summary><p>{certification.credentialId}</p>
                  </details>
                </div>
              </div>
            </li>)}
          </ul>
        </Section>

        <Section id="skills" title="What I bring" eyebrow="Product, business and people">
          <dl className={styles.skills}>{content.skills.map(skill => <div key={skill.area}><dt>{skill.area}</dt><dd>{skill.description}</dd></div>)}</dl>
          <details className={styles.disclosure}>
            <summary>How I work across the product lifecycle<span aria-hidden="true" className={styles.toggle} /></summary>
            <div className={styles.disclosureBody}>
              <p className={styles.skillsIntro}>{content.summary}</p>
              <ol className={styles.lifecycleSteps}>{content.lifecycle.map(stage => <li key={stage.label}><h3>{stage.label}</h3><p>{stage.detail}</p></li>)}</ol>
            </div>
          </details>
          <div className={styles.closingActions}>
            <CvDownload className="ink-button" />
            <Link href="/product" className={styles.textAction}>Explore my work <span aria-hidden="true">→</span></Link>
          </div>
        </Section>
      </main>
      <Footer />
    </PublicShell>
  );
}
