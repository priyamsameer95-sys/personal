'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { CaseStudy, WorkCompany } from '@/lib/work-types';
import { workTypeLabels } from '@/lib/work-types';
import BrandMarks from '@/components/BrandMarks';
import styles from './work-explorer.module.css';
import WorkPreview, { type WorkPreviewStudy } from './WorkPreview';
import { featuredCaseStudies } from '@/lib/work-presentation';

export interface WorkExplorerGroup {
  company: WorkCompany;
  studies: Array<WorkPreviewStudy & Pick<CaseStudy, 'period'>>;
}

const primaryIds = ['cashkaro', 'credflow', 'absolute', 'urbankhet'];
const contextLabels: Record<string, string> = {
  'founder-programmes': 'Incubation and founder support',
  'water-farmers': 'Internship',
  'gujarat-action-group': 'Volunteering',
  advisory: 'Independent advisory',
  cept: 'University and creative practice',
};

export function filterWorkGroups(groups: readonly WorkExplorerGroup[], selected: string): WorkExplorerGroup[] {
  return groups.filter(group => selected === 'all' || selected === group.company.id || (selected === 'other' && !primaryIds.includes(group.company.id)));
}

export function resolveWorkFragment(hash: string, groups: readonly WorkExplorerGroup[]): { selection: string; fragment: string } | null {
  let fragment: string;
  try { fragment = decodeURIComponent(hash.replace(/^#/, '')); } catch { return null; }
  if (fragment === 'other-contexts' && groups.some(group => !primaryIds.includes(group.company.id))) return { selection: 'other', fragment };
  return groups.some(group => group.company.id === fragment) ? { selection: fragment, fragment } : null;
}

function CompanyWork({ group, hidden }: { group: WorkExplorerGroup; hidden: boolean }) {
  const { company, studies } = group;
  return <section id={company.id} tabIndex={-1} aria-labelledby={`${company.id}-title`} className={styles.companySection} hidden={hidden}>
    <header className={styles.companyHeader}>
      <div>
        <BrandMarks companyId={company.id} />
        <p className={styles.companyMeta}>{company.period} · {company.relationship || contextLabels[company.id] || 'Employment'}</p>
        <h2 id={`${company.id}-title`}>{company.name}</h2>
      </div>
      <div className={styles.companyScope}><p className={styles.companyRole}>{company.role}</p><p>{company.summary}</p></div>
    </header>
    <div className={styles.indexList}>{studies.map(study => <article className={styles.indexItem} key={study.id}>
      <div><p className={styles.cardMeta}>{workTypeLabels[study.workType]}</p><h3><Link href={`/product/${encodeURIComponent(study.slug)}`}>{study.visualSummary?.title || study.title}<span aria-hidden="true"> ↗</span></Link></h3></div>
      <p className={styles.cardSummary}>{study.visualSummary?.summary || study.summary}</p>
    </article>)}</div>
  </section>;
}

export default function WorkExplorer({ groups }: { groups: WorkExplorerGroup[] }) {
  const primary = primaryIds.flatMap(id => groups.filter(group => group.company.id === id));
  const other = groups.filter(group => !primaryIds.includes(group.company.id));
  const featured = featuredCaseStudies(groups.flatMap(group => group.studies));
  const [selected, setSelected] = useState('all');
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const pendingFragment = useRef<string | null>(null);
  const total = groups.reduce((count, group) => count + group.studies.length, 0);
  const isOther = selected === 'other' || other.some(group => group.company.id === selected);
  const visible = filterWorkGroups(groups, selected);
  const visibleCount = visible.reduce((count, group) => count + group.studies.length, 0);
  const activeName = selected === 'all' ? 'All work' : selected === 'other' ? 'Other experience' : groups.find(group => group.company.id === selected)?.company.name || 'Work';

  useEffect(() => {
    const reveal = (id: string) => {
      const target = document.getElementById(id);
      target?.scrollIntoView({ block: 'start' });
      target?.focus({ preventScroll: true });
    };
    const followFragment = () => {
      const match = resolveWorkFragment(window.location.hash, groups);
      if (!match) return;
      const { selection: next, fragment: id } = match;
      if (selectedRef.current === next) {
        requestAnimationFrame(() => reveal(id));
      } else {
        pendingFragment.current = id;
        setSelected(next);
      }
    };
    followFragment();
    window.addEventListener('hashchange', followFragment);
    return () => window.removeEventListener('hashchange', followFragment);
  }, [groups]);

  useEffect(() => {
    const id = pendingFragment.current;
    if (!id || selected !== (id === 'other-contexts' ? 'other' : id)) return;
    pendingFragment.current = null;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById(id);
      target?.scrollIntoView({ block: 'start' });
      target?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [selected]);

  function choose(next: string) {
    setSelected(next);
    const fragment = next === 'all' ? '' : next === 'other' ? '#other-contexts' : `#${next}`;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${fragment}`);
  }

  return (
    <div className={styles.explorer}>
      <section className={styles.featured} aria-labelledby="featured-title">
        <div className={styles.featuredIntro}><h2 id="featured-title">Six featured projects</h2><a href="#company-index" className="ink-link">Browse all {total} projects <span aria-hidden="true">↓</span></a></div>
        {featured.map((study, index) => <WorkPreview key={study.id} study={study} priority={index === 0} />)}
      </section>
      <div id="company-index" className={styles.indexIntro}><p>Full project index</p><h2>Every company. Every context.</h2><p>All {total} projects are here. Use a filter if you have a particular company in mind.</p></div>
      <div className={styles.controls}>
        <div role="group" aria-label="Filter work by company" className={styles.primaryFilters}>
          <button type="button" aria-pressed={selected === 'all'} onClick={() => choose('all')}>All work <span>{total}</span></button>
          {primary.map(({ company, studies }) => (
            <button key={company.id} type="button" aria-pressed={selected === company.id} onClick={() => choose(company.id)}>
              {company.name}<span>{studies.length}</span>
            </button>
          ))}
        </div>
        {other.length > 0 && (
          <div className={styles.otherFilter}>
            <label htmlFor="other-work-context">Other experience</label>
            <select id="other-work-context" value={isOther ? selected : ''} onChange={event => choose(event.target.value)}>
              <option value="" disabled>Choose from {other.length} other contexts</option>
              <option value="other">All other experience</option>
              {other.map(({ company }) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </div>
        )}
      </div>
      <p role="status" aria-live="polite" aria-atomic="true" className={styles.resultCount}>{activeName} · {visibleCount} {visibleCount === 1 ? 'study' : 'studies'}</p>
      {primary.map(group => <CompanyWork key={group.company.id} group={group} hidden={selected !== 'all' && selected !== group.company.id} />)}
      {other.length > 0 && (
        <section id="other-contexts" tabIndex={-1} aria-labelledby="other-contexts-title" className={styles.otherContexts} hidden={selected !== 'all' && !isOther}>
          <header className={styles.otherIntro}>
            <p className={styles.companyMeta}>Beyond company and founder roles</p>
            <h2 id="other-contexts-title">Additional experience</h2>
            <p>Incubation, an internship, community work, advisory and independent practice retain their own scope.</p>
          </header>
          {other.map(group => <CompanyWork key={group.company.id} group={group} hidden={selected !== 'all' && selected !== 'other' && selected !== group.company.id} />)}
        </section>
      )}
    </div>
  );
}
