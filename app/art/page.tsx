import React from 'react';
import db from '@/lib/db';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface ContentItem {
  id: string;
  title: string;
  description: string;
  category: 'art';
  file_path: string | null;
  file_type: string | null;
  is_public: number;
  created_at: number;
}

export const revalidate = 0;

export default function ArtGalleryPage() {
  const items = db.prepare(
    "SELECT * FROM content WHERE category = 'art' AND is_public = 1 ORDER BY created_at DESC"
  ).all() as ContentItem[];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-[56rem] mx-auto px-6 py-20 pb-24">
        <Header />

        <main className="animate-[fadeInUp_0.4s_cubic-bezier(0.2,0,0,1)_both]">
          <div className="mb-12 max-w-[42rem]">
            <h2 className="font-serif italic text-3xl font-medium text-[#1A1A1A] m-0 mb-4">
              The Canvas
            </h2>
            <p className="text-[#525252] text-lg leading-[1.65] m-0">
              Product management is a world of rigid constraints, metrics, and absolutes. I paint floral scenes to practice fluid expression. The brush does not require a database schema. It is a necessary counterbalance.
            </p>
          </div>

          {items.length === 0 ? (
            <div className="py-20 text-center font-mono text-xs text-[#8C8C8C] border border-dashed border-[#E5E5E5] rounded-2xl bg-white">
              NO PAINTINGS PUBLISHED YET
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-12">
              {items.map((art) => (
                <Link
                  key={art.id}
                  href={`/art/${art.id}`}
                  className="group no-underline block transition hover:-translate-y-0.5"
                >
                  <div className="aspect-[4/5] bg-[#F0EAE1] border border-[rgba(229,229,229,0.4)] rounded-xl overflow-hidden mb-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center justify-center relative">
                    {art.file_path ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`/api/media/${art.id}`}
                        alt={art.title}
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <span className="font-serif italic text-sm text-[#1A1A1A]/40">{art.title}</span>
                    )}
                  </div>
                  <h4 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#1A1A1A] m-0">
                    {art.title}
                  </h4>
                  <p className="text-sm text-[#8C8C8C] m-0 mt-1">{art.description}</p>
                </Link>
              ))}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
