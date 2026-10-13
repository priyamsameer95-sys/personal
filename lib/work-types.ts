export interface WorkCompany {
  id: string;
  name: string;
  period: string;
  role: string;
  summary: string;
  order: number;
}

export interface CaseStudyOutcome {
  label: string;
  value?: string;
  detail?: string;
}

export interface CaseStudySection {
  id: string;
  title: string;
  body: string[];
  bullets?: string[];
  mediaIds?: string[];
}

interface WorkMediaBase {
  id: string;
  src: string;
  caption: string;
}

export interface CaseStudyScreenshot extends WorkMediaBase {
  kind: 'image';
  alt: string;
  width?: number;
  height?: number;
}

export interface CaseStudyVideo extends WorkMediaBase {
  kind: 'video';
  title: string;
  poster?: string;
  mime?: string;
  duration?: string;
  transcript?: string;
  captions?: { src: string; language: string; label: string }[];
}

export type CaseStudyMedia = CaseStudyScreenshot | CaseStudyVideo;

export interface CaseStudyDownload {
  label: string;
  url: string;
  filename: string;
  mime: string;
  description?: string;
  bytes?: number;
  parts?: string[];
  sha256?: string;
}

export interface CaseStudy {
  id: string;
  slug: string;
  aliases?: string[];
  companyId: string;
  title: string;
  summary: string;
  role: string;
  period: string;
  order: number;
  featured?: boolean;
  status?: 'published' | 'draft';
  heroMediaId?: string;
  outcomes: CaseStudyOutcome[];
  sections: CaseStudySection[];
  media: CaseStudyMedia[];
  downloads: CaseStudyDownload[];
  relatedSlugs?: string[];
  sourceNotes?: string[];
}

export interface PublishedWorkItem {
  id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  body_markdown: string | null;
  created_at: string;
  media: Array<{ blob_url: string; kind: string; alt_text: string | null }>;
}
