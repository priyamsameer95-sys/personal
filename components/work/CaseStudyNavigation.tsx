'use client';

import { useEffect, type MouseEvent } from 'react';
import { revealCaseStudyAnchor } from './anchors';
import styles from './work.module.css';

interface ChapterLink {
  id: string;
  title: string;
  expandable: boolean;
  group?: 'story' | 'detail' | 'reference';
}

export default function CaseStudyNavigation({ rootId, chapters }: { rootId: string; chapters: ChapterLink[] }) {
  useEffect(() => {
    function revealHash() {
      const root = document.getElementById(rootId);
      if (root) revealCaseStudyAnchor(window.location.hash, root);
    }
    revealHash();
    window.addEventListener('hashchange', revealHash);
    return () => window.removeEventListener('hashchange', revealHash);
  }, [rootId]);

  function navigate(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const root = document.getElementById(rootId);
    if (!root || !revealCaseStudyAnchor(`#${id}`, root)) return;
    event.preventDefault();
    if (window.location.hash !== `#${id}`) window.history.pushState(null, '', `#${id}`);
  }

  function chapterLink(chapter: ChapterLink) {
    return <a key={chapter.id} href={`#${chapter.id}`} onClick={(event) => navigate(event, chapter.id)}>{chapter.title}</a>;
  }

  const main = chapters.filter((chapter) => !chapter.expandable);
  const supporting = chapters.filter((chapter) => chapter.expandable);
  const detail = supporting.filter((chapter) => chapter.group !== 'reference');
  const reference = supporting.filter((chapter) => chapter.group === 'reference');

  return <nav className={styles.storyNav} aria-label="In this case study">
    <div className={styles.mainChapterLinks}><span>In this case study</span>{main.map(chapterLink)}</div>
    {supporting.length > 0 && <details className={styles.supportingNav}>
      <summary>Supporting chapters <small>{supporting.length} chapters</small><span aria-hidden="true">+</span></summary>
      <div className={styles.supportingNavGroups}>
        {detail.length > 0 && <div><p>Further detail</p><div>{detail.map(chapterLink)}</div></div>}
        {reference.length > 0 && <div><p>Source chapters</p><div>{reference.map(chapterLink)}</div></div>}
      </div>
    </details>}
  </nav>;
}
