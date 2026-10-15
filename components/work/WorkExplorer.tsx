/* Original local reference assets retain their own dimensions and direct image URLs. */
/* eslint-disable @next/next/no-img-element */
import Icon from '@/components/Icon';
import Link from 'next/link';
import type { CaseStudy, WorkCompany } from '@/lib/work-types';
import { getCaseDisplayTitle, getPrimaryMedia } from '@/lib/work-presentation';
import BrandMarks from '@/components/BrandMarks';
import WorkPreview, { type WorkPreviewStudy } from './WorkPreview';
import WorkFragmentNavigation from './WorkFragmentNavigation';
import styles from './work-explorer.module.css';

export interface WorkExplorerGroup {
  company: Pick<WorkCompany, 'id' | 'name'>;
  studies: WorkPreviewStudy[];
}

export const selectedWorkSlugs = [
  'cashkaro-college-money-education-loans', 'cashkaro-eduloans-policy-workflow',
  'cashkaro-lending-mcp-feedback', 'cashkaro-lender-integration-operations',
  'absolute-rural-credit-uli', 'absolute-silkroute-marketplace',
  'absolute-crop-health-ai', 'urbankhet-farm-to-fork',
] as const;
const selectedCompanyIds = ['cashkaro', 'absolute', 'urbankhet'];
const supportingSlugs = ['absolute-upaj-farmer-experience', 'absolute-farm-os-iot-gis'];
const selectedSlugs = new Set<string>([...selectedWorkSlugs, ...supportingSlugs]);
export const previewMediaIds: Readonly<Record<string, string>> = {
  'cashkaro-college-money-education-loans': 'college-money-abroad-hero-final',
  'cashkaro-eduloans-policy-workflow': 'eduloans-prototype-inspector',
  'cashkaro-lending-mcp-feedback': 'lending-mcp-proposal',
  'cashkaro-lender-integration-operations': 'lender-integration-handshake',
  'absolute-rural-credit-uli': 'upaj-riskstac-monitoring',
  'absolute-silkroute-marketplace': 'workflow-diagram',
  'absolute-crop-health-ai': 'upaj-growstac-advisory',
  'absolute-upaj-farmer-experience': 'upaj-growstac-personalised',
  'absolute-farm-os-iot-gis': 'upaj-growstac-technology',
};

export function prepareWorkGroups(groups: readonly { company: WorkCompany; studies: CaseStudy[] }[]): WorkExplorerGroup[] {
  return groups.map(({ company, studies }) => ({
    company: { id: company.id, name: company.name },
    studies: studies.filter(study => selectedSlugs.has(study.slug)).map(study => {
      const previewId = previewMediaIds[study.slug];
      const media = previewId ? study.media.filter(asset => asset.id === previewId) : getPrimaryMedia(study).slice(0, 1);
      return {
        id: study.id, slug: study.slug, companyId: study.companyId,
        title: study.title, summary: study.summary, workType: study.workType,
        visualSummary: study.visualSummary ? { title: study.visualSummary.title } : undefined,
        media, primaryMediaIds: media.map(asset => asset.id),
        companionMedia: study.slug === 'urbankhet-farm-to-fork'
          ? study.media.find(asset => asset.id === 'urbankhet-linkedin-sorted-packs') : undefined,
      };
    }),
  }));
}

const companyAccounts: Record<string, { name: string; website?: string; period: string; about: string; remit: string }> = {
  cashkaro: {
    name: 'CashKaro', website: 'https://cashkaro.com/', period: '2025–Present',
    about: 'Cashback and financial-product distribution. BankKaro and College.money connect borrowers with partner lenders.',
    remit: 'I lead lending products, partner operations and P&L as General Manager.',
  },
  absolute: {
    name: 'Absolute', website: 'https://www.absolute.bio/', period: '2021–2024',
    about: 'Bioscience and agricultural technology. Upaj connects farm information with advisory, risk assessment and lending.',
    remit: 'I grew from Product Manager to Principal PM across farmer products, trade and agricultural data.',
  },
  urbankhet: {
    name: 'UrbanKhet', period: '2019–2021',
    about: 'A farm-to-customer venture serving households and business buyers through sourcing, subscriptions and delivery.',
    remit: 'I founded and operated the business, owning the customer offer, operations and P&L.',
  },
};
const legacyTargets: Record<string, string> = {
  'lending-journeys': 'cashkaro-college-money-education-loans',
  'partner-platforms': 'cashkaro-lender-integration-operations',
  'applied-ai': 'cashkaro-eduloans-policy-workflow',
  'operating-business': 'urbankhet-farm-to-fork',
};

