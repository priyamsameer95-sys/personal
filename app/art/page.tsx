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

export default async function ArtGalleryPage() {
  const { rows } = await db`
    SELECT * FROM content WHERE category = 'art' AND is_public = 1 ORDER BY created_at DESC
  `;
  const items = rows as ContentItem[];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="max-w-[56rem] mx-auto px-6 py-20 pb-24">
        <Header />

        <main className="animate-fade-in-up">
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-system-primary mb-3">Art</h2>
            <p className="text-system-secondary text-lg font-serif">
              Fluid expression as a counterbalance to rigid constraints.
            </p>
          </div>

          {items.length === 0 ? (
            <div className="py-20 text-center font-mono text-xs text-system-tertiary border border-dashed border-system-outline/40 rounded-2xl bg-white">
              NO PAINTINGS PUBLISHED YET
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {items.map((art, index) => {
                const aspectClass = index % 2 === 0 ? 'aspect-square' : 'aspect-[4/5]';
                return (
                  <Link
                    key={art.id}
                    href={`/art/${art.id}`}
                    className="group no-underline block bg-system-surface border border-system-outline p-4 flex flex-col justify-end shadow-material-soft rounded-xl transition duration-200 hover:-translate-y-0.5 hover:shadow-material-hover"
                  >
                    <div className={`${aspectClass} overflow-hidden mb-4 rounded-lg bg-[#F0EAE1] relative flex items-center justify-center`}>
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
                    <h4 className="font-mono text-[10px] text-system-tertiary uppercase tracking-widest m-0">
                      {art.title}
                    </h4>
                    {art.description && (
                      <p className="text-xs text-system-secondary m-0 mt-2 line-clamp-2">{art.description}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}
