import React from 'react';
import db from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PrintButton from '@/components/PrintButton';

interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: 'cv';
  file_path: string | null;
  file_type: string | null;
  is_public: number;
  is_downloadable: number;
  created_at: number;
}

export const revalidate = 0; // Prevent stale caching

export default async function CvPage() {
  // Query the latest public CV upload
  const { rows } = await db`
    SELECT * FROM content WHERE category = 'cv' AND is_public = 1 ORDER BY created_at DESC LIMIT 1
  `;
  const cvItem = rows[0] as ContentItem | undefined;

  // Check if downloading is allowed
  const isDownloadable = cvItem && cvItem.file_path && cvItem.is_downloadable === 1;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-[56rem] mx-auto px-6 py-20 pb-24">
        <Header />

        <main className="animate-[fadeInUp_0.4s_cubic-bezier(0.2,0,0,1)_both]">
          <div className="flex justify-between items-end mb-12 border-b border-[#E5E5E5] pb-6 gap-5 flex-wrap">
            <div>
              <h2 className="text-3xl font-bold text-[#1A1A1A] m-0 mb-1 font-sans">
                Priyam Sameer
              </h2>
              <p className="text-sm font-mono text-[#8C8C8C] tracking-[0.03em] m-0">
                Product Manager · Builder · Gurugram, India
              </p>
            </div>
            <div className="no-print flex gap-3">
              <PrintButton />
              
              {isDownloadable && (
                <a
                  href={`/api/download/${cvItem.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#1A1A1A] hover:bg-[#F5F5F5] border border-[#CCCCCC] rounded-lg text-sm font-semibold cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition duration-200 no-underline"
                >
                  <span className="material-symbols-rounded text-lg select-none font-bold">download</span> Download PDF
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-12">
            <div className="flex flex-col gap-10">
              {/* Experience Section */}
              <section>
                <h3 className="font-mono text-[11px] font-bold tracking-[0.14em] uppercase text-[#8C8C8C] m-0 mb-4">
                  Experience
                </h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-baseline mb-1 gap-3 flex-wrap">
                      <h4 className="font-bold text-[#1A1A1A] text-lg m-0 font-sans">
                        CashKaro &amp; Antigravity
                      </h4>
                      <span className="text-sm font-mono text-[#8C8C8C] whitespace-nowrap">2024 - Present</span>
                    </div>
                    <p className="text-[#1A1A1A] font-medium text-sm m-0 mb-2 font-sans">
                      Senior Product Manager (P&amp;L Owner)
                    </p>
                    <ul className="list-disc m-0 pl-4.5 text-[#525252] text-sm leading-6 flex flex-col gap-1.5">
                      <li>Own the Education Loans P&amp;L at CashKaro, managing both product strategy and business outcomes.</li>
                      <li>Simultaneously building Antigravity from scratch: a high-performance education loan platform.</li>
                      <li>Architected the core business rules engine, integrated multiple lender APIs, and built secure AWS S3 KYC pipelines.</li>
                    </ul>
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline mb-1 gap-3 flex-wrap">
                      <h4 className="font-bold text-[#1A1A1A] text-lg m-0 font-sans">
                        Absolute.ag
                      </h4>
                      <span className="text-sm font-mono text-[#8C8C8C] whitespace-nowrap">2022 - 2024</span>
                    </div>
                    <p className="text-[#1A1A1A] font-medium text-sm m-0 mb-2 font-sans">
                      Principal Product Manager (Promoted from PM)
                    </p>
                    <ul className="list-disc m-0 pl-4.5 text-[#525252] text-sm leading-6 flex flex-col gap-1.5">
                      <li>Led the satellite-data driven risk engine for India&apos;s Unified Lending Interface (ULI), transforming rural credit models.</li>
                      <li>Built iTrade cross-border platform connecting buyers/sellers across 25+ countries, driving $100M+ GMV.</li>
                      <li>Developed computer-vision models for real-time crop diagnostics.</li>
                    </ul>
                  </div>

                  <div>
                    <div className="flex justify-between items-baseline mb-1 gap-3 flex-wrap">
                      <h4 className="font-bold text-[#1A1A1A] text-lg m-0 font-sans">
                        UrbanKhet
                      </h4>
                      <span className="text-sm font-mono text-[#8C8C8C] whitespace-nowrap">2020 - 2022</span>
                    </div>
                    <p className="text-[#1A1A1A] font-medium text-sm m-0 mb-2 font-sans">
                      Founder
                    </p>
                    <ul className="list-disc m-0 pl-4.5 text-[#525252] text-sm leading-6 flex flex-col gap-1.5">
                      <li>Incubated at IIM Ahmedabad Ventures. Raised ₹1.5 Cr in funding.</li>
                      <li>Scaled farm-to-fork operations to 3,400 D2C users and secured B2B accounts like Marriott and BigBasket.</li>
                      <li>Managed 28 employees and executed a mathematically clean operational wind-down with zero defaults.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Education Section */}
              <section>
                <h3 className="font-mono text-[11px] font-bold tracking-[0.14em] uppercase text-[#8C8C8C] m-0 mb-4">
                  Education
                </h3>
                <div>
                  <h4 className="font-bold text-[#1A1A1A] text-base m-0 mb-1 font-sans">
                    CEPT University
                  </h4>
                  <p className="text-[#525252] text-sm m-0">
                    B.Tech in Construction Technology. (Chosen independently over IIT).
                  </p>
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-8">
              {/* Contact Info */}
              <section>
                <h3 className="font-mono text-[11px] font-bold tracking-[0.14em] uppercase text-[#8C8C8C] m-0 mb-3">
                  Contact
                </h3>
                <div className="text-[#525252] text-sm flex flex-col gap-2">
                  <a href="mailto:contact@priyamsameer.com" className="no-underline hover:text-[#1A1A1A] transition">
                    contact@priyamsameer.com
                  </a>
                  <a href="https://linkedin.com/in/priyamsameer" className="no-underline hover:text-[#1A1A1A] transition">
                    linkedin.com/in/priyamsameer
                  </a>
                  <a href="https://priyamsameer.com" className="no-underline hover:text-[#1A1A1A] transition">
                    priyamsameer.com
                  </a>
                </div>
              </section>

              {/* Core Competencies */}
              <section>
                <h3 className="font-mono text-[11px] font-bold tracking-[0.14em] uppercase text-[#8C8C8C] m-0 mb-3">
                  Core Competencies
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    'P&L Ownership',
                    'API Integrations',
                    'Rules Engines',
                    'AgriTech',
                    'FinTech / Lending',
                    'Operations',
                  ].map((comp) => (
                    <span
                      key={comp}
                      className="px-2.5 py-1.5 bg-white border border-[rgba(229,229,229,0.5)] shadow-[0_1px_2px_rgba(0,0,0,0.05)] rounded-lg text-xs font-semibold text-[#525252]"
                    >
                      {comp}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