export default function WorkExplorer({ groups }: { groups: WorkExplorerGroup[] }) {
  const studies = new Map(groups.flatMap(group => group.studies).map(study => [study.slug, study]));
  const selected = selectedWorkSlugs.flatMap(slug => studies.get(slug) ? [studies.get(slug)!] : []);
  const career = groups.filter(group => !selectedCompanyIds.includes(group.company.id));
  const fragments = ['other-contexts', 'company-index', 'upaj-stack-title', ...Object.keys(legacyTargets), ...groups.map(group => group.company.id), ...selected.map(study => `project-${study.slug}`)];

  return <div className={styles.explorer}>
    <WorkFragmentNavigation fragments={fragments} />
    <nav id="company-index" className={styles.companyNavigation} aria-label="Work by company" tabIndex={-1}>
      {selectedCompanyIds.map(id => <a key={id} href={`#${id}`}>{companyAccounts[id].name}<span aria-hidden="true"><Icon name="arrow-down" /></span></a>)}
    </nav>
    {selectedCompanyIds.map(id => {
      const account = companyAccounts[id];
      const companyStudies = selected.filter(study => study.companyId === id);
      if (!companyStudies.length) return null;
      return <section key={id} id={id} className={styles.companySection} aria-labelledby={`${id}-work-title`} tabIndex={-1}>
        <header className={styles.companyHeader}>
          <div className={styles.companyIdentity}>
            {account.website ? <a className={styles.companyLink} href={account.website} target="_blank" rel="noopener noreferrer" aria-label={`${account.name} (opens in a new tab)`}><BrandMarks companyId={id} /><h2 id={`${id}-work-title`} tabIndex={-1}>{account.name}<Icon name="arrow-up-right" /></h2></a> : <div className={styles.companyLink}><BrandMarks companyId={id} /><h2 id={`${id}-work-title`} tabIndex={-1}>{account.name}</h2></div>}
            <p>{account.period}</p>
          </div>
          <div className={styles.companyAccount}><p>{account.about}</p></div>
        </header>
        <div className={styles.companyProjects}>{companyStudies.map((study, index) => {
          const layout = study.media[0]?.category === 'diagram' ? 'diagram' : 'lead';
          return <div id={`project-${study.slug}`} key={study.id} className={`${styles.projectTarget} ${styles.projectLead}`} tabIndex={-1}>
            {Object.entries(legacyTargets).filter(([, slug]) => study.slug === slug).map(([fragment]) => <span key={fragment} id={fragment} className={styles.anchorAlias} tabIndex={-1} />)}
            <WorkPreview study={study} priority={id === 'cashkaro' && index === 0} showBrand={false} layout={layout} />
          </div>;
        })}</div>
        {id === 'absolute' && <section className={styles.productStack} aria-labelledby="upaj-stack-title">
          <h3 id="upaj-stack-title" tabIndex={-1}>More from the Upaj stack</h3>
          <div className={styles.supportingGrid}>{supportingSlugs.flatMap(slug => {
            const study = studies.get(slug);
            if (!study) return [];
            const media = study.media[0];
            return [<Link href={`/product/${slug}`} key={slug} className={styles.supportingCard}>
              {media?.kind === 'image' && <div className={styles.supportingImage}><img src={media.src} alt={media.alt} width={media.width} height={media.height} loading="lazy" decoding="async" /></div>}
              <h4>{getCaseDisplayTitle(study)}<span aria-hidden="true"> <Icon name="arrow-up-right" /></span></h4>
              <p>{slug === supportingSlugs[0] ? 'Farm monitoring, markets and useful next actions.' : 'Plot context, sensors and field workflows.'}</p>
              <span>Current public reference · historical work in the case</span>
            </Link>];
          })}</div>
        </section>}
      </section>;
    })}
    <section id="other-contexts" className={styles.experienceBridge} aria-labelledby="experience-bridge-title" tabIndex={-1}>
      {career.map(({ company }) => <span key={company.id} id={company.id} className={styles.anchorAlias} />)}
      <h2 id="experience-bridge-title" tabIndex={-1}>The full career</h2><p>Roles, promotions, education and further work are in <Link href="/cv">Experience <span aria-hidden="true"><Icon name="arrow-up-right" /></span></Link>.</p>
    </section>
  </div>;
}
