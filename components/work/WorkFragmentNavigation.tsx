'use client';

import { useEffect } from 'react';

const careerDestinations: Readonly<Record<string, string>> = {
  credflow: '/cv#credflow',
  'founder-programmes': '/cv#founder-programmes',
  'water-farmers': '/cv#internship',
  'gujarat-action-group': '/cv#gujarat-action-group',
  advisory: '/cv#advisory',
  cept: '/cv#education',
};

function decodeFragment(hash: string): string | null {
  try {
    return decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    return null;
  }
}

/** Legacy career links have fixed internal destinations, never URLs supplied by a hash. */
export function resolveCareerFragment(hash: string): string | null {
  const fragment = decodeFragment(hash);
  return fragment && Object.prototype.hasOwnProperty.call(careerDestinations, fragment)
    ? careerDestinations[fragment]
    : null;
}

export function resolveWorkFragment(hash: string, fragments: readonly string[]): string | null {
  const fragment = decodeFragment(hash);
  return fragment && fragments.includes(fragment) ? fragment : null;
}

/** Only fragment names cross this client boundary; project records stay on the server. */
export default function WorkFragmentNavigation({ fragments }: { fragments: string[] }) {
  useEffect(() => {
    let frame = 0;
    function followFragment() {
      cancelAnimationFrame(frame);
      const careerDestination = resolveCareerFragment(window.location.hash);
      if (careerDestination) {
        window.location.replace(careerDestination);
        return;
      }
      const id = resolveWorkFragment(window.location.hash, fragments);
      if (!id) return;
      frame = requestAnimationFrame(() => {
        const target = document.getElementById(id);
        const project = target?.closest?.<HTMLElement>('[id^="project-"]');
        const heading = target?.querySelector?.<HTMLElement>('h2[tabindex="-1"], h3[tabindex="-1"]')
          || project?.querySelector?.<HTMLElement>('h3[tabindex="-1"]');
        (heading || target)?.focus({ preventScroll: true });
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
