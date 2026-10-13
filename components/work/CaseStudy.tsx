import Link from 'next/link';
import { findWorkCompany, getCaseStudyMedia, relatedCaseStudies } from '@/lib/work';
import type { CaseStudy as CaseStudyData, CaseStudyMedia } from '@/lib/work-types';
import styles from './work.module.css';
import DownloadBundle from './DownloadBundle';

export function fileSize(bytes?: number): string | undefined {
  if (!bytes || bytes < 1) return undefined;
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;
}

function Media({ media, priority = false }: { media: CaseStudyMedia; priority?: boolean }) {
  const isLongImage = media.kind === 'image' && Boolean(media.width && media.height && media.height > media.width * 2.5);
  return (
    <figure className={`${styles.figure}${media.kind === 'video' ? ` ${styles.videoFigure}` : ''}`}>
      {media.kind === 'image' ? (
        <a href={media.src} target="_blank" rel="noopener noreferrer" aria-label={`Open full-size image: ${media.alt} (opens in a new tab)`} className={styles.imageLink}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media.src} alt={media.alt} width={media.width} height={media.height} loading={priority ? 'eager' : 'lazy'} className={`${styles.image}${isLongImage ? ` ${styles.longImage}` : ''}`} />
          {isLongImage && <span className={styles.imageHint}>View full-size image <span aria-hidden="true">↗</span></span>}
        </a>
      ) : (
        <>
          <video className={styles.video} controls playsInline preload="metadata" poster={media.poster} aria-label={media.title}>
            <source src={media.src} type={media.mime || 'video/mp4'} />
            {media.captions?.map((track, index) => <track key={track.src} kind="captions" src={track.src} srcLang={track.language} label={track.label} default={index === 0} />)}
            Your browser cannot play this video. <a href={media.src}>Open the video</a>.
          </video>
          {media.transcript && (
            <details className={styles.transcript}>
              <summary>Video description</summary>
              <p>{media.transcript}</p>
            </details>
          )}
        </>
      )}
      {media.caption && <figcaption>{media.caption}{media.kind === 'video' && media.duration ? ` · ${media.duration}` : ''}</figcaption>}
    </figure>
  );
}

export default function CaseStudy({ study }: { study: CaseStudyData }) {
  const company = findWorkCompany(study.companyId);
  const hero = study.media.find((media) => media.id === study.heroMediaId);
  const usedMedia = new Set([study.heroMediaId, ...study.sections.flatMap((section) => section.mediaIds || [])]);
  const additionalMedia = study.media.filter((media) => !usedMedia.has(media.id));
  const related = relatedCaseStudies(study);

  return (
    <>
      <Link href={company ? `/product#${company.id}` : '/product'} className={styles.backLink}><span aria-hidden="true">←</span> All work{company ? ` / ${company.name}` : ''}</Link>
      <article className={styles.caseStudy}>
        <header className={styles.caseHeader}>
          <p className={styles.eyebrow}>{company?.name || 'Product work'} · {study.period}</p>
          <h1>{study.title}</h1>
          <p className={styles.caseSummary}>{study.summary}</p>
          <dl className={styles.context}>
            <div><dt>My role</dt><dd>{study.role}</dd></div>
            <div><dt>When</dt><dd>{study.period}</dd></div>
            {company && <div><dt>Organisation / context</dt><dd>{company.name}</dd></div>}
          </dl>
        </header>

        {hero && <div className={styles.heroMedia}><Media media={hero} priority /></div>}

        {study.outcomes.length > 0 && (
          <section className={styles.outcomesSection} aria-labelledby="outcomes-title">
            <h2 id="outcomes-title">The outcomes</h2>
            <dl className={styles.outcomes}>
              {study.outcomes.map((outcome, index) => (
                <div key={`${outcome.label}-${index}`}>
                  <dt>{outcome.label}</dt>
                  {outcome.value && <dd className={styles.outcomeValue}>{outcome.value}</dd>}
                  {outcome.detail && <dd className={styles.outcomeDetail}>{outcome.detail}</dd>}
                </div>
              ))}
            </dl>
          </section>
        )}

        {study.sections.length > 1 && (
          <nav className={styles.storyNav} aria-label="In this case study">
            <span>In this story</span>
            {study.sections.map((section) => <a key={section.id} href={`#story-${section.id}`}>{section.title}</a>)}
            {study.downloads.length > 0 && <a href="#downloads">Downloads</a>}
          </nav>
        )}

        <div className={styles.story}>
          {study.sections.map((section, index) => {
            const media = getCaseStudyMedia(study, section.mediaIds || []);
            return (
              <section key={section.id} id={`story-${section.id}`} className={styles.storySection} aria-labelledby={`heading-${section.id}`}>
                <div className={styles.sectionHeading}><span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h2 id={`heading-${section.id}`}>{section.title}</h2></div>
                <div className={styles.sectionBody}>
                  {section.body.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
                  {section.bullets && section.bullets.length > 0 && <ul>{section.bullets.map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}</ul>}
                  {media.length > 0 && <div className={media.length > 1 ? styles.gallery : styles.singleMedia}>{media.map((asset) => <Media key={asset.id} media={asset} />)}</div>}
                </div>
              </section>
            );
          })}
        </div>

        {additionalMedia.length > 0 && (
          <section className={styles.materialsSection} aria-labelledby="materials-title">
            <h2 id="materials-title">A closer look</h2>
            <div className={styles.gallery}>{additionalMedia.map((media) => <Media key={media.id} media={media} />)}</div>
          </section>
        )}

        {study.downloads.length > 0 && (
          <section id="downloads" className={styles.downloadsSection} aria-labelledby="downloads-title">
            <h2 id="downloads-title">Take a closer look</h2>
            <p>Download the case study and supporting materials.</p>
            <div className={styles.downloads}>
              {study.downloads.map((download) => (
                download.parts?.length ? <DownloadBundle key={download.url} download={download} /> : <a key={download.url} href={download.url} download={download.filename} className={styles.download}>
                  <div className={styles.downloadCopy}><strong>{download.label}</strong>{download.description && <span>{download.description}</span>}<small>{[download.filename.split('.').pop()?.toUpperCase(), fileSize(download.bytes)].filter(Boolean).join(' · ')}</small></div>
                  <span aria-hidden="true">↓</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {study.sourceNotes && study.sourceNotes.length > 0 && <aside className={styles.sourceNotes} aria-label="About these materials">{study.sourceNotes.map((note, index) => <p key={index}>{note}</p>)}</aside>}
      </article>

      {related.length > 0 && (
        <section className={styles.relatedSection} aria-labelledby="related-title">
          <div className={styles.sectionIntro}><h2 id="related-title">Keep exploring</h2><Link href="/product">All work <span aria-hidden="true">↗</span></Link></div>
          <div className={styles.related}>{related.map((other) => <Link key={other.id} href={`/product/${encodeURIComponent(other.slug)}`}><span>{findWorkCompany(other.companyId)?.name}</span><h3>{other.title}</h3><p>{other.summary}</p><span className={styles.readLink}>Read story <span aria-hidden="true">→</span></span></Link>)}</div>
        </section>
      )}
    </>
  );
}
