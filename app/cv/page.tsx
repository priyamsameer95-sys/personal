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
  description: 'Priyam Sameer’s CV: roles, promotions, product responsibilities and reported results at CashKaro / BankKaro, CredFlow, Absolute / Upaj and UrbanKhet, plus education and certifications.',
  openGraph: { title: 'Experience & CV — Priyam Sameer', description: 'Career chronology, responsibilities, product work and the original CV.' },
  twitter: { title: 'Experience & CV — Priyam Sameer', description: 'Career chronology, responsibilities, product work and the original CV.' },
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} className={styles.section} aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className={styles.sectionTitle}>{title}</h2>
    {children}
  </section>;
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>{children} <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>;
}

function CaseLink({ slug, label }: { slug: string; label?: string }) {
  const study = findCaseStudy(slug);
  return study ? <Link href={`/product/${encodeURIComponent(study.slug)}`} className={styles.caseLink}>{label || study.title}<span className="sr-only"> — proof of work</span></Link> : null;
}

function ProofLinks({ slugs }: { slugs: readonly string[] }) {
  return <span className={styles.proofLinks}> ({slugs.map((slug, index) => <span key={slug}>{index > 0 && '; '}<CaseLink slug={slug} label={projectLabels[slug]} /></span>)})</span>;
}

// One line identifies each business. Company-wide scale is not a CV result.
const companyDescription: Record<string, string> = {
  cashkaro: 'Cashback, savings and financial-products marketplaces.',
  credflow: 'Finance software, working capital and payments for MSMEs.',
  absolute: 'Bioscience, agricultural data and farmer products.',
  urbankhet: 'Farm-to-customer produce venture for households and business buyers.',
};

// Source-supported delivery responsibilities not already stated in project rows.
const deliveryScope: Record<string, string> = {
  cashkaro: 'Discovery, prioritisation and release follow-through; distribution and partner onboarding; recruitment across product, sales and operations; coordination with engineering, growth and lender teams; weekly funnel, MIS and service-level reviews.',
  credflow: 'Launch planning and onboarding; product economics, P&L and acquisition-cost analysis; partnership with engineering and go-to-market teams, using product analytics and MoEngage.',
  absolute: 'Roadmaps, payment-failure analysis and shared delivery priorities across product, engineering, data, agronomy, finance, operations and regional teams, with Jira and daily scrum.',
  urbankhet: 'P&L, early manual customer and farmer outreach, operating-team and SOP design, farmer and delivery coordination, and incubation and funding conversations.',
};

const projectLabels: Record<string, string> = {
  'cashkaro-personal-loan-marketplace': 'Personal loans',
  'cashkaro-college-money-education-loans': 'Education loans',
  'cashkaro-lender-integration-operations': 'Lender integrations',
  'cashkaro-eduloans-policy-workflow': 'EduLoans prototype',
  'cashkaro-lending-mcp-feedback': 'MCP proposal',
  'credflow-kuberx-launch': 'KuberX',
  'credflow-pay-via-credit-card': 'Pay via Credit Card',
  'absolute-silkroute-marketplace': 'SilkRoute',
  'absolute-trade-payments-erp': 'Trade payments & ERP',
  'absolute-upaj-farmer-experience': 'Upaj',
  'absolute-farm-os-iot-gis': 'Farm OS',
  'absolute-rural-credit-uli': 'Agricultural credit risk & ULI',
  'absolute-ondc-credit-infrastructure': 'ONDC proposal',
  'absolute-crop-health-ai': 'Crop-health AI',
  'absolute-rainfall-grid-insurance': 'Rainfall-grid insurance',
  'absolute-upaj-international': 'International adaptation',
  'absolute-agri-input-institutional-commerce': 'Agri-input & institutional commerce',
  'absolute-supporting-portfolio': 'Supporting portfolio & proposals',
  'urbankhet-farm-to-fork': 'UrbanKhet product & operations',
  'urbankhet-covid-pivot': 'COVID delivery pivot',
};

