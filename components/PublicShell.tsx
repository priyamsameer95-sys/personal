import type { ReactNode } from 'react';
import SiteAnalytics from '@/components/SiteAnalytics';

export default function PublicShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="peel-canvas">
      <SiteAnalytics />
      <div className="peel-underlay" aria-hidden="true">
        <svg viewBox="0 0 1440 1000" preserveAspectRatio="xMidYMid slice">
          <rect width="1440" height="1000" fill="#ff7628" />
          <path d="M0 0H700L320 580H0Z" fill="#f59dc6" />
          <path d="M870 0H1440V650L630 1000H380Z" fill="#2657ef" />
          <path d="M0 710L700 370L1440 1000H0Z" fill="#c5e875" />
          <path d="M1180 0H1440V280L920 730L720 510Z" fill="#ffe348" />
          <path d="M0 920L670 640L1000 1000H0Z" fill="#ff7628" />
        </svg>
      </div>
      <div className="peel-sheet">
        <div className="peel-corner" aria-hidden="true" />
        <div className={['peel-content', className].join(' ')}>{children}</div>
      </div>
    </div>
  );
}
