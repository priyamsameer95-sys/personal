import snapshot from '@/content/github-projects.json';

export const githubOwner = snapshot.owner;
export const githubProfileUrl = `https://github.com/${githubOwner}`;
export const githubGroups = snapshot.groups;
export type GithubProject = {
  name: string; title: string; group: string; kind: string; language: string | null;
  description: string; url: string; sourcePath?: string; casePath?: string; demoUrl?: string;
  pitch?: string; technicalTags?: string[]; logic?: { label: string; expression: string; note?: string };
};
const repositoryUrl = (name: string) => `${githubProfileUrl}/${encodeURIComponent(name)}`;
export const reviewedGithubProjects: GithubProject[] = snapshot.projects.map(project => ({ ...project, url: repositoryUrl(project.name) }));

export function classifyGithubProject(name: string, description = ''): string {
  const text = `${name} ${description}`.toLowerCase();
  if (/loan|lender|credit|fintech|equity|payment/.test(text)) return 'decision-systems';
  if (/audio|podcast|voice|speech|\btts\b|screening|agent|chatbot/.test(text)) return 'ai-lending';
  if (/game|puzzle|palette|colou?r|creative|\btv\b/.test(text)) return 'creative-web';
  if (/json|csv|regex|parser|data|developer|tool/.test(text)) return 'tools-experiments';
  return 'notes-repositories';
}

/** Public, credential-free discovery; reviewed content is the outage/build fallback. */
export async function getGithubProjects(): Promise<GithubProject[]> {
  try {
    const publicRepos: Array<{ name: string; description?: string | null; language?: string | null; size?: number; archived?: boolean }> = [];
    let page = 1;
    while (true) {
      const response = await fetch(`https://api.github.com/users/${githubOwner}/repos?type=owner&sort=full_name&per_page=100&page=${page}`, {
        headers: { Accept: 'application/vnd.github+json' }, next: { revalidate: 3600 }, signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error('Public repository index unavailable');
      const records: unknown = await response.json();
      if (!Array.isArray(records)) throw new Error('Invalid repository index');
      publicRepos.push(...records.filter(repo => repo && repo.private === false && repo.owner?.login === githubOwner && typeof repo.name === 'string' && /^[A-Za-z0-9_.-]+$/.test(repo.name)));
      if (records.length < 100) break;
      page += 1;
    }
    const unique = new Map(publicRepos.map(repo => [repo.name, repo]));
    const projects: GithubProject[] = [];
    for (const reviewed of reviewedGithubProjects) {
      const current = unique.get(reviewed.name);
      if (!current) continue;
      projects.push({ ...reviewed, language: typeof current.language === 'string' ? current.language : reviewed.language,
        ...(reviewed.kind === 'Empty repository' && (current.size || 0) > 0 ? { kind: 'Repository', pitch: undefined, technicalTags: undefined, logic: undefined, description: typeof current.description === 'string' && current.description.trim() ? current.description.trim().slice(0, 240) : 'Explore the source and project notes on GitHub.' } : {}),
      });
      unique.delete(reviewed.name);
    }
    for (const repo of Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name))) {
      projects.push({ name: repo.name, title: repo.name, group: classifyGithubProject(repo.name, repo.description || ''), kind: repo.archived ? 'Archived repository' : repo.size === 0 ? 'Empty repository' : 'Repository',
        language: typeof repo.language === 'string' ? repo.language : null, url: repositoryUrl(repo.name),
        description: typeof repo.description === 'string' && repo.description.trim() ? repo.description.trim().slice(0, 240) : repo.size === 0 ? 'No source files are published in this repository yet.' : 'Explore the source and project notes on GitHub.',
      });
    }
    return projects;
  } catch {
    return reviewedGithubProjects;
  }
}
