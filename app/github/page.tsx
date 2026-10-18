import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import Icon from '@/components/Icon';
import Media from '@/components/work/Media';
import DemoLauncher from '@/components/github/DemoLauncher';
import { getGithubProjects, githubGroups, githubProfileUrl } from '@/lib/github-projects';
import { buildGithubShowcase } from '@/lib/github-showcase';
import { githubEditorial } from '@/lib/github-editorial';
import { absoluteUrl, breadcrumbs, pageMetadata, serializeJsonLd } from '@/lib/seo';
import styles from './github.module.css';

const description = 'Try Priyam Sameer’s browser tools and explore original interfaces for EduLoans, voice AI and fintech, with model choices, tool contracts and source code.';
export const metadata: Metadata = pageMetadata({ path: '/github', title: 'GitHub projects', description });
export const revalidate = 3600;

export default async function GithubProjectsPage() {
  const repositories = await getGithubProjects();
  const { projects, supporting } = buildGithubShowcase(repositories);
  const groups = githubGroups.map(group => ({ ...group, projects: projects.filter(project => (project.id === 'eduloans' ? 'ai-lending' : project.group) === group.id) })).filter(group => group.projects.length || group.id === 'notes-repositories' && supporting.length);
  const structuredData = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'GitHub projects — Priyam Sameer', url: absoluteUrl('/github'), description,
    mainEntity: { '@type': 'ItemList', numberOfItems: projects.length, itemListElement: projects.map((project, index) => ({ '@type': 'ListItem', position: index + 1, name: githubEditorial[project.id]?.title || project.title, url: absoluteUrl(`/github#project-${project.id}`) })) },
  };
  return <PublicShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs([{ name: 'Home', path: '/' }, { name: 'GitHub projects', path: '/github' }])) }} />
    <Header />
    <main id="main-content" className={styles.page}>
      <header className={styles.intro}>
        <div><p className={styles.eyebrow}>Projects / public source</p><h1>Projects, in practice.</h1><p>Explore the interfaces, AI systems and browser tools behind my public code.</p></div>
        <div className={styles.profile}><p><strong>{projects.length}</strong> projects <span> / </span><strong>{repositories.length}</strong> public repositories</p><a href={githubProfileUrl} target="_blank" rel="noopener noreferrer">GitHub profile <Icon name="arrow-up-right" /><span className="sr-only"> (opens in a new tab)</span></a></div>
      </header>
      <nav className={styles.index} aria-label="Project categories">{groups.map(group => <a key={group.id} href={`#${group.id}`}>{group.navTitle || group.title}<span>{group.projects.length}</span></a>)}</nav>
      {groups.map((group, groupIndex) => <section key={group.id} id={group.id} tabIndex={-1} className={styles.group} aria-labelledby={`${group.id}-title`}>
        <header className={styles.groupHeading}><span className={styles.sectionNumber}>{String(groupIndex + 1).padStart(2, '0')}</span><h2 id={`${group.id}-title`}>{group.id === 'ai-lending' ? 'AI, voice & lending systems' : group.title}</h2><p>{group.id === 'ai-lending' ? 'Original interfaces, explicit model paths and deliberate human control.' : group.description}</p></header>
        <div className={styles.projects}>{group.projects.map((project, index) => {
          const story = githubEditorial[project.id];
          const primary = story?.images[0];
          const title = story?.title || project.title;
          return <article key={project.id} id={`project-${project.id}`} data-github-project={project.id} className={`${styles.project}${project.id === 'eduloans' ? ` ${styles.featured}` : ''}`}>
            <div className={styles.projectHeader}><div><span>{story?.kicker || project.repositories[0].kind}</span><h3>{title}</h3></div><span className={styles.projectNumber}>{String(index + 1).padStart(2, '0')}</span></div>
            <div className={styles.projectBody}>
              {primary && <div className={styles.visuals}>
                <Media media={{ ...primary, id: `github-${project.id}`, kind: 'image', category: 'prototype-screenshot' }} priority={project.id === 'eduloans'} compact />
                {story.images.length > 1 && <div className={styles.thumbnails}>{story.images.slice(1).map((image, imageIndex) => <div key={image.src}><Media media={{ ...image, id: `github-${project.id}-${imageIndex}`, kind: 'image', category: 'prototype-screenshot' }} compact /><span>{['Student intake', 'Partner pipeline', 'Reviewer queue'][imageIndex]}</span></div>)}</div>}
                {project.id === 'eduloans' && <div className={styles.architecture} aria-label="EduLoans MCP prototype architecture"><p>Inside the MCP prototype</p><ol><li><strong>Agent client</strong><span>Requests a defined tool</span></li><li><strong>MCP contract</strong><span>JSON Schema · stdio</span></li><li><strong>Rules & lookup</strong><span>Deterministic result</span></li></ol><p>Evaluation explains a pre-check. It does not approve a loan.</p></div>}
              </div>}
              <div className={styles.account}>
                <p className={styles.summary}>{story?.summary || project.repositories[0].description}</p>
                {story && <>
                  <ul className={styles.stack} aria-label={`${title} tools and technologies`}>{story.stack.map(tool => <li key={tool}>{tool}</li>)}</ul>
                  <div className={styles.decisions}>{story.decisions.map(decision => <div key={decision.title}><h4>{decision.title}</h4><p>{decision.text}</p></div>)}</div>
                  <dl className={styles.logic}><dt>{story.mechanism.label}</dt><dd><code>{story.mechanism.expression}</code><p>{story.mechanism.note}</p></dd></dl>
                  {story.tools && <div className={styles.toolContracts}><h4>The nine MCP tools</h4><ul>{story.tools.map(tool => <li key={tool}><code>{tool}</code></li>)}</ul></div>}
                  <p className={styles.status}>{story.status}</p>
                  {story.demoPath && <div className={styles.try}><DemoLauncher title={title} path={story.demoPath} /></div>}
                </>}
                {project.repositories.some(repository => repository.archived) && <p className={styles.status}>Includes a repository marked archived on GitHub.</p>}
              </div>
            </div>
            <footer className={styles.sources}><p>{project.repositories.length > 1 ? `One project / ${project.repositories.length} source repositories` : 'Source & implementation'}</p><ul>{project.repositories.map(repository => <li key={repository.name}>
              <a href={repository.url} target="_blank" rel="noopener noreferrer">{repository.name}<Icon name="arrow-up-right" /><span className="sr-only"> (opens in a new tab)</span></a>
              <span>{story?.repositoryRoles?.[repository.name] || repository.kind}</span>
              {repository.sourcePath && <a className={styles.sourceFile} href={`${repository.url}/blob/main/${repository.sourcePath.split('/').map(encodeURIComponent).join('/')}`} target="_blank" rel="noopener noreferrer">{repository.sourcePath}<span className="sr-only"> (opens in a new tab)</span></a>}
              {repository.casePath && <Link className={styles.sourceFile} href={repository.casePath}>Full product case <Icon name="arrow-up-right" /></Link>}
            </li>)}</ul>{story?.links && <div className={styles.implementationLinks}>{story.links.map(link => <a key={link.path} href={`${project.repositories[0].url}/blob/main/${link.path.split('/').map(encodeURIComponent).join('/')}`} target="_blank" rel="noopener noreferrer">{link.label}<Icon name="arrow-up-right" /><span className="sr-only"> (opens in a new tab)</span></a>)}</div>}</footer>
          </article>;
        })}</div>
        {group.id === 'notes-repositories' && supporting.length > 0 && <aside className={styles.supporting} aria-labelledby="supporting-title"><h3 id="supporting-title">Notes & starting points</h3><p>A build log and workspaces without published implementations.</p><ul>{supporting.map(repository => <li key={repository.name}><a href={repository.url} target="_blank" rel="noopener noreferrer">{repository.name}<Icon name="arrow-up-right" /><span className="sr-only"> (opens in a new tab)</span></a><span>{repository.kind === 'Empty repository' ? 'No source files published yet.' : 'Dated build notes and project references.'}</span></li>)}</ul></aside>}
      </section>)}
    </main>
    <Footer />
  </PublicShell>;
}
