import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { Metadata } from 'next';
import content from './content.json';
import styles from './cv.module.css';

export const metadata: Metadata = {
  title: 'CV',
  description: content.summary,
};

const pdfFilename = 'Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section} aria-label={title}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

export default function CvPage() {
  return (
    <div className="min-h-screen bg-system-bg">
      <div className={['max-w-6xl mx-auto px-6 md:px-10 py-8 md:py-10', styles.shell].join(' ')}>
        <Header />
        <div className={[styles.toolbar, 'no-print'].join(' ')}>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-system-tertiary">Curriculum vitae</p>
          <a href={`/cv/${pdfFilename}`} download={pdfFilename} className={styles.download}>
            Download CV <span aria-hidden="true">↓</span>
          </a>
        </div>

        <main id="main-content" className={[styles.document, 'animate-fade-in-up'].join(' ')}>
          <div className={styles.identity}>
            <h1>{content.name}</h1>
            <div className={styles.contact} aria-label="Contact details and portfolio links">
              <span>India</span>
              <a href="mailto:priyam.sameer.95@gmail.com">priyam.sameer.95@gmail.com</a>
              <a href="tel:+918238452277">+91 8238452277</a>
              <a href="https://www.linkedin.com/in/priyam-sameer" target="_blank" rel="noopener noreferrer">linkedin.com/in/priyam-sameer<span className="sr-only"> (opens in a new tab)</span></a>
              <a href="https://github.com/priyamsameer95-sys/V1.03-Chat-eduloans" target="_blank" rel="noopener noreferrer">AI builds<span className="sr-only"> (opens in a new tab)</span></a>
              <a href="https://github.com/priyamsameer95-sys/eduloans" target="_blank" rel="noopener noreferrer">Source code<span className="sr-only"> (opens in a new tab)</span></a>
            </div>
          </div>

          <Section title="Summary">
            <p>{content.summary}</p>
          </Section>

          <Section title="Experience">
            {content.experience.map(job => (
              <article key={job.company} className={styles.job}>
                <div className={styles.company}>
                  <h3>{job.company}</h3>
                  <p className={styles.dates}>{job.dates}</p>
                </div>
                <p className={styles.roleTitle}>{job.title}</p>
                <p className={styles.context}>{job.context}</p>
                <ul className={styles.bullets}>
                  {job.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}
                </ul>
              </article>
            ))}
          </Section>

          <Section title="Education">
            <p>{content.education}</p>
          </Section>

          <Section title="Skills">
            <dl className={styles.skills}>
              {content.skills.map(skill => {
                const separator = skill.indexOf(':');
                return (
                  <div key={skill}>
                    <dt>{skill.slice(0, separator)}:</dt>
                    <dd>{skill.slice(separator + 1).trim()}</dd>
                  </div>
                );
              })}
            </dl>
          </Section>

          <Section title="Awards and recognition">
            <div className={styles.recognition}>
              {content.recognition.map(line => <p key={line}>{line}</p>)}
            </div>
          </Section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
