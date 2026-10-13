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

/** Keep authored links useful while rejecting executable URL schemes. */
export function safeMarkdownUrl(url: string): string {
  const value = url.trim();
  if (/[\u0000-\u0020\u007f]/.test(value)) return '';
  const colon = value.indexOf(':');
  const pathBoundary = value.search(/[/?#]/);
  if (colon !== -1 && (pathBoundary === -1 || colon < pathBoundary) && !/^(?:https?|mailto|tel)$/i.test(value.slice(0, colon))) return '';
  return value;
}
