'use client';

import { useState } from 'react';

export default function PeelReveal() {
  const [peeled, setPeeled] = useState(false);

  return (
    <div className="peel-study">
      <div className="peel-art" data-peeled={peeled} aria-hidden="true">
        <div className="peel-art-colour">
          <svg viewBox="0 0 500 500" preserveAspectRatio="xMidYMid slice">
            <rect width="500" height="500" fill="#ff7628" />
            <path d="M0 0H500L190 310L0 170Z" fill="#ffe348" />
            <path d="M0 150L345 30L500 150L200 470H0Z" fill="#f59dc6" />
            <path d="M390 0H500V500H160Z" fill="#2657ef" />
            <path d="M0 390L275 220L400 500H0Z" fill="#c5e875" />
            <path d="M0 0L330 370L200 500H0V410L165 315Z" fill="#ff7628" />
            <circle cx="400" cy="400" r="96" fill="#ffe348" />
          </svg>
        </div>
        <div className="peel-art-shadow" />
        <div className="peel-art-cover" />
        <div className="peel-art-curl" />
      </div>
      <div className="peel-study-caption">
        <p>A little colour underneath.</p>
        <button type="button" onClick={() => setPeeled(value => !value)} className="peel-toggle">
          {peeled ? 'Fold back' : 'Peel back'} <span aria-hidden="true">{peeled ? '↙' : '↗'}</span>
        </button>
      </div>
      <span className="sr-only" role="status">{peeled ? 'The white cover is peeled back, revealing more colour.' : 'A white cover partially conceals the colourful layer.'}</span>
    </div>
  );
}
