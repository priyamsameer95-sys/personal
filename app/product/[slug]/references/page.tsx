import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { findCaseStudy } from '@/lib/work';
import { CaseStudyReferences } from '@/components/work/CaseStudy';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const study = findCaseStudy(params.slug);
  return { title: study ? `Evidence — ${study.visualSummary?.title || study.title}` : 'Supporting evidence', robots: { index:false, follow:true } };
}
export default function ReferencesPage({ params }: { params: { slug: string } }) {
  const study = findCaseStudy(params.slug);
  if (!study) notFound();
  if (study.slug !== params.slug) redirect(`/product/${study.slug}/references`);
  return <PublicShell><Header /><main id="main-content"><CaseStudyReferences study={study} /></main><Footer /></PublicShell>;
}
