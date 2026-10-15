'use client';

import { useEffect, useState, type ReactNode } from 'react';
import styles from './email-contact.module.css';

export const emailAddress = 'Priyam.Sameer.95@gmail.com';

export function CopyEmailButton({ email = emailAddress, className = '' }: { email?: string; className?: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  useEffect(() => {
    if (status !== 'copied') return;
    const timer = window.setTimeout(() => setStatus('idle'), 4000);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  }

  return <span className={`${styles.copyControl} ${className}`}>
    <button type="button" className={styles.copyButton} aria-label="Copy email address" onClick={copy}>
      {status === 'copied' ? 'Copied' : 'Copy email'}
    </button>
    <span role="status" className={status === 'failed' ? styles.failure : 'sr-only'}>
      {status === 'copied' ? 'Email address copied.' : status === 'failed' ? `Couldn’t copy automatically. Select and copy: ${email}` : ''}
    </span>
  </span>;
}

export default function EmailContact({ email = emailAddress, subject, href, children, className = '', linkClassName = '' }: {
  email?: string;
  subject?: string;
  href?: string;
  children?: ReactNode;
  className?: string;
  linkClassName?: string;
}) {
  const emailHref = href || `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
  return <span className={`${styles.contact} ${className}`}>
    <a href={emailHref} className={`${styles.emailLink} ${linkClassName}`}>{children || email}</a>
    <CopyEmailButton email={email} />
  </span>;
}
