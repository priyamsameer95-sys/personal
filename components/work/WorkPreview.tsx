import Link from 'next/link';
import type { CaseStudy } from '@/lib/work-types';
import { workTypeLabels } from '@/lib/work-types';
import { getPrimaryMedia } from '@/lib/work-presentation';
import Media from './Media';
import BrandMarks from '@/components/BrandMarks';
import styles from './work-preview.module.css';
export type WorkPreviewStudy=Pick<CaseStudy,'id'|'slug'|'companyId'|'title'|'summary'|'role'|'workType'|'visualSummary'|'media'|'heroMediaId'|'primaryMediaIds'|'featuredOrder'|'outcomes'>;
export const selectedProjectOwnership:Readonly<Record<string,string>>={
 'cashkaro-college-money-education-loans':'A student enquiry still needs documents, lender matching and follow-through before a lender can review it. I owned the education-loan journey, partner commercials and operations. The case follows how intake, preparation and routing were connected.',
 'cashkaro-lending-mcp-feedback':'I proposed a shared way for two lending rule engines to evaluate a case, with separate approval before policy changes. The case explains the proposed tool contract, trust boundary and validation plan.',
 'cashkaro-lender-integration-operations':'Each lender brought different rules and handoffs. I worked with engineering and partners on common eligibility, KYC, status and payout requirements, while retaining lender-specific policy and operating reviews.',
 'cashkaro-eduloans-policy-workflow':'I built an interaction prototype for student, partner and reviewer workflows around inspectable lender rules and human document verification. It uses sample records and scripted responses; the case explains the model and what still needs validation.',
 'absolute-rural-credit-uli':'I shaped agricultural risk information for lender appraisal, including standardised outputs and API access. The lender retained the credit decision. The case shows the assessment-product decision before explaining the ULI context.',
 'absolute-silkroute-marketplace':'Finding a buyer or seller was only the beginning. I connected discovery and negotiation with ordering, payments and regional operations. The programme reported $100M GMV in nine months.',
 'absolute-crop-health-ai':'I worked with engineering, modelling and agronomy to make leaf-image capture usable offline and diagnosis available after reconnection. The case separates the delivered flow from the intended conversational-advisory layer.',
 'urbankhet-farm-to-fork':'I moved from terrace farming to a produce service, building the storefront alongside sourcing, subscriptions and delivery. The case examines the customer promise and what changed as operating conditions became harder.',
};
export default function WorkPreview({study,priority=false,reveal=false,showBrand=true}:{study:WorkPreviewStudy;priority?:boolean;reveal?:boolean;showBrand?:boolean}){
 const media=getPrimaryMedia(study)[0];
 return <article className={`${styles.preview}${!media?` ${styles.textOnly}`:''}`} aria-labelledby={`preview-${study.id}`}>
  <div className={styles.account} data-reveal={reveal?'':undefined}><div className={styles.brand}>{showBrand&&<BrandMarks companyId={study.companyId} small/>}<p>{study.companyId==='absolute'&&study.workType==='delivered'?'Historical product delivery':workTypeLabels[study.workType]}</p></div><h3 id={`preview-${study.id}`}>{study.visualSummary?.title||study.title}</h3><p className={styles.summary}>{selectedProjectOwnership[study.slug]||study.summary}</p><Link href={`/product/${study.slug}`} className="ink-link">Read the case <span aria-hidden="true">↗</span><span className="sr-only">: {study.visualSummary?.title||study.title}</span></Link></div>
  {media&&<div className={`${styles.evidence}${study.companyId==='urbankhet'?` ${styles.portraitEvidence}`:''}`}><Media media={media} priority={priority} compact/></div>}
 </article>;
}
