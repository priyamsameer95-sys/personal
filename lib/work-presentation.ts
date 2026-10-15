import type { CaseStudy, CaseStudyMedia, CaseStudyPresentation } from './work-types';

const caseDisplayTitles: Readonly<Record<string, string>> = {
  'cashkaro-personal-loan-marketplace': 'Personal-loan marketplace',
  'cashkaro-college-money-education-loans': 'College.money education loans',
  'cashkaro-eduloans-policy-workflow': 'EduLoans reviewer workspace',
  'cashkaro-lender-integration-operations': 'Lender integrations',
  'cashkaro-lending-mcp-feedback': 'Lending policy via MCP',
  'credflow-kuberx-launch': 'KuberX launch',
  'credflow-pay-via-credit-card': 'KuberX credit-card payments',
  'absolute-silkroute-marketplace': 'SilkRoute commodity trading',
  'absolute-trade-payments-erp': 'Trade payments and ERP',
  'absolute-rural-credit-uli': 'RiskStac and ULI',
  'absolute-ondc-credit-infrastructure': 'ONDC credit infrastructure',
  'absolute-upaj-farmer-experience': 'Upaj farmer experience',
  'absolute-farm-os-iot-gis': 'Farm OS monitoring',
  'absolute-crop-health-ai': 'Crop-health AI',
  'absolute-rainfall-grid-insurance': 'Rainfall data and insurance',
  'absolute-upaj-international': 'Upaj in Brazil and Malaysia',
  'absolute-agri-input-institutional-commerce': 'Agri-input institutional commerce',
  'absolute-supporting-portfolio': 'Absolute portfolio archive',
  'urbankhet-farm-to-fork': 'UrbanKhet farm to customer',
  'urbankhet-covid-pivot': 'UrbanKhet COVID pivot',
  'urbankhet-incubation-funding': 'UrbanKhet venture support',
  'water-farmers-aquaponics': 'Water Farmers aquaponics',
  'gujarat-action-group-covid-resource-database': 'COVID resource database',
  'independent-founder-advisory': 'Founder advisory',
  'cept-football-creative-practice': 'Football and painting',
};

export function getCaseDisplayTitle(study: Pick<CaseStudy, 'slug' | 'title'> & { visualSummary?: Pick<NonNullable<CaseStudy['visualSummary']>, 'title'> }): string {
  return caseDisplayTitles[study.slug] || study.visualSummary?.title || study.title;
}

export function featuredCaseStudies<T extends { featuredOrder?: number }>(studies: readonly T[]): T[] {
  return studies.filter(study => Number.isFinite(study.featuredOrder) && study.featuredOrder! > 0)
    .sort((a, b) => a.featuredOrder! - b.featuredOrder!);
}

export function getPrimaryMedia(study: Pick<CaseStudy, 'media' | 'heroMediaId' | 'primaryMediaIds'>): CaseStudyMedia[] {
  const selected = (study.primaryMediaIds || []).flatMap(id => {
    const media = study.media.find(asset => asset.id === id);
    return media ? [media] : [];
  });
  if (study.primaryMediaIds) return selected.filter((media, index, all) => all.findIndex(asset => asset.src === media.src) === index);
  const hero = study.media.find(media => media.id === study.heroMediaId);
  if (hero) return [hero];
  const priorities = ['prototype-screenshot', 'product-screenshot', 'walkthrough', 'photograph', 'diagram', 'illustration', 'source-document'];
  return [...study.media].sort((a, b) => priorities.indexOf(a.category || (a.kind === 'video' ? 'walkthrough' : 'illustration')) - priorities.indexOf(b.category || (b.kind === 'video' ? 'walkthrough' : 'illustration'))).slice(0, 1);
}

export function mediaGroupTitle(media: CaseStudyMedia): string {
  if (media.category === 'prototype-screenshot' || media.provenance?.kind === 'prototype') return 'Original interaction prototype';
  if (media.kind === 'video') return media.provenance?.kind === 'authored' ? 'Public-reference walkthrough' : 'Product walkthrough';
  if (media.category === 'product-screenshot') return media.provenance?.kind === 'current-public' ? 'Current public product reference' : 'Product screenshot';
  if (media.category === 'photograph') return 'Company photograph';
  if (media.category === 'diagram') return media.src.includes('/architecture/') ? 'Technical portfolio diagram' : 'Workflow explanation';
  if (media.category === 'source-document') return media.provenance?.kind === 'proposal' ? 'Institutional proposal reference' : 'Source document reference';
  if (media.category === 'illustration') return media.provenance?.label || 'Illustration of my approach';
  return media.provenance?.label || 'Visual reference';
}

export function getCasePresentation(study: CaseStudy): CaseStudyPresentation {
  if (study.presentation) return study.presentation;
  const details = study.sections.filter(section => section.group === 'detail');
  return {
    decisionBeats: [
      { id: 'decision', title: details[0]?.title || 'The product decision', sectionIds: ['build', ...(details[0] ? [details[0].id] : [])] },
      { id: 'delivery', title: details[1]?.title || 'Making the decision work', sectionIds: ['delivery', ...(details[1] ? [details[1].id] : [])] },
      { id: 'judgment', title: 'What I learned', sectionIds: ['takeaway'] },
    ],
    supportingGroups: study.sections.filter(section => section.group === 'reference' || (section.group === 'detail' && !details.slice(0, 2).includes(section)))
      .map(section => ({ id: section.id, title: section.title, sectionIds: [section.id] })),
  };
}
