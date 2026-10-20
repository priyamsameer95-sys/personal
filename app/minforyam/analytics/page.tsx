import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, noarchive: true } };

// Reports are rendered by the loopback-only dashboard, never by the hosted app.
export default function AnalyticsUnavailable(): never {
  notFound();
}
