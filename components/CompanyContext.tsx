import BrandMarks from './BrandMarks';
import { getCompanyContext, type CompanyContextData } from '@/lib/company-context';
import styles from './company-context.module.css';

export function CompanyDescription({ company, className = '' }: { company: CompanyContextData; className?: string }) {
  return <p className={`${styles.about}${className ? ` ${className}` : ''}`}>{company.abstract ? company.abstract.map((part, index) => {
    const source = company.sources.find(source => source.id === part.sourceId);
    return source ? <a key={index} href={source.href} {...(source.href.startsWith('https://') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{part.text}{source.href.startsWith('https://') && <span className={styles.visuallyHidden}> (opens in a new tab)</span>}</a> : part.text;
  }) : company.about}</p>;
}

export default function CompanyContext({ companyId, compact = false, showIdentity = true, headingId, headingLevel = 3, period, className = '' }: {
  companyId: string;
  compact?: boolean;
  showIdentity?: boolean;
  headingId?: string;
  headingLevel?: 2 | 3;
  period?: string;
  className?: string;
}) {
  const company = getCompanyContext(companyId);
  if (!company) return null;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return <div className={`${styles.context}${compact ? ` ${styles.compact}` : ''}${!showIdentity ? ` ${styles.withoutIdentity}` : ''}${className ? ` ${className}` : ''}`}>
    {showIdentity && <div className={styles.identity}>
      <BrandMarks brandIds={company.brandIds} className={styles.brands} />
      <div className={styles.identityText}>
        <Heading id={headingId} className={styles.name}>{company.name}</Heading>
        {period && <p className={styles.period}>{period}</p>}
      </div>
    </div>}
    <div className={styles.description}>
      <CompanyDescription company={company} />
      {!!company.websites.length && <div className={styles.websites}>{company.websites.map(website => <a key={website.href} href={website.href} target="_blank" rel="noopener noreferrer">{website.label}<span aria-hidden="true"> ↗</span><span className={styles.visuallyHidden}> (opens in a new tab)</span></a>)}</div>}
    </div>
  </div>;
}
