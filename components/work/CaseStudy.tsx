import Link from 'next/link';
import { findWorkCompany, getCaseStudyMedia, relatedCaseStudies } from '@/lib/work';
import { workTypeLabels } from '@/lib/work-types';
import type { CaseStudy as CaseStudyData, CaseStudyMedia, CaseStudySection } from '@/lib/work-types';
import styles from './work.module.css';
import Media from './Media';
import CaseStudyNavigation, { CaseStudyJump } from './CaseStudyNavigation';
import { Chart, Workflow } from './VisualStory';
import BrandMarks from '@/components/BrandMarks';
import { caseBrandIds } from '@/lib/brands';

function mediaCount(media: CaseStudyMedia[]) {
  const videos = media.filter(asset => asset.kind === 'video').length;
  const images = media.length - videos;
  return [images ? `${images} ${images === 1 ? 'image' : 'images'}` : '', videos ? `${videos} ${videos === 1 ? 'video' : 'videos'}` : ''].filter(Boolean).join(' and ');
}

function MediaSet({ media, label = 'More visual evidence' }: { media: CaseStudyMedia[]; label?: string }) {
  if (!media.length) return null;
  const first = media.slice(0, 2);
  const remaining = media.slice(2);
  return <div className={styles.mediaSet}>
    <div className={first.length > 1 ? styles.gallery : styles.singleMedia}>{first.map(asset => <Media key={asset.id} media={asset} />)}</div>
    {remaining.length > 0 && <details className={styles.moreMedia}>
      <summary>{label} <span>{mediaCount(remaining)}</span><span aria-hidden="true">+</span></summary>
      <div className={`${styles.gallery} ${styles.remainingGallery}`} tabIndex={0} role="region" aria-label={`${label}: ${mediaCount(remaining)}. Scroll to explore.`}>{remaining.map(asset => <Media key={asset.id} media={asset} />)}</div>
    </details>}
  </div>;
}

