'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Index', path: '/' },
    { label: 'Work', path: '/product' },
    { label: 'Art', path: '/art' },
    { label: 'Writing', path: '/blog' },
    { label: 'CV', path: '/cv' },
  ];

  return (
    <header className="mb-20">
      <nav id="nav-header" className="flex items-baseline justify-between gap-7 mb-6 flex-wrap">
        <Link href="/" className="no-underline">
          <h1 className="font-mono text-xs font-bold tracking-[0.15em] uppercase text-[#1A1A1A] m-0">
            Priyam Sameer
          </h1>
        </Link>
        <div className="flex gap-6 items-baseline flex-wrap">
          {navItems.map((item) => {
            // Checks if path matches, or if it is a detail page of that section (e.g. /product/123)
            const isActive =
              item.path === '/'
                ? pathname === '/'
                : pathname === item.path || pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`pb-1 border-b-2 font-mono text-[11px] font-bold tracking-[0.12em] uppercase transition-colors duration-200 no-underline ${
                  isActive
                    ? 'border-[#1A1A1A] text-[#1A1A1A]'
                    : 'border-transparent text-[#8C8C8C] hover:text-[#1A1A1A]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Pristine Contact CTA Bar */}
      <div className="flex flex-wrap gap-x-6 gap-y-3 items-center border-t border-[rgba(229,229,229,0.5)] pt-4">
        <a
          href="tel:+918238452277"
          className="flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-[0.08em] uppercase text-[#8C8C8C] hover:text-[#1A1A1A] transition-colors duration-200 no-underline"
        >
          <span className="material-symbols-rounded text-sm">call</span>
          <span>Call Now</span>
        </a>
        <a
          href="https://wa.me/918238452277"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-[0.08em] uppercase text-[#8C8C8C] hover:text-[#1A1A1A] transition-colors duration-200 no-underline"
        >
          <span className="material-symbols-rounded text-sm font-bold">chat</span>
          <span>WhatsApp</span>
        </a>
        <a
          href="mailto:Priyam.Sameer.95@gmail.com"
          className="flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-[0.08em] uppercase text-[#8C8C8C] hover:text-[#1A1A1A] transition-colors duration-200 no-underline"
        >
          <span className="material-symbols-rounded text-sm">mail</span>
          <span>Email</span>
        </a>
        <a
          href="sms:+918238452277"
          className="flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-[0.08em] uppercase text-[#8C8C8C] hover:text-[#1A1A1A] transition-colors duration-200 no-underline"
        >
          <span className="material-symbols-rounded text-sm">sms</span>
          <span>Drop a Message</span>
        </a>
      </div>
    </header>
  );
}
