import Link from 'next/link';
import { findWorkCompany, relatedCaseStudies } from '@/lib/work';
import { getCaseDisplayTitle, getCasePresentation, getPrimaryMedia } from '@/lib/work-presentation';
import { workTypeLabels } from '@/lib/work-types';
import type { CaseStudy as CaseStudyData, CaseStudyMedia, CaseStudySection } from '@/lib/work-types';
import styles from './work.module.css';
import Media from './Media';
import CaseStudyNavigation from './CaseStudyNavigation';
import { Chart } from './VisualStory';
import BrandMarks from '@/components/BrandMarks';
import { caseBrandIds } from '@/lib/brands';
import { productLinks } from '@/lib/product-links';
import Icon from '@/components/Icon';

function Gallery({ media, priority = false }: { media: CaseStudyMedia[]; priority?: boolean }) {
  if (!media.length) return null;
  return <div className={`${styles.gallery}${media.length === 1 ? ` ${styles.singleMedia}` : ''}`}>
    {media.map((asset, index) => <div key={asset.id}><Media media={asset} priority={priority && index === 0} compact showDescription /></div>)}
  </div>;
}
function SectionAnchors({ section }: { section: CaseStudySection }) {
  return <>{Array.from(new Set([section.id, `story-${section.id}`, `heading-${section.id}`, ...(section.anchorAliases || []).filter(alias => alias !== 'downloads')])).map(id => <span key={id} id={id} className={styles.anchorAlias} aria-hidden="true" />)}</>;
}
function Tables({ sections, captions }: { sections: CaseStudySection[]; captions?: string[] }) {
  return <>{sections.flatMap(section => section.tables || []).filter(table => !captions || captions.includes(table.caption)).map((table, index) => <div key={`${table.caption}-${index}`} className={styles.tableBlock}>
    {table.headers.length > 2 && <p className={styles.tableHint}>Scroll across to see every column. <Icon name="arrow-right" /></p>}
    <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={table.caption}><table className={table.headers.length <= 2 ? styles.narrowTable : undefined}><caption><span>{table.caption}</span></caption><thead><tr>{table.headers.map((header, column) => <th key={column} scope="col">{header}</th>)}</tr></thead><tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table></div>
    {table.note && <p className={styles.tableNote}>{table.note}</p>}
  </div>)}</>;
}
function Sources({ sections }: { sections: CaseStudySection[] }) {
  const seen = new Set<string>();
  return <ol className={styles.referenceList}>{sections.flatMap(section => {
    if (!section.source) return [];
    const source = section.source;
    const description = [source.label, source.range, source.date, source.version].filter(Boolean).join(' · ');
    const links = (source.links || []).flatMap(link => {
      try { const url = new URL(link.href); return url.protocol === 'https:' && !url.username && !url.password && link.label.trim() ? [{ ...link, href: url.href }] : []; } catch { return []; }
    });
    const key = JSON.stringify([description, links]);
    if (seen.has(key)) return []; seen.add(key);
    return [<li id={`source-${seen.size}`} key={key} tabIndex={-1}><div><p>{description}</p>{!!links.length && <ul className={styles.sourceLinks} aria-label="External source references">{links.map(link => <li key={link.href}><a href={link.href} target="_blank" rel="noopener noreferrer">{link.label} <Icon name="arrow-up-right" /><span className="sr-only"> (opens in a new tab)</span></a></li>)}</ul>}</div></li>];
  })}</ol>;
}
function referenceFragments(study: CaseStudyData, mainIds: Set<string>) {
  const sections = study.sections.filter(section => !mainIds.has(section.id));
  const presentation = getCasePresentation(study);
  return Array.from(new Set(['reference-chapters', 'reference-chapters-title', 'evidence', 'downloads', ...sections.flatMap(section => [section.id, `story-${section.id}`, `heading-${section.id}`, ...(section.anchorAliases || [])]), ...presentation.supportingGroups.map(group => `chapter-${group.id}`), ...(presentation.legacyChapterTargets || []).map(target => target.id)]));
}

