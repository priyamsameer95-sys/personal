'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
    <header className="no-print relative z-10 mb-16 border-b border-black/15 pb-5 text-black md:mb-20">
      <div id="nav-header" className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between md:gap-8">
        <Link href="/" aria-label="Priyam Sameer — home" className="flex w-fit min-h-11 items-center gap-3 rounded-sm no-underline focus-visible:outline-black">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full border border-black bg-white text-lg font-semibold tracking-tight text-black">
            ps.
          </span>
          <span className="text-base font-semibold tracking-tight text-black">Priyam Sameer</span>
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
                  className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm px-1 text-sm transition-colors duration-150 ease-out no-underline focus-visible:outline-black active:bg-black/10 sm:px-2 ${
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

          <a
            href="mailto:Priyam.Sameer.95@gmail.com"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black bg-black px-5 text-sm font-medium text-white transition-[background-color,color,transform] duration-150 ease-out hover:bg-white hover:text-black focus-visible:outline-black active:scale-[0.97] no-underline"
          >
            Contact Priyam <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </header>
  );
}
