'use client';

import React from 'react';

export default function PrintButton() {
  return (
    <button
      onClick={() => {
        if (typeof window !== 'undefined') window.print();
      }}
      className="no-print inline-flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-white hover:bg-black border-0 rounded-lg text-sm font-semibold cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.12)] transition duration-200"
    >
      <span className="material-symbols-rounded text-lg select-none">print</span> Print CV
    </button>
  );
}