function cvText(text: string) {
  const sentence = text.replace(/^I /, '');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export default function ExperiencePage() {
  return <PublicShell className={styles.shell}>
    <Header />
    <main id="main-content" className={styles.document}>
      <header className={styles.identity}>
        <div>
          <p className={styles.documentLabel}>Experience & CV</p>
          <h1>{content.name}</h1>
          <p className={styles.profession}>Product Management & Business Growth</p>
          <p className={styles.location}>{content.location}</p>
          <div className={styles.contactLinks}>
            <a href="mailto:Priyam.Sameer.95@gmail.com" className={styles.externalLink}>Priyam.Sameer.95@gmail.com</a>
            <ExternalLink href="https://www.linkedin.com/in/priyam-sameer">LinkedIn</ExternalLink>
          </div>
        </div>
        <CvDownload className="ink-button" />
      </header>

      <nav className={styles.pageNav} aria-label="On this page">
        <a href="#career">Career</a><a href="#internship">Internship</a><a href="#other-contexts">Other experience</a><a href="#education">Education</a><a href="#recognition">Recognition</a><a href="#certifications">Certifications</a><a href="#skills">Skills</a>
      </nav>

      <Section id="career" title="Career">
        <ol className={styles.career}>
          {content.experience.map((job, index) => {
            const company = getCompanyContext(job.companyId);
            return <li key={job.companyId} id={job.companyId} className={styles.careerEntry}>
              <div className={styles.tenure}>
                {index === 0 && <p className={styles.current}>Current</p>}
                <p className={styles.dates}>{job.dates}</p>
                <p className={styles.relationship}>{job.relationship}</p>
              </div>
              <article className={styles.job} aria-labelledby={`${job.companyId}-title`}>
                <header className={styles.companyHeader}>
                  <BrandMarks companyId={job.companyId} className={styles.companyMarks} />
                  <h3 id={`${job.companyId}-title`} className={styles.companyName}>{job.company}</h3>
                  <p className={styles.companyDescription}>{companyDescription[job.companyId]}</p>
                  {company && company.websites.length > 0 && <div className={styles.websiteLinks}>{company.websites.map(website => <ExternalLink key={website.href} href={website.href}>{website.label}</ExternalLink>)}</div>}
                </header>

                {job.progression.length > 1 ? <ol className={styles.roles} aria-label={`Dated roles at ${job.company}`}>
                  {[...job.progression].reverse().map((role, roleIndex) => <li key={role.title}>
                    <div><p className={styles.roleTitle}>{roleIndex === 0 ? job.title : role.title}</p>{!(roleIndex === 0 ? job.title : role.title).includes(role.detail) && <p className={styles.roleDetail}>{role.detail}</p>}</div>
                    <p className={styles.roleDates}>{role.dates}</p>
                  </li>)}
                </ol> : <p className={styles.singleRole}>{job.title}</p>}

                <section id={`${job.companyId}-responsibilities`} className={styles.workAccount} aria-labelledby={`${job.companyId}-work-title`}>
                  <h4 id={`${job.companyId}-work-title`} className="sr-only">Responsibilities and results</h4>
                  <ul className={styles.responsibilities}>
                    {job.responsibilities.map(responsibility => <li key={responsibility.text}>
                      <p>{cvText(responsibility.text)}<ProofLinks slugs={responsibility.cases} /></p>
                      {('result' in responsibility || 'note' in responsibility) && <p className={styles.resultLine}>{'result' in responsibility && <strong>{responsibility.result}</strong>}{'note' in responsibility && <span className={styles.qualification}>{'result' in responsibility && ' '}{responsibility.note}</span>}</p>}
                    </li>)}
                    <li><p>{deliveryScope[job.companyId]}</p></li>
                  </ul>
                  <p className={styles.sourceNote}>{job.leadershipNote}</p>
                </section>
              </article>
            </li>;
          })}
        </ol>
      </Section>

      <Section id="internship" title="Internship">
        <article className={styles.cvEntry}>
          <div className={styles.tenure}><p className={styles.dates}>{content.internship.dates}</p><p className={styles.relationship}>Internship</p></div>
          <div>
            <BrandMarks companyId="water-farmers" />
            <h3 className={styles.companyName}>{content.internship.company}</h3>
            <p className={styles.companyDescription}>Aquaponics farm design and operations.</p>
            <ExternalLink href="https://waterfarmers.com/">Water Farmers website</ExternalLink>
            <p className={styles.singleRole}>{content.internship.title}</p>
            <p>{cvText(content.internship.description)} <span className={styles.proofLinks}>(<CaseLink slug={content.internship.caseSlug} label="Aquaponics operations" />)</span></p>
            <p className={styles.sourceNote}>{content.internship.scope}</p>
          </div>
        </article>
      </Section>

      <Section id="other-contexts" title="Other experience">
        <div className={styles.otherEntries}>{content.otherContexts.map(context => <article key={context.caseSlug} id={findCaseStudy(context.caseSlug)?.companyId} className={styles.cvEntry}>
          <div className={styles.tenure}><p className={styles.dates}>{context.dates}</p><p className={styles.relationship}>{context.title}</p></div>
          <div>
            <BrandMarks companyId={findCaseStudy(context.caseSlug)?.companyId} small />
            <h3 className={styles.entryTitle}>{context.organisation}</h3>
            {findCaseStudy(context.caseSlug)?.companyId === 'founder-programmes' && <div className={styles.websiteLinks}><ExternalLink href="https://iimaventures.com/">IIMA Ventures website</ExternalLink><ExternalLink href="https://gusec.edu.in/">GUSEC website</ExternalLink></div>}
            <p className={styles.entryCopy}>{context.description} <span className={styles.proofLinks}>(<CaseLink slug={context.caseSlug} label="Related work" />)</span></p>
          </div>
        </article>)}</div>
      </Section>

      <div className={styles.foundationGrid}>
        <Section id="education" title="Education">
          <BrandMarks companyId="cept" />
          <h3 className={styles.companyName}>{content.education.institution}</h3>
          <ExternalLink href="https://cept.ac.in/">CEPT University website</ExternalLink>
          <p className={styles.degree}>{content.education.degree}</p>
          <p className={styles.dates}>{content.education.dates}</p>
          <p className={styles.entryCopy}>{content.education.description} <span className={styles.proofLinks}>(<CaseLink slug={content.education.caseSlug} label="Football & creative practice" />)</span></p>
        </Section>
        <Section id="recognition" title="Recognition">
          <ul className={styles.recognition}>{content.recognitionDetails.map(item => <li key={item.title}><h3 className={styles.entryTitle}>{item.title}</h3><p className={styles.relationship}>{item.context}</p></li>)}</ul>
        </Section>
      </div>

      <Section id="certifications" title="Certifications">
        <ul className={styles.certifications}>{content.certifications.map(certification => <li key={certification.credentialId}>
          <BrandMarks brandIds={[certification.brandId]} small className={styles.certificationBrand} />
          <div>
            <h3 className={styles.entryTitle}>{certification.title}</h3>
            <p className={styles.certificationMeta}>{certification.issuer} · Issued <time dateTime={certification.issuedDate}>{certification.issued}</time></p>
            <p className={styles.credentialId}>Credential ID {certification.credentialId}</p>
            <ExternalLink href={certification.credentialUrl}>View credential<span className="sr-only"> for {certification.title}</span></ExternalLink>
          </div>
        </li>)}</ul>
      </Section>

      <Section id="skills" title="Skills">
        <dl className={styles.skills}>{content.skills.map(skill => <div key={skill.area}><dt>{skill.area}</dt><dd>{skill.description}</dd></div>)}</dl>
      </Section>
    </main>
    <Footer />
  </PublicShell>;
}
