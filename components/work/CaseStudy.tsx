import Link from 'next/link';
import { findWorkCompany, relatedCaseStudies } from '@/lib/work';
import { getCasePresentation, getPrimaryMedia } from '@/lib/work-presentation';
import { workTypeLabels } from '@/lib/work-types';
import type { CaseStudy as CaseStudyData, CaseStudyChapterGroup, CaseStudyMedia, CaseStudySection } from '@/lib/work-types';
import styles from './work.module.css';
import Media from './Media';
import CaseStudyNavigation from './CaseStudyNavigation';
import { Chart } from './VisualStory';
import BrandMarks from '@/components/BrandMarks';
import { caseBrandIds } from '@/lib/brands';

function Gallery({ media, priority = false }: { media: CaseStudyMedia[]; priority?: boolean }) {
  if (!media.length) return null;
  return <div className={`${styles.gallery}${media.length === 1 ? ` ${styles.singleMedia}` : ''}`}>
    {media.map((asset, index) => <div key={asset.id} className={asset.kind === 'image' && asset.width && asset.height && asset.height > asset.width * 1.3 ? styles.portraitMedia : undefined}>
      <Media media={asset} priority={priority && index === 0} />
    </div>)}
  </div>;
}

function SectionAnchors({ section }: { section: CaseStudySection }) {
  return <>{[`story-${section.id}`, `heading-${section.id}`, ...(section.anchorAliases || []).filter(alias => alias !== 'downloads')].map(id => <span key={id} id={id} className={styles.anchorAlias} aria-hidden="true" />)}</>;
}

function Tables({ sections }: { sections: CaseStudySection[] }) {
  return <>{sections.flatMap(section => section.tables || []).map((table, index) => <div key={`${table.caption}-${index}`} className={styles.tableBlock}>
    <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={table.caption}>
      <table><caption><span>{table.caption}</span></caption><thead><tr>{table.headers.map((header, column) => <th key={column} scope="col">{header}</th>)}</tr></thead><tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table>
    </div>{table.note && <p className={styles.tableNote}>{table.note}</p>}
  </div>)}</>;
}

