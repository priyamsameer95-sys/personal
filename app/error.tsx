'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import EmailContact from '@/components/EmailContact';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <PublicShell>
        <Header />
        <main id="main-content" className="py-12 md:py-20">
          <p className="text-sm text-system-tertiary mb-5">
            Page unavailable
          </p>
          <h1 className="font-sans text-4xl md:text-5xl text-system-primary tracking-tight mb-5">
            This page couldn&apos;t load.
          </h1>
          <p className="text-system-secondary leading-relaxed max-w-md mb-8">
            Please try again in a moment. You can also return to the homepage or get in touch by email.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={reset}
              className="ink-button"
            >
              Try again
            </button>
            <Link href="/" className="inline-flex min-h-11 items-center text-sm text-system-primary underline underline-offset-4">
              Back to home
            </Link>
            <EmailContact linkClassName="inline-flex min-h-11 items-center text-sm text-system-secondary underline underline-offset-4">
              Contact Priyam
            </EmailContact>
          </div>
        </main>
        <Footer />
    </PublicShell>
  );
}
