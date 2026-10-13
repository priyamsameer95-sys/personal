/** Reveal an existing chapter before navigating to its fragment, including legacy aliases. */
export function revealCaseStudyAnchor(hash: string, root: HTMLElement): boolean {
  let id: string;
  try { id = decodeURIComponent(hash.replace(/^#/, '')); } catch { return false; }
  if (!id) return false;
  const target = root.ownerDocument.getElementById(id);
  if (!target || !root.contains(target)) return false;
  for (let ancestor: HTMLElement | null = target; ancestor && root.contains(ancestor); ancestor = ancestor.parentElement) {
    if (ancestor.tagName === 'DETAILS') (ancestor as HTMLDetailsElement).open = true;
  }
  const chapter = target.closest<HTMLElement>('[data-case-section]');
  const destination = chapter || target;
  const focusTarget = chapter?.querySelector<HTMLElement>('[data-case-heading]') || target;
  destination.scrollIntoView({ block: 'start' });
  focusTarget.focus({ preventScroll: true });
  return true;
}
