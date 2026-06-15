import React from 'react';
import db from '@/lib/db';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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

        <main className="animate-fade-in-up bg-white p-6 md:p-12 shadow-material-soft border border-system-outline rounded-xl">
          <div className="flex justify-between items-end border-b-2 border-black pb-4 mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-1 font-sans">
                Priyam Sameer
              </h2>
              <p className="font-mono text-xs md:text-sm tracking-widest uppercase text-gray-600 m-0">
                Product Manager · Builder · Gurugram, India
              </p>
            </div>
            <div className="text-right text-xs md:text-sm text-gray-600 space-y-1">
              <p className="m-0">priyam.sameer.95@gmail.com</p>
              <p className="m-0">linkedin.com/in/priyamsameer</p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Experience Section */}
            <section>
              <h3 className="font-bold text-base md:text-lg border-b border-gray-300 pb-1 mb-4 uppercase tracking-wider text-black">
                Experience
              </h3>
              
              <div className="mb-6">
                <div className="flex justify-between font-bold mb-1 text-sm md:text-base text-black flex-wrap gap-2">
                  <span>CashKaro</span>
                  <span className="font-mono text-xs md:text-sm font-normal text-gray-600">2024 - Present</span>
                </div>
                <div className="italic text-xs md:text-sm text-gray-700 mb-2">Senior Product Manager (Education Loans)</div>
                <ul className="list-disc pl-5 text-xs md:text-sm space-y-1 text-gray-800">
                  <li>End-to-end P&amp;L ownership of the Education Loans vertical.</li>
                  <li>Building &apos;Antigravity&apos;, a 0-1 education loan platform with proprietary rules engine.</li>
                </ul>
              </div>

              <div className="mb-6">
                <div className="flex justify-between font-bold mb-1 text-sm md:text-base text-black flex-wrap gap-2">
                  <span>Absolute.ag</span>
                  <span className="font-mono text-xs md:text-sm font-normal text-gray-600">2021 - 2024</span>
                </div>
                <div className="italic text-xs md:text-sm text-gray-700 mb-2">Principal Product Manager</div>
                <ul className="list-disc pl-5 text-xs md:text-sm space-y-1 text-gray-800">
                  <li>Architected satellite-data rural credit engine for RBI&apos;s Unified Lending Interface.</li>
                  <li>Managed iTrade cross-border platform scaling to $100M+ GMV across 25 countries.</li>
                </ul>
              </div>

              <div className="mb-6">
                <div className="flex justify-between font-bold mb-1 text-sm md:text-base text-black flex-wrap gap-2">
                  <span>UrbanKhet</span>
                  <span className="font-mono text-xs md:text-sm font-normal text-gray-600">2019 - 2021</span>
                </div>
                <div className="italic text-xs md:text-sm text-gray-700 mb-2">Founder (Incubated at IIM-A Ventures)</div>
                <ul className="list-disc pl-5 text-xs md:text-sm space-y-1 text-gray-800">
                  <li>Built D2C Agritech platform scaling to 3,400 users and 28 employees.</li>
                  <li>Raised ₹1.5Cr seed grant. Wound down operations with 100% payout to all creditors.</li>
                </ul>
              </div>
            </section>

            {/* Education Section */}
            <section>
              <h3 className="font-bold text-base md:text-lg border-b border-gray-300 pb-1 mb-4 uppercase tracking-wider text-black">
                Education
              </h3>
              <div className="flex justify-between font-bold text-sm md:text-base text-black">
                <span>CEPT University</span>
                <span className="font-mono text-xs md:text-sm font-normal text-gray-600">2014 - 2018</span>
              </div>
              <div className="text-xs md:text-sm text-gray-800 mt-1">
                B.Tech, Construction Technology (Selected independently over IIT)
              </div>
            </section>
          </div>

          <div className="mt-12 flex justify-center gap-4 no-print flex-wrap">
            <button
              onClick={() => window.print()}
              className="bg-black text-white px-6 py-2.5 rounded-lg font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors cursor-pointer shadow-material-soft"
            >
              Print / Save as PDF
            </button>
            {isDownloadable && (
              <a
                href={`/api/download/${cvItem.id}`}
                className="bg-white text-black border border-[#CCCCCC] px-6 py-2.5 rounded-lg font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-gray-100 transition-colors shadow-material-soft no-underline flex items-center gap-1.5"
              >
                <span className="material-symbols-rounded text-sm">download</span> Download PDF
              </a>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
