'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { CaseStudyMedia } from '@/lib/work-types';
import Icon from '@/components/Icon';
import styles from './work.module.css';

function provenanceText(media: CaseStudyMedia) {
  if (!media.provenance) return '';
  const { kind, label, date } = media.provenance;
  if (kind === 'prototype') return 'Original interface · V1.03';
  if (kind === 'current-public') return `Current public reference${date ? ` · ${date}` : ''}`;
  if (kind === 'authored' && media.kind === 'video') return `Generated from public reference pages${date ? ` · ${date}` : ''}`;
  if (kind === 'authored' && media.category === 'diagram') return 'Authored explanation; not a product screen.';
  return [label, date].filter(Boolean).join(' · ');
}

function MediaSource({ media }: { media: CaseStudyMedia }) {
  const source = media.provenance?.sourceUrl;
  if (!source) return null;
  try {
    const url = new URL(source);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return <a className={styles.mediaSource} href={url.href} target="_blank" rel="noopener noreferrer">View original source <Icon name="arrow-up-right" /><span className="sr-only"> (opens in a new tab)</span></a>;
  } catch { return null; }
}

export default function Media({ media, priority = false, previewSrc, compact = false, showDescription = !compact }: { media: CaseStudyMedia; priority?: boolean; previewSrc?: string; compact?: boolean; showDescription?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [actualSize, setActualSize] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const dialogId = `${labelId}-image`;
  const captionId = `${labelId}-caption`;
  const descriptionId = `${labelId}-description`;
  const dialogCaptionId = `${labelId}-dialog-caption`;
  const hasDescription = media.kind === 'video' && showDescription && Boolean(media.transcript);
  const describedBy = [media.caption || media.provenance ? captionId : '', hasDescription ? descriptionId : ''].filter(Boolean).join(' ') || undefined;
  const sourceContext = provenanceText(media);
  const isLongImage = media.kind === 'image' && Boolean(media.width && media.height && media.height > media.width * 2.5);
  const portraitDiagram = media.kind === 'image' && media.category === 'diagram' && Boolean(media.width && media.height && media.height > media.width);

  useEffect(() => {
    if (!expanded || !dialog.current) return;
    const modal = dialog.current;
    const previousOverflow = document.body.style.overflow;
    if (!modal.open) modal.showModal();
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
    <figure className={`${styles.figure}${media.kind === 'video' ? ` ${styles.videoFigure}` : ''}${portraitDiagram ? ` ${styles.portraitDiagram}` : ''}${compact ? ` ${styles.compactMedia}` : ''}`}>
      {media.kind === 'image' ? (
        <>
          <button ref={trigger} type="button" aria-haspopup="dialog" aria-label={`Enlarge image: ${media.alt}`} aria-expanded={expanded} aria-controls={dialogId} data-analytics={expanded ? undefined : 'media_opened'} data-analytics-target="image" className={styles.imageButton} onClick={() => { setActualSize(false); setExpanded(true); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewSrc || media.src} alt={media.alt} width={media.width} height={media.height} loading={priority ? 'eager' : 'lazy'} decoding="async" className={`${styles.image}${isLongImage ? ` ${styles.longImage}` : ''}`} />
            <span className={styles.imageHint} aria-hidden="true">Enlarge <Icon name="arrow-up-right" /></span>
          </button>
          <dialog ref={dialog} id={dialogId} className={styles.imageDialog} aria-labelledby={labelId} aria-describedby={expanded && (media.caption || sourceContext) ? dialogCaptionId : undefined} onClose={() => { setExpanded(false); trigger.current?.focus({ preventScroll: true }); }} onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeImage();
          }}>
            {expanded && <div className={styles.dialogLayout}>
              <div className={styles.dialogHeader}><h2 id={labelId}>{media.alt}</h2><div className={styles.dialogActions}><button type="button" aria-pressed={actualSize} onClick={() => setActualSize((current) => !current)} className={styles.dialogClose}>{actualSize ? 'Fit to screen' : 'Actual size'}</button><button ref={closeButton} type="button" onClick={closeImage} className={styles.dialogClose}>Close <Icon name="close" /></button></div></div>
              <div className={styles.dialogImageScroll} tabIndex={0} role="region" aria-label={actualSize ? 'Actual size image; scroll to see the full image' : 'Enlarged image, fitted to the screen'}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={media.src} alt={media.alt} width={media.width} height={media.height} className={`${styles.dialogImage}${actualSize ? ` ${styles.actualSize}` : ''}`} />
              </div>
              {(media.caption || sourceContext) && <p id={dialogCaptionId} className={styles.dialogCaption} tabIndex={0} role="region" aria-label="Image caption and source">{media.caption}{sourceContext && <span className={styles.provenance}>{sourceContext}</span>}<MediaSource media={media} /></p>}
            </div>}
          </dialog>
        </>
      ) : (
        <>
          <video className={`${styles.video}${media.frame === 'portrait' ? ` ${styles.portraitVideo}` : ''}`} controls controlsList="nodownload" playsInline preload="none" poster={media.poster} aria-label={media.title} aria-describedby={describedBy}>
            <source src={media.src} type={media.mime || 'video/mp4'} />
            {media.captions?.map((track, index) => <track key={track.src} kind="captions" src={track.src} srcLang={track.language} label={track.label} default={index === 0} />)}
            Your browser cannot play this video.
          </video>
          {hasDescription && <p id={descriptionId} className={styles.videoDescription}><span>Walkthrough description</span>{media.transcript}</p>}
        </>
      )}
      {(media.caption || media.provenance) && <figcaption id={captionId}>
        {media.caption}{media.kind === 'video' && media.duration ? ` · ${media.duration}` : ''}
        {sourceContext && <span className={styles.provenance}>{sourceContext}</span>}
        <MediaSource media={media} />
      </figcaption>}
    </figure>
  );
}
