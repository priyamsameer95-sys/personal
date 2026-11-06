'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { startAnalyticsVisit } from '@/lib/analytics-client';

/** Anonymous first-party measurement; no visual UI and no browsing-to-email linkage. */
export default function SiteAnalytics() {
  const pathname = usePathname();
  useEffect(() => startAnalyticsVisit(pathname), [pathname]);
  return null;
}
