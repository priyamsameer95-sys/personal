import data from './case-studies.json';
import type { CaseStudy, WorkCompany } from '@/lib/work-types';

// The JSON supplies the website's briefs, narratives and reference chapters.
// Registry tests validate its public fields, media, anchors and route identifiers.
export const companies = data.companies as WorkCompany[];
export const caseStudies = data.caseStudies as CaseStudy[];
