'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { CaseStudy, WorkCompany } from '@/lib/work-types';
import { workTypeLabels } from '@/lib/work-types';
import BrandMarks from '@/components/BrandMarks';
import styles from './work-explorer.module.css';

export interface WorkExplorerGroup {
  company: WorkCompany;
  studies: Array<Pick<CaseStudy, 'id' | 'slug' | 'title' | 'summary' | 'role' | 'period' | 'workType' | 'visualSummary'> & Partial<Pick<CaseStudy, 'media' | 'heroMediaId' | 'outcomes'>>>;
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
  return (
    <section id={company.id} tabIndex={-1} aria-labelledby={`${company.id}-title`} className={styles.companySection} hidden={hidden}>
      <header className={styles.companyHeader}>
        <div>
          <BrandMarks companyId={company.id} />
          <p className={styles.companyMeta}>{company.period} · {company.relationship || contextLabels[company.id] || 'Employment'}</p>
          <h2 id={`${company.id}-title`}>{company.name}</h2>
        </div>
        <div className={styles.companyScope}>
          <p className={styles.companyRole}>{company.role}</p>
          <p>{company.summary.split(/(?<=\.)\s+/)[0]}</p>
          {company.summary.split(/(?<=\.)\s+/).length > 1 && <details className={styles.companyContext}><summary>{primaryIds.includes(company.id) ? 'Company context' : 'More context'} <span aria-hidden="true">+</span></summary><p>{company.summary.split(/(?<=\.)\s+/).slice(1).join(' ')}</p></details>}
        </div>
      </header>
      <div className={styles.cardGrid}>
        {studies.map(study => {
          const hero = study.media?.find(asset => asset.id === study.heroMediaId);
          const heroImage = hero?.kind === 'image' ? hero : study.media?.find(asset => asset.kind === 'image');
          const image = study.slug === 'cashkaro-eduloans-policy-workflow' ? {
            kind: 'image' as const,
            src: '/work/workflows/cashkaro-eduloans-policy-workflow.svg',
            width: 1400,
            height: 780,
            alt: 'Authored overview of the education-loan policy workflow',
            provenance: { kind: 'authored' as const, label: 'Authored workflow overview; full technical model in the case study' },
          } : heroImage;
          const previewLabel = image?.provenance?.label || (study.workType === 'prototype' ? 'Prototype reference' : study.workType === 'proposal' ? 'Proposal reference' : 'Reference material');
          return (
          <article key={study.id} className={styles.card}>
            {image?.kind === 'image' ? <div className={styles.preview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" />
              <span>{previewLabel}</span>
            </div> : <div className={styles.textPreview}><p>{workTypeLabels[study.workType]}</p><p>{study.visualSummary?.impact || study.outcomes?.[0]?.label || study.role}</p>{study.outcomes?.[0]?.detail && <small>{study.outcomes[0].detail}</small>}</div>}
            <div className={styles.cardContent}>
            <header>
              <p className={styles.cardMeta}>{workTypeLabels[study.workType]}</p>
              <h3>{study.visualSummary?.title || study.title}</h3>
              <p className={styles.cardSummary}>{study.visualSummary?.summary || study.summary}</p>
              <p className={styles.cardRole}><span>My role</span> {study.visualSummary?.role || study.role}</p>
            </header>
            <Link className={styles.readCase} href={`/product/${encodeURIComponent(study.slug)}`}>
              Read case study <span aria-hidden="true">→</span><span className={styles.visuallyHidden}>: {study.visualSummary?.title || study.title}</span>
            </Link>
            </div>
          </article>
        ); })}
      </div>
    </section>
  );
}

export default function WorkExplorer({ groups }: { groups: WorkExplorerGroup[] }) {
  const primary = primaryIds.flatMap(id => groups.filter(group => group.company.id === id));
  const other = groups.filter(group => !primaryIds.includes(group.company.id));
  const initialCompany = primary.find(group => group.company.id === 'cashkaro') || primary[0] || groups[0];
  const [selected, setSelected] = useState(initialCompany?.company.id || 'all');
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
      <div className={styles.controls}>
        <div role="group" aria-label="Filter work by company" className={styles.primaryFilters}>
          {primary.map(({ company, studies }) => (
            <button key={company.id} type="button" aria-pressed={selected === company.id} onClick={() => choose(company.id)}>
              {company.name}<span>{studies.length}</span>
            </button>
          ))}
          <button type="button" aria-pressed={selected === 'all'} onClick={() => choose('all')}>All work <span>{total}</span></button>
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
