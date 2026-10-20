'use client';

import Icon from '@/components/Icon';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CopyEmailButton, emailAddress } from './EmailContact';
import styles from './contact-chooser.module.css';

const channels = [
  { name: 'Email', detail: 'For opportunities and a longer conversation', href: `mailto:${emailAddress}`, value: emailAddress },
  { name: 'LinkedIn', detail: 'Connect professionally', href: 'https://www.linkedin.com/in/priyam-sameer', value: 'View profile', external: true },
  { name: 'WhatsApp', detail: 'Start a quick conversation', href: 'https://wa.me/918238452277', value: 'Message Priyam', external: true },
  { name: 'Call', detail: 'Talk directly', href: 'tel:+918238452277', value: '+91 82384 52277' },
];

export default function ContactChooser({ className = '', children }: { className?: string; children?: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const firstChannel = useRef<HTMLAnchorElement>(null);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const previousOverflow = useRef('');
  const active = useRef(false);
  useEffect(() => () => {
    if (active.current) document.body.style.overflow = previousOverflow.current;
  }, []);

  function close() { dialog.current?.close(); }
  function restore() {
    setOpen(false);
    active.current = false;
    document.body.style.overflow = previousOverflow.current;
    trigger.current?.focus();
  }
  function show() {
    if (!dialog.current || dialog.current.open) return;
    previousOverflow.current = document.body.style.overflow;
    active.current = true;
    dialog.current.showModal();
    firstChannel.current?.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';
    setOpen(true);
  }

  return <>
    <button ref={trigger} type="button" aria-label="Contact Priyam" aria-haspopup="dialog" aria-expanded={open} data-analytics={open ? undefined : 'contact_opened'} data-analytics-target="menu" className={className} onClick={show}>
      {children || <>Contact Priyam <span aria-hidden="true"><Icon name="arrow-up-right" /></span></>}
    </button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} aria-describedby={descriptionId} onClose={restore} onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
    }}>
      <div className={styles.content}>
        <div className={styles.heading}><p>Start a conversation</p><button type="button" onClick={close} aria-label="Close contact options">Close <span aria-hidden="true"><Icon name="close" /></span></button></div>
        <h2 id={titleId}>Contact Priyam.</h2>
        <p id={descriptionId} className={styles.intro}>Tell me about the role or product problem you have in mind.</p>
        <ul className={styles.channels}>{channels.map((channel, index) => <li key={channel.name}>
          <a ref={index === 0 ? firstChannel : undefined} href={channel.href} target={channel.external ? '_blank' : undefined} rel={channel.external ? 'noopener noreferrer' : undefined} onClick={close}>
            <span><strong>{channel.name}</strong><span className={styles.detail}>{channel.detail}</span><span className={styles.value}>{channel.value}</span></span>
            <span aria-hidden="true"><Icon name="arrow-up-right" /></span>
            {channel.external && <span className="sr-only"> (opens in a new tab)</span>}
          </a>
          {channel.name === 'Email' && <CopyEmailButton email={channel.value} className={styles.copyEmail} />}
        </li>)}</ul>
      </div>
    </dialog>
  </>;
}
