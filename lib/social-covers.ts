import { caseStudies, companies } from '@/content/work/case-studies';
import coverMedia from '@/content/social-covers.json';
import { getCaseDisplayTitle } from './work-presentation';

export const SOCIAL_COVER_SIZE = { width: 1200, height: 630 };
export const SOCIAL_COVER_VERSION = 'cover-v1.png';

export interface SocialCover {
  title: string;
  context: string;
  label: string;
  asset: string | null;
  style: 'page' | 'project' | 'text';
}

const mainPages: Record<string, string> = {
  home: 'Agriculture, AI & fintech', work: 'Selected work', experience: 'Experience',
  art: 'Paintings', github: 'GitHub projects', writing: 'Writing',
};
const companyNames: Record<string, string> = { cashkaro: 'CashKaro', absolute: 'Absolute', urbankhet: 'UrbanKhet', credflow: 'CredFlow' };

// Only exact, published destinations can render an image. URL input never
// becomes a file path or an outbound request.
export function resolveSocialCover(path: readonly string[]): SocialCover | null {
  if (path.length === 2 && path[1] === SOCIAL_COVER_VERSION && Object.hasOwn(mainPages, path[0])) {
    return { title: mainPages[path[0]], context: 'Priyam Sameer', label: 'Original website page', asset: `/social/page-captures/${path[0]}.png`, style: 'page' };
  }
  if (path.length !== 3 || path[0] !== 'product' || path[2] !== SOCIAL_COVER_VERSION) return null;
  const study = caseStudies.find(item => item.slug === path[1] && item.status !== 'draft');
  if (!study) return null;
  const media = (coverMedia as Record<string, { src: string | null; label: string }>)[study.slug];
  if (!media) return null;
  const company = companies.find(item => item.id === study.companyId);
  return {
    title: getCaseDisplayTitle(study),
    context: companyNames[study.companyId] || company?.name || 'Priyam Sameer',
    label: media.label,
    asset: media.src,
    style: media.src ? 'project' : 'text',
  };
}
