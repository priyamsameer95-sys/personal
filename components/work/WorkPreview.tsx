import Icon from '@/components/Icon';
import Link from 'next/link';
import type { CaseStudy } from '@/lib/work-types';
import { workTypeLabels } from '@/lib/work-types';
import { getCaseDisplayTitle, getPrimaryMedia } from '@/lib/work-presentation';
import { productLinks } from '@/lib/product-links';
import Media from './Media';
import BrandMarks from '@/components/BrandMarks';
import styles from './work-preview.module.css';

export type WorkPreviewStudy = Pick<CaseStudy, 'id' | 'slug' | 'companyId' | 'title' | 'summary' | 'workType' | 'media' | 'heroMediaId' | 'primaryMediaIds'> & {
  visualSummary?: Pick<NonNullable<CaseStudy['visualSummary']>, 'title'>;
};
export const selectedProjectOwnership: Readonly<Record<string, string>> = {
 'cashkaro-college-money-education-loans':'I owned the education-loan journey, partner commercials and operations, connecting intake, documents and lender routing. This is a current public reference; lenders retain the credit decision.',
 'cashkaro-lending-mcp-feedback':'I proposed shared evaluation for two lending rule engines, with a defined tool contract and separate approval before policy changes. Architecture proposal; validation remains proposed.',
 'cashkaro-lender-integration-operations':'I worked with engineering and lenders on eligibility, KYC, status and payout handoffs, preserving partner-specific policy. The diagram explains the operating model; implementation is unverified.',
 'cashkaro-eduloans-policy-workflow':'I built student, partner and reviewer interactions around inspectable lender rules and human verification. Original prototype; sample records and scripted responses. Validation remains incomplete.',
 'absolute-rural-credit-uli':'I shaped agricultural risk information for lender appraisal, with standardised outputs and API access. Lenders retained the credit decision; current product references and national ULI context are labelled separately.',
 'absolute-silkroute-marketplace':'I connected commodity discovery and negotiation with ordering, payments and regional operations. The programme reported $100M GMV in nine months; this is programme scale, not an isolated feature result.',
 'absolute-crop-health-ai':'I worked with engineering, modelling and agronomy on offline leaf-image capture and diagnosis after reconnection. The delivered flow is distinct from the intended conversational-advisory layer; model accuracy is not established.',
 'urbankhet-farm-to-fork':'I moved from terrace farming to a produce service, building the storefront alongside sourcing, subscriptions and delivery. Historical storefront and campaign material show the customer promise and operating model.',
};

export const projectThemes: Readonly<Record<string, string>> = {
 'cashkaro-college-money-education-loans': 'Education lending',
 'cashkaro-eduloans-policy-workflow': 'AI & review',
 'cashkaro-lending-mcp-feedback': 'Policy systems',
 'cashkaro-lender-integration-operations': 'Partner APIs',
 'absolute-rural-credit-uli': 'Agricultural credit',
 'absolute-silkroute-marketplace': 'Commodity trade',
 'absolute-crop-health-ai': 'Crop intelligence',
 'urbankhet-farm-to-fork': 'Founder & operations',
};
export const projectDecisions: Readonly<Record<string, string>> = {
 'cashkaro-college-money-education-loans': 'Prepare a case a lender can assess.',
 'cashkaro-eduloans-policy-workflow': 'Keep uncertainty visible to a reviewer.',
 'cashkaro-lending-mcp-feedback': 'Calling a rule must not change it.',
 'cashkaro-lender-integration-operations': 'A shared contract, with partner-specific rules.',
 'absolute-rural-credit-uli': 'Support appraisal. Keep the credit decision with the lender.',
 'absolute-silkroute-marketplace': 'Connect the deal to execution.',
 'absolute-crop-health-ai': 'Capture offline. Diagnose after reconnection.',
 'urbankhet-farm-to-fork': 'Own the promise from sourcing to delivery.',
};

interface WorkPreviewProps {
  study: WorkPreviewStudy;
  priority?: boolean;
  reveal?: boolean;
  showBrand?: boolean;
  layout?: 'card' | 'lead' | 'diagram';
}

export default function WorkPreview({ study, priority = false, reveal = false, showBrand = true, layout = 'card' }: WorkPreviewProps) {
  const media = getPrimaryMedia(study)[0];
  const title = getCaseDisplayTitle(study);
  const product = productLinks[study.slug];
  const status = study.companyId === 'absolute' && study.workType === 'delivered'
    ? 'Historical product delivery'
    : workTypeLabels[study.workType];

  const heading = <header className={styles.projectHeading} data-reveal={reveal ? '' : undefined}>
    <div className={styles.brand}>
      {showBrand && <BrandMarks companyId={study.companyId} small />}
      <p>{projectThemes[study.slug] && <span>{projectThemes[study.slug]}<span aria-hidden="true"> · </span></span>}{status}</p>
    </div>
    <h3 id={`preview-${study.id}`}>{title}</h3>
  </header>;
  return <article className={`${styles.preview}${layout === 'lead' ? ` ${styles.lead}` : layout === 'diagram' ? ` ${styles.diagram}` : ''}${!media ? ` ${styles.textOnly}` : ''}`} aria-labelledby={`preview-${study.id}`}>
    {heading}
    {media && <div className={`${styles.evidence}${study.companyId === 'urbankhet' ? ` ${styles.portraitEvidence}` : ''}`}>
      <Media media={media} priority={priority} compact />
    </div>}
    <div className={styles.story}>
      <div className={styles.account}>
        {projectDecisions[study.slug] && <p className={styles.decision}>{projectDecisions[study.slug]}</p>}
        <p className={styles.summary}>{selectedProjectOwnership[study.slug] || study.summary}</p>
        <div className={styles.actions}>
          <Link href={`/product/${study.slug}`} className="ink-link">Full case study <span aria-hidden="true"><Icon name="arrow-up-right" /></span><span className="sr-only">: {title}</span></Link>
          {product && <a href={product.href} className="ink-link" target="_blank" rel="noopener noreferrer">{product.label}<span aria-hidden="true"><Icon name="arrow-up-right" /></span><span className="sr-only"> (opens in a new tab)</span></a>}
        </div>
      </div>
    </div>
  </article>;
}
