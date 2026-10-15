import { ImageResponse } from 'next/og';

export const alt = 'Priyam Sameer — product leadership across lending, agriculture and marketplaces';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function SocialPreview() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', padding: 12, background: '#2657ef', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', height: '100%', padding: '64px 70px', background: '#faf7f0', color: '#171717' }}>
        <div style={{ display: 'flex', fontSize: 28 }}>priyamsameer.com</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: 88, fontWeight: 700, letterSpacing: -4 }}>Priyam Sameer</div>
          <div style={{ display: 'flex', fontSize: 35, color: '#625e56' }}>Lending. Agriculture. Founder experience.</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {['#ff7628', '#f59dc6', '#c5e875', '#ffe348'].map(colour => <div key={colour} style={{ display: 'flex', width: 90, height: 12, background: colour }} />)}
        </div>
      </div>
    </div>,
    size,
  );
}
