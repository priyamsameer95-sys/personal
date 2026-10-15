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
import EmailContact from '@/components/EmailContact';
import Icon from '@/components/Icon';
import content from './content.json';
import styles from './cv.module.css';

export const metadata: Metadata = {
  title: 'Experience & CV',
  description: 'Priyam Sameer’s career in lending products, partner platforms and commercial ownership: CashKaro, CredFlow, Absolute and UrbanKhet. Roles, dates, relevant work and a downloadable CV.',
  openGraph: { title: 'Experience & CV — Priyam Sameer', description: 'Product leadership, partner platforms and founder experience. Explore the career record or download the CV.', images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Priyam Sameer — product leadership' }] },
  twitter: { card: 'summary_large_image', images: ['/twitter-image'], title: 'Experience & CV — Priyam Sameer', description: 'Product leadership, partner platforms and founder experience. Explore the career record or download the CV.' },
};

function Section({ id, title, children, nested = false }: { id: string; title: string; children: ReactNode; nested?: boolean }) {
  const Heading = nested ? 'h3' : 'h2';
  return <section id={id} tabIndex={-1} className={styles.section} aria-labelledby={`${id}-title`}>
    <Heading id={`${id}-title`} className={styles.sectionTitle}>{title}</Heading>
    {children}
  </section>;
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>{children}<Icon name="arrow-up-right" /><span className="sr-only"> (opens in a new tab)</span></a>;
}

function CaseLink({ slug, label }: { slug: string; label: string }) {
  const study = findCaseStudy(slug);
  return study ? <Link href={`/product/${encodeURIComponent(study.slug)}`} className={styles.caseLink}>{label}</Link> : null;
}

function RelatedWork({ items }: { items: readonly { slug: string; label: string }[] }) {
  return <div className={styles.proofWork}>
    <p className={styles.proofLabel}>Selected work</p>
    <ul className={styles.caseLinks} aria-label="Related work">
      {items.map(item => <li key={item.slug}><CaseLink {...item} /></li>)}
    </ul>
  </div>;
}

export default function ExperiencePage() {
  return <PublicShell className={styles.shell}>
    <Header />
    <main id="main-content" className={styles.document}>
      <header className={styles.introduction}>
        <div>
          <h1>Experience.</h1>
          <p className={styles.summary}>{content.summary}</p>
        </div>
        <CvDownload className="ink-button" />
      </header>

      <nav className={styles.pageNav} aria-label="On this page">
        <a href="#career">Career</a>
        <a href="#background">Background</a>
        <a href="#certifications">Learning & capabilities</a>
      </nav>

      <Section id="career" title="Career">
        <ol className={styles.career}>
          {content.experience.map(job => {
            const company = getCompanyContext(job.companyId);
            const [website, ...productWebsites] = company?.websites || [];
            return <li key={job.companyId} id={job.companyId} tabIndex={-1} className={styles.careerEntry}>
              <article className={styles.job} aria-labelledby={`${job.companyId}-title`}>
                <div className={styles.companyRail}>
                  <BrandMarks companyId={job.companyId} className={styles.companyMarks} />
                  <header className={styles.companyHeader}>
                    <h3 id={`${job.companyId}-title`} className={styles.companyName}>
                      {website ? <ExternalLink href={website.href}>{website.label.replace(/\s+website$/i, '')}</ExternalLink> : job.company}
                    </h3>
                    <p className={styles.companyContext}>{job.companyDescription}</p>
                    {productWebsites.length > 0 && <div className={styles.productLinks}>
                      {productWebsites.map(product => <ExternalLink key={product.href} href={product.href}>{product.label.replace(/\s+website$/i, '')}</ExternalLink>)}
                    </div>}
                  </header>
                  <p className={styles.dates}>{job.dates}</p>
                </div>

                <section id={`${job.companyId}-responsibilities`} tabIndex={-1} className={styles.workAccount} aria-labelledby={`${job.companyId}-work-title`}>
                  {job.progression.length > 1 ? <ol className={styles.roles} aria-label={`Roles at ${job.company}`}>
                    {[...job.progression].reverse().map((role,index) => {
                      const RoleHeading = index === 0 ? 'h4' : 'p';
                      return <li key={role.title}>
                        <RoleHeading id={index === 0 ? `${job.companyId}-work-title` : undefined} className={styles.roleTitle}>{role.title}</RoleHeading>
                        <p className={styles.roleDates}>{role.dates}</p>
                      </li>;
                    })}
                  </ol> : <h4 id={`${job.companyId}-work-title`} className={styles.singleRole}>{job.title}</h4>}
                  <ul className={styles.responsibilities}>{job.responsibilities.map(responsibility => <li key={responsibility.text}>{responsibility.text}</li>)}</ul>
                  <RelatedWork items={job.cases} />
                  {'ventureSupport' in job && job.ventureSupport && <div id={job.ventureSupport.id} tabIndex={-1} className={styles.ventureSupport}>
                    <p>{job.ventureSupport.text}</p>
                    <CaseLink {...job.ventureSupport.case} />
                  </div>}
                </section>
              </article>
            </li>;
          })}
        </ol>
      </Section>

      <section id="background" tabIndex={-1} className={styles.background} aria-labelledby="background-title">
        <h2 id="background-title" className={styles.groupTitle}>Background</h2>
        <div className={styles.backgroundGrid}>
          <Section id="internship" title="Early experience" nested>
            <article className={styles.backgroundEntry} id="water-farmers" tabIndex={-1}>
              <BrandMarks companyId={content.internship.companyId} small className={styles.backgroundMark} />
              <h4 className={styles.entryTitle}><ExternalLink href={content.internship.website}>{content.internship.company}</ExternalLink></h4>
              <p className={styles.entryRole}>{content.internship.title}</p>
              <p className={styles.dates}>{content.internship.dates}</p>
              <p className={styles.entryCopy}>{content.internship.description}</p>
              <div className={styles.entryLinks}><CaseLink slug={content.internship.caseSlug} label={content.internship.caseLabel} /></div>
            </article>
          </Section>

          <Section id="other-contexts" title="Independent & community work" nested>
            <div className={styles.otherEntries}>{content.otherContexts.map(context => <article key={context.caseSlug} id={context.id} tabIndex={-1} className={styles.backgroundEntry}>
              <h4 className={styles.entryTitle}>{context.organisation}</h4>
              <p className={styles.entryRole}>{context.title}</p>
              {context.dates && <p className={styles.dates}>{context.dates}</p>}
              <p className={styles.entryCopy}>{context.description}</p>
              <div className={styles.entryLinks}><CaseLink slug={context.caseSlug} label={context.caseLabel} /></div>
            </article>)}</div>
          </Section>

          <Section id="education" title="Education" nested>
            <div className={styles.backgroundEntry} id="cept" tabIndex={-1}>
              <BrandMarks companyId="cept" small className={styles.backgroundMark} />
              <h4 className={styles.entryTitle}><ExternalLink href={content.education.website}>{content.education.institution}</ExternalLink></h4>
              <p className={styles.degree}>{content.education.degree}</p>
              <p className={styles.dates}>{content.education.dates}</p>
              <p className={styles.entryCopy}>{content.education.description}</p>
              <div className={styles.entryLinks}>
                <CaseLink slug={content.education.caseSlug} label={content.education.caseLabel} />
                <Link href="/art" className={styles.caseLink}>Paintings</Link>
              </div>
            </div>
          </Section>

          <Section id="recognition" title="Recognition" nested>
            <ul className={styles.recognition}>{content.recognitionDetails.map(item => <li key={item.title}>
              <strong>{item.title}</strong><span>{item.context}</span>
            </li>)}</ul>
          </Section>
        </div>
      </section>

      <div className={styles.learningGrid}>
        <Section id="certifications" title="Certifications & learning">
          <ul className={styles.certifications}>{content.certifications.map(certification => <li key={certification.credentialUrl}>
            <h3 className={styles.entryTitle}>{certification.title}</h3>
            <p>{certification.issuer} · <time dateTime={certification.issuedDate}>{certification.issued}</time></p>
            <ExternalLink href={certification.credentialUrl}>View credential<span className="sr-only"> for {certification.title}</span></ExternalLink>
          </li>)}</ul>
        </Section>
        <Section id="skills" title="Core capabilities">
          <dl className={styles.skills}>{content.skills.map(skill => <div key={skill.area}>
            <dt>{skill.area}</dt><dd>{skill.description}</dd>
          </div>)}</dl>
        </Section>
      </div>

      <div className={styles.contactRecord}>
        <p>{content.profession} <span>{content.location}</span></p>
        <nav className={styles.contactLinks} aria-label="CV contact details">
          <EmailContact email={content.contacts.email} linkClassName={styles.externalLink} />
          <a href={content.contacts.phoneHref} className={styles.externalLink}>{content.contacts.phone}</a>
          <ExternalLink href={content.contacts.websiteUrl}>{content.contacts.website}</ExternalLink>
          <ExternalLink href={content.contacts.linkedinUrl}>LinkedIn</ExternalLink>
        </nav>
      </div>
    </main>
    <Footer compact />
  </PublicShell>;
}
