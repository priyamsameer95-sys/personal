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
    <nav id="nav-header" className="flex items-baseline justify-between gap-7 mb-20 flex-wrap">
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
  );
}
