import type { GithubProject } from './github-projects';

export type GithubShowcaseProject = {
  id: string;
  title: string;
  group: string;
  repositoryNames: string[];
  repositories: GithubProject[];
};

type ProjectDefinition = Pick<GithubShowcaseProject, 'id' | 'title' | 'group' | 'repositoryNames'>;

// These are product identities, not claims that separate prototypes were deployed together.
const projectDefinitions: readonly ProjectDefinition[] = [
  { id: 'eduloans', title: 'EduLoans', group: 'decision-systems', repositoryNames: ['mcp-el', 'V1.03-Chat-eduloans', 'edulaons'] },
  { id: 'theya-audio', title: 'THEYA.Audio', group: 'ai-lending', repositoryNames: ['THEYA.AUDIO'] },
  { id: 'voice-screening', title: 'Conversational Voice Screening', group: 'ai-lending', repositoryNames: ['hr-screening101'] },
  { id: 'rocket-card', title: 'Rocket Card Intelligence', group: 'decision-systems', repositoryNames: ['rocket-card-finder'] },
  { id: 'equity-simulator', title: 'EquitySim — Exit Economics', group: 'decision-systems', repositoryNames: ['2026-08-22-equity-simulator'] },
  { id: 'json-atlas', title: 'JSON Atlas — Structural Codegen', group: 'tools-experiments', repositoryNames: ['2026-08-22-json-atlas'] },
  { id: 'regex-matcher', title: 'Magic Text Matcher — Visual Regex', group: 'tools-experiments', repositoryNames: ['magic-text-matcher'] },
  { id: 'csv-streamer', title: 'StreamCSV — Browser Data Pipeline', group: 'tools-experiments', repositoryNames: ['2026-08-22-csv-streamer'] },
  { id: 'colour-palette', title: 'Procedural Colour Palette Generator', group: 'creative-web', repositoryNames: ['2026-08-22-color-palette-gen'] },
  { id: 'tv-surf', title: 'TV Surf — Stochastic Discovery', group: 'creative-web', repositoryNames: ['2026-08-22-tv-surf'] },
  { id: 'scrambl', title: 'Scrambl — Deterministic Daily Play', group: 'creative-web', repositoryNames: ['2026-08-22-scrambl'] },
  { id: 'portfolio', title: 'Portfolio Publishing Platform', group: 'notes-repositories', repositoryNames: ['personal'] },
];

// Escape the escape character too, so new names such as a.b and a_2eb cannot collide.
const unreviewedProjectId = (name: string) => `repository-${name.toLowerCase().replace(/[^a-z0-9-]/g, character => `_${character.charCodeAt(0).toString(16).padStart(2, '0')}`)}`;

/** Group related public source repositories without losing their individual status or links. */
export function buildGithubShowcase(repositories: readonly GithubProject[]): {
  projects: GithubShowcaseProject[];
  supporting: GithubProject[];
} {
  const remaining = new Map<string, GithubProject>();
  for (const repository of repositories) {
    const key = repository.name.toLowerCase();
    if (!remaining.has(key)) remaining.set(key, repository);
  }
  const supporting: GithubProject[] = [];
  for (const [key, repository] of Array.from(remaining.entries())) {
    if (key === 'daily-build-log' || repository.kind === 'Empty repository') {
      supporting.push(repository);
      remaining.delete(key);
    }
  }
  const projects: GithubShowcaseProject[] = [];
  for (const definition of projectDefinitions) {
    const members = definition.repositoryNames.flatMap(name => {
      const key = name.toLowerCase();
      const repository = remaining.get(key);
      if (!repository) return [];
      remaining.delete(key);
      return [repository];
    });
    if (members.length) projects.push({ ...definition, repositoryNames: members.map(repository => repository.name), repositories: members });
  }
  for (const repository of Array.from(remaining.values()).sort((a, b) => a.name.localeCompare(b.name))) {
    projects.push({ id: unreviewedProjectId(repository.name), title: repository.title, group: repository.group, repositoryNames: [repository.name], repositories: [repository] });
  }
  return { projects, supporting };
}
