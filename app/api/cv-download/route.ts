import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/auth';
import { CV_DOWNLOAD_FILENAME, CV_DOWNLOAD_URL } from '@/lib/cv-download';
import { CVLeadRateLimitError, normalizeCVEmail, normalizeCVSource, recordCVInterest } from '@/lib/cv-leads';
import { checkCVEmailDomain, CVEmailRejectedError, CVEmailCheckUnavailableError } from '@/lib/cv-email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const MAX_BODY_BYTES = 2048;
const noStore = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

function failure(error: string, status: number, headers = {}) {
  return NextResponse.json({ error }, { status, headers: { ...noStore, ...headers } });
}

function hasSameOrigin(request: NextRequest): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const host = request.headers.get('host');
  // Next can normalize request.url to an internal hostname. Host is the
  // browser-facing authority; Vercel supplies the original HTTPS protocol.
  const protocol = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.slice(0, -1);
  if (!host || !/^[a-z0-9.:[\]-]+$/i.test(host) || !/^https?$/.test(protocol)) return false;
  try {
    return request.headers.get('origin') === new URL(`${protocol}://${host}`).origin;
  } catch { return false; }
}

async function readBody(request: NextRequest): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) throw new RangeError();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_BODY_BYTES) { await reader.cancel(); throw new RangeError(); }
      chunks.push(chunk.value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) {
    return failure('Please request the CV from this website.', 403);
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return failure('Please submit the email form.', 415);
  }
  let body: unknown;
  try { body = await readBody(request); }
  catch (error) { return failure(error instanceof RangeError ? 'The form is too large.' : 'Please enter a valid email address.', error instanceof RangeError ? 413 : 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return failure('Please enter a valid email address.', 400);
  const fields = body as Record<string, unknown>;
  const email = normalizeCVEmail(fields.email);
  if (!email || Object.keys(fields).some(key => !['email', 'website', 'sourcePath'].includes(key)) ||
    (fields.website !== undefined && fields.website !== '') ||
    (fields.sourcePath !== undefined && typeof fields.sourcePath !== 'string')) {
    return failure('Please check your email address and try again.', 400);
  }
  try {
    await checkCVEmailDomain(email);
    await recordCVInterest(email, normalizeCVSource(fields.sourcePath), getClientIp(request));
    return NextResponse.json({ downloadUrl: CV_DOWNLOAD_URL, filename: CV_DOWNLOAD_FILENAME }, { headers: noStore });
  } catch (error) {
    if (error instanceof CVEmailRejectedError) return failure(error.message, 400);
    if (error instanceof CVEmailCheckUnavailableError) return failure(error.message, 503, { 'Retry-After': '30' });
    if (error instanceof CVLeadRateLimitError) return failure('Please wait a few minutes before requesting the CV again.', 429, { 'Retry-After': String(error.retryAfter) });
    return failure('The CV request could not be saved. Please try again shortly.', 503);
  }
}
