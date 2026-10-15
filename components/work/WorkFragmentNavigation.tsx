'use client';

import { useEffect } from 'react';

export function resolveWorkFragment(hash: string, fragments: readonly string[]): string | null {
  try {
    const fragment = decodeURIComponent(hash.replace(/^#/, ''));
    return fragments.includes(fragment) ? fragment : null;
  } catch {
    return null;
  }
}

/** Only fragment names cross this client boundary; project records stay on the server. */
export default function WorkFragmentNavigation({ fragments }: { fragments: string[] }) {
  useEffect(() => {
    let frame = 0;
    function followFragment() {
      const id = resolveWorkFragment(window.location.hash, fragments);
      if (!id) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const target = document.getElementById(id);
        target?.focus({ preventScroll: true });
        target?.scrollIntoView({ block: 'start', behavior: 'instant' });
      });
    }
    followFragment();
    window.addEventListener('hashchange', followFragment);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', followFragment);
    };
  }, [fragments]);
  return null;
}
