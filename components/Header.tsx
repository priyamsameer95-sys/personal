'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import CvDownload from './CvDownload';

const navItems = [
  { label: 'Home', path: '/' },
  { label: 'Work', path: '/product' },
  { label: 'Experience', path: '/cv' },
  { label: 'Writing', path: '/blog' },
  { label: 'Art', path: '/art' },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="no-print relative z-10 mb-8 border-b border-black/15 pb-4 text-black md:mb-10">
      <div id="nav-header" className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-8">
        <Link href="/" aria-label="Priyam Sameer — home" className="flex w-fit min-h-11 items-center gap-3 rounded-sm no-underline focus-visible:outline-black">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full border border-black bg-white text-lg font-semibold tracking-tight text-black">
            ps.
          </span>
          <span className="text-base font-semibold tracking-tight text-black">Priyam Sameer</span>
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 md:justify-end">
          <nav aria-label="Main navigation" className="flex w-full flex-wrap items-center gap-0 sm:gap-3 md:w-auto">
            {navItems.map((item) => {
              const isActive = item.path === '/'
                ? pathname === '/'
                : pathname === item.path || pathname.startsWith(`${item.path}/`);

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={`inline-flex min-h-11 min-w-10 items-center justify-center rounded-sm px-1 text-xs transition-colors duration-150 ease-out no-underline focus-visible:outline-black active:bg-black/10 sm:min-w-11 sm:px-2 sm:text-sm ${
                    isActive
                      ? 'font-semibold text-black underline decoration-black decoration-2 underline-offset-8'
                      : 'text-black hover:bg-black/5 hover:underline hover:underline-offset-8'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <CvDownload className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black px-3 text-xs font-medium hover:bg-black/5 focus-visible:outline-black active:scale-[0.97] sm:px-4 sm:text-sm" />
          <a
            href="mailto:Priyam.Sameer.95@gmail.com"
            aria-label="Contact Priyam"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black bg-black px-3 text-xs font-medium text-white transition-[background-color,color,transform] duration-150 ease-out hover:bg-white hover:text-black focus-visible:outline-black active:scale-[0.97] no-underline sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">Contact</span><span className="hidden sm:inline">Contact Priyam</span> <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </header>
  );
}
