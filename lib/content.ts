/** A readable excerpt for cards, without Markdown formatting or image URLs. */
export function contentExcerpt(markdown: string | null | undefined, maxLength = 200): string {
  if (!markdown) return '';

  const text = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s*|[-*+]\s+|\d+[.)]\s+)/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) return text;
  const shortened = text.slice(0, maxLength);
  const lastSpace = shortened.lastIndexOf(' ');
  return `${shortened.slice(0, lastSpace > maxLength * 0.6 ? lastSpace : maxLength).trimEnd()}…`;
}

/** Attachments stay in the source archive; public reading takes place on the site. */
export function isAttachmentUrl(url: string): boolean {
  let decoded = url;
  for (let pass = 0; pass < 2; pass += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch { break; }
  }
  const pathname = decoded.split(/[?#]/, 1)[0];
  return /\.(?:pdf|docx?|docm|pptx?|pptm|xlsx?|xlsm|odt|odp|ods|rtf|csv|zip|7z|rar|tar|gz|mp4|mov|webm|mp3|wav|txt)(?:\.part-\d+)?$/i.test(pathname)
    || /(?:^|\/)downloads?(?:\/|$)/i.test(pathname);
}

/** Keep reading and contact links useful, without executable schemes or file downloads. */
export function safeMarkdownUrl(url: string): string {
  const value = url.trim();
  if (/[\u0000-\u0020\u007f]/.test(value)) return '';
  const colon = value.indexOf(':');
  const pathBoundary = value.search(/[/?#]/);
  if (colon !== -1 && (pathBoundary === -1 || colon < pathBoundary) && !/^(?:https?|mailto|tel)$/i.test(value.slice(0, colon))) return '';
  if (!/^(?:mailto|tel):/i.test(value) && isAttachmentUrl(value)) return '';
  return value;
}
