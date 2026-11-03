export const MAX_ADMIN_PDF_BYTES = 20 * 1024 * 1024;
const PDF_DOWNLOAD_TIMEOUT_MS = 10_000;
const MEDIA_LOCATION_ERROR = 'Media must use this website’s configured Blob storage and matching file path.';
const PDF_DOWNLOAD_ERROR = 'The uploaded PDF could not be read safely. Upload the PDF again.';

type MediaEnvironment = Record<string, string | undefined>;

// The installed Blob SDK parses the store ID from token.split('_')[3] and
// constructs https://{storeId}.public.blob.vercel-storage.com/{pathname}.
// Apply a stricter canonical token format before deriving the allowlisted host.
export function getAdminBlobHostname(env: MediaEnvironment = process.env): string | null {
  const token = env.BLOB_READ_WRITE_TOKEN;
  const store = typeof token === 'string'
    ? /^vercel_blob_rw_([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)_[a-z0-9_-]+$/i.exec(token)?.[1].toLowerCase()
    : undefined;
  const derived = store ? `${store}.public.blob.vercel-storage.com` : null;
  const explicit = env.CMS_BLOB_HOSTNAME;
  if (explicit !== undefined && explicit !== '') {
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.public\.blob\.vercel-storage\.com$/i.test(explicit)) return null;
    const hostname = explicit.toLowerCase();
    if (derived && derived !== hostname) return null;
    return hostname;
  }
  return derived;
}

export function validateAdminMediaLocation(
  blobUrl: unknown,
  blobPathname: unknown,
  env: MediaEnvironment = process.env,
): string | null {
  const hostname = getAdminBlobHostname(env);
  if (!hostname || typeof blobUrl !== 'string' || typeof blobPathname !== 'string'
    || !blobPathname || blobUrl.length > 8192 || blobPathname.length > 4096
    || /[\x00-\x1f\x7f\\]/.test(blobUrl) || /[\x00-\x1f\x7f\\]/.test(blobPathname)
    || blobUrl !== blobUrl.trim() || blobPathname.startsWith('/')
    || blobPathname.split('/').some(segment => !segment || segment === '.' || segment === '..')
    || /[?#]/.test(blobUrl) || /%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(blobUrl)) return MEDIA_LOCATION_ERROR;
  try {
    const url = new URL(blobUrl);
    const authority = /^https:\/\/([^/?#]+)/i.exec(blobUrl)?.[1];
    if (url.protocol !== 'https:' || url.hostname !== hostname
      || authority?.toLowerCase() !== hostname || url.username || url.password || url.port
      || decodeURIComponent(url.pathname.slice(1)) !== blobPathname) return MEDIA_LOCATION_ERROR;
    return null;
  } catch {
    return MEDIA_LOCATION_ERROR;
  }
}

export async function downloadAdminPDF(
  blobUrl: string,
  blobPathname: string,
  options: { env?: MediaEnvironment; fetcher?: typeof fetch } = {},
): Promise<Uint8Array> {
  if (validateAdminMediaLocation(blobUrl, blobPathname, options.env)) throw new Error(MEDIA_LOCATION_ERROR);
  let response: Response | undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    response = await (options.fetcher || fetch)(blobUrl, {
      redirect: 'error',
      signal: AbortSignal.timeout(PDF_DOWNLOAD_TIMEOUT_MS),
      cache: 'no-store',
      headers: { Accept: 'application/pdf' },
    });
    if (!response.ok || response.redirected || !/^application\/pdf(?:\s*;|\s*$)/i.test(response.headers.get('content-type') || '')) {
      throw new Error();
    }
    const declared = response.headers.get('content-length');
    if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_ADMIN_PDF_BYTES || Number(declared) === 0)) throw new Error();
    if (!response.body) throw new Error();
    reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      total += result.value.byteLength;
      if (total > MAX_ADMIN_PDF_BYTES) throw new Error();
      chunks.push(result.value);
    }
    if (total < 8 || (declared !== null && total !== Number(declared))) throw new Error();
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const signature = Array.from(bytes.subarray(0, 8), byte => String.fromCharCode(byte)).join('');
    if (!/^%PDF-\d\.\d$/.test(signature)) throw new Error();
    return bytes;
  } catch {
    if (reader) await reader.cancel().catch(() => {});
    else await response?.body?.cancel().catch(() => {});
    throw new Error(PDF_DOWNLOAD_ERROR);
  } finally {
    reader?.releaseLock();
  }
}
