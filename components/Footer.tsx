import React from 'react';

export default function Footer() {
  return (
    <footer id="global-footer" className="no-print w-full bg-system-surface border-t border-system-outline/40 mt-auto pt-24 pb-16 relative z-10">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-start gap-16 md:gap-8">
        
        {/* Left Side: Contact & Network */}
        <div className="w-full md:w-1/2">
          <h3 className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase text-system-tertiary mb-10">Contact & Network</h3>
          
          <div className="flex flex-col gap-6">
            <a href="tel:+918238452277" className="group flex items-center gap-4 w-fit no-underline">
              <span className="material-symbols-rounded text-system-tertiary text-[20px]">call</span>
              <span className="font-mono text-sm tracking-wide text-system-secondary group-hover:text-system-primary transition-colors">Call Now</span>
            </a>
            
            <a href="https://wa.me/918238452277" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 w-fit no-underline">
              <span className="material-symbols-rounded text-system-tertiary text-[20px]">chat</span>
              <span className="font-mono text-sm tracking-wide text-system-secondary group-hover:text-system-primary transition-colors">WhatsApp</span>
            </a>
            
            <a href="mailto:Priyam.Sameer.95@gmail.com" className="group flex items-center gap-4 w-fit no-underline">
              <span className="material-symbols-rounded text-system-tertiary text-[20px]">mail</span>
              <span className="font-mono text-sm tracking-wide text-system-secondary group-hover:text-system-primary transition-colors">Priyam.Sameer.95@gmail.com</span>
            </a>
            
            <a href="https://linkedin.com/in/priyamsameer" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 w-fit no-underline">
              <span className="material-symbols-rounded text-system-tertiary text-[20px]">open_in_new</span>
              <span className="font-mono text-sm tracking-wide text-system-secondary group-hover:text-system-primary transition-colors">LinkedIn Profile</span>
            </a>
          </div>
        </div>

        {/* Right Side: Philosophy & Copyright */}
        <div className="w-full md:w-1/2 flex flex-col justify-end items-start md:items-end h-full">
          <p className="font-serif italic text-system-secondary text-lg mb-12">&ldquo;A dream should outlast the dreamer.&rdquo;</p>
          <div className="flex flex-col items-start md:items-end gap-2 mt-auto">
            <span className="font-mono text-[10px] text-system-tertiary font-bold tracking-[0.15em] uppercase">&copy; 2026 Priyam Sameer</span>
            <span className="font-mono text-[10px] text-system-primary font-bold tracking-[0.15em] uppercase">Built with structural integrity</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
