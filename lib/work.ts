import { caseStudies, companies } from '@/content/work/case-studies';
import { publicDb as db } from '@/lib/db';
import { contentExcerpt } from '@/lib/content';
import type { CaseStudy, CaseStudyMedia, PublishedWorkItem, WorkCompany, WorkType } from '@/lib/work-types';

export interface WorkCompanyGroup {
  company: WorkCompany;
  studies: CaseStudy[];
}

export interface WorkTeaser {
  id: string;
  href: string;
  title: string;
  summary: string;
  company?: string;
  workType?: WorkType;
  outcome?: string;
  image?: { src: string; alt: string };
}

// Retired curated routes must not fall through to an older publishing record.
const retiredWorkSlugs = new Set(['independent-moneylion-wow-strategy', 'moneylion-wow-strategy']);

export function isRetiredWorkSlug(identifier: string): boolean {
  return retiredWorkSlugs.has(identifier);
}

export function publishedCaseStudies(studies: readonly CaseStudy[] = caseStudies): CaseStudy[] {
  return studies.filter((study) => study.status !== 'draft').sort((a, b) => a.order - b.order);
}

export function findCaseStudy(identifier: string, studies: readonly CaseStudy[] = caseStudies): CaseStudy | undefined {
  return publishedCaseStudies(studies).find((study) => study.slug === identifier || study.aliases?.includes(identifier));
}

export function findWorkCompany(companyId: string): WorkCompany | undefined {
  return companies.find((company) => company.id === companyId);
}

export function groupCaseStudies(
  studies: readonly CaseStudy[] = caseStudies,
  companyList: readonly WorkCompany[] = companies,
): WorkCompanyGroup[] {
  const published = publishedCaseStudies(studies);
  return [...companyList].sort((a, b) => a.order - b.order).map((company) => ({
    company,
    studies: published.filter((study) => study.companyId === company.id),
  })).filter((group) => group.studies.length > 0);
}

export function caseStudyPreview(study: CaseStudy): { src: string; alt: string } | undefined {
  const hero = study.media.find((media) => media.id === study.heroMediaId);
  const image = hero?.kind === 'image' ? hero : study.media.find((media) => media.kind === 'image');
  if (image?.kind === 'image') return { src: image.src, alt: image.alt };
  const video = hero?.kind === 'video' && hero.poster ? hero : study.media.find((media) => media.kind === 'video' && media.poster);
  return video?.kind === 'video' && video.poster ? { src: video.poster, alt: video.title } : undefined;
}

export function getCaseStudyMedia(study: CaseStudy, ids: readonly string[]): CaseStudyMedia[] {
  return ids.flatMap((id) => {
    const media = study.media.find((asset) => asset.id === id);
    return media ? [media] : [];
  });
}

export function relatedCaseStudies(study: CaseStudy, limit = 3): CaseStudy[] {
  const candidates = publishedCaseStudies().filter((candidate) => candidate.slug !== study.slug);
  return [...candidates].sort((a, b) => {
    const rank = (candidate: CaseStudy) => study.relatedSlugs?.includes(candidate.slug) ? 0 : candidate.companyId === study.companyId ? 1 : 2;
    return rank(a) - rank(b) || a.order - b.order;
  }).slice(0, limit);
}

export function withoutCuratedDuplicates(
  items: readonly PublishedWorkItem[],
  studies: readonly CaseStudy[] = caseStudies,
): PublishedWorkItem[] {
  const published = publishedCaseStudies(studies);
  const reserved = new Set(published.flatMap((study) => [study.slug, ...(study.aliases || [])]));
  return items.filter((item) => !item.slug || (!reserved.has(item.slug) && !isRetiredWorkSlug(item.slug)));
}

// Authored studies remain usable independently of the optional publishing database.
export async function loadPublishedWork(): Promise<PublishedWorkItem[]> {
  if (!process.env.POSTGRES_URL) return [];
  try {
    const { rows } = await db`
      SELECT
        ci.id, ci.title, ci.slug, ci.summary, ci.body_markdown, ci.created_at,
        COALESCE(
          json_agg(
            json_build_object('blob_url', ma.blob_url, 'kind', ma.kind, 'alt_text', ma.alt_text)
            ORDER BY ma.sort_order
          ) FILTER (WHERE ma.id IS NOT NULL), '[]'::json
        ) AS media
      FROM content_items ci
      LEFT JOIN media_assets ma ON ma.content_id = ci.id
      WHERE ci.type = 'work' AND ci.status = 'published'
      GROUP BY ci.id
      ORDER BY ci.sort_order ASC, ci.created_at DESC
    `;
    return withoutCuratedDuplicates(rows as PublishedWorkItem[]);
  } catch {
    console.error('Additional published work could not be loaded. Authored case studies remain available.');
    return [];
  }
}

export async function featuredWork(limit = 2): Promise<WorkTeaser[]> {
  const published = publishedCaseStudies();
  const selected = [...published.filter((study) => study.featured), ...published.filter((study) => !study.featured)].slice(0, limit);
  const teasers: WorkTeaser[] = selected.map((study) => ({
    id: study.id,
    href: `/product/${encodeURIComponent(study.slug)}`,
    title: study.title,
    summary: study.summary,
    company: findWorkCompany(study.companyId)?.name,
    workType: study.workType,
    outcome: study.executiveBrief?.impact,
    image: caseStudyPreview(study),
  }));
  if (teasers.length >= limit) return teasers;
  const databaseItems = await loadPublishedWork();
  return [...teasers, ...databaseItems.slice(0, limit - teasers.length).map((item) => {
    const firstImage = item.media.find((media) => media.kind === 'image');
    return {
      id: item.id,
      href: `/product/${encodeURIComponent(item.slug || item.id)}`,
      title: item.title,
      summary: contentExcerpt(item.summary || item.body_markdown, 220),
      image: firstImage ? { src: firstImage.blob_url, alt: firstImage.alt_text || item.title } : undefined,
    };
  })];
}
