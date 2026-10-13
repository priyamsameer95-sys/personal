export interface WorkCompany {
  id: string;
  name: string;
  period: string;
  role: string;
  summary: string;
  order: number;
  relationship?: string;
}

export const workTypeLabels = {
  delivered: 'Delivered work',
  prototype: 'Prototype',
  proposal: 'Proposal',
  independent: 'Independent exercise',
  community: 'Community work',
  creative: 'Creative work',
  supporting: 'Supporting context',
} as const;

export type WorkType = keyof typeof workTypeLabels;

export interface ExecutiveBrief {
  challenge: string;
  remit: string;
  decision: string;
  impact: string;
}

export interface CaseStudyChart {
  id: string;
  title: string;
  kind: 'comparison' | 'donut' | 'metric';
  unit?: string;
  values: { label: string; value: number }[];
  note: string;
}

export interface CaseStudyVisualSummary {
  title: string;
  summary: string;
  challenge: string;
  role: string;
  decision: string;
  impact: string;
  workflow: {
    label: string;
    steps: { title: string; detail?: string }[];
    note: string;
  };
  charts?: CaseStudyChart[];
}

export interface CaseStudyTable {
  caption: string;
  headers: string[];
  rows: string[][];
  note?: string;
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
  group?: 'story' | 'detail' | 'reference';
  source?: { label: string; range?: string; date?: string; version?: string };
  tables?: CaseStudyTable[];
  anchorAliases?: string[];
}

export interface WorkMediaBase {
  id: string;
  src: string;
  caption: string;
  provenance?: {
    kind: 'historical' | 'current-public' | 'authored' | 'proposal';
    label: string;
    date?: string;
  };
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

export interface CaseStudy {
  id: string;
  slug: string;
  aliases?: string[];
  companyId: string;
  title: string;
  summary: string;
  workType: WorkType;
  executiveBrief: ExecutiveBrief;
  visualSummary?: CaseStudyVisualSummary;
  role: string;
  period: string;
  order: number;
  featured?: boolean;
  status?: 'published' | 'draft';
  heroMediaId?: string;
  outcomes: CaseStudyOutcome[];
  sections: CaseStudySection[];
  media: CaseStudyMedia[];
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
