'use client';
import { useEffect, useState } from 'react';

export default function AnalyticsPreference() {
  const [disabled, setDisabled] = useState<boolean | null>(null);
  const [signal, setSignal] = useState(false);
  useEffect(() => {
    setDisabled(document.cookie.split(';').some(value => value.trim() === 'ps_analytics_disabled=1'));
    setSignal(navigator.doNotTrack === '1' || Boolean((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl));
  }, []);
  function change() {
    const next = !disabled;
    document.cookie = `ps_analytics_disabled=${next ? '1' : '0'}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    setDisabled(next);
    window.dispatchEvent(new Event('portfolio:analytics-preference'));
  }
  return <section aria-labelledby="preference-title">
    <h2 id="preference-title">Your choice, in this browser.</h2>
    <p role="status">{disabled === null ? 'Checking your preference…' : signal ? 'Your browser’s privacy signal is respected. Analytics is off.' : disabled ? 'Analytics is off for this browser.' : 'Anonymous analytics is on for this browser.'}</p>
    <button type="button" className="ink-button" onClick={change} disabled={disabled === null || signal}>
      {disabled ? 'Allow anonymous analytics' : 'Exclude this browser from analytics'}
    </button>
    <p>You can still use every page and request the CV. This choice applies to this browser; clearing its cookies removes the preference.</p>
  </section>;
}