export default function CaseStudy({ study }: { study: CaseStudyData }) {
  const company = findWorkCompany(study.companyId);
  const brandIds = caseBrandIds(study.companyId, study.slug);
  const presentation = getCasePresentation(study);
  const referenceHref = `/product/${study.slug}/references`;
  const sectionById = new Map(study.sections.map(section => [section.id, section]));
  const select = (ids: string[]) => ids.flatMap(id => { const section = sectionById.get(id); return section ? [section] : []; });
  const situation = select(['problem']);
  const results = select(['results']);
  const beats = presentation.decisionBeats.filter(group => group.sectionIds.some(id => sectionById.has(id)));
  const mainIds = new Set(['problem', 'results', ...beats.flatMap(group => group.sectionIds)]);
  const primary = getPrimaryMedia(study).slice(0, 1);
  const portraitPrimary = primary[0]?.kind === 'video' && primary[0].frame === 'portrait';
  const usedMedia = new Set(primary.map(media => media.src));
  const usedParagraphs = new Set<string>();
  const paragraphs = (items: string[]) => items.filter(text => { const key = text.replace(/\s+/g, ' ').trim(); if (!key || usedParagraphs.has(key)) return false; usedParagraphs.add(key); return true; });
  const proposal = study.workType === 'proposal';
  const note = presentation.format === 'note' || presentation.format === 'archive';
  const resultsTitle = presentation.resultsTitle || (proposal ? 'Proposed approach and validation' : study.workType === 'prototype' ? 'Prototype scope and validation' : 'What changed');
  const rootId = `case-${study.id}`;
  const chartValues = (study.visualSummary?.charts || []).map(chart => chart.values.map(value => String(value.value)));
  const shownOutcomes = study.outcomes.filter(outcome => {
    if (!outcome.value && !outcome.detail) return false;
    const numbers = outcome.value?.replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || [];
    return !(numbers.length && chartValues.some(values => numbers.every(number => values.includes(number))));
  });
  const resultParagraphs = results.flatMap(section => section.body);
  const hasResults = resultParagraphs.length || shownOutcomes.length || study.visualSummary?.charts?.length;
  const related = relatedCaseStudies(study).slice(0, 2);
  const productLink = productLinks[study.slug];
  return <>
    <div className={styles.backNavigation}><Link href={company ? `/product#${company.id}` : '/product'} className={styles.backLink}><Icon name="arrow-left" /> Work{company ? ` / ${company.name}` : ''}</Link></div>
    <article id={rootId} className={`${styles.caseStudy}${note ? ` ${styles.backgroundNote}` : ''}${portraitPrimary ? ` ${styles.portraitCase}` : ''}`} data-case-section>
      <header className={styles.caseHeader}>
        <div className={styles.caseIdentity}><BrandMarks brandIds={brandIds} small className={brandIds.length > 1 ? styles.caseBrands : undefined} /><p className={styles.eyebrow}>{workTypeLabels[study.workType]} {!presentation.suppressPeriod && <span>{presentation.periodLabel ? `${presentation.periodLabel}: ` : ''}{study.period}</span>}</p></div>
        <div className={styles.caseTitle}><h1 data-case-heading tabIndex={-1}>{getCaseDisplayTitle(study)}</h1><p className={styles.caseSummary}>{study.visualSummary?.summary || study.summary}</p>{productLink && <a className={styles.productLink} href={productLink.href} target="_blank" rel="noopener noreferrer" data-analytics="outbound_clicked" data-analytics-target="live_product">{productLink.label} <Icon name="arrow-up-right" /><span className="sr-only"> (opens in a new tab)</span></a>}</div>
        <div className={styles.caseRemit}><p className={styles.visualRole}><strong>My role</strong> {study.visualSummary?.role || study.role}</p></div>
      </header>
      {primary.length ? <section id="product-reference" className={styles.leadEvidence} aria-label="Featured visual evidence" data-case-section><Gallery media={primary} priority /></section> : <span id="product-reference" className={styles.anchorAlias} aria-hidden="true" />}
      <CaseStudyNavigation rootId={rootId} chapters={[{ id:'full-case-study', title:note ? 'Account' : proposal ? 'Proposed design' : 'Decisions' }, ...(hasResults ? [{ id:'responsibility-and-results', title:resultsTitle }] : [])]} referenceHref={referenceHref} referenceFragments={referenceFragments(study, mainIds)} />
      <section id="full-case-study" className={styles.mainStory} aria-labelledby="story-title" data-case-section>
        <div className={styles.storyIntro}><h2 id="story-title" data-case-heading tabIndex={-1}>{note ? 'The experience' : proposal ? 'The proposed design' : 'Why this mattered'}</h2></div>
        <span id="brief-title" className={styles.anchorAlias} aria-hidden="true" />
        {situation.map(section => <SectionAnchors key={section.id} section={section} />)}
        <div className={styles.situation}>{paragraphs(situation.flatMap(section => section.body)).map(text => <p key={text}>{text}</p>)}</div>
        <span id="decision-chapters" className={styles.anchorAlias} aria-hidden="true" /><span id="decision-chapters-title" className={styles.anchorAlias} aria-hidden="true" />
        {beats.map(group => {
          const sections = select(group.sectionIds);
          const media = (group.mainMediaIds || []).flatMap(id => {
            const asset = study.media.find(media => media.id === id);
            if (!asset || usedMedia.has(asset.src)) return []; usedMedia.add(asset.src); return [asset];
          });
          return <section key={group.id} id={`chapter-${group.id}`} className={styles.decisionBeat} data-case-section>
            <header className={styles.chapterHeader}>{sections.map(section => <SectionAnchors key={section.id} section={section} />)}<h3 data-case-heading tabIndex={-1}>{group.title}</h3></header>
            <div className={styles.chapterBody}><div className={styles.chapterText}>{paragraphs(group.body || sections.flatMap(section => section.body)).map(text => <p key={text}>{text}</p>)}</div><Gallery media={media} />{group.mainTableCaptions?.length ? <Tables sections={sections} captions={group.mainTableCaptions} /> : null}</div>
          </section>;
        })}
        <span id="product-workflow" className={styles.anchorAlias} aria-hidden="true" />
      </section>
      {!!hasResults && <section id="responsibility-and-results" className={styles.resultsSection} aria-labelledby="outcomes-title" data-case-section>{results.map(section => <SectionAnchors key={section.id} section={section} />)}<h2 id="outcomes-title" data-case-heading tabIndex={-1}>{resultsTitle}</h2><div className={styles.chapterText}>{paragraphs(resultParagraphs).map(text => <p key={text}>{text}</p>)}</div>
        {!!study.visualSummary?.charts?.length && <div className={styles.caseCharts}>{study.visualSummary.charts.map(chart => <Chart key={chart.id} chart={chart} />)}</div>}
        {!!shownOutcomes.length && <dl className={styles.outcomes}>{shownOutcomes.map((outcome,index) => <div key={index}><dt>{outcome.label}</dt>{outcome.value && <dd className={styles.outcomeValue}>{outcome.value}</dd>}{outcome.detail && <dd className={styles.outcomeDetail}>{outcome.detail}</dd>}</div>)}</dl>}
      </section>}
      {presentation.links?.length ? <div className={styles.caseActions}>{presentation.links.map(link => <Link key={link.href} href={link.href} className="ink-link">{link.label} <Icon name="arrow-up-right" /></Link>)}</div> : null}
      <section className={styles.referenceEntry} aria-labelledby="reference-entry-title"><div><h2 id="reference-entry-title">Sources & technical detail</h2><p>Original artifacts, detailed tables and source notes.</p></div><Link href={referenceHref} className="ink-link">View supporting material <Icon name="arrow-up-right" /></Link></section>
    </article>
    {!!related.length && <section className={styles.relatedSection} aria-labelledby="related-title"><div className={styles.sectionIntro}><h2 id="related-title">Related work</h2><Link href="/product">Selected work <Icon name="arrow-up-right" /></Link></div><div className={styles.related}>{related.map(other => <Link key={other.id} href={`/product/${other.slug}`}><span>{findWorkCompany(other.companyId)?.name} · {workTypeLabels[other.workType]}</span><h3>{getCaseDisplayTitle(other)}</h3></Link>)}</div></section>}
  </>;
}

