import { resolveSocialCover } from '@/lib/social-covers';
import { renderSocialCover } from '@/lib/social-cover-image';

export const runtime = 'nodejs';
export const revalidate = 86400;

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const cover = resolveSocialCover(path);
  if (!cover) return new Response(null, { status: 404 });
  try {
    return await renderSocialCover(cover);
  } catch {
    // A broken visual must not silently return the generic personal card.
    return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
