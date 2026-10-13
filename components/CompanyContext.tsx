import BrandMarks from './BrandMarks';
import { getCompanyContext } from '@/lib/company-context';
import styles from './company-context.module.css';

export default function CompanyContext({ companyId, compact = false, showIdentity = true, headingId, headingLevel = 3, className = '' }: {
  companyId: string;
  compact?: boolean;
  showIdentity?: boolean;
  headingId?: string;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const company = getCompanyContext(companyId);
  if (!company) return null;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return <div className={`${styles.context}${compact ? ` ${styles.compact}` : ''}${className ? ` ${className}` : ''}`}>
    {showIdentity && <div className={styles.identity}>
      <BrandMarks brandIds={company.brandIds} className={styles.brands} />
      <Heading id={headingId} className={styles.name}>{company.name}</Heading>
    </div>}
    <p className={styles.about}>{company.about}</p>
    <dl className={styles.facts}>{company.facts.map(fact => <div key={fact.label}>
      <dt>{fact.label}</dt><dd className={styles.value}>{fact.value}</dd><dd className={styles.factDetail}>{fact.detail}</dd>
    </div>)}</dl>
    {!!company.websites.length && <div className={styles.websites}>{company.websites.map(website => <a key={website.href} href={website.href} target="_blank" rel="noopener noreferrer">{website.label}<span aria-hidden="true"> ↗</span><span className={styles.visuallyHidden}> (opens in a new tab)</span></a>)}</div>}
    <p className={styles.scope}>{company.scopeNote}</p>
    <p className={styles.sources}><span>Sources · </span>{company.sources.map((source, index) => <span key={source.id}>{index > 0 && ' · '}<a href={source.href} target="_blank" rel="noopener noreferrer">{source.label}<span className={styles.visuallyHidden}> (opens in a new tab)</span></a></span>)}<span className={styles.reviewed}>Reviewed {company.reviewedAt}</span></p>
  </div>;
}