export function CaseStudyReferences({ study }: { study: CaseStudyData }) {
  const used = new Set<string>();
  const presentation = getCasePresentation(study);
  const internalIds = new Set(presentation.internalSectionIds || []);
  const publicSections = study.sections.filter(section => !internalIds.has(section.id));
  const chapters = presentation.supportingGroups.flatMap(group => {
    const section = publicSections.find(section => group.sectionIds.includes(section.id));
    return section ? [{ id: `reference-${section.id}`, title: group.title }] : [];
  });
  const mediaFor = (ids: string[]) => ids.flatMap(id => {
    const asset = study.media.find(media => media.id === id);
    if (!asset || used.has(asset.src)) return []; used.add(asset.src); return [asset];
  });
  return <article id={`references-${study.id}`} className={`${styles.caseStudy} ${styles.referencePage}`} data-case-section>
    <Link href={`/product/${study.slug}`} className={styles.backLink}><Icon name="arrow-left" /> Return to the case study</Link>
    <header className={styles.referenceHeader}><p>Supporting evidence</p><h1 data-case-heading tabIndex={-1}>{getCaseDisplayTitle(study)}</h1><p>The complete artifacts and detailed records behind the account. Current public references, original work and proposed designs retain their labels.</p></header>
    <CaseStudyNavigation rootId={`references-${study.id}`} chapters={[...chapters, { id: 'evidence', title: 'Notes and sources' }]} />
    <span id="downloads" className={styles.anchorAlias} aria-hidden="true" />
    <section id="reference-chapters" data-case-section>
      <h2 id="reference-chapters-title" className="sr-only" data-case-heading tabIndex={-1}>Detailed material</h2>
      {publicSections.map(section => <section key={section.id} id={`reference-${section.id}`} className={styles.sourceFamily} data-case-section>
        <header className={styles.chapterHeader}><SectionAnchors section={section} />{[...presentation.decisionBeats,...presentation.supportingGroups].filter(group => group.sectionIds[0] === section.id).map(group => <span key={group.id} id={`chapter-${group.id}`} className={styles.anchorAlias} aria-hidden="true" />)}{presentation.legacyChapterTargets?.filter(target => target.sectionId === section.id).map(target => <span key={target.id} id={target.id} className={styles.anchorAlias} aria-hidden="true" />)}<h2 data-case-heading tabIndex={-1}>{section.title}</h2></header>
        <div className={styles.chapterText}>{section.body.map((text,index) => <p key={index}>{text}</p>)}{!!section.bullets?.length && <ul>{section.bullets.map((text,index) => <li key={index}>{text}</li>)}</ul>}</div>
        <Tables sections={[section]} /><Gallery media={mediaFor(section.mediaIds || [])} />
      </section>)}
    </section>
    <section id="evidence" className={styles.evidenceSection} data-case-section><h2 data-case-heading tabIndex={-1}>Notes and sources</h2><Gallery media={study.media.filter(asset => !used.has(asset.src)).filter((asset,index,all) => all.findIndex(media => media.src === asset.src) === index)} />
      {!!study.sourceNotes?.length && <ul className={styles.sourceNotes}>{Array.from(new Set(study.sourceNotes)).map(note => <li key={note}>{note}</li>)}</ul>}
      {study.sections.filter(section => internalIds.has(section.id)).map(section => <span key={section.id}><SectionAnchors section={section} />{[...presentation.decisionBeats,...presentation.supportingGroups].filter(group => group.sectionIds[0] === section.id).map(group => <span key={group.id} id={`chapter-${group.id}`} className={styles.anchorAlias} aria-hidden="true" />)}</span>)}
      <Sources sections={publicSections} />
    </section>
    <Link href={`/product/${study.slug}`} className="ink-link">Return to the case study <Icon name="arrow-up-right" /></Link>
  </article>;
}
