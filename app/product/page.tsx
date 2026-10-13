import type { Metadata } from 'next';
import Link from 'next/link';
import { contentExcerpt } from '@/lib/content';
import { caseStudyPreview, groupCaseStudies, loadPublishedWork } from '@/lib/work';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import styles from '@/components/work/work.module.css';

export const metadata: Metadata = {
  title: 'My Work',
  description: 'The products, decisions and outcomes behind Priyam Sameer’s work in lending, agriculture and trade.',
};

export const revalidate = 0;

export default async function ProductWorkPage() {
  const groups = groupCaseStudies();
  const additionalWork = await loadPublishedWork();

  return (
    <PublicShell>
      <Header />
      <main id="main-content" className="animate-fade-in-up">
        <header className={styles.pageIntro}>
          <p className={styles.eyebrow}>Products, people and decisions</p>
          <h1>My work.</h1>
          <p>The products and projects behind my work: the problems, choices and outcomes, and the context that connects them.</p>
        </header>

        {groups.length > 1 && (
          <nav className={styles.companyNav} aria-label="Explore work by organisation and context">
            {groups.map(({ company, studies }) => <a key={company.id} href={`#${company.id}`}>{company.name}<small>{studies.length} {studies.length === 1 ? 'story' : 'stories'}</small></a>)}
          </nav>
        )}

        {groups.map(({ company, studies }) => (
          <section key={company.id} id={company.id} aria-labelledby={`${company.id}-title`} className={styles.companySection}>
            <header className={styles.companyHeader}>
              <div><p className={styles.period}>{company.period}</p><h2 id={`${company.id}-title`}>{company.name}</h2><p className={styles.role}>{company.role}</p></div>
              <p className={styles.description}>{company.summary}</p>
            </header>
            <div>
              {studies.map((study) => {
                const image = caseStudyPreview(study);
                const href = `/product/${encodeURIComponent(study.slug)}`;
                const outcome = study.outcomes[0];
                const download = study.downloads.find((file) => file.mime === 'application/pdf') || study.downloads[0];
                return (
                  <article key={study.id} className={`${styles.workRow}${image ? '' : ` ${styles.textOnly}`}`}>
                    <div>
                      <p className={styles.eyebrow}>{study.period}</p>
                      <h3><Link href={href}>{study.title}</Link></h3>
                      <p className={styles.rowSummary}>{study.summary}</p>
                      {outcome && <p className={styles.rowOutcome}>{outcome.value && <><strong>{outcome.value}</strong> · </>}{outcome.label}</p>}
                      <div className={styles.rowActions}>
                        <Link href={href}>Read the story <span aria-hidden="true">→</span></Link>
                        {download && <a href={download.url} download={download.filename}>{download.label} <span aria-hidden="true">↓</span></a>}
                      </div>
                    </div>
                    {image && <Link href={href} className={styles.preview} aria-label={`Read ${study.title}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.src} alt={image.alt} loading="lazy" />
                    </Link>}
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        {additionalWork.length > 0 && (
          <section className={styles.additionalSection} aria-labelledby="additional-work-title">
            <h2 id="additional-work-title">More product work</h2>
            {additionalWork.map((item) => {
              const image = item.media.find((media) => media.kind === 'image');
              const href = `/product/${encodeURIComponent(item.slug || item.id)}`;
              return (
                <article key={item.id} className={`${styles.workRow}${image ? '' : ` ${styles.textOnly}`}`}>
                  <div><h3><Link href={href}>{item.title}</Link></h3><p className={styles.rowSummary}>{contentExcerpt(item.summary || item.body_markdown, 240)}</p><div className={styles.rowActions}><Link href={href}>Read the story <span aria-hidden="true">→</span></Link></div></div>
                  {image && <Link href={href} className={styles.preview} aria-label={`Read ${item.title}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.blob_url} alt={image.alt_text || item.title} loading="lazy" />
                  </Link>}
                </article>
              );
            })}
          </section>
        )}

        {groups.length === 0 && additionalWork.length === 0 && <div className={styles.empty}><p>There are no published case studies here yet.</p><a href="mailto:Priyam.Sameer.95@gmail.com" className={styles.readLink}>Start a conversation <span aria-hidden="true">↗</span></a></div>}
      </main>
      <Footer />
    </PublicShell>
  );
}
