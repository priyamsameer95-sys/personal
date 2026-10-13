'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Work', path: '/product' },
  { label: 'Art', path: '/art' },
  { label: 'Writing', path: '/blog' },
  { label: 'CV', path: '/cv' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="no-print relative z-10 mb-16 border-b border-system-outline pb-5 md:mb-20">
      <div id="nav-header" className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
        <Link href="/" aria-label="Priyam Sameer — home" className="flex w-fit min-h-11 items-center gap-3 no-underline">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-system-primary font-serif text-xl italic text-system-bg">
            ps.
          </span>
          <span className="text-base font-semibold tracking-tight text-system-primary">Priyam Sameer</span>
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 md:justify-end md:gap-6">
          <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-1 sm:gap-3">
            {navItems.map((item) => {
              const isActive = item.path === '/'
                ? pathname === '/'
                : pathname === item.path || pathname.startsWith(`${item.path}/`);

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex min-h-11 items-center rounded-md px-2 text-sm transition-colors no-underline ${
                    isActive
                      ? 'font-semibold text-system-primary underline decoration-system-accent underline-offset-8'
                      : 'text-system-secondary hover:text-system-accent'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <a
            href="mailto:Priyam.Sameer.95@gmail.com"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-system-outline px-4 text-sm font-medium text-system-primary transition-colors hover:border-system-accent hover:text-system-accent no-underline"
          >
            Let’s talk <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </header>
  );
}
