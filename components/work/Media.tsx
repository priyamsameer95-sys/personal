'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { CaseStudyMedia } from '@/lib/work-types';
import styles from './work.module.css';

const provenanceLabels = {
  historical: 'Historical material',
  'current-public': 'Current public reference',
  authored: 'Illustration of my approach',
  proposal: 'Proposal material',
};

export default function Media({ media, priority = false }: { media: CaseStudyMedia; priority?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [actualSize, setActualSize] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const isLongImage = media.kind === 'image' && Boolean(media.width && media.height && media.height > media.width * 2.5);

  useEffect(() => {
    if (!expanded || !dialog.current) return;
    const modal = dialog.current;
    const previousOverflow = document.body.style.overflow;
    modal.showModal();
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (modal.open) modal.close();
    };
  }, [expanded]);

  function closeImage() {
    dialog.current?.close();
  }

  return (
    <figure className={`${styles.figure}${media.kind === 'video' ? ` ${styles.videoFigure}` : ''}`}>
      {media.kind === 'image' ? (
        <>
          <button ref={trigger} type="button" aria-haspopup="dialog" aria-label={`Enlarge image: ${media.alt}`} className={styles.imageButton} onClick={() => { setActualSize(false); setExpanded(true); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media.src} alt={media.alt} width={media.width} height={media.height} loading={priority ? 'eager' : 'lazy'} className={`${styles.image}${isLongImage ? ` ${styles.longImage}` : ''}`} />
            <span className={styles.imageHint} aria-hidden="true">Enlarge image <span>↗</span></span>
          </button>
          <dialog ref={dialog} className={styles.imageDialog} aria-labelledby={labelId} onClose={() => { setExpanded(false); trigger.current?.focus({ preventScroll: true }); }} onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeImage();
          }}>
            {expanded && <div className={styles.dialogLayout}>
              <div className={styles.dialogHeader}><h2 id={labelId}>{media.alt}</h2><div className={styles.dialogActions}><button type="button" onClick={() => setActualSize((current) => !current)} className={styles.dialogClose}>{actualSize ? 'Fit to screen' : 'Actual size'}</button><button ref={closeButton} type="button" onClick={closeImage} className={styles.dialogClose}>Close <span aria-hidden="true">×</span></button></div></div>
              <div className={styles.dialogImageScroll} tabIndex={0} role="region" aria-label="Enlarged image; scroll to see the full image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={media.src} alt={media.alt} width={media.width} height={media.height} className={`${styles.dialogImage}${actualSize ? ` ${styles.actualSize}` : ''}`} />
              </div>
              {(media.caption || media.provenance) && <p className={styles.dialogCaption}>{media.caption}{media.provenance && <span className={styles.provenance}>{provenanceLabels[media.provenance.kind]} · {media.provenance.label}{media.provenance.date ? ` · ${media.provenance.date}` : ''}</span>}</p>}
            </div>}
          </dialog>
        </>
      ) : (
        <>
          <video className={styles.video} controls controlsList="nodownload" playsInline preload="metadata" poster={media.poster} aria-label={media.title}>
            <source src={media.src} type={media.mime || 'video/mp4'} />
            {media.captions?.map((track, index) => <track key={track.src} kind="captions" src={track.src} srcLang={track.language} label={track.label} default={index === 0} />)}
            Your browser cannot play this video.
          </video>
          {media.transcript && <details className={styles.transcript}><summary>Video description</summary><p>{media.transcript}</p></details>}
        </>
      )}
      {(media.caption || media.provenance) && <figcaption>
        {media.caption}{media.kind === 'video' && media.duration ? ` · ${media.duration}` : ''}
        {media.provenance && <span className={styles.provenance}>{provenanceLabels[media.provenance.kind]} · {media.provenance.label}{media.provenance.date ? ` · ${media.provenance.date}` : ''}</span>}
      </figcaption>}
    </figure>
  );
}
