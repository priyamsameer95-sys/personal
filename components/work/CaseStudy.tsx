import Link from 'next/link';
import { findWorkCompany, getCaseStudyMedia, relatedCaseStudies } from '@/lib/work';
import { workTypeLabels } from '@/lib/work-types';
import type { CaseStudy as CaseStudyData, CaseStudySection } from '@/lib/work-types';
import styles from './work.module.css';
import Media from './Media';
import CaseStudyNavigation from './CaseStudyNavigation';

function SectionBody({ section, study }: { section: CaseStudySection; study: CaseStudyData }) {
  const media = getCaseStudyMedia(study, section.mediaIds || []);
  return <div className={styles.sectionBody}>
    {section.source && <p className={styles.sectionSource}>{[section.source.label, section.source.range, section.source.date, section.source.version].filter(Boolean).join(' · ')}</p>}
    {section.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    {!!section.bullets?.length && <ul>{section.bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}</ul>}
    {section.tables?.map((table, index) => <div key={`${table.caption}-${index}`} className={styles.tableBlock}>
      <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={table.caption}>
        <table><caption>{table.caption}</caption><thead><tr>{table.headers.map((header, column) => <th key={column} scope="col">{header}</th>)}</tr></thead><tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table>
      </div>
      {table.note && <p className={styles.tableNote}>{table.note}</p>}
    </div>)}
    {media.length > 0 && <div className={media.length > 1 ? styles.gallery : styles.singleMedia}>{media.map((asset) => <Media key={asset.id} media={asset} />)}</div>}
  </div>;
}

function Anchors({ section, legacyDownloads }: { section: CaseStudySection; legacyDownloads?: boolean }) {
  const aliases = new Set([...(section.anchorAliases || []), ...(legacyDownloads ? ['downloads'] : [])]);
  aliases.delete(`story-${section.id}`);
  return <>{Array.from(aliases).map((alias) => <span key={alias} id={alias} className={styles.anchorAlias} aria-hidden="true" />)}</>;
}

export default function CaseStudy({ study }: { study: CaseStudyData }) {
  const company = findWorkCompany(study.companyId);
  const hero = study.media.find((media) => media.id === study.heroMediaId);
  const usedMedia = new Set([study.heroMediaId, ...study.sections.flatMap((section) => section.mediaIds || [])]);
  const additionalMedia = study.media.filter((media) => !usedMedia.has(media.id));
  const related = relatedCaseStudies(study);
  const firstReference = study.sections.find((section) => section.group === 'reference');
  const formerDownloadsChapter = study.sections.find((section) => section.anchorAliases?.includes('downloads'));
  const hasEvidence = additionalMedia.length > 0;
  const fallbackDownloadsId = formerDownloadsChapter?.id || firstReference?.id || (!hasEvidence ? study.sections[0]?.id : undefined);
  const resultLabels = {
    delivered: { brief: 'The impact', section: 'Results and scope' },
    prototype: { brief: 'What I delivered', section: 'Prototype scope and validation' },
    proposal: { brief: 'What I proposed', section: 'Proposal and validation' },
    independent: { brief: 'What I explored', section: 'Proposal and validation' },
    community: { brief: 'My contribution', section: 'Contribution and context' },
    creative: { brief: 'What I created', section: 'Creative work and context' },
    supporting: { brief: 'What this establishes', section: 'Reference scope and evidence' },
  };
  const resultLabel = resultLabels[study.workType] || { brief: 'Results and scope', section: 'Results and context' };
  const brief = study.executiveBrief || {
    challenge: study.summary,
    remit: study.role,
    decision: 'The story below explains my decisions and the tradeoffs behind them.',
    impact: study.outcomes.map((outcome) => [outcome.value, outcome.label, outcome.detail].filter(Boolean).join(' · ')).join(' '),
  };
  const rootId = `case-${study.id}`;

  return <>
    <Link href={company ? `/product#${company.id}` : '/product'} className={styles.backLink}><span aria-hidden="true">←</span> All work{company ? ` / ${company.name}` : ''}</Link>
    <article id={rootId} className={styles.caseStudy}>
      <header className={styles.caseHeader}>
        <p className={styles.eyebrow}>{company?.name || 'Product work'} · {study.period}</p>
        <p className={styles.workType}>{workTypeLabels[study.workType] || 'Case study'}</p>
        <h1>{study.title}</h1>
        <p className={styles.caseSummary}>{study.summary}</p>
        <dl className={styles.context}>
          <div><dt>My role</dt><dd>{study.role}</dd></div>
          <div><dt>When</dt><dd>{study.period}</dd></div>
          {company && <div><dt>{company.relationship || 'Organisation / context'}</dt><dd>{company.name}</dd></div>}
        </dl>
      </header>

      <section className={styles.executiveBrief} aria-labelledby="brief-title">
        <h2 id="brief-title">The case at a glance</h2>
        <dl className={styles.briefGrid}>
          <div><dt>The challenge</dt><dd>{brief.challenge}</dd></div>
          <div><dt>My remit</dt><dd>{brief.remit}</dd></div>
          <div><dt>The decision</dt><dd>{brief.decision}</dd></div>
          <div><dt>{resultLabel.brief}</dt><dd>{brief.impact}</dd></div>
        </dl>
      </section>

      {study.outcomes.length > 0 && <section className={styles.outcomesSection} aria-labelledby="outcomes-title">
        <h2 id="outcomes-title">{resultLabel.section}</h2>
        <dl className={styles.outcomes}>{study.outcomes.map((outcome, index) => <div key={`${outcome.label}-${index}`}>
          <dt>{outcome.label}</dt>{outcome.value && <dd className={styles.outcomeValue}>{outcome.value}</dd>}{outcome.detail && <dd className={styles.outcomeDetail}>{outcome.detail}</dd>}
        </div>)}</dl>
      </section>}

      {!!study.sourceNotes?.length && <aside className={styles.claimContext} aria-label="Scope and evidence"><p className={styles.claimContextLabel}>Scope and evidence</p>{study.sourceNotes.map((note, index) => <p key={index}>{note}</p>)}</aside>}

      {hero && <div className={styles.heroMedia}><Media media={hero} priority /></div>}

      <CaseStudyNavigation rootId={rootId} chapters={[
        ...study.sections.map((section) => ({ id: `story-${section.id}`, title: section.title, expandable: Boolean(section.group && section.group !== 'story'), group: section.group })),
        ...(hasEvidence ? [{ id: 'evidence', title: 'Evidence and context', expandable: true, group: 'reference' as const }] : []),
      ]} />

      <div className={styles.story}>
        {study.sections.map((section, index) => {
          const expandable = section.group && section.group !== 'story';
          const number = <span className={styles.sectionNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>;
          if (expandable) return <details key={section.id} id={`story-${section.id}`} className={styles.chapter} data-case-section>
            <summary className={styles.chapterSummary} data-case-heading>{number}<h2 id={`heading-${section.id}`}>{section.title}</h2><span className={styles.chapterToggle} aria-hidden="true">+</span></summary>
            <Anchors section={section} legacyDownloads={fallbackDownloadsId === section.id} />
            <div className={styles.chapterBody}><SectionBody section={section} study={study} /></div>
          </details>;
          return <section key={section.id} id={`story-${section.id}`} className={styles.storySection} aria-labelledby={`heading-${section.id}`} data-case-section>
            <Anchors section={section} legacyDownloads={fallbackDownloadsId === section.id} />
            <div className={styles.sectionHeading}>{number}<h2 id={`heading-${section.id}`} data-case-heading tabIndex={-1}>{section.title}</h2></div>
            <SectionBody section={section} study={study} />
          </section>;
        })}
      </div>

      {hasEvidence && <details id="evidence" className={styles.chapter} data-case-section>
        <summary className={styles.chapterSummary} data-case-heading><h2 id="materials-title">Evidence and context</h2><span className={styles.chapterToggle} aria-hidden="true">+</span></summary>
        {!fallbackDownloadsId && <span id="downloads" className={styles.anchorAlias} aria-hidden="true" />}
        <div className={styles.evidenceBody}>
          {additionalMedia.length > 0 && <div className={styles.gallery}>{additionalMedia.map((media) => <Media key={media.id} media={media} />)}</div>}
        </div>
      </details>}
    </article>

    <section className={styles.caseContact} aria-labelledby="case-contact-title">
      <h2 id="case-contact-title">Discuss a product leadership opportunity.</h2>
      <p>If this is the kind of product challenge your team is working through, I’d like to hear about it.</p>
      <a href="mailto:Priyam.Sameer.95@gmail.com">Discuss a product leadership role <span aria-hidden="true">↗</span></a>
    </section>

    {related.length > 0 && <section className={styles.relatedSection} aria-labelledby="related-title">
      <div className={styles.sectionIntro}><h2 id="related-title">Related case studies</h2><Link href="/product">All work <span aria-hidden="true">↗</span></Link></div>
      <div className={styles.related}>{related.map((other) => <Link key={other.id} href={`/product/${encodeURIComponent(other.slug)}`}><span>{findWorkCompany(other.companyId)?.name} · {workTypeLabels[other.workType] || 'Case study'}</span><h3>{other.title}</h3><p>{other.summary}</p><span className={styles.readLink}>Read case study <span aria-hidden="true">→</span></span></Link>)}</div>
    </section>}
  </>;
}
