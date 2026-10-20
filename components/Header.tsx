'use client';

import Icon from '@/components/Icon';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import CvDownload from './CvDownload';
import ContactChooser from './ContactChooser';
import styles from './site-chrome.module.css';

const navItems = [
  { label: 'Home', path: '/' }, { label: 'Work', path: '/product' },
  { label: 'Experience', path: '/cv' }, { label: 'Art', path: '/art' },
  { label: 'GitHub', path: '/github' },
];

export default function Header({ wordmarkOnly = true }: { wordmarkOnly?: boolean }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => setMenuOpen(false), [pathname]);
  function closeMenu(destination: string) {
    setMenuOpen(false);
    if (menuOpen && destination === pathname) menuButton.current?.focus();
  }
  return <header className={`${styles.header} no-print`} id="nav-header" onKeyDown={event => {
    if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); menuButton.current?.focus(); }
  }}>
    <Link href="/" aria-label="Priyam Sameer — home" className={styles.identity} onClick={() => closeMenu('/')}>
      {!wordmarkOnly && <span className={styles.monogram} aria-hidden="true">ps.</span>}<span>Priyam Sameer</span>
    </Link>
    <button ref={menuButton} type="button" className={styles.menuButton} aria-expanded={menuOpen} aria-controls="public-navigation" data-analytics={menuOpen ? undefined : 'menu_opened'} data-analytics-target="menu" onClick={() => setMenuOpen(open => !open)}>{menuOpen ? 'Close' : 'Menu'} <span aria-hidden="true"><Icon name={menuOpen ? 'minus' : 'plus'} /></span></button>
    <nav id="public-navigation" aria-label="Main navigation" className={styles.navigation} data-open={menuOpen}>
      {navItems.map(item => {
        const active = item.path === '/' ? pathname === '/' : pathname === item.path || pathname.startsWith(`${item.path}/`);
        return <Link key={item.path} href={item.path} aria-current={active ? 'page' : undefined} onClick={() => closeMenu(item.path)}>{item.label}</Link>;
      })}
    </nav>
    <div className={styles.headerActions}>
      <CvDownload className={styles.cvButton} />
      <ContactChooser className={styles.contactButton}><span className={styles.contactLong}>Contact Priyam</span><span className={styles.contactShort}>Contact</span> <span aria-hidden="true"><Icon name="arrow-up-right" /></span></ContactChooser>
    </div>
  </header>;
}
