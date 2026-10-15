'use client';

import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { revealCaseStudyAnchor } from './anchors';
import styles from './work.module.css';

interface ChapterLink { id: string; title: string }
function navigate(event: MouseEvent<HTMLAnchorElement>, rootId: string, id: string) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const root = document.getElementById(rootId);
  if (!root || !revealCaseStudyAnchor(`#${id}`, root)) return;
  event.preventDefault();
  if (window.location.hash !== `#${id}`) window.history.pushState(null, '', `#${id}`);
}
export function CaseStudyJump({ rootId, targetId, children, className }: { rootId: string; targetId: string; children: ReactNode; className?: string }) {
  return <a href={`#${targetId}`} className={className} onClick={event => navigate(event, rootId, targetId)}>{children}</a>;
}
export default function CaseStudyNavigation({ rootId, chapters, referenceHref, referenceFragments = [] }: { rootId: string; chapters: ChapterLink[]; referenceHref?: string; referenceFragments?: string[] }) {
  useEffect(() => {
    function revealHash() {
      let fragment = '';
      try { fragment = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      if (referenceHref && (referenceFragments.includes(fragment) || /^source-\d+$/.test(fragment))) {
        window.location.replace(`${referenceHref}#${encodeURIComponent(fragment)}`);
        return;
      }
      const root = document.getElementById(rootId); if (root) revealCaseStudyAnchor(window.location.hash, root);
    }
    revealHash(); window.addEventListener('hashchange', revealHash);
    return () => window.removeEventListener('hashchange', revealHash);
  }, [rootId, referenceHref, referenceFragments]);
  return <nav className={styles.storyNav} aria-label="In this case study"><span>On this page</span><div>{chapters.map(chapter => <CaseStudyJump key={chapter.id} rootId={rootId} targetId={chapter.id}>{chapter.title}</CaseStudyJump>)}</div></nav>;
}
