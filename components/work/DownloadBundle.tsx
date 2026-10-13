'use client';

import { useEffect, useRef, useState } from 'react';
import { assembleDownload, DownloadBundleError } from '@/lib/download-bundle';
import type { CaseStudyDownload } from '@/lib/work-types';
import styles from './work.module.css';

export default function DownloadBundle({ download }: { download: CaseStudyDownload }) {
  const [phase, setPhase] = useState<'idle' | 'fetching' | 'verifying' | 'ready' | 'error' | 'cancelled'>('idle');
  const [received, setReceived] = useState(0);
  const [saveUrl, setSaveUrl] = useState<string>();
  const [error, setError] = useState('');
  const abort = useRef<AbortController>();
  const objectUrl = useRef<string>();
  const downloadButton = useRef<HTMLButtonElement>(null);
  const busy = phase === 'fetching' || phase === 'verifying';
  const percent = download.bytes ? Math.min(100, Math.round(received / download.bytes * 100)) : undefined;
  const livePercent = percent === undefined ? undefined : Math.floor(percent / 10) * 10;

  useEffect(() => () => {
    const controller = abort.current;
    abort.current = undefined;
    controller?.abort();
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  useEffect(() => {
    if (phase === 'cancelled') downloadButton.current?.focus();
  }, [phase]);

  async function startDownload() {
    if (busy) return;
    abort.current?.abort();
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = undefined;
    setSaveUrl(undefined);
    setError('');
    setReceived(0);
    setPhase('fetching');
    const controller = new AbortController();
    abort.current = controller;
    let lastPercent = -1;
    try {
      const blob = await assembleDownload(download, {
        signal: controller.signal,
        onProgress: (bytes) => {
          const nextPercent = download.bytes ? Math.floor(bytes / download.bytes * 100) : Math.floor(bytes / (1024 * 1024));
          if (nextPercent !== lastPercent) {
            lastPercent = nextPercent;
            setReceived(bytes);
          }
        },
        onVerify: () => setPhase('verifying'),
      });
      controller.signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      objectUrl.current = url;
      setSaveUrl(url);
      setReceived(blob.size);
      setPhase('ready');
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = download.filename;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (reason) {
      if (controller.signal.aborted) {
        if (abort.current === controller) setPhase('cancelled');
      } else {
        setError(reason instanceof DownloadBundleError && reason.reason === 'incomplete'
          ? 'The download is incomplete. Please try again.'
          : reason instanceof DownloadBundleError && reason.reason === 'integrity'
            ? 'The download could not be verified. Please try again.'
            : 'The download could not be prepared. Please try again.');
        setPhase('error');
      }
    } finally {
      if (abort.current === controller) abort.current = undefined;
    }
  }

  const size = download.bytes ? `${(download.bytes / (1024 * 1024)).toFixed(1)} MB` : undefined;
  return (
    <div className={styles.bundleDownload}>
      <button ref={downloadButton} type="button" onClick={startDownload} disabled={busy} aria-busy={busy} className={styles.download}>
        <span className={styles.downloadCopy}><strong>{download.label}</strong>{download.description && <span>{download.description}</span>}<small>{[download.filename.split('.').pop()?.toUpperCase(), size].filter(Boolean).join(' · ')}</small></span>
        <span aria-hidden="true">{busy ? '…' : '↓'}</span>
      </button>
      {busy && <div className={styles.bundleProgress}><progress value={received} max={download.bytes || received + 1} aria-label="Download preparation progress" /><button type="button" onClick={() => abort.current?.abort()}>Cancel</button></div>}
      <p className={styles.downloadStatus} aria-live="polite" role="status">
        {phase === 'fetching' && `Preparing download${livePercent && livePercent < 100 ? ` · ${livePercent}%` : '…'}`}
        {phase === 'verifying' && 'Checking the completed file…'}
        {phase === 'ready' && 'Your download is ready. If it did not start, use the save link below.'}
        {phase === 'error' && error}
        {phase === 'cancelled' && 'Download cancelled.'}
      </p>
      {phase === 'error' && <button type="button" onClick={startDownload} className={styles.bundleAction}>Try again <span aria-hidden="true">↻</span></button>}
      {saveUrl && <a href={saveUrl} download={download.filename} className={styles.bundleAction}>Save {download.filename.split('.').pop()?.toUpperCase() || 'file'} <span aria-hidden="true">↓</span></a>}
    </div>
  );
}
