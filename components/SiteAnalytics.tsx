'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/** First-party, cookie-free page counts. No email, query string or raw referrer URL is sent. */
export default function SiteAnalytics() {
  const pathname = usePathname();
  const lastSent = useRef('');
  useEffect(() => {
    const privacy = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (!pathname || !/^\/(?:$|product(?:\/|$)|art$|cv$|github$|blog$)/.test(pathname) || navigator.doNotTrack === '1' || privacy.globalPrivacyControl || !window.crypto?.randomUUID) return;
    function send() {
      if (document.visibilityState !== 'visible' || lastSent.current === pathname) return;
      lastSent.current = pathname;
      let referrer = '';
      try { referrer = document.referrer ? new URL(document.referrer).hostname : ''; } catch { /* No referrer. */ }
      void fetch('/api/analytics', { method: 'POST', credentials: 'same-origin', mode: 'same-origin', keepalive: true,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ eventId: window.crypto.randomUUID(), path: pathname, referrer }),
      }).catch(() => { /* Measurement never interrupts reading or downloads. */ });
    }
    const timer = window.setTimeout(send, 300);
    document.addEventListener('visibilitychange', send);
    return () => { window.clearTimeout(timer); document.removeEventListener('visibilitychange', send); };
  }, [pathname]);
  return null;
}
