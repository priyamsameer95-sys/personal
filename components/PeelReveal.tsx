'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

const PAPER = 'M 450 260 C 450 365 375 448 269 451 C 163 454 70 387 64 276 C 58 165 125 77 236 66 C 347 55 450 140 450 260 Z';

interface Motion {
  value: number;
  velocity: number;
  target: number;
  frame: number | null;
  time: number | null;
}

export default function PeelReveal() {
  const id = useId().replace(/:/g, '');
  const [peeled, setPeeled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [settled, setSettled] = useState(false);
  const reduceMotion = useRef(false);
  const motion = useRef<Motion>({ value: 0, velocity: 0, target: 0, frame: null, time: null });

  const snapToTarget = useCallback(() => {
    const current = motion.current;
    if (current.frame !== null) cancelAnimationFrame(current.frame);
    current.frame = null;
    current.time = null;
    current.velocity = 0;
    current.value = current.target;
    setProgress(current.target);
    setSettled(current.target === 1);
  }, []);

  const animate = useCallback(function step(time: number) {
    const current = motion.current;
    if (reduceMotion.current) {
      snapToTarget();
      return;
    }

    const elapsed = current.time === null ? 1 / 60 : Math.min((time - current.time) / 1000, .04);
    current.time = time;

    // One damped spring drives the crease, flap, reveal, and shadow together.
    // Small integration steps keep the motion stable across refresh rates.
    const steps = Math.max(1, Math.ceil(elapsed / .008));
    const dt = elapsed / steps;
    for (let i = 0; i < steps; i++) {
      current.velocity += ((current.target - current.value) * 240 - current.velocity * 31) * dt;
      current.value += current.velocity * dt;
      if (current.value < 0 || current.value > 1) {
        current.value = Math.max(0, Math.min(1, current.value));
        current.velocity = 0;
      }
    }

    if (Math.abs(current.target - current.value) < .0008 && Math.abs(current.velocity) < .008) {
      snapToTarget();
      return;
    }

    setProgress(current.value);
    current.frame = requestAnimationFrame(step);
  }, [snapToTarget]);

  useEffect(() => {
    const current = motion.current;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => {
      reduceMotion.current = media.matches;
      if (media.matches) snapToTarget();
    };
    updatePreference();
    media.addEventListener('change', updatePreference);
    return () => {
      media.removeEventListener('change', updatePreference);
      if (current.frame !== null) cancelAnimationFrame(current.frame);
      current.frame = null;
    };
  }, [snapToTarget]);

  function togglePeel() {
    const current = motion.current;
    current.target = current.target === 1 ? 0 : 1;
    setPeeled(current.target === 1);
    setSettled(false);
    if (reduceMotion.current) {
      snapToTarget();
    } else if (current.frame === null) {
      current.time = null;
      current.frame = requestAnimationFrame(animate);
    }
  }

  const crease = 650 - progress * 200;
  const lift = .82 - progress * .16;
  // Reflect the lifted paper around x + y = crease, then foreshorten its
  // depth. Every point on the crease stays fixed, so the fold cannot detach.
  const a = (1 - lift) / 2;
  const b = -(1 + lift) / 2;
  const offset = (1 + lift) * crease / 2;
  const fold = `matrix(${a} ${b} ${b} ${a} ${offset} ${offset})`;
  const cover = `M -520 -520 H 1040 V ${crease - 1040} L ${crease - 1040} 1040 H -520 Z`;
  const cap = `M 1040 ${crease - 1040} V 1040 H ${crease - 1040} Z`;

  return (
    <div className="peel-study">
      <div className="peel-art" data-peeled={peeled} data-progress={progress.toFixed(3)} aria-hidden="true">
        <svg className="peel-art-illustration" viewBox="0 0 520 520" focusable="false">
          <defs>
            <clipPath id={`${id}-surface`}><path d={PAPER} /></clipPath>
            <clipPath id={`${id}-cover`}><path d={cover} /></clipPath>
            <clipPath id={`${id}-cap`}><path d={cap} /></clipPath>
            <linearGradient id={`${id}-paper`} gradientUnits="userSpaceOnUse" x1={crease / 2} y1={crease / 2} x2={crease / 2 + 48} y2={crease / 2 + 48}>
              <stop offset="0" stopColor="#c9c2b5" />
              <stop offset=".12" stopColor="#eee9df" />
              <stop offset=".45" stopColor="#fff" />
              <stop offset="1" stopColor="#faf7f0" />
            </linearGradient>
            <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>
          <g transform="rotate(-9 260 260)">
            <g clipPath={`url(#${id}-surface)`}>
              <rect width="520" height="520" fill="#ff7628" />
              <path d="M0 0H520L190 310L0 170Z" fill="#ffe348" />
              <path d="M0 150L345 30L520 150L200 470H0Z" fill="#f59dc6" />
              <path d="M390 0H520V520H160Z" fill="#2657ef" />
              <path d="M0 390L275 220L400 520H0Z" fill="#c5e875" />
              <path d="M0 0L330 370L200 520H0V410L165 315Z" fill="#ff7628" />
              <circle cx="420" cy="420" r="96" fill="#ffe348" />
              <g clipPath={`url(#${id}-cover)`}><path d={PAPER} fill="#fff" /></g>
              <g transform="translate(3 5)">
                <g transform={fold} filter={`url(#${id}-shadow)`} opacity=".14">
                  <g clipPath={`url(#${id}-cap)`}><path d={PAPER} fill="#000" /></g>
                </g>
              </g>
            </g>
            <path d={PAPER} fill="none" stroke="#0b0b0b" strokeOpacity=".12" strokeWidth=".8" />
            <g transform={fold}>
              <g clipPath={`url(#${id}-cap)`}>
                <path d={PAPER} fill={`url(#${id}-paper)`} stroke="#d8d8d8" strokeWidth=".7" />
              </g>
            </g>
          </g>
        </svg>
      </div>
      <div className="peel-study-caption">
        <p>A little colour underneath.</p>
        <button type="button" onClick={togglePeel} aria-pressed={peeled} className="peel-toggle">
          {peeled ? 'Fold back' : 'Peel back'} <span aria-hidden="true">{peeled ? '↙' : '↗'}</span>
        </button>
      </div>
      <span className="sr-only" role="status">{settled ? 'The white cover is peeled back, revealing more colour.' : 'A white cover partially conceals the colourful layer.'}</span>
    </div>
  );
}
