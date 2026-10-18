'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import styles from './demo.module.css';

export default function DemoLauncher({ title, path }: { title: string; path: string }) {
  const [open, setOpen] = useState(false);
  const modal = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const id = useId();
  // Only reviewed, same-site static demonstrations can be embedded.
  const safePath = /^\/github-demos\/[a-z0-9-]+\/index\.html$/.test(path) ? path : null;
  useEffect(() => {
    if (!open || !modal.current) return;
    const dialog = modal.current;
    const overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    close.current?.focus();
    // An opaque iframe has its own Escape handling; accept only its close message.
    const onMessage = (event: MessageEvent) => {
      if (event.source === frame.current?.contentWindow && event.data?.type === 'priyam-demo-close') dialog.close();
    };
    window.addEventListener('message', onMessage);
    return () => { window.removeEventListener('message', onMessage); document.body.style.overflow = overflow; if (dialog.open) dialog.close(); };
  }, [open]);
  if (!safePath) return null;
  return <>
    <button type="button" ref={trigger} className={styles.launch} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-demo`} onClick={() => setOpen(true)}>Try {title}<Icon name="arrow-up-right" /></button>
    <dialog ref={modal} id={`${id}-demo`} className={styles.dialog} aria-labelledby={`${id}-title`} onClose={() => { setOpen(false); trigger.current?.focus({ preventScroll: true }); }}>
      {open && <div className={styles.layout}>
        <header className={styles.header}><div><h2 id={`${id}-title`}>{title}</h2><p>Isolated browser demo · no live services</p></div><button ref={close} type="button" onClick={() => modal.current?.close()}>Close<Icon name="close" /></button></header>
        <iframe ref={frame} src={safePath} title={`${title} interactive demonstration`} sandbox="allow-scripts allow-forms allow-downloads" referrerPolicy="no-referrer" className={styles.frame} />
      </div>}
    </dialog>
  </>;
}
