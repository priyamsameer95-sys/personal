import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import sharp from 'sharp';
import { ImageResponse } from 'next/og';
import coverMedia from '@/content/social-covers.json';
import { SOCIAL_COVER_SIZE, type SocialCover } from './social-covers';

async function localImage(path: string): Promise<string> {
  const directory = resolve(process.cwd(), 'public');
  const original = Object.values(coverMedia).find(media => media.src === path);
  const asset = original && 'rasterSrc' in original ? String(original.rasterSrc) : path;
  const file = resolve(directory, `.${asset}`);
  if (!path.startsWith('/') || !file.startsWith(directory + sep)) throw new Error('Invalid cover asset');
  const mime = ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' } as Record<string, string>)[extname(file)];
  if (!mime) throw new Error('Unsupported cover asset');
  const bytes = await readFile(file);
  // Some historical .png files and browser captures contain JPEG bytes.
  // Decode by content and normalize the encoding; the original pixels stay intact.
  const png = await sharp(bytes, { limitInputPixels: 40_000_000 }).png().toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

export async function renderSocialCover(cover: SocialCover): Promise<ImageResponse> {
  const src = cover.asset ? await localImage(cover.asset) : null;
  const headers = { 'Cache-Control': 'public, max-age=3600, s-maxage=86400', 'X-Content-Type-Options': 'nosniff' };
  if (cover.style === 'page' && src) {
    return new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#faf7f0' }}>
        {/* These are captures of the actual destination, not a second design. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={cover.title} width={1200} height={630} style={{ width: 1200, height: 630, objectFit: 'cover', objectPosition: 'top' }} />
      </div>,
      { ...SOCIAL_COVER_SIZE, headers },
    );
  }
  const hasMedia = Boolean(src);
  return new ImageResponse(
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', padding: '30px 38px 24px', background: '#faf7f0', color: '#171717', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 22, color: '#625e56', marginBottom: 12 }}>
        <span>{cover.context}</span><span>priyamsameer.com</span>
      </div>
      <div style={{ display: 'flex', fontSize: hasMedia ? 45 : 67, fontWeight: 700, lineHeight: 1.12, letterSpacing: '-1.4px', marginBottom: hasMedia ? 18 : 36, marginTop: hasMedia ? 0 : 75 }}>{cover.title}</div>
      {src && <div style={{ display: 'flex', width: 1124, height: 424, alignItems: 'center', justifyContent: 'center', background: '#f0ece3', border: '1px solid #ded8cd', overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={cover.title} width={1122} height={422} style={{ width: 1122, height: 422, objectFit: cover.asset?.includes('/eduloans/prototype/') ? 'cover' : 'contain', objectPosition: 'top' }} />
      </div>}
      <div style={{ display: 'flex', fontSize: 20, color: '#625e56', marginTop: hasMedia ? 16 : 'auto' }}>{cover.label}</div>
    </div>,
    { ...SOCIAL_COVER_SIZE, headers },
  );
}
