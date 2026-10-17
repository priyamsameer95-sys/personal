import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import Icon from '@/components/Icon';
import { getGithubProjects, githubGroups, githubProfileUrl } from '@/lib/github-projects';
import { absoluteUrl, breadcrumbs, pageMetadata, serializeJsonLd } from '@/lib/seo';
import styles from './github.module.css';

const description = 'Explore Priyam Sameer’s public GitHub projects: education-loan prototypes, MCP tools, webpage-to-audio, browser utilities and creative experiments.';
export const metadata: Metadata = pageMetadata({ path: '/github', title: 'GitHub projects', description });
export const revalidate = 3600;

export default async function GithubProjectsPage() {
  const projects = await getGithubProjects();
  const groups = githubGroups.map(group => ({ ...group, projects: projects.filter(project => project.group === group.id) })).filter(group => group.projects.length);
  const structuredData = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'GitHub projects — Priyam Sameer', url: absoluteUrl('/github'), description,
    mainEntity: { '@type': 'ItemList', numberOfItems: projects.length, itemListElement: projects.map((project, index) => ({ '@type': 'ListItem', position: index + 1, name: project.title, url: project.url })) },
  };
  return <PublicShell>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbs([{ name: 'Home', path: '/' }, { name: 'GitHub projects', path: '/github' }])) }} />
    <Header />
    <main id="main-content" className={styles.page}>
      <header className={styles.intro}>
        <div><h1>GitHub projects.</h1><p>Code for lending, audio and everyday tools.</p></div>
        <div className={styles.profile}><p>{projects.length} public repositories</p><a href={githubProfileUrl} target="_blank" rel="noopener noreferrer">GitHub profile <Icon name="arrow-up-right" /><span className="sr-only"> (opens in a new tab)</span></a></div>
      </header>
      <nav className={styles.index} aria-label="Project categories">{groups.map(group => <a key={group.id} href={`#${group.id}`}>{group.title}<span>{group.projects.length}</span></a>)}</nav>
      {groups.map(group => <section key={group.id} id={group.id} tabIndex={-1} className={styles.group} aria-labelledby={`${group.id}-title`}>
        <header className={styles.groupHeading}><h2 id={`${group.id}-title`}>{group.title}</h2><p>{group.description}</p></header>
        <div className={styles.projects}>{group.projects.map(project => <article key={project.name} className={styles.project}>
          <div className={styles.meta}><span>{project.kind}</span>{project.language && <span>{project.language}</span>}</div>
          <h3>{project.title}</h3>
          <p className={styles.description}>{project.description}</p>
          <p className={styles.repoName}>{project.name}</p>
          <div className={styles.actions}>
            <a href={project.url} target="_blank" rel="noopener noreferrer">View repository<Icon name="arrow-up-right" /><span className="sr-only"> (opens in a new tab)</span></a>
            {project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">Try the tool<Icon name="arrow-up-right" /><span className="sr-only"> (opens in a new tab)</span></a>}
            {project.casePath && <Link href={project.casePath}>See the walkthrough<Icon name="arrow-up-right" /></Link>}
          </div>
        </article>)}</div>
      </section>)}
    </main>
    <Footer />
  </PublicShell>;
}