function SectionBody({ section, study, condensed = false, excludedMediaId }: { section: CaseStudySection; study: CaseStudyData; condensed?: boolean; excludedMediaId?: string }) {
  const media = getCaseStudyMedia(study, section.mediaIds || []).filter(asset => asset.id !== excludedMediaId);
  const paragraphs = condensed ? section.body.slice(1) : section.body;
  const extra = <>
    {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    {!!section.bullets?.length && <ul>{section.bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}</ul>}
    {section.tables?.map((table, index) => <div key={`${table.caption}-${index}`} className={styles.tableBlock}>
      <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={table.caption}>
        <table><caption>{table.caption}</caption><thead><tr>{table.headers.map((header, column) => <th key={column} scope="col">{header}</th>)}</tr></thead><tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table>
      </div>
      {table.note && <p className={styles.tableNote}>{table.note}</p>}
    </div>)}
    <MediaSet media={media} label="See the remaining references" />
  </>;
  const hasExtra = paragraphs.length > 0 || Boolean(section.bullets?.length || section.tables?.length || media.length);
  return <div className={styles.sectionBody}>
    {section.source && <p className={styles.sectionSource}>{[section.source.label, section.source.range, section.source.date, section.source.version].filter(Boolean).join(' · ')}</p>}
    {excludedMediaId && section.mediaIds?.includes(excludedMediaId) && <p className={styles.leadReferenceNote}>The featured reference is shown in the overview. <CaseStudyJump rootId={`case-${study.id}`} targetId="product-reference">Return to the visual <span aria-hidden="true">↑</span></CaseStudyJump></p>}
    {condensed && section.body[0] && <p>{section.body[0]}</p>}
    {condensed ? hasExtra && <details className={styles.narrativeDetail}>
      <summary>More on {section.title.replace(/^The /, '').toLowerCase()} <span aria-hidden="true">+</span></summary>
      <div>{extra}</div>
    </details> : extra}
  </div>;
}

function Anchors({ section, legacyDownloads }: { section: CaseStudySection; legacyDownloads?: boolean }) {
  const aliases = new Set([...(section.anchorAliases || []), ...(legacyDownloads ? ['downloads'] : [])]);
  aliases.delete(`story-${section.id}`);
  return <>{Array.from(aliases).map(alias => <span key={alias} id={alias} className={styles.anchorAlias} aria-hidden="true" />)}</>;
}

export default function CaseStudy({ study }: { study: CaseStudyData }) {
  const company = findWorkCompany(study.companyId);
  const usedMedia = new Set(study.sections.flatMap(section => section.mediaIds || []));
  const related = relatedCaseStudies(study);
  const firstReference = study.sections.find(section => section.group === 'reference');
  const formerDownloadsChapter = study.sections.find(section => section.anchorAliases?.includes('downloads'));
  const fallbackDownloadsId = formerDownloadsChapter?.id || firstReference?.id;
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
    impact: study.outcomes.map(outcome => [outcome.value, outcome.label, outcome.detail].filter(Boolean).join(' · ')).join(' '),
  };
  const visual = study.visualSummary || {
    title: study.title, summary: study.summary, role: study.role,
    challenge: brief.challenge, decision: brief.decision, impact: brief.impact,
    workflow: { label: '', steps: [], note: '' },
    charts: [],
  };
  const rootId = `case-${study.id}`;
  const walkthrough = study.media.find(media => media.kind === 'video');
  const hero = study.media.find(media => media.id === study.heroMediaId);
  const leadVisual = walkthrough || (hero?.kind === 'image' && !hero.src.endsWith('.svg') ? hero : undefined);
  const portraitLead = leadVisual?.kind === 'image' && Boolean(leadVisual.width && leadVisual.height && leadVisual.height > leadVisual.width * 1.15);
  const leadTitle = walkthrough ? walkthrough.provenance?.label || 'Product walkthrough' : leadVisual?.provenance?.kind === 'current-public' ? 'Current product reference' : leadVisual?.provenance?.kind === 'authored' ? 'Illustration of my approach' : leadVisual?.provenance?.kind === 'proposal' ? 'Proposal material' : leadVisual?.src.includes('/architecture/') ? 'Technical portfolio diagram' : leadVisual?.provenance?.kind === 'historical' ? 'Historical material' : 'Reference material';
  const mediaChapter = leadVisual && study.sections.find(section => section.mediaIds?.includes(leadVisual.id));
  const additionalMedia = study.media.filter(media => !usedMedia.has(media.id) && media.id !== leadVisual?.id);
  const narrative = study.sections.filter(section => !section.group || section.group === 'story');
  const decisions = study.sections.filter(section => section.group === 'detail');
  const references = study.sections.filter(section => section.group === 'reference');
  const hasEvidence = additionalMedia.length > 0 || Boolean(study.sourceNotes?.length);
  const chapters = study.sections.map(section => ({ id: `story-${section.id}`, title: section.title, expandable: Boolean(section.group && section.group !== 'story'), group: section.group }));
  const chapter = (section: CaseStudySection) => <details key={section.id} id={`story-${section.id}`} className={styles.chapter} data-case-section>
    <summary className={styles.chapterSummary} data-case-heading><h3 id={`heading-${section.id}`}>{section.title}</h3><span className={styles.chapterCount}>{section.mediaIds?.length ? mediaCount(getCaseStudyMedia(study, section.mediaIds)) : section.tables?.length ? `${section.tables.length} ${section.tables.length === 1 ? 'table' : 'tables'}` : 'Read more'}</span><span className={styles.chapterToggle} aria-hidden="true">+</span></summary>
    <Anchors section={section} legacyDownloads={fallbackDownloadsId === section.id} />
    <div className={styles.chapterBody}><SectionBody section={section} study={study} excludedMediaId={leadVisual?.id} /></div>
  </details>;

  return <>
    <Link href={company ? `/product#${company.id}` : '/product'} className={styles.backLink}><span aria-hidden="true">←</span> Work{company ? ` / ${company.name}` : ''}</Link>
    <article id={rootId} className={styles.caseStudy}>
      <header className={styles.caseHeader}>
        <BrandMarks brandIds={caseBrandIds(study.companyId, study.slug)} small />
        <p className={styles.eyebrow}>{study.period} <span>{workTypeLabels[study.workType] || 'Case study'}</span></p>
        <h1>{visual.title}</h1>
        <p className={styles.caseSummary}>{visual.summary}</p>
        <p className={styles.visualRole}><strong>My responsibility</strong> {visual.role}</p>
      </header>

      <section className={styles.caseOrientation} aria-label="Case at a glance">
        <dl><div><dt>The challenge</dt><dd>{visual.challenge}</dd></div><div><dt>{study.workType === 'proposal' || study.workType === 'independent' ? 'Proposed approach' : 'The decision'}</dt><dd>{visual.decision}</dd></div><div><dt>{resultLabel.brief}</dt><dd>{brief.impact}</dd></div></dl>
      </section>

      {leadVisual && <section id="product-reference" className={styles.leadEvidence} data-case-section>
        <div className={styles.sectionIntro}><h2 data-case-heading tabIndex={-1}>{leadTitle}</h2>{mediaChapter && <CaseStudyJump rootId={rootId} targetId={`story-${mediaChapter.id}`}>Reference context <span aria-hidden="true">↓</span></CaseStudyJump>}</div>
        <div className={`${styles.leadMedia}${portraitLead ? ` ${styles.portraitLead}` : ''}`}><Media media={leadVisual} priority /></div>
      </section>}

      {!!visual.charts?.length && <section className={styles.caseCharts} aria-label="Reported measures and their scope">{visual.charts.map(chart => <Chart key={chart.id} chart={chart} />)}</section>}

      <CaseStudyNavigation rootId={rootId} chapters={chapters} />

      <section id="full-case-study" className={styles.mainStory} aria-labelledby="story-title" data-case-section>
        <div className={styles.storyIntro}><h2 id="story-title" data-case-heading tabIndex={-1}>The product story</h2><p>Situation, decisions, delivery and what I learned.</p></div>
        <div className={styles.story}>
          {narrative.map(section => <section key={section.id} id={`story-${section.id}`} className={styles.storySection} aria-labelledby={`heading-${section.id}`} data-case-section>
            <Anchors section={section} legacyDownloads={fallbackDownloadsId === section.id} />
            <div className={styles.sectionHeading}><h3 id={`heading-${section.id}`} data-case-heading tabIndex={-1}>{section.title}</h3></div>
            <SectionBody section={section} study={study} condensed excludedMediaId={leadVisual?.id} />
          </section>)}
        </div>
      </section>

      {visual.workflow.steps.length > 0 && <details id="product-workflow" className={styles.chapter} data-case-section>
        <summary className={styles.chapterSummary} data-case-heading><h2>The product workflow</h2><span className={styles.chapterCount}>{visual.workflow.steps.length} stages</span><span className={styles.chapterToggle} aria-hidden="true">+</span></summary>
        <div className={styles.workflowBody}><Workflow workflow={visual.workflow} /></div>
      </details>}

      {decisions.length > 0 && <section id="decision-chapters" className={styles.chapterGroup} aria-labelledby="decision-chapters-title"><header><h2 id="decision-chapters-title">Decisions in detail</h2><p>{decisions.length} chapters on the choices and operating detail.</p></header>{decisions.map(chapter)}</section>}
      {references.length > 0 && <section id="reference-chapters" className={styles.chapterGroup} aria-labelledby="reference-chapters-title"><header><h2 id="reference-chapters-title">Product references and source material</h2><p>{references.length} chapters. Historical work, current references and proposals are labelled separately.</p></header>{references.map(chapter)}</section>}

      <details id="responsibility-and-results" className={styles.chapter} data-case-section>
        <summary className={styles.chapterSummary} data-case-heading><h2>Responsibility and results record</h2><span className={styles.chapterToggle} aria-hidden="true">+</span></summary>
        <div className={styles.recordBody}>
          <p className={styles.fullCaseTitle}>{study.title}</p>
          <dl className={styles.briefGrid}><div><dt>The challenge</dt><dd>{brief.challenge}</dd></div><div><dt>My remit</dt><dd>{brief.remit}</dd></div><div><dt>{study.workType === 'proposal' || study.workType === 'independent' ? 'Proposed approach' : 'The decision'}</dt><dd>{brief.decision}</dd></div><div><dt>{resultLabel.brief}</dt><dd>{brief.impact}</dd></div></dl>
          {study.outcomes.length > 0 && <section className={styles.outcomesSection} aria-labelledby="outcomes-title"><h3 id="outcomes-title">{resultLabel.section}</h3><dl className={styles.outcomes}>{study.outcomes.map((outcome, index) => <div key={`${outcome.label}-${index}`}><dt>{outcome.label}</dt>{outcome.value && <dd className={styles.outcomeValue}>{outcome.value}</dd>}{outcome.detail && <dd className={styles.outcomeDetail}>{outcome.detail}</dd>}</div>)}</dl></section>}
        </div>
      </details>

      {hasEvidence && <details id="evidence" className={styles.chapter} data-case-section>
        <summary className={styles.chapterSummary} data-case-heading><h2>Evidence and measurement notes</h2><span className={styles.chapterToggle} aria-hidden="true">+</span></summary>
        {!fallbackDownloadsId && <span id="downloads" className={styles.anchorAlias} aria-hidden="true" />}
        <div className={styles.evidenceBody}><MediaSet media={additionalMedia} />{!!study.sourceNotes?.length && <aside className={styles.claimContext} aria-label="Scope and evidence"><p className={styles.claimContextLabel}>Scope and evidence</p>{study.sourceNotes.map((note, index) => <p key={index}>{note}</p>)}</aside>}</div>
      </details>}
      {!hasEvidence && !fallbackDownloadsId && <span id="downloads" className={styles.anchorAlias} aria-hidden="true" />}
    </article>

    {related.length > 0 && <section className={styles.relatedSection} aria-labelledby="related-title">
      <div className={styles.sectionIntro}><h2 id="related-title">Keep exploring</h2><Link href="/product">All work <span aria-hidden="true">↗</span></Link></div>
      <div className={styles.related}>{related.map(other => <Link key={other.id} href={`/product/${encodeURIComponent(other.slug)}`}><span>{findWorkCompany(other.companyId)?.name} · {workTypeLabels[other.workType] || 'Case study'}</span><h3>{other.visualSummary?.title || other.title}</h3><span className={styles.readLink}>Read case study <span aria-hidden="true">→</span></span></Link>)}</div>
    </section>}
  </>;
}
