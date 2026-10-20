import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { listCVInterests, type CVLead } from '@/lib/cv-leads';
import styles from './cv-leads.module.css';

export const dynamic = 'force-dynamic';

function date(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(value));
}

export default async function CVInterests() {
  if (!await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value)) redirect('/minforyam/login');
  let leads: CVLead[] = [], total = 0, failed = false;
  try { ({ leads, total } = await listCVInterests()); } catch { failed = true; }
  return <main className={styles.page}>
    <nav><Link className={styles.back} href="/minforyam">Back to admin</Link> · <Link className={styles.back} href="/minforyam/analytics">Website analytics</Link></nav>
    <header className={styles.header}><div><h1>CV interests</h1><p>Email addresses shared before a CV download. Counts reflect recorded requests, not confirmed PDF opens.</p></div>
      {!failed && <a className={styles.export} href="/api/admin/cv-leads?format=csv">Export CSV</a>}
    </header>
    {failed ? <div role="alert"><p>CV interests could not be loaded. Please try again.</p><a className={styles.back} href="/minforyam/cv-leads">Reload interests</a></div> : <>
      <p className={styles.count}>{total} {total === 1 ? 'email address' : 'email addresses'}. {total > 200 ? 'Showing the latest 200. CSV contains up to the latest 10,000.' : 'CSV contains up to the latest 10,000.'}</p>
      {leads.length ? <div className={styles.table} tabIndex={0} role="region" aria-label="CV interest records"><table><caption className="sr-only">Visitor email addresses and recorded CV requests</caption><thead><tr><th scope="col">Email</th><th scope="col">First request · UTC</th><th scope="col">Latest request · UTC</th><th scope="col">Requests</th><th scope="col">Latest page</th></tr></thead><tbody>
        {leads.map(lead => <tr key={lead.email}><td>{lead.email}</td><td>{date(lead.first_requested_at)}</td><td>{date(lead.last_requested_at)}</td><td>{lead.download_count}</td><td>{lead.last_source_path}</td></tr>)}
      </tbody></table></div> : <p>No CV requests have been recorded yet.</p>}
    </>}
  </main>;
}