interface PresentedGroup { group: CaseStudyChapterGroup; sections: CaseStudySection[]; paragraphs: string[]; bullets: string[]; sources: string[]; media: CaseStudyMedia[] }
function Chapter({ item, number }: { item: PresentedGroup; number?: number }) {
  return <section id={`chapter-${item.group.id}`} className={number ? styles.decisionBeat : styles.sourceFamily} data-case-section>
    {item.sections.map(section => <SectionAnchors key={section.id} section={section} />)}
    <header className={styles.chapterHeader}>{number && <span className={styles.beatNumber} aria-hidden="true">0{number}</span>}<h3 data-case-heading tabIndex={-1}>{item.group.title}</h3></header>
    <div className={styles.chapterText}>{item.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      {!!item.bullets.length && <ul>{item.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>}
    </div>
    <Tables sections={item.sections} />
    <Gallery media={item.media} />
    {!!item.sources.length && <p className={styles.sectionSource}>{item.sources.join(' · ')}</p>}
  </section>;
}

export default function CaseStudy({ study }: { study: CaseStudyData }) {
  const company = findWorkCompany(study.companyId);
  const related = relatedCaseStudies(study);
  const primary = getPrimaryMedia(study);
  const usedMedia = new Set(primary.map(asset => asset.src));
  const seenParagraphs = new Set<string>();
  const seenBullets = new Set<string>();
  const presentation = getCasePresentation(study);
  const sectionById = new Map(study.sections.map(section => [section.id, section]));
  const normalise = (text: string) => text.replace(/\s+/g, ' ').trim();
  const responsibility = study.executiveBrief?.remit;
  if (responsibility) seenParagraphs.add(normalise(responsibility));
  function present(group: CaseStudyChapterGroup): PresentedGroup {
    const sections = group.sectionIds.flatMap(id => { const section = sectionById.get(id); return section ? [section] : []; });
    const paragraphs = (group.body || sections.flatMap(section => section.body)).filter(text => { const key = normalise(text); if (seenParagraphs.has(key)) return false; seenParagraphs.add(key); return true; });
    const bullets = sections.flatMap(section => section.bullets || []).filter(text => { const key = normalise(text); if (seenBullets.has(key)) return false; seenBullets.add(key); return true; });
    const media = sections.flatMap(section => section.mediaIds || []).flatMap(id => {
      const asset = study.media.find(candidate => candidate.id === id);
      if (!asset || usedMedia.has(asset.src)) return [];
      usedMedia.add(asset.src); return [asset];
    });
    const sources = Array.from(new Set(sections.flatMap(section => section.source ? [[section.source.label, section.source.range, section.source.date, section.source.version].filter(Boolean).join(' · ')] : [])));
    return { group, sections, paragraphs, bullets, media, sources };
  }
  const situation = present({ id: 'situation', title: 'The situation', sectionIds: ['problem'] });
  const beats = presentation.decisionBeats.map(present).filter(item => item.sections.length);
  const results = present({ id: 'results', title: 'Impact and its limits', sectionIds: ['results'] });
  const supporting = presentation.supportingGroups.map(present).filter(item => item.sections.length);
  const validation = supporting.filter(item => item.group.sectionIds.some(id => id === 'software-validation-record' || id === 'evaluation-plan'));
  const sources = supporting;
  const remaining = study.media.filter(asset => { if (usedMedia.has(asset.src)) return false; usedMedia.add(asset.src); return true; });
  const rootId = `case-${study.id}`;
  const proposal = study.workType === 'proposal' || study.workType === 'independent';
  const resultsTitle = proposal ? 'Proposed approach and validation' : study.workType === 'prototype' ? 'Prototype scope and validation' : 'Results and scope';
  const chartValues = (study.visualSummary?.charts || []).map(chart => chart.values.map(value => String(value.value)));
  const outcomeValueCovered = (value: string) => {
    const numbers = value.replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || [];
    return numbers.length > 0 && chartValues.some(values => numbers.every(number => values.includes(number)));
  };
  const chapters = [
    { id: 'full-case-study', title: 'Decisions and delivery' },
    { id: 'responsibility-and-results', title: resultsTitle },
    ...(validation.length ? [{ id: `chapter-${validation[0].group.id}`, title: 'Validation evidence and plan' }] : []),
    ...(sources.length ? [{ id: 'reference-chapters', title: 'Supporting context' }] : []),
    { id: 'evidence', title: 'Source and measurement notes' },
  ];
  return <>
    <Link href={company ? `/product#${company.id}` : '/product'} className={styles.backLink}><span aria-hidden="true">←</span> Work{company ? ` / ${company.name}` : ''}</Link>
    <article id={rootId} className={styles.caseStudy}>
      <header className={styles.caseHeader}>
        <BrandMarks brandIds={caseBrandIds(study.companyId, study.slug)} small />
        <p className={styles.eyebrow}>{workTypeLabels[study.workType] || 'Case study'} <span>{study.period}</span></p>
        <h1>{study.visualSummary?.title || study.title}</h1>
        <p className={styles.caseSummary}>{study.visualSummary?.summary || study.summary}</p>
        <p className={styles.visualRole}><strong>My responsibility</strong> {study.visualSummary?.role || study.role}</p>
        {proposal && <p className={styles.statusNote}>Architecture or product direction. Deployment and achieved outcomes are not established.</p>}
      </header>

      {!!primary.length && <section id="product-reference" className={styles.leadEvidence} aria-label="Featured visual evidence" data-case-section><Gallery media={primary} priority /></section>}
      <CaseStudyNavigation rootId={rootId} chapters={chapters} />
      <section id="full-case-study" className={styles.mainStory} aria-labelledby="story-title" data-case-section>
        <div className={styles.storyIntro}><h2 id="story-title" data-case-heading tabIndex={-1}>{proposal ? 'The proposed product approach' : 'The decisions behind the work'}</h2></div>
        <span id="brief-title" className={styles.anchorAlias} aria-hidden="true" />
        {situation.sections.map(section => <SectionAnchors key={section.id} section={section} />)}
        <div className={styles.situation}>{responsibility && <p>{responsibility}</p>}{situation.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div><Gallery media={situation.media} />
        <span id="decision-chapters" className={styles.anchorAlias} aria-hidden="true" /><span id="decision-chapters-title" className={styles.anchorAlias} aria-hidden="true" />
        {beats.map((item, index) => <Chapter key={item.group.id} item={item} number={index + 1} />)}
        <span id="product-workflow" className={styles.anchorAlias} aria-hidden="true" />
      </section>

      <section id="responsibility-and-results" className={styles.resultsSection} aria-labelledby="outcomes-title" data-case-section>
        {results.sections.map(section => <SectionAnchors key={section.id} section={section} />)}
        <h2 id="outcomes-title" data-case-heading tabIndex={-1}>{resultsTitle}</h2>
        <div className={styles.chapterText}>{results.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
        {!!study.visualSummary?.charts?.length && <div className={styles.caseCharts}>{study.visualSummary.charts.map(chart => <Chart key={chart.id} chart={chart} />)}</div>}
        {!!study.outcomes.length && <dl className={styles.outcomes}>{study.outcomes.map((outcome, index) => <div key={`${outcome.label}-${index}`}><dt>{outcome.label}</dt>{outcome.value && !outcomeValueCovered(outcome.value) && <dd className={styles.outcomeValue}>{outcome.value}</dd>}{outcome.detail && <dd className={styles.outcomeDetail}>{outcome.detail}</dd>}</div>)}</dl>}
        <Tables sections={results.sections} /><Gallery media={results.media} />
      </section>
      {!!sources.length && <section id="reference-chapters" className={styles.supportingSection} aria-labelledby="supporting-title" data-case-section><span id="reference-chapters-title" className={styles.anchorAlias} aria-hidden="true" /><h2 id="supporting-title" data-case-heading tabIndex={-1}>Supporting context and visual evidence</h2>{sources.map(item => <Chapter key={item.group.id} item={item} />)}</section>}
      <section id="evidence" className={styles.evidenceSection} aria-labelledby="materials-title" data-case-section>
        {!sources.length && <span id="reference-chapters-title" className={styles.anchorAlias} aria-hidden="true" />}
        <span id="downloads" className={styles.anchorAlias} aria-hidden="true" />
        <h2 id="materials-title" data-case-heading tabIndex={-1}>Source and measurement notes</h2>
        <Gallery media={remaining} />
        {!!study.sourceNotes?.length && <ul className={styles.sourceNotes}>{Array.from(new Set(study.sourceNotes)).map(note => <li key={note}>{note}</li>)}</ul>}
      </section>
    </article>
    {!!related.length && <section className={styles.relatedSection} aria-labelledby="related-title"><div className={styles.sectionIntro}><h2 id="related-title">Keep exploring</h2><Link href="/product">All work <span aria-hidden="true">↗</span></Link></div><div className={styles.related}>{related.map(other => <Link key={other.id} href={`/product/${encodeURIComponent(other.slug)}`}><span>{findWorkCompany(other.companyId)?.name} · {workTypeLabels[other.workType] || 'Case study'}</span><h3>{other.visualSummary?.title || other.title}</h3><span className={styles.readLink}>Read case study <span aria-hidden="true">→</span></span></Link>)}</div></section>}
  </>;
}
