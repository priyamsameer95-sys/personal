// Per-type upload and content validation constants.
// Shared by the blob-upload token route and the content POST route.

export type ContentType = 'cv' | 'art' | 'work' | 'blog';

export const VALID_TYPES: ContentType[] = ['cv', 'art', 'work', 'blog'];

export interface TypeConfig {
  allowedMimes: string[];
  allowedExtensions: string[];
  maxFileSizeBytes: number;
  minFiles: number;
  maxFiles: number;
  mediaKind: 'pdf' | 'image';
  maxWordCount: number; // soft limit, for UI warning only
  forceProtected: boolean;
  forceDownloadable: boolean | null; // null means user-configurable
}

export const TYPE_CONFIGS: Record<ContentType, TypeConfig> = {
  cv: {
    allowedMimes: ['application/pdf'],
    allowedExtensions: ['.pdf'],
    maxFileSizeBytes: 20 * 1024 * 1024,
    minFiles: 1,
    maxFiles: 1,
    mediaKind: 'pdf',
    maxWordCount: 0, // body not used for CV
    forceProtected: false,
    forceDownloadable: null, // user chooses, default true
  },
  art: {
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxFileSizeBytes: 25 * 1024 * 1024,
    minFiles: 1,
    maxFiles: 1,
    mediaKind: 'image',
    maxWordCount: 500,
    forceProtected: true,
    forceDownloadable: false, // always false for art
  },
  work: {
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxFileSizeBytes: 25 * 1024 * 1024,
    minFiles: 1,
    maxFiles: 5,
    mediaKind: 'image',
    maxWordCount: 1500,
    forceProtected: false,
    forceDownloadable: null,
  },
  blog: {
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxFileSizeBytes: 25 * 1024 * 1024,
    minFiles: 0,
    maxFiles: 3,
    mediaKind: 'image',
    maxWordCount: 2500,
    forceProtected: false,
    forceDownloadable: null,
  },
};

export function isValidType(type: string): type is ContentType {
  return VALID_TYPES.includes(type as ContentType);
}

// Validate a single file on the server side.
// Returns a specific error string, or null if valid.
export function validateFileMime(
  mime: string,
  type: ContentType
): string | null {
  const config = TYPE_CONFIGS[type];
  if (!config.allowedMimes.includes(mime)) {
    const allowed = config.allowedExtensions
      .map((e) => e.replace('.', '').toUpperCase())
      .join(', ');
    return `Invalid file type "${mime}". Allowed for ${type}: ${allowed}.`;
  }
  return null;
}

// Validate media count for a content type.
// Returns a specific error string, or null if valid.
export function validateMediaCount(
  count: number,
  type: ContentType
): string | null {
  const config = TYPE_CONFIGS[type];
  if (count < config.minFiles) {
    return `${type.toUpperCase()} requires at least ${config.minFiles} file(s). Got ${count}.`;
  }
  if (count > config.maxFiles) {
    return `${type.toUpperCase()} allows at most ${config.maxFiles} file(s). Got ${count}.`;
  }
  return null;
}

// Count words in a string (simple split on whitespace).
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

// Media item shape as received from the client after blob upload.
export interface MediaPayload {
  blob_url: string;
  blob_pathname: string;
  kind: 'image' | 'pdf';
  mime_type: string;
  width?: number | null;
  height?: number | null;
  orientation?: 'landscape' | 'portrait' | 'square' | null;
  alt_text?: string | null;
  protected: boolean;
  sort_order: number;
}

// Content payload shape for POST/PUT.
export interface ContentPayload {
  type: ContentType;
  title: string;
  summary?: string | null;
  body_markdown?: string | null;
  meta?: Record<string, unknown>;
  status: 'draft' | 'published';
  downloadable: boolean;
  sort_order?: number;
  media: MediaPayload[];
}

// Validate the full content payload on the server side.
// Returns a specific error string, or null if valid.
export function validateContentPayload(
  body: ContentPayload
): string | null {
  if (!body.type || !isValidType(body.type)) {
    return `Invalid content type "${body.type}". Must be one of: ${VALID_TYPES.join(', ')}.`;
  }

  if (!body.title || !body.title.trim()) {
    return 'Title is required.';
  }

  if (!['draft', 'published'].includes(body.status)) {
    return `Invalid status "${body.status}". Must be "draft" or "published".`;
  }

  const mediaError = validateMediaCount(body.media?.length ?? 0, body.type);
  if (mediaError) return mediaError;

  // Validate each media item
  for (const m of body.media || []) {
    if (!m.blob_url || !m.blob_pathname) {
      return 'Each media item must have blob_url and blob_pathname.';
    }
    const mimeError = validateFileMime(m.mime_type, body.type);
    if (mimeError) return mimeError;
    if (!['image', 'pdf'].includes(m.kind)) {
      return `Invalid media kind "${m.kind}". Must be "image" or "pdf".`;
    }
  }

  return null;
}
