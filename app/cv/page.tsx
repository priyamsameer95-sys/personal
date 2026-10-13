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

function CaseLink({ slug }: { slug: string }) {
  const study = findCaseStudy(slug);
  return study ? <Link href={`/product/${encodeURIComponent(study.slug)}`} className={styles.caseLink}>{study.title} <span aria-hidden="true">→</span></Link> : null;
}

export default function ExperiencePage() {
  return (
    <PublicShell className={styles.shell}>
      <Header />
      <main id="main-content" className={`${styles.document} animate-fade-in-up`}>
        <header className={styles.identity}>
          <p className={styles.eyebrow}>{content.name} · {content.location}</p>
          <h1>Experience.</h1>
          <p className={styles.intro}>{content.intro}</p>
          <div className={styles.actions}>
            <CvDownload className="ink-button" />
            <Link href="/product" className={styles.textAction}>Explore my work <span aria-hidden="true">→</span></Link>
            <a href="mailto:Priyam.Sameer.95@gmail.com" className={styles.textAction}>Contact Priyam <span aria-hidden="true">↗</span></a>
          </div>
          <nav className={styles.pageNav} aria-label="On this page">
            <a href="#career">Career</a><a href="#internship">Internship</a><a href="#other-contexts">Other experience</a><a href="#education">Education</a><a href="#recognition">Recognition</a><a href="#certifications">Certifications</a>
          </nav>
        </header>

        <Section id="career" title="Career progression" eyebrow="Employment and founder work">
          <ol className={styles.timeline}>
            {content.experience.map(job => <li key={job.companyId} id={job.companyId} className={styles.timelineItem}>
              <div className={styles.timelineDate}><span className={styles.timelineDot} aria-hidden="true" /><p>{job.dates}</p><span>{job.relationship}</span></div>
              <article className={styles.job} aria-labelledby={`${job.companyId}-title`}>
                <header className={styles.company}>
                  <BrandMarks companyId={job.companyId} />
                  <h3 id={`${job.companyId}-title`}>{job.company}</h3>
                  <p className={styles.roleTitle}>{job.title}</p>
                  <p className={styles.context}>{job.context}</p>
                </header>

                <ol className={styles.progression} aria-label={`Role progression at ${job.company}`}>
                  {job.progression.map((role, index) => <li key={role.title}>
                    <span className={styles.roleMarker} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <div><h4>{role.title}</h4><p className={styles.progressionDate}>{role.dates}</p><p className={styles.progressionDetail}>{role.detail}</p></div>
                  </li>)}
                </ol>

                <ul className={styles.highlights}>{job.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}</ul>

                <details className={styles.disclosure}>
                  <summary>Responsibilities, leadership and case studies<span aria-hidden="true" className={styles.toggle} /></summary>
                  <div className={styles.disclosureBody}>
                    <dl className={styles.scope}>{job.scope.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.text}</dd></div>)}</dl>
                    <p className={styles.note}>{job.leadershipNote}</p>
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
            </li>)}
          </ol>
        </Section>

        <Section id="internship" title="An early grounding in operations" eyebrow={`Internship · ${content.internship.dates}`}>
          <article className={styles.internship}>
            <div><BrandMarks companyId="water-farmers" /><h3>{content.internship.company}</h3><p className={styles.roleTitle}>{content.internship.title}</p></div>
            <div>
              <ul className={styles.highlights}>{content.internship.highlights.map(highlight => <li key={highlight}>{highlight}</li>)}</ul>
              <details className={styles.disclosure}><summary>Internship scope and case study<span aria-hidden="true" className={styles.toggle} /></summary><div className={styles.disclosureBody}>
                <p>{content.internship.description}</p><p className={styles.note}>{content.internship.scope}</p><CaseLink slug={content.internship.caseSlug} />
              </div></details>
            </div>
          </article>
        </Section>

        <Section id="other-contexts" title="Beyond employment" eyebrow="Incubation, community and independent work">
          <p className={styles.sectionIntro}>Distinct relationships, separate from my employment chronology.</p>
          <div className={styles.contextGrid}>{content.otherContexts.map(context => <article key={context.caseSlug} className={styles.contextCard}>
            <BrandMarks companyId={findCaseStudy(context.caseSlug)?.companyId} />
            <p className={styles.eyebrow}>{context.title}</p>
            <h3>{context.organisation}</h3><p className={styles.dates}>{context.dates}</p>
            <details className={styles.disclosure}><summary>Scope and case study<span aria-hidden="true" className={styles.toggle} /></summary><div className={styles.disclosureBody}>
              <p>{context.description}</p><CaseLink slug={context.caseSlug} />
            </div></details>
          </article>)}</div>
        </Section>

        <div className={styles.foundationGrid}>
          <Section id="education" title="Education" eyebrow="Academic background">
            <BrandMarks companyId="cept" />
            <h3 className={styles.foundationTitle}>{content.education.institution}</h3>
            <p className={styles.roleTitle}>{content.education.degree}</p><p className={styles.dates}>{content.education.dates}</p>
            <p className={styles.educationCopy}>{content.education.description}</p><CaseLink slug={content.education.caseSlug} />
          </Section>
          <Section id="recognition" title="Recognition" eyebrow="Awards and venture support">
            <ul className={styles.recognition}>{content.recognitionDetails.map(item => <li key={item.title}><span className={styles.recognitionMark} aria-hidden="true">↗</span><div><h3>{item.title}</h3><p>{item.context}</p></div></li>)}</ul>
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
                    <summary>Credential ID</summary>
                    <p>{certification.credentialId}</p>
                  </details>
                </div>
              </div>
            </li>)}
          </ul>
        </Section>

        <Section id="skills" title="What I bring" eyebrow="Product, business and people">
          <details className={styles.disclosure}>
            <summary>Product, platform and leadership scope<span aria-hidden="true" className={styles.toggle} /></summary>
            <div className={styles.disclosureBody}>
              <p className={styles.skillsIntro}>{content.summary}</p>
              <div className={styles.lifecycle}>
                <h3 className={styles.eyebrow}>Across the product lifecycle</h3>
                <ol className={styles.lifecycleSteps}>
                  {content.lifecycle.map((stage, index) => <li key={stage.label}>
                    <span className={styles.stageNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                    <h4>{stage.label}</h4><p>{stage.detail}</p>
                  </li>)}
                </ol>
              </div>
              <dl className={styles.skills}>{content.skills.map(skill => <div key={skill.area}><dt>{skill.area}</dt><dd>{skill.description}</dd></div>)}</dl>
            </div>
          </details>
          <div className={styles.closingActions}>
            <CvDownload className="ink-button" />
            <a href="https://www.linkedin.com/in/priyam-sameer" target="_blank" rel="noopener noreferrer" className={styles.textAction}>LinkedIn <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
          </div>
        </Section>
      </main>
      <Footer />
    </PublicShell>
  );
}
