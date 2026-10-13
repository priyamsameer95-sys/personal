import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { findCaseStudy } from '@/lib/work';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import content from './content.json';
import styles from './cv.module.css';

export const metadata: Metadata = {
  title: 'Experience',
  description: 'Priyam Sameer’s career chronology: product leadership at CashKaro, CredFlow and Absolute, founding UrbanKhet, and distinct internship, community and independent work.',
  openGraph: { title: 'Experience — Priyam Sameer', description: 'My career in product leadership: CashKaro, CredFlow, Absolute and UrbanKhet, with internship, community and independent work.' },
  twitter: { title: 'Experience — Priyam Sameer', description: 'My career in product leadership: CashKaro, CredFlow, Absolute and UrbanKhet, with internship, community and independent work.' },
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className={styles.sectionTitle}>{title}</h2>
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
          <p className={styles.summary}>{content.summary}</p>
          <div className={styles.contact} aria-label="Contact Priyam">
            <a href="mailto:Priyam.Sameer.95@gmail.com">Contact Priyam <span aria-hidden="true">↗</span></a>
            <a href="https://www.linkedin.com/in/priyam-sameer" target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
            <Link href="/product">Explore my work <span aria-hidden="true">→</span></Link>
          </div>
        </header>

        <Section id="career" title="Employment and founder work">
          {content.experience.map(job => <article key={job.companyId} className={styles.job}>
            <div className={styles.company}><h3>{job.company}</h3><p className={styles.dates}>{job.dates}</p></div>
            <p className={styles.roleTitle}>{job.title}</p>
            {job.roleHistory.length > 0 && <ul className={styles.roleHistory}>{job.roleHistory.map(role => <li key={role}>{role}</li>)}</ul>}
            <p className={styles.context}>{job.context}</p>
            <ul className={styles.responsibilities}>
              {job.responsibilities.map(responsibility => <li key={responsibility.text}>
                <p>{responsibility.text}</p>
                {'result' in responsibility && <p className={styles.result}>{responsibility.result}</p>}
                {'note' in responsibility && <p className={styles.note}>{responsibility.note}</p>}
                <div className={styles.caseLinks}>{responsibility.cases.map(slug => <CaseLink key={slug} slug={slug} />)}</div>
              </li>)}
            </ul>
          </article>)}
        </Section>

        <Section id="internship" title="Internship">
          <article className={styles.contextCard}>
            <div className={styles.company}><h3>{content.internship.company}</h3><p className={styles.dates}>{content.internship.dates}</p></div>
            <p className={styles.roleTitle}>{content.internship.title}</p>
            <p>{content.internship.description}</p>
            <CaseLink slug={content.internship.caseSlug} />
          </article>
        </Section>

        <Section id="other-contexts" title="Incubation, community and independent work">
          <p className={styles.sectionIntro}>These activities have distinct relationships and are separate from my employment chronology.</p>
          <div className={styles.contextGrid}>{content.otherContexts.map(context => <article key={context.caseSlug} className={styles.contextCard}>
            <p className={styles.eyebrow}>{context.title}</p>
            <h3>{context.organisation}</h3><p className={styles.dates}>{context.dates}</p>
            <p>{context.description}</p>
            <CaseLink slug={context.caseSlug} />
          </article>)}</div>
        </Section>

        <Section id="education" title="Education and interests">
          <div className={styles.company}><h3>{content.education.institution}</h3><p className={styles.dates}>{content.education.dates}</p></div>
          <p className={styles.roleTitle}>{content.education.degree}</p>
          <p>{content.education.description}</p>
          <CaseLink slug={content.education.caseSlug} />
        </Section>

        <Section id="skills" title="What I bring">
          <dl className={styles.skills}>{content.skills.map(skill => <div key={skill.area}><dt>{skill.area}</dt><dd>{skill.description}</dd></div>)}</dl>
        </Section>

        <Section id="recognition" title="Recognition">
          <ul className={styles.recognition}>{content.recognition.map(line => <li key={line}>{line}</li>)}</ul>
        </Section>
      </main>
      <Footer />
    </PublicShell>
  );
}
