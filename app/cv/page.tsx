import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { findCaseStudy } from '@/lib/work';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import CvDownload from '@/components/CvDownload';
import BrandMarks from '@/components/BrandMarks';
import CompanyContext from '@/components/CompanyContext';
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

// The company account is open and stated once. These lines retain delivery
// facts that are not already part of the project-specific responsibility rows.
const deliveryScope: Record<string, string> = {
  cashkaro: 'Distribution and partner onboarding; recruitment across product, sales and operations; coordination with engineering, growth and lender teams; release follow-through and weekly funnel, MIS and service-level reviews.',
  credflow: 'Product economics, P&L and acquisition-cost analysis, working with engineering and go-to-market teams. Product analytics and MoEngage connected customer behaviour to delivery priorities.',
  absolute: 'Roadmaps, payment-failure analysis and shared priorities across product, engineering, data, agronomy, finance, operations and regional teams, with Jira and daily scrum.',
  urbankhet: 'P&L, early manual customer and farmer outreach, operating-team and SOP design, farmer and delivery coordination, and incubation and funding conversations.',
};

const roleOverview: Record<string, string> = {
  cashkaro: content.experience[0].responsibilities[0].text,
  credflow: 'I connected SME product journeys with launch, acquisition, activation and the economics of serving customers.',
  absolute: 'I led product work across commodity trade, recurring farmer needs, agricultural data and rural-credit products.',
  urbankhet: content.experience[3].responsibilities[0].text,
};

const projectLabels: Record<string, string> = {
  'cashkaro-personal-loan-marketplace': 'Personal-loan marketplace',
  'cashkaro-college-money-education-loans': 'Education-loan journeys',
  'cashkaro-lender-integration-operations': 'Lender integrations & operations',
  'cashkaro-eduloans-policy-workflow': 'EduLoans policy & verification',
  'cashkaro-lending-mcp-feedback': 'MCP policy-reuse proposal',
  'credflow-kuberx-launch': 'KuberX launch & activation',
  'credflow-pay-via-credit-card': 'Pay via Credit Card',
  'absolute-silkroute-marketplace': 'SilkRoute commodity trading',
  'absolute-trade-payments-erp': 'Trade payments & ERP',
  'absolute-upaj-farmer-experience': 'Upaj farmer experience',
  'absolute-farm-os-iot-gis': 'Farm OS',
  'absolute-rural-credit-uli': 'Agricultural data & rural credit',
  'absolute-ondc-credit-infrastructure': 'ONDC credit proposal',
  'absolute-crop-health-ai': 'Crop-health AI',
  'absolute-rainfall-grid-insurance': 'Rainfall-grid insurance',
  'absolute-upaj-international': 'International adaptation',
  'absolute-agri-input-institutional-commerce': 'Agri-input & institutional commerce',
  'absolute-supporting-portfolio': 'Supporting portfolio & proposals',
  'urbankhet-farm-to-fork': 'Building UrbanKhet',
  'urbankhet-covid-pivot': 'The COVID delivery pivot',
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
            <p className={styles.intro}>Product leader and former founder, combining AI-assisted product development with commercial ownership.</p>
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
              return <li key={job.companyId} id={job.companyId} className={styles.timelineItem}>
                <div className={styles.timelineDate}>
                  <span className={styles.timelineDot} aria-hidden="true" />
                  {jobIndex === 0 && <span className={styles.currentLabel}>Current role</span>}
                  <p>{job.dates}</p><span className={styles.relationship}>{job.relationship}</span>
                </div>
                <article className={styles.job} aria-labelledby={`${job.companyId}-title`}>
                  <CompanyContext companyId={job.companyId} headingId={`${job.companyId}-title`} />
                  <header className={styles.roleHeader}>
                    <p className={styles.detailTitle}>My role</p>
                    <p className={styles.roleTitle}>{job.title}</p>
                    <p className={styles.context}>{job.context}</p>
                    <p className={styles.ownership}>{roleOverview[job.companyId]}</p>
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

                  <section id={`${job.companyId}-responsibilities`} className={styles.workAccount} aria-labelledby={`${job.companyId}-work-title`}>
                    <h4 id={`${job.companyId}-work-title`} className={styles.detailTitle}>Product work & outcomes</h4>
                    <ul className={styles.responsibilities}>
                      {job.responsibilities.map((responsibility, index) => {
                        const isOverview = index === 0 && (job.companyId === 'cashkaro' || job.companyId === 'urbankhet');
                        // Personal lending is described in the following row; the
                        // broad CashKaro remit introduces the education-loan work.
                        const cases = job.companyId === 'cashkaro' && isOverview ? responsibility.cases.slice(1) : responsibility.cases;
                        const [primary, ...related] = cases;
                        return <li key={responsibility.text}>
                          <div className={styles.accountCopy}>
                            <CaseLink slug={primary} label={projectLabels[primary]} />
                            {!isOverview && <p>{responsibility.text}</p>}
                            {job.companyId === 'cashkaro' && isOverview && <p>Student applications, lender commercials and operating handoffs across education lending.</p>}
                            {job.companyId === 'urbankhet' && isOverview && <p>The web product and farm-to-customer operating model, from early outreach to sourcing and fulfilment.</p>}
                            {related.length > 0 && <div className={styles.caseLinks}>{related.map(slug => <CaseLink key={slug} slug={slug} label={projectLabels[slug]} />)}</div>}
                          </div>
                          {('result' in responsibility || 'note' in responsibility) && <div className={styles.accountResult}>
                            {'result' in responsibility && <p className={styles.result}>{responsibility.result}</p>}
                            {'note' in responsibility && <p className={styles.note}>{responsibility.note}</p>}
                          </div>}
                        </li>;
                      })}
                    </ul>
                    <div className={styles.deliveryScope}><h4 className={styles.detailTitle}>Delivery scope</h4><p>{deliveryScope[job.companyId]}</p></div>
                    <p className={styles.sourceNote}>{job.leadershipNote}</p>
                  </section>
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
                  <p className={styles.certificationCredential}><span>Credential ID</span> {certification.credentialId}</p>
                </div>
              </div>
            </li>)}
          </ul>
        </Section>

        <Section id="skills" title="What I bring" eyebrow="Product, business and people">
          <dl className={styles.skills}>{content.skills.map(skill => <div key={skill.area}><dt>{skill.area}</dt><dd>{skill.description}</dd></div>)}</dl>
          <div className={styles.lifecycle}>
            <h3 className={styles.detailTitle}>Across the product lifecycle</h3>
            <ol className={styles.lifecycleSteps}>{content.lifecycle.map(stage => <li key={stage.label}><h4>{stage.label}</h4><p>{stage.detail}</p></li>)}</ol>
          </div>
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
