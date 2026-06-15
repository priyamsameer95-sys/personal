'use client';

import React from 'react';

export default function PrintButton() {
  return (
    <button
      onClick={() => {
        if (typeof window !== 'undefined') window.print();
      }}
      className="bg-black text-white px-6 py-2.5 rounded-lg font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-gray-800 transition-colors cursor-pointer shadow-material-soft"
    >
      Print / Save as PDF
    </button>
  );
}
