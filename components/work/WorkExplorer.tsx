'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import type { CaseStudy, WorkCompany } from '@/lib/work-types';
import CompanyContext from '@/components/CompanyContext';
import styles from './work-explorer.module.css';
import WorkPreview, { type WorkPreviewStudy } from './WorkPreview';

export interface WorkExplorerGroup {
  company: WorkCompany;
  studies: Array<WorkPreviewStudy & Pick<CaseStudy, 'period'>>;
}

export const selectedWorkSlugs = [
  'cashkaro-college-money-education-loans',
  'cashkaro-lending-mcp-feedback',
  'cashkaro-lender-integration-operations',
  'cashkaro-eduloans-policy-workflow',
  'absolute-rural-credit-uli',
  'absolute-silkroute-marketplace',
  'absolute-crop-health-ai',
  'urbankhet-farm-to-fork',
] as const;

const selectedCompanyIds = ['cashkaro', 'absolute', 'urbankhet'];
const experienceDestinations: Record<string, string> = {
  credflow: '/cv#credflow',
  'founder-programmes': '/cv#other-contexts',
  'water-farmers': '/cv#internship',
  'gujarat-action-group': '/cv#other-contexts',
  advisory: '/cv#other-contexts',
  cept: '/cv#education',
};

export function selectWorkGroups(groups: readonly WorkExplorerGroup[]): WorkExplorerGroup[] {
  return selectedCompanyIds.flatMap(id => {
    const group = groups.find(group => group.company.id === id);
    if (!group) return [];
    const studies = selectedWorkSlugs.flatMap(slug => group.studies.filter(study => study.slug === slug));
    return studies.length ? [{ company: group.company, studies }] : [];
  });
}

export function resolveWorkFragment(hash: string, groups: readonly WorkExplorerGroup[]): string | null {
  let fragment: string;
  try { fragment = decodeURIComponent(hash.replace(/^#/, '')); } catch { return null; }
  if (['other-contexts', 'company-index'].includes(fragment)) return fragment;
  return groups.some(group => group.company.id === fragment) ? fragment : null;
}

const upajStack = [
  { title: 'Farmer app', description: 'Recurring farm information, markets and useful next actions.', slug: 'absolute-upaj-farmer-experience' },
  { title: 'Farm monitoring', description: 'Plot context, IoT and GIS connected to field use.', slug: 'absolute-farm-os-iot-gis' },
  { title: 'Crop-health AI', description: 'Leaf capture, diagnosis and crop-specific advice.', slug: 'absolute-crop-health-ai' },
  { title: 'RiskStac for institutions', description: 'Agricultural risk information for lender assessment.', slug: 'absolute-rural-credit-uli' },
];

function CompanyWork({ group, priority }: { group: WorkExplorerGroup; priority?: boolean }) {
  const { company, studies } = group;
  return <section id={company.id} tabIndex={-1} aria-labelledby={`${company.id}-title`} className={styles.companySection}>
    <header className={styles.companyHeader}>
      <CompanyContext companyId={company.id} headingId={`${company.id}-title`} headingLevel={2} compact />
      <p className={styles.companyMeta}>{company.period} · {company.relationship || 'Employment'} · {studies.length} selected projects</p>
    </header>
    {company.id === 'absolute' && <section className={styles.productStack} aria-labelledby="upaj-stack-title">
      <h3 id="upaj-stack-title">Upaj’s connected product stack</h3>
      <p>My work connected recurring farmer needs, field monitoring and advice with the information institutions need to assess agricultural risk.</p>
      <ul>{upajStack.map(product => <li key={product.slug}><Link href={`/product/${product.slug}`}><strong>{product.title}<span aria-hidden="true"> ↗</span></strong><span>{product.description}</span></Link></li>)}</ul>
    </section>}
    <div className={styles.selectedProjects}>{studies.map((study, index) => <WorkPreview key={study.id} study={study} priority={priority && index === 0} />)}</div>
  </section>;
}

export default function WorkExplorer({ groups }: { groups: WorkExplorerGroup[] }) {
  const selected = selectWorkGroups(groups);
  const career = groups.filter(group => !selectedCompanyIds.includes(group.company.id));
  useEffect(() => {
    const followFragment = () => {
      const fragment = resolveWorkFragment(window.location.hash, groups);
      if (!fragment) return;
      requestAnimationFrame(() => {
        const target = document.getElementById(fragment);
        target?.scrollIntoView({ block: 'start' });
        target?.focus({ preventScroll: true });
      });
    };
    followFragment();
    window.addEventListener('hashchange', followFragment);
    return () => window.removeEventListener('hashchange', followFragment);
  }, [groups]);

  return <div className={styles.explorer}>
    <nav id="company-index" className={styles.companyNavigation} aria-label="Selected company work" tabIndex={-1}>{selected.map(({ company }) => <a key={company.id} href={`#${company.id}`}>{company.name}<span aria-hidden="true"> ↓</span></a>)}</nav>
    {selected.map((group, index) => <CompanyWork key={group.company.id} group={group} priority={index === 0} />)}
    <section id="other-contexts" className={styles.experienceBridge} aria-labelledby="experience-bridge-title" tabIndex={-1}>
      <h2 id="experience-bridge-title">Career &amp; background</h2>
      <p>For the complete chronology, role progression and work beyond these selected projects, <Link href="/cv">view my experience <span aria-hidden="true">↗</span></Link>.</p>
      <nav aria-label="Earlier roles and additional experience">{career.map(({ company }) => <Link key={company.id} id={company.id} href={experienceDestinations[company.id] || '/cv'}>{company.name}<span aria-hidden="true"> ↗</span></Link>)}</nav>
    </section>
  </div>;
}
