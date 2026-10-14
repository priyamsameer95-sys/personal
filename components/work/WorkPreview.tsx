import Link from 'next/link';
import type { CaseStudy } from '@/lib/work-types';
import { workTypeLabels } from '@/lib/work-types';
import { getPrimaryMedia } from '@/lib/work-presentation';
import Media from './Media';
import BrandMarks from '@/components/BrandMarks';
import styles from './work-preview.module.css';

export type WorkPreviewStudy = Pick<CaseStudy, 'id' | 'slug' | 'companyId' | 'title' | 'summary' | 'role' | 'workType' | 'visualSummary' | 'media' | 'heroMediaId' | 'primaryMediaIds' | 'featuredOrder' | 'outcomes'>;

/** Concise presentation of the recorded remit and decision; the source registry remains unchanged. */
export const selectedProjectOwnership: Readonly<Record<string, string>> = {
  'cashkaro-college-money-education-loans': 'I owned the education-loan journey and partner commercials, connecting student intake, documents and lender routing with operations and P&L.',
  'cashkaro-lending-mcp-feedback': 'I proposed a shared policy interface for two rule engines, separating evaluation from approval to change a rule.',
  'cashkaro-lender-integration-operations': 'I joined engineering requirements with lender service levels and payout operations, keeping a common contract around lender-specific policy.',
  'cashkaro-eduloans-policy-workflow': 'I turned the PRD and lender rules into an AI-assisted interaction prototype, keeping document uncertainty and verification with a human reviewer.',
  'absolute-rural-credit-uli': 'I shaped farm-risk information for lender appraisal, standardising assessment outputs and API access while leaving the credit decision with the lender.',
  'absolute-silkroute-marketplace': 'I connected commodity discovery and negotiation with trade operations, working across research, product modules and regional delivery.',
  'absolute-crop-health-ai': 'I brought engineering, modelling and agronomy into the capture-to-advice journey, connecting expert-reviewed data and offline leaf capture with crop-specific guidance.',
  'urbankhet-farm-to-fork': 'I built the customer offer and the operating business together, moving from terrace farming to produce sourcing, orders, delivery and P&L.',
};

export default function WorkPreview({ study, priority = false, reveal = false, showBrand = true }: { study: WorkPreviewStudy; priority?: boolean; reveal?: boolean; showBrand?: boolean }) {
  const media = getPrimaryMedia(study)[0];
  const visual = study.visualSummary;
  return <article className={styles.preview} aria-labelledby={`preview-${study.id}`}>
    {media && <div className={styles.evidence}>
      <Media media={media} priority={priority} compact />
    </div>}
    <div className={styles.account} data-reveal={reveal ? '' : undefined}>
      <div className={styles.brand}>{showBrand && <BrandMarks companyId={study.companyId} small />}<p>{workTypeLabels[study.workType]}</p></div>
      <h3 id={`preview-${study.id}`}>{visual?.title || study.title}</h3>
      <p className={styles.summary}>{visual?.summary || study.summary}</p>
      <p className={styles.ownership}>{selectedProjectOwnership[study.slug] || <><strong>My part.</strong> {visual?.role || study.role}{visual?.decision && <> {visual.decision}</>}</>}</p>
      {visual?.impact && <p className={styles.result}><strong>{study.workType === 'proposal' || study.workType === 'prototype' ? 'Validation status.' : 'Outcome.'}</strong> {visual.impact}</p>}
      <Link href={`/product/${encodeURIComponent(study.slug)}`} className="ink-link">Full case study <span aria-hidden="true">↗</span><span className="sr-only">: {visual?.title || study.title}</span></Link>
    </div>
  </article>;
}
