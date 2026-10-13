'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './home-motion.module.css';

/** Content is visible without JavaScript; reveal only items still below the viewport. */
export default function HomeMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = root.current;
    if (!container || !('IntersectionObserver' in window)) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches) return;
    const items = Array.from(container.querySelectorAll<HTMLElement>('[data-reveal]'));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.revealState = 'visible';
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1 });
    items.forEach(item => {
      item.dataset.revealState = item.getBoundingClientRect().top < window.innerHeight ? 'visible' : 'pending';
      observer.observe(item);
    });
    function respectPreference(event: MediaQueryListEvent) {
      if (!event.matches) return;
      observer.disconnect();
      items.forEach(item => { item.dataset.revealState = 'visible'; });
    }
    preference.addEventListener('change', respectPreference);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', respectPreference);
      items.forEach(item => { delete item.dataset.revealState; });
    };
  }, []);
  return <div ref={root} className={styles.root}>{children}</div>;
}
