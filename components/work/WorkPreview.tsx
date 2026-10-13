import Link from 'next/link';
import type { CaseStudy } from '@/lib/work-types';
import { workTypeLabels } from '@/lib/work-types';
import { getPrimaryMedia, mediaGroupTitle } from '@/lib/work-presentation';
import Media from './Media';
import BrandMarks from '@/components/BrandMarks';
import styles from './work-preview.module.css';

export type WorkPreviewStudy = Pick<CaseStudy, 'id' | 'slug' | 'companyId' | 'title' | 'summary' | 'role' | 'workType' | 'visualSummary' | 'media' | 'heroMediaId' | 'primaryMediaIds' | 'featuredOrder' | 'outcomes'>;

export default function WorkPreview({ study, priority = false, reveal = false }: { study: WorkPreviewStudy; priority?: boolean; reveal?: boolean }) {
  const media = getPrimaryMedia(study)[0];
  const visual = study.visualSummary;
  return <article className={styles.preview} aria-labelledby={`preview-${study.id}`}>
    {media && <div className={styles.evidence}>
      <p className={styles.mediaLabel}>{mediaGroupTitle(media)}</p>
      <Media media={media} priority={priority} compact />
    </div>}
    <div className={styles.account} data-reveal={reveal ? '' : undefined}>
      <div className={styles.brand}><BrandMarks companyId={study.companyId} small /><p>{workTypeLabels[study.workType]}</p></div>
      <h3 id={`preview-${study.id}`}>{visual?.title || study.title}</h3>
      <p className={styles.summary}>{visual?.summary || study.summary}</p>
      <dl className={styles.decisions}>
        <div><dt>My ownership</dt><dd>{visual?.role || study.role}</dd></div>
        {visual?.decision && <div><dt>The decision</dt><dd>{visual.decision}</dd></div>}
        {visual?.impact && <div><dt>{study.workType === 'proposal' || study.workType === 'prototype' ? 'Validation status' : 'Impact & scope'}</dt><dd>{visual.impact}</dd></div>}
      </dl>
      <Link href={`/product/${encodeURIComponent(study.slug)}`} className="ink-link">Full case study <span aria-hidden="true">↗</span><span className="sr-only">: {visual?.title || study.title}</span></Link>
    </div>
  </article>;
}
