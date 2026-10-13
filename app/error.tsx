'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-system-bg">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 md:py-10">
        <Header />
        <main id="main-content" className="py-12 md:py-20">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-system-tertiary mb-5">
            A brief interruption
          </p>
          <h1 className="font-serif text-4xl md:text-5xl text-system-primary tracking-tight mb-5">
            This page couldn&apos;t load.
          </h1>
          <p className="text-system-secondary leading-relaxed max-w-md mb-8">
            Please try again in a moment. You can also return to the homepage or get in touch by email.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={reset}
              className="rounded-full bg-system-primary text-white px-6 py-3 text-sm font-medium hover:bg-black transition-colors"
            >
              Try again
            </button>
            <Link href="/" className="text-sm text-system-primary underline underline-offset-4">
              Back to home
            </Link>
            <a href="mailto:Priyam.Sameer.95@gmail.com" className="text-sm text-system-secondary underline underline-offset-4">
              Email Priyam
            </a>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
