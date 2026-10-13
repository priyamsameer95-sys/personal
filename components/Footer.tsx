export default function Footer() {
  return (
    <footer id="global-footer" className="no-print relative z-10 mt-24 border-t border-system-outline pb-6 pt-12 md:mt-32 md:pt-16">
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-system-tertiary">Get in touch</p>
          <h2 className="mb-4 font-serif text-3xl leading-tight text-system-primary sm:text-4xl">Have something in mind?</h2>
          <a
            href="mailto:Priyam.Sameer.95@gmail.com"
            className="inline-flex min-h-11 max-w-full items-center gap-2 break-all text-sm text-system-accent underline decoration-system-outline underline-offset-4 transition-colors hover:decoration-system-accent sm:text-base"
          >
            Priyam.Sameer.95@gmail.com <span aria-hidden="true" className="shrink-0">↗</span>
          </a>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
            <a href="tel:+918238452277" className="inline-flex min-h-11 items-center text-sm text-system-secondary transition-colors hover:text-system-accent no-underline">Call</a>
            <a href="https://wa.me/918238452277" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm text-system-secondary transition-colors hover:text-system-accent no-underline">WhatsApp <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
            <a href="https://linkedin.com/in/priyamsameer" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm text-system-secondary transition-colors hover:text-system-accent no-underline">LinkedIn <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
            <a href="https://github.com/priyamsameer" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm text-system-secondary transition-colors hover:text-system-accent no-underline">GitHub <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
            <a href="https://heymaya.pro" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm text-system-secondary transition-colors hover:text-system-accent no-underline">HeyMaya.pro <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-8 md:items-end md:text-right">
          <p className="max-w-xs font-serif text-2xl italic leading-snug text-system-secondary">“A dream should outlast the dreamer.”</p>
          <p className="text-xs text-system-tertiary">© {new Date().getFullYear()} Priyam Sameer</p>
        </div>
      </div>
    </footer>
  );
}
