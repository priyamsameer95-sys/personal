import type { CaseStudyDownload } from '@/lib/work-types';

export class DownloadBundleError extends Error {
  constructor(public readonly reason: 'fetch' | 'incomplete' | 'integrity') {
    super(reason);
    this.name = 'DownloadBundleError';
  }
}

export async function assembleDownload(
  download: CaseStudyDownload,
  { signal, onProgress, onVerify }: {
    signal: AbortSignal;
    onProgress?: (received: number) => void;
    onVerify?: () => void;
  },
): Promise<Blob> {
  const chunks: ArrayBuffer[] = [];
  let received = 0;
  const append = (chunk: ArrayBuffer) => {
    received += chunk.byteLength;
    if (download.bytes !== undefined && received > download.bytes) throw new DownloadBundleError('incomplete');
    chunks.push(chunk);
    onProgress?.(received);
  };

  for (const part of download.parts || []) {
    signal.throwIfAborted();
    const response = await fetch(part, { signal });
    if (!response.ok) throw new DownloadBundleError('fetch');
    if (!response.body) {
      append(await response.arrayBuffer());
      continue;
    }
    const reader = response.body.getReader();
    try {
      while (true) {
        signal.throwIfAborted();
        const { done, value } = await reader.read();
        if (done) break;
        append(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer);
      }
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }

  signal.throwIfAborted();
  if (!received || (download.bytes !== undefined && received !== download.bytes)) throw new DownloadBundleError('incomplete');
  const blob = new Blob(chunks, { type: download.mime });
  // File size is checked on every origin. WebCrypto adds the source hash check
  // on HTTPS and localhost, where browsers expose the secure-context API.
  if (download.sha256 && globalThis.crypto?.subtle) {
    onVerify?.();
    const digest = await globalThis.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    signal.throwIfAborted();
    const actual = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    if (actual !== download.sha256.toLowerCase()) throw new DownloadBundleError('integrity');
  }
  return blob;
}
