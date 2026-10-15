import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { findCaseStudy } from '@/lib/work';
import { getCompanyContext } from '@/lib/company-context';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import CvDownload from '@/components/CvDownload';
import BrandMarks from '@/components/BrandMarks';
import content from './content.json';
import styles from './cv.module.css';

export const metadata: Metadata = {
  title: 'Experience & CV',
  description: 'Priyam Sameer’s career in lending products, partner platforms and commercial ownership: CashKaro, CredFlow, Absolute and UrbanKhet. Roles, dates, relevant work and a downloadable CV.',
  openGraph: { title: 'Experience & CV — Priyam Sameer', description: 'Product leadership, partner platforms and founder experience. Explore the career record or download the CV.' },
  twitter: { title: 'Experience & CV — Priyam Sameer', description: 'Product leadership, partner platforms and founder experience. Explore the career record or download the CV.' },
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className={styles.sectionTitle}>{title}</h2>
    {children}
  </section>;
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>{children}<span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>;
}

function CaseLink({ slug, label }: { slug: string; label: string }) {
  const study = findCaseStudy(slug);
  return study ? <Link href={`/product/${encodeURIComponent(study.slug)}`} className={styles.caseLink}>{label}</Link> : null;
}

function RelatedWork({ items }: { items: readonly { slug: string; label: string }[] }) {
  return <ul className={styles.caseLinks} aria-label="Related work">{items.map(item => <li key={item.slug}><CaseLink {...item} /></li>)}</ul>;
}

