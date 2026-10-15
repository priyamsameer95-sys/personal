import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { findCaseStudy } from '@/lib/work';
import { CaseStudyReferences } from '@/components/work/CaseStudy';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import { getCaseDisplayTitle } from '@/lib/work-presentation';
import { pageMetadata } from '@/lib/seo';

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const study = findCaseStudy(params.slug);
  if (!study) return { title: 'Supporting evidence', robots: { index: false, follow: true } };
  return pageMetadata({ path: `/product/${study.slug}/references`, title: `Evidence: ${getCaseDisplayTitle(study)}`, description: `Supporting sources and media for ${getCaseDisplayTitle(study)}, including provenance and measurement qualifications.`, noIndex: true });
}
export default function ReferencesPage({ params }: { params: { slug: string } }) {
  const study = findCaseStudy(params.slug);
  if (!study) notFound();
  if (study.slug !== params.slug) redirect(`/product/${study.slug}/references`);
  return <PublicShell><Header /><main id="main-content"><CaseStudyReferences study={study} /></main><Footer /></PublicShell>;
}
