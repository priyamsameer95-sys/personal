import data from './case-studies.json';
import type { CaseStudy, WorkCompany } from '@/lib/work-types';

// The JSON is also the source for downloadable PDFs. Registry tests validate
// its public fields, references, file sizes and route identifiers.
export const companies = data.companies as WorkCompany[];
export const caseStudies = data.caseStudies as CaseStudy[];