export default function ExperiencePage() {
  return <PublicShell className={styles.shell}>
    <Header />
    <main id="main-content" className={styles.document}>
      <header className={styles.identity}>
        <div>
          <p className={styles.documentLabel}>Experience & CV</p>
          <h1>{content.name}</h1>
          <p className={styles.profession}>{content.profession} <span>· {content.location}</span></p>
          <p className={styles.summary}>{content.summary}</p>
          <div className={styles.contactLinks}>
            <a href={`mailto:${content.contacts.email}`} className={styles.externalLink}>{content.contacts.email}</a>
            <a href={content.contacts.phoneHref} className={styles.externalLink}>{content.contacts.phone}</a>
            <ExternalLink href={content.contacts.websiteUrl}>{content.contacts.website}</ExternalLink>
            <ExternalLink href={content.contacts.linkedinUrl}>LinkedIn</ExternalLink>
          </div>
        </div>
        <CvDownload className="ink-button" />
      </header>

      <nav className={styles.pageNav} aria-label="On this page">
        <a href="#career">Career</a><a href="#internship">Internship</a><a href="#other-contexts">Other experience</a><a href="#education">Education</a><a href="#recognition">Recognition</a><a href="#certifications">Learning</a><a href="#skills">Capabilities</a>
      </nav>

      <Section id="career" title="Career">
        <ol className={styles.career}>
          {content.experience.map(job => {
            const company = getCompanyContext(job.companyId);
            return <li key={job.companyId} id={job.companyId} className={styles.careerEntry}>
              <p className={styles.dates}>{job.dates}</p>
              <article className={styles.job} aria-labelledby={`${job.companyId}-title`}>
                <header className={styles.companyHeader}>
                  <BrandMarks companyId={job.companyId} className={styles.companyMarks} />
                  <h3 id={`${job.companyId}-title`} className={styles.companyName}>{job.company}</h3>
                  <div className={styles.companyContext}>
                    <p>{job.companyDescription}</p>
                    {company?.websites.map(website => <ExternalLink key={website.href} href={website.href}>{website.label}</ExternalLink>)}
                  </div>
                </header>

                {job.progression.length > 1 ? <ol className={styles.roles} aria-label={`Roles at ${job.company}`}>
                  {[...job.progression].reverse().map(role => <li key={role.title}>
                    <p className={styles.roleTitle}>{role.title}</p><p className={styles.roleDates}>{role.dates}</p>
                  </li>)}
                </ol> : <p className={styles.singleRole}>{job.title}</p>}

                <section id={`${job.companyId}-responsibilities`} className={styles.workAccount} aria-labelledby={`${job.companyId}-work-title`}>
                  <h4 id={`${job.companyId}-work-title`} className="sr-only">Responsibilities and selected work</h4>
                  <ul className={styles.responsibilities}>{job.responsibilities.map(responsibility => <li key={responsibility.text}>{responsibility.text}</li>)}</ul>
                  <RelatedWork items={job.cases} />
                  {'ventureSupport' in job && job.ventureSupport && <p id={job.ventureSupport.id} className={styles.ventureSupport}>{job.ventureSupport.text} <CaseLink {...job.ventureSupport.case} /></p>}
                </section>
              </article>
            </li>;
          })}
        </ol>
      </Section>

      <Section id="internship" title="Internship">
        <article className={styles.cvEntry} id="water-farmers">
          <p className={styles.dates}>{content.internship.dates}</p>
          <div>
            <BrandMarks companyId={content.internship.companyId} className={styles.companyMarks} />
            <h3 className={styles.companyName}>{content.internship.company}</h3>
            <p className={styles.singleRole}>{content.internship.title}</p>
            <p>{content.internship.description}</p>
            <div className={styles.entryLinks}><CaseLink slug={content.internship.caseSlug} label={content.internship.caseLabel} /><ExternalLink href={content.internship.website}>Water Farmers website</ExternalLink></div>
          </div>
        </article>
      </Section>

      <Section id="other-contexts" title="Other experience">
        <div className={styles.otherEntries}>{content.otherContexts.map(context => <article key={context.caseSlug} id={context.id} className={styles.cvEntry}>
          <p className={styles.dates}>{context.dates || context.title}</p>
          <div>
            <h3 className={styles.entryTitle}>{context.organisation}{context.dates && <span> · {context.title}</span>}</h3>
            <p className={styles.entryCopy}>{context.description}</p>
            <div className={styles.entryLinks}><CaseLink slug={context.caseSlug} label={context.caseLabel} /></div>
          </div>
        </article>)}</div>
      </Section>

      <Section id="education" title="Education">
        <div className={styles.cvEntry} id="cept">
          <p className={styles.dates}>{content.education.dates}</p>
          <div>
            <BrandMarks companyId="cept" className={styles.companyMarks} />
            <h3 className={styles.companyName}>{content.education.institution}</h3>
            <p className={styles.degree}>{content.education.degree}</p>
            <p className={styles.entryCopy}>{content.education.description}</p>
            <div className={styles.entryLinks}><ExternalLink href={content.education.website}>CEPT University website</ExternalLink><CaseLink slug={content.education.caseSlug} label={content.education.caseLabel} /><Link href="/art" className={styles.caseLink}>Paintings</Link></div>
          </div>
        </div>
      </Section>

      <Section id="recognition" title="Recognition">
        <ul className={styles.recognition}>{content.recognitionDetails.map(item => <li key={item.title}><strong>{item.title}</strong><span>{item.context}</span></li>)}</ul>
      </Section>

      <Section id="certifications" title="Certifications & learning">
        <ul className={styles.certifications}>{content.certifications.map(certification => <li key={certification.credentialUrl}>
          <div><h3 className={styles.entryTitle}>{certification.title}</h3><p>{certification.issuer} · <time dateTime={certification.issuedDate}>{certification.issued}</time></p></div>
          <ExternalLink href={certification.credentialUrl}>View credential<span className="sr-only"> for {certification.title}</span></ExternalLink>
        </li>)}</ul>
      </Section>

      <Section id="skills" title="Core capabilities">
        <dl className={styles.skills}>{content.skills.map(skill => <div key={skill.area}><dt>{skill.area}</dt><dd>{skill.description}</dd></div>)}</dl>
      </Section>
    </main>
    <Footer />
  </PublicShell>;
}
