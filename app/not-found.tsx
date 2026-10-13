import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';

export default function NotFoundPage() {
  return (
    <PublicShell>
      <Header />
      <main id="main-content" className="py-12 md:py-20">
        <p className="mb-5 font-mono text-xs uppercase tracking-[0.16em] text-system-tertiary">404</p>
        <h1 className="mb-5 font-sans text-4xl tracking-tight text-system-primary md:text-5xl">
          This page couldn&apos;t be found.
        </h1>
        <p className="mb-8 max-w-md leading-relaxed text-system-secondary">
          The link may have changed, or this page is no longer available. Explore the portfolio to find your way back.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/" className="ink-button">Back to home <span aria-hidden="true">→</span></Link>
          <Link href="/product" className="inline-flex min-h-11 items-center text-sm text-system-primary underline underline-offset-4">
            Explore the work
          </Link>
        </div>
      </main>
      <Footer />
    </PublicShell>
  );
}
