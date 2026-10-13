export default function Footer() {
  return (
    <footer id="global-footer" className="no-print relative z-10 mt-24 border-t border-black/15 pb-6 pt-12 text-black md:mt-32 md:pt-16">
      <div className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <p className="mb-4 text-sm font-medium">Contact Priyam</p>
          <h2 className="mb-4 text-3xl font-medium leading-tight tracking-tight sm:text-4xl">Let’s discuss product leadership.</h2>
          <p className="mb-5 max-w-md text-sm leading-relaxed">For product leadership roles and conversations about lending, marketplaces or agritech, email me or connect on LinkedIn.</p>
          <a
            href="mailto:Priyam.Sameer.95@gmail.com"
            className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-sm break-all text-sm text-black underline decoration-black underline-offset-4 transition-[text-decoration-thickness] duration-150 hover:decoration-2 focus-visible:outline-black sm:text-base"
          >
            Priyam.Sameer.95@gmail.com <span aria-hidden="true" className="shrink-0">↗</span>
          </a>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
            <a href="tel:+918238452277" className="inline-flex min-h-11 min-w-11 items-center rounded-sm text-sm text-black underline-offset-4 hover:underline focus-visible:outline-black">Call</a>
            <a href="https://wa.me/918238452277" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 rounded-sm text-sm text-black underline-offset-4 hover:underline focus-visible:outline-black">WhatsApp <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
          </div>
        </div>

        <div className="flex flex-col items-start gap-6 md:items-end md:text-right">
          <div>
            <p className="mb-3 text-sm font-medium">Connect</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 md:justify-end">
              <a href="https://www.linkedin.com/in/priyam-sameer" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 rounded-sm text-sm text-black underline-offset-4 hover:underline focus-visible:outline-black">LinkedIn <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
            </div>
          </div>
          <p className="max-w-xs text-sm leading-relaxed">Priyam Sameer<br />Product leadership across lending, marketplaces and agritech.</p>
          <p className="text-xs">© {new Date().getFullYear()} Priyam Sameer</p>
        </div>
      </div>
    </footer>
  );
}
