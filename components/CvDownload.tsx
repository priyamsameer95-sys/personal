'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import Icon from '@/components/Icon';
import { CV_DOWNLOAD_FILENAME, CV_DOWNLOAD_URL } from '@/lib/cv-download';
import styles from './cv-download.module.css';

export { CV_DOWNLOAD_URL };

export default function CvDownload({ className = '' }: { className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const email = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const readyAction = useRef<HTMLAnchorElement>(null);
  const request = useRef<AbortController>();
  const previousOverflow = useRef('');
  const active = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [readyURL, setReadyURL] = useState('');
  const id = useId();
  const titleId = `${id}-title`, descriptionId = `${id}-description`, emailId = `${id}-email`, errorId = `${id}-error`;

  useEffect(() => () => {
    request.current?.abort();
    if (active.current) document.body.style.overflow = previousOverflow.current;
  }, []);
  useEffect(() => {
    if (!open) return;
    if (readyURL) readyAction.current?.focus({ preventScroll: true });
    else {
      form.current?.reset();
      email.current?.focus({ preventScroll: true });
    }
  }, [open, readyURL]);

  function close() { dialog.current?.close(); }
  function restore() {
    request.current?.abort();
    active.current = false;
    setOpen(false);
    setPending(false);
    document.body.style.overflow = previousOverflow.current;
    trigger.current?.focus();
  }
  function show() {
    if (!dialog.current || dialog.current.open) return;
    setError('');
    setReadyURL('');
    setPending(false);
    previousOverflow.current = document.body.style.overflow;
    active.current = true;
    dialog.current.showModal();
    document.body.style.overflow = 'hidden';
    setOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/cv-download', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: fields.get('email'), website: fields.get('website'), sourcePath: window.location.pathname }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The CV request could not be saved. Please try again.');
      // Only the approved same-origin CV is accepted, including its source version.
      const approved = new URL(CV_DOWNLOAD_URL, window.location.origin);
      const download = new URL(result.downloadUrl, window.location.origin);
      if (download.href !== approved.href) throw new Error('The CV could not be prepared. Please try again.');
      if (controller.signal.aborted) return;
      const downloadURL = `${download.pathname}${download.search}`;
      setReadyURL(downloadURL);
      const link = document.createElement('a');
      link.href = downloadURL;
      link.download = CV_DOWNLOAD_FILENAME;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (failure) {
      if (controller.signal.aborted) return;
      setError(failure instanceof Error ? failure.message : 'The CV request could not be saved. Please try again.');
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }

  return <>
    <button ref={trigger} type="button" className={className} aria-label="Download CV" aria-haspopup="dialog" aria-controls={`${id}-dialog`} aria-expanded={open} data-analytics={open ? undefined : 'cv_opened'} data-analytics-target="cv" onClick={show}>
      Download CV <Icon name="download" />
    </button>
    <dialog ref={dialog} id={`${id}-dialog`} className={styles.dialog} aria-labelledby={titleId} aria-describedby={descriptionId} onClose={restore} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }}>
      <div className={styles.content}>
        <div className={styles.topline}><span>Priyam Sameer</span><button type="button" onClick={close} aria-label="Close CV request"><Icon name="close" /></button></div>
        <h2 id={titleId}>{readyURL ? 'Your CV is ready.' : 'Get my CV.'}</h2>
        <p id={descriptionId} className={styles.description}>Share your email to download my CV. I’ll receive it as a record of your interest. This does not subscribe you to a newsletter.</p>
        {readyURL ? <div className={styles.success}>
          <p role="status">Your request has been saved. If the download didn’t start, use the link below.</p>
          <a ref={readyAction} href={readyURL} download={CV_DOWNLOAD_FILENAME} data-analytics="cv_download_clicked" data-analytics-target="cv" className={styles.action}>Download CV <Icon name="download" /></a>
        </div> : <form ref={form} onSubmit={submit} aria-busy={pending}>
          <label htmlFor={emailId}>Email address</label>
          <input ref={email} id={emailId} type="email" name="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" aria-describedby={error ? errorId : undefined} readOnly={pending} />
          <div className={styles.honeypot} aria-hidden="true"><label htmlFor={`${id}-website`}>Leave this field empty</label><input id={`${id}-website`} name="website" type="text" autoComplete="off" tabIndex={-1} /></div>
          {error && <p id={errorId} role="alert" className={styles.error}>{error}</p>}
          <button type="submit" className={styles.action} data-analytics="cv_download_clicked" data-analytics-target="cv" disabled={pending}>{pending ? 'Preparing your CV…' : 'Continue to download'}<Icon name="download" /></button>
        </form>}
      </div>
    </dialog>
  </>;
}
