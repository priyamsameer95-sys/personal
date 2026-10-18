import editorial from '@/content/github-showcase.json';

export type GithubScreen = { src: string; alt: string; caption: string; width: number; height: number };
export type GithubEditorial = {
  title: string; kicker: string; summary: string; stack: string[];
  decisions: { title: string; text: string }[];
  mechanism: { label: string; expression: string; note: string };
  status: string; images: GithubScreen[]; demoPath?: string;
  repositoryRoles?: Record<string, string>; tools?: string[];
  links?: { label: string; path: string }[];
};
export const githubEditorial: Record<string, GithubEditorial> = editorial;
