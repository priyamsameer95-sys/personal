'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { normalizeAnalyticsAction, type AnalyticsAction } from '@/lib/analytics-events';

// The server checks the published route registry again. Never include URL
// parameters, fragments, rendered labels, form values or contact destinations.
function publicPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 512 || !value.startsWith('/')) return null;
  const path = value.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  return path.length <= 240 && /^\/(?:$|(?:product|art|blog)(?:\/[a-z0-9-]+(?:\/references)?)?$|cv$|github$)/.test(path) ? path : null;
}

function linkAction(element: Element): AnalyticsAction | null {
  const href = element.getAttribute('href');
  if (!href) return null;
  if (/^mailto:/i.test(href)) return { type: 'contact_clicked', target: 'email' };
  if (/^tel:/i.test(href)) return { type: 'contact_clicked', target: 'phone' };
  let url: URL;
  try { url = new URL(href, window.location.href); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
  if (url.origin === window.location.origin) {
    if (/^\/cv\/Priyam_Sameer_Zero_to_One_Product_Manager_CV\.pdf$/.test(url.pathname)) return { type: 'cv_download_clicked', target: 'cv' };
    const target = publicPath(url.pathname);
    return target ? { type: 'navigation_clicked', target } : null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'linkedin.com') return { type: 'contact_clicked', target: 'linkedin' };
  if (host === 'wa.me' || host === 'api.whatsapp.com') return { type: 'contact_clicked', target: 'whatsapp' };
  if (host === 'github.com') return { type: 'outbound_clicked', target: 'github' };
  if (host === 'college.money' || host === 'upaj.org') return { type: 'outbound_clicked', target: 'live_product' };
  return { type: 'outbound_clicked', target: 'external' };
}

/** First-party counts of public page views and deliberate actions; no browsing-to-email linkage. */
export default function SiteAnalytics() {
  const pathname = usePathname();
  const lastSent = useRef('');
  useEffect(() => {
    const path = publicPath(pathname);
    const privacy = navigator as Navigator & { globalPrivacyControl?: boolean };
    function permitted() { return navigator.doNotTrack !== '1' && !privacy.globalPrivacyControl && document.visibilityState === 'visible'; }
    if (!path || navigator.doNotTrack === '1' || privacy.globalPrivacyControl || !window.crypto?.randomUUID) return;
    let referrer = '';
    try { referrer = document.referrer ? new URL(document.referrer).hostname : ''; } catch { /* No referrer. */ }
    const playedVideos = new WeakSet<Element>();

    function send(action: AnalyticsAction) {
      if (!permitted()) return;
      try {
        void fetch('/api/analytics', { method: 'POST', credentials: 'same-origin', mode: 'same-origin', keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId: window.crypto.randomUUID(), path, referrer, ...action }),
        }).catch(() => { /* Measurement never interrupts reading or downloads. */ });
      } catch { /* Unavailable measurement never blocks an action. */ }
    }
    function pageView() {
      if (!permitted() || lastSent.current === path) return;
      lastSent.current = path!;
      send({ type: 'page_view' });
    }
    function onClick(event: MouseEvent) {
      // Includes genuine keyboard activation. Programmatic clicks used to start
      // the approved CV download are already represented by its saved request.
      const middleLink = event.type === 'auxclick' && event.button === 1;
      if (!event.isTrusted || (event.type === 'auxclick' ? !middleLink : event.button !== 0) || !permitted() || !(event.target instanceof Element)) return;
      const element = event.target.closest('[data-analytics], a[href]');
      if (!element || element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true') return;
      if (middleLink && (element.tagName !== 'A' || !element.hasAttribute('href'))) return;
      const explicit = element.getAttribute('data-analytics');
      const action = explicit
        ? normalizeAnalyticsAction(explicit, element.getAttribute('data-analytics-target'), publicPath)
        : linkAction(element);
      if (!action || action.type === 'page_view') return;
      pageView();
      send(action);
    }
    function onPlay(event: Event) {
      const video = event.target;
      if (!(video instanceof Element) || video.tagName !== 'VIDEO' || video.hasAttribute('autoplay') || playedVideos.has(video) || !permitted()) return;
      playedVideos.add(video);
      pageView();
      send({ type: 'video_started', target: 'video' });
    }
    function onCompletedAction(event: Event) {
      // Clipboard success is emitted after the browser has accepted the copy.
      const detail = (event as CustomEvent<unknown>).detail;
      if (!detail || typeof detail !== 'object' || !('type' in detail) || !('target' in detail)) return;
      const action = normalizeAnalyticsAction(detail.type, detail.target, publicPath);
      if (action?.type === 'email_copied' && action.target === 'email') { pageView(); send(action); }
    }
    const timer = window.setTimeout(pageView, 300);
    document.addEventListener('visibilitychange', pageView);
    document.addEventListener('click', onClick, true);
    document.addEventListener('auxclick', onClick, true);
    document.addEventListener('play', onPlay, true);
    document.addEventListener('portfolio:analytics', onCompletedAction);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', pageView);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('auxclick', onClick, true);
      document.removeEventListener('play', onPlay, true);
      document.removeEventListener('portfolio:analytics', onCompletedAction);
    };
  }, [pathname]);
  return null;
}
