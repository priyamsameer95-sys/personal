import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false, noarchive: true } };

// CV contact records are displayed only in the local owner dashboard.
export default function CVInterestsUnavailable(): never {
  notFound();
}
