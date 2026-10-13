import Link from 'next/link';
import { findWorkCompany, getCaseStudyMedia, relatedCaseStudies } from '@/lib/work';
import { workTypeLabels } from '@/lib/work-types';
import type { CaseStudy as CaseStudyData, CaseStudySection } from '@/lib/work-types';
import styles from './work.module.css';
import Media from './Media';
import CaseStudyNavigation, { CaseStudyJump } from './CaseStudyNavigation';
import VisualStory from './VisualStory';

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
  const usedMedia = new Set(study.sections.flatMap((section) => section.mediaIds || []));
  const additionalMedia = study.media.filter((media) => !usedMedia.has(media.id));
  const related = relatedCaseStudies(study);
  const firstReference = study.sections.find((section) => section.group === 'reference');
  const formerDownloadsChapter = study.sections.find((section) => section.anchorAliases?.includes('downloads'));
  const hasEvidence = additionalMedia.length > 0 || Boolean(study.sourceNotes?.length);
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
  const visual = study.visualSummary || {
    title: study.title,
    summary: study.summary,
    role: study.role,
    challenge: brief.challenge,
    decision: brief.decision,
    impact: brief.impact,
    workflow: { label: '', steps: [], note: '' },
  };
  const rootId = `case-${study.id}`;
  const walkthrough = study.media.find((media) => media.kind === 'video');
  const leadVisual = walkthrough || study.media[0];
  const mediaChapter = leadVisual && study.sections.find((section) => section.mediaIds?.includes(leadVisual.id));
  const mediaTarget = leadVisual ? (mediaChapter ? `story-${mediaChapter.id}` : 'evidence') : undefined;

  return <>
    <Link href={company ? `/product#${company.id}` : '/product'} className={styles.backLink}><span aria-hidden="true">←</span> All work{company ? ` / ${company.name}` : ''}</Link>
    <article id={rootId} className={styles.caseStudy}>
      <header className={styles.caseHeader}>
        <p className={styles.eyebrow}>{company?.name || 'Product work'} · {study.period} · {workTypeLabels[study.workType] || 'Case study'}</p>
        <h1>{visual.title}</h1>
        <p className={styles.caseSummary}>{visual.summary}</p>
        <p className={styles.visualRole}><strong>My role</strong> {visual.role}</p>
      </header>

      <VisualStory summary={visual} />
      {mediaTarget && <CaseStudyJump rootId={rootId} targetId={mediaTarget} className={styles.mediaJump}>{walkthrough ? 'View product walkthroughs' : 'View supporting visuals'} <span aria-hidden="true">↓</span></CaseStudyJump>}

      <details id="full-case-study" className={`${styles.chapter} ${styles.fullCase}`} data-case-section>
        <summary className={styles.chapterSummary} data-case-heading><h2>Full case study</h2><span className={styles.fullCaseHint}>Decisions, delivery and outcomes</span><span className={styles.chapterToggle} aria-hidden="true">+</span></summary>
        <div className={styles.fullCaseBody}>
      <p className={styles.fullCaseTitle}>{study.title}</p>
      <section className={styles.executiveBrief} aria-labelledby="brief-title">
        <h3 id="brief-title">The original brief</h3>
        <dl className={styles.briefGrid}>
          <div><dt>The challenge</dt><dd>{brief.challenge}</dd></div>
          <div><dt>My remit</dt><dd>{brief.remit}</dd></div>
          <div><dt>The decision</dt><dd>{brief.decision}</dd></div>
          <div><dt>{resultLabel.brief}</dt><dd>{brief.impact}</dd></div>
        </dl>
      </section>

      {study.outcomes.length > 0 && <section className={styles.outcomesSection} aria-labelledby="outcomes-title">
        <h3 id="outcomes-title">{resultLabel.section}</h3>
        <dl className={styles.outcomes}>{study.outcomes.map((outcome, index) => <div key={`${outcome.label}-${index}`}>
          <dt>{outcome.label}</dt>{outcome.value && <dd className={styles.outcomeValue}>{outcome.value}</dd>}{outcome.detail && <dd className={styles.outcomeDetail}>{outcome.detail}</dd>}
        </div>)}</dl>
      </section>}

      <CaseStudyNavigation rootId={rootId} chapters={[
        ...study.sections.map((section) => ({ id: `story-${section.id}`, title: section.title, expandable: Boolean(section.group && section.group !== 'story'), group: section.group })),
      ]} />

      <div className={styles.story}>
        {study.sections.map((section, index) => {
          const expandable = section.group && section.group !== 'story';
          const number = <span className={styles.sectionNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>;
          if (expandable) return <details key={section.id} id={`story-${section.id}`} className={styles.chapter} data-case-section>
            <summary className={styles.chapterSummary} data-case-heading>{number}<h3 id={`heading-${section.id}`}>{section.title}</h3><span className={styles.chapterToggle} aria-hidden="true">+</span></summary>
            <Anchors section={section} legacyDownloads={fallbackDownloadsId === section.id} />
            <div className={styles.chapterBody}><SectionBody section={section} study={study} /></div>
          </details>;
          return <section key={section.id} id={`story-${section.id}`} className={styles.storySection} aria-labelledby={`heading-${section.id}`} data-case-section>
            <Anchors section={section} legacyDownloads={fallbackDownloadsId === section.id} />
            <div className={styles.sectionHeading}>{number}<h3 id={`heading-${section.id}`} data-case-heading tabIndex={-1}>{section.title}</h3></div>
            <SectionBody section={section} study={study} />
          </section>;
        })}
      </div>
        </div>
      </details>

      {hasEvidence && <details id="evidence" className={styles.chapter} data-case-section>
        <summary className={styles.chapterSummary} data-case-heading><h2 id="materials-title">Screens, videos and source context</h2><span className={styles.chapterToggle} aria-hidden="true">+</span></summary>
        {!fallbackDownloadsId && <span id="downloads" className={styles.anchorAlias} aria-hidden="true" />}
        <div className={styles.evidenceBody}>
          {additionalMedia.length > 0 && <div className={styles.gallery}>{additionalMedia.map((media) => <Media key={media.id} media={media} />)}</div>}
          {!!study.sourceNotes?.length && <aside className={styles.claimContext} aria-label="Scope and evidence"><p className={styles.claimContextLabel}>Scope and evidence</p>{study.sourceNotes.map((note, index) => <p key={index}>{note}</p>)}</aside>}
        </div>
      </details>}
    </article>

    <section className={styles.caseContact} aria-labelledby="case-contact-title">
      <h2 id="case-contact-title">Discuss a product leadership opportunity.</h2>
      <a href="mailto:Priyam.Sameer.95@gmail.com">Discuss a product leadership role <span aria-hidden="true">↗</span></a>
    </section>

    {related.length > 0 && <section className={styles.relatedSection} aria-labelledby="related-title">
      <div className={styles.sectionIntro}><h2 id="related-title">Related case studies</h2><Link href="/product">All work <span aria-hidden="true">↗</span></Link></div>
      <div className={styles.related}>{related.map((other) => <Link key={other.id} href={`/product/${encodeURIComponent(other.slug)}`}><span>{findWorkCompany(other.companyId)?.name} · {workTypeLabels[other.workType] || 'Case study'}</span><h3>{other.visualSummary?.title || other.title}</h3><span className={styles.readLink}>Read case study <span aria-hidden="true">→</span></span></Link>)}</div>
    </section>}
  </>;
}
