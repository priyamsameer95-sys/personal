import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import { getSiteAnalytics } from '@/lib/site-analytics';
import styles from './analytics.module.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Private website analytics',
  robots: { index: false, follow: false, noarchive: true },
};

type Analytics = Awaited<ReturnType<typeof getSiteAnalytics>>;
const number = (value: number) => new Intl.NumberFormat('en-IN').format(value);
const date = (value: string, withTime = false) => new Intl.DateTimeFormat('en-IN', {
  day: 'numeric', month: 'short', year: 'numeric',
  ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  timeZone: 'Asia/Kolkata',
}).format(new Date(value));
const shortDate = (value: string) => new Intl.DateTimeFormat('en-IN', {
  day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata',
}).format(new Date(value));

function DailyActivity({ daily }: { daily: Analytics['daily'] }) {
  const width = 960, height = 230, left = 34, right = 12, top = 18, bottom = 30;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const max = Math.max(1, ...daily.map(day => Math.max(day.pageViews, day.cvRequests)));
  const slot = plotWidth / Math.max(1, daily.length);
  const barWidth = Math.max(2, Math.min(28, slot * .65));
  const y = (value: number) => top + plotHeight * (1 - value / max);
  const path = daily.map((day, index) => `${index ? 'L' : 'M'}${left + slot * (index + .5)},${y(day.cvRequests)}`).join(' ');

  return <div className={styles.chart}>
    <p className={styles.chartScale}>Daily count · scale 0–{number(max)}</p>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-labelledby="daily-chart-title daily-chart-description">
      <title id="daily-chart-title">Daily page views and recorded CV requests</title>
      <desc id="daily-chart-description">Blue bars show page views. The orange line shows CV requests. Counts use Indian Standard Time. A daily data table follows for screen readers.</desc>
      {[0, .5, 1].map(fraction => <g key={fraction}>
        <line x1={left} x2={width - right} y1={top + plotHeight * fraction} y2={top + plotHeight * fraction} className={styles.gridLine} />
      </g>)}
      {daily.map((day, index) => <g key={day.date}>
        <rect x={left + slot * (index + .5) - barWidth / 2} y={y(day.pageViews)} width={barWidth} height={Math.max(0, top + plotHeight - y(day.pageViews))} rx="2" className={styles.viewBar}>
          <title>{`${shortDate(day.date)}: ${number(day.pageViews)} page views, ${number(day.cvRequests)} CV requests`}</title>
        </rect>
      </g>)}
      <path d={path} className={styles.requestLine} vectorEffect="non-scaling-stroke" />
      {daily.filter(day => day.cvRequests > 0).map(day => {
        const index = daily.indexOf(day);
        return <circle key={day.date} cx={left + slot * (index + .5)} cy={y(day.cvRequests)} r="4" className={styles.requestDot}><title>{`${shortDate(day.date)}: ${number(day.cvRequests)} CV requests`}</title></circle>;
      })}
    </svg>
    {daily.length > 0 && <div className={styles.chartDates} aria-hidden="true"><span>{shortDate(daily[0].date)}</span><span>{shortDate(daily[Math.floor((daily.length - 1) / 2)].date)}</span><span>{shortDate(daily[daily.length - 1].date)}</span></div>}
    <div className="sr-only"><table><caption>Daily website activity in Indian Standard Time</caption><thead><tr><th scope="col">Date</th><th scope="col">Visitor-days</th><th scope="col">Page views</th><th scope="col">CV requests</th></tr></thead><tbody>
      {daily.map(day => <tr key={day.date}><th scope="row">{shortDate(day.date)}</th><td>{day.visitors}</td><td>{day.pageViews}</td><td>{day.cvRequests}</td></tr>)}
    </tbody></table></div>
  </div>;
}

function Breakdown({ rows, noun, empty }: { rows: { label: string; value: number }[]; noun: string; empty: string }) {
  const max = Math.max(1, ...rows.map(row => row.value));
  return rows.length ? <ol className={styles.breakdown}>
    {rows.map(row => <li key={row.label}>
      <div className={styles.rowLabel}><span>{row.label}</span><strong>{number(row.value)}<span className="sr-only"> {noun}</span></strong></div>
      <div className={styles.barTrack} aria-hidden="true"><span style={{ width: `${row.value / max * 100}%` }} /></div>
    </li>)}
  </ol> : <p className={styles.empty}>{empty}</p>;
}

export default async function SiteAnalytics({ searchParams }: { searchParams?: { days?: string | string[] } }) {
  if (!await verifySessionToken(cookies().get(SESSION_COOKIE_NAME)?.value)) redirect('/minforyam/login');
  const requestedDays = searchParams?.days;
  const days = requestedDays === '7' ? 7 : requestedDays === '90' ? 90 : 30;
  let data: Analytics | null = null;
  try { data = await getSiteAnalytics(days); } catch { /* A storage failure must not look like zero traffic. */ }
  return <AnalyticsDashboard data={data} days={days} />;
}

function AnalyticsDashboard({ data, days }: { data: Analytics | null; days: 7 | 30 | 90 }) {
  return <main id="main-content" className={styles.page}>
    <nav className={styles.adminNav} aria-label="Private administration"><Link href="/minforyam">Back to admin</Link><Link href="/minforyam/cv-leads">CV interests & export</Link></nav>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>Private · visible after sign-in</p><h1>Website analytics.</h1><p className={styles.intro}>Traffic, popular pages and the people who shared an email for your CV.</p></div>
      <nav className={styles.ranges} aria-label="Reporting period">
        {([7, 30, 90] as const).map(range => <Link key={range} href={`/minforyam/analytics?days=${range}`} prefetch={false} aria-current={days === range ? 'page' : undefined}>{range} days</Link>)}
      </nav>
    </header>

    {!data ? <section className={styles.error} role="alert"><h2>Analytics could not be loaded.</h2><p>The database is unavailable. These are not zero-traffic results.</p><a href={`/minforyam/analytics?days=${days}`}>Try again</a><Link href="/minforyam/cv-leads">Open CV interests</Link></section> : <>
      <div className={styles.period}><p>{date(data.startDate)} – {date(data.endDate)} <span>· IST</span></p><p>{data.trackingStartedAt ? `Visitor tracking began ${date(data.trackingStartedAt)}.` : 'Visitor tracking is ready. No page views recorded yet.'}</p></div>
      <section className={styles.metrics} aria-label="Activity summary">
        {[
          { label: 'Page views', value: data.pageViews, note: `In the last ${days} days` },
          { label: 'Visitor-days', value: data.visitors, note: 'Estimated daily browsers, summed' },
          { label: 'CV requests', value: data.cvRequests, note: 'In this period, since request tracking began' },
          { label: 'Emails shared', value: data.cvContacts, note: 'Distinct email addresses · all time' },
        ].map(metric => <div key={metric.label} className={styles.metric}><p>{metric.label}</p><strong>{number(metric.value)}</strong><span>{metric.note}</span></div>)}
      </section>

      <section className={styles.activity} aria-labelledby="activity-title">
        <div className={styles.sectionHeading}><div><h2 id="activity-title">Daily activity</h2><p>Page views and recorded CV requests · IST</p></div><div className={styles.legend} aria-hidden="true"><span><i className={styles.blueKey} />Page views</span><span><i className={styles.orangeKey} />CV requests</span></div></div>
        <DailyActivity daily={data.daily} />
        {!data.pageViews && !data.cvRequests && <p className={styles.empty}>No activity recorded in this period. Previous traffic cannot be reconstructed.</p>}
      </section>

      <div className={styles.insights}>
        <section className={styles.panel} aria-labelledby="pages-title"><div className={styles.sectionHeading}><div><h2 id="pages-title">Pages people visit</h2><p>Page views in the selected period</p></div></div>
          {data.topPages.length ? <div className={styles.pageList}><div className={styles.pageListHeader}><span>Page</span><span>Views</span><span>Visitor-days</span></div>{data.topPages.map(page => <div key={page.path} className={styles.pageListRow}><span>{page.path}</span><strong>{number(page.views)}</strong><span>{number(page.visitors)}</span></div>)}</div> : <p className={styles.empty}>Pages will appear after your first recorded visit.</p>}
        </section>
        <section className={styles.panel} aria-labelledby="referrers-title"><div className={styles.sectionHeading}><div><h2 id="referrers-title">Where views come from</h2><p>Page views by referrer reported by the browser</p></div></div><Breakdown rows={data.referrers.map(row => ({ label: row.source, value: row.visits }))} noun="page views" empty="No referrer data recorded yet." /></section>
        <section className={styles.panel} aria-labelledby="devices-title"><div className={styles.sectionHeading}><div><h2 id="devices-title">Devices</h2><p>Page views by approximate device category</p></div></div><Breakdown rows={data.devices.map(row => ({ label: row.device, value: row.visits }))} noun="page views" empty="No device data recorded yet." /></section>
        {data.countries.length > 0 && <section className={styles.panel} aria-labelledby="countries-title"><div className={styles.sectionHeading}><div><h2 id="countries-title">Countries</h2><p>Page views by approximate location</p></div></div><Breakdown rows={data.countries.map(row => ({ label: row.country, value: row.visits }))} noun="page views" empty="No country data available yet." /></section>}
      </div>

      <section className={styles.contacts} aria-labelledby="contacts-title">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>All-time CV interests</p><h2 id="contacts-title">Emails shared for your CV</h2><p>{number(data.cvLeadsTotal)} {data.cvLeadsTotal === 1 ? 'email address' : 'email addresses'} · {number(data.cvRequestsAllTime)} recorded {data.cvRequestsAllTime === 1 ? 'request' : 'requests'} across all time.</p></div><a className={styles.export} href="/api/admin/cv-leads?format=csv">Export emails as CSV</a></div>
        <p className={styles.tableNote}>Latest 200 contacts, independent of the date filter. Request counts reflect successful form submissions, not confirmed PDF opens.</p>
        {data.cvLeads.length ? <div className={styles.table} tabIndex={0} role="region" aria-label="CV email records; scroll horizontally for all columns"><table><caption className="sr-only">Email addresses shared through the CV download form, all-time request counts and source pages</caption><thead><tr><th scope="col">Email</th><th scope="col">Latest request · IST</th><th scope="col">First request · IST</th><th scope="col">Requests</th><th scope="col">Latest page</th></tr></thead><tbody>
          {data.cvLeads.map(lead => <tr key={lead.email}><th scope="row">{lead.email}</th><td>{date(lead.last_requested_at, true)}</td><td>{date(lead.first_requested_at, true)}</td><td>{number(lead.download_count)}</td><td>{lead.last_source_path}</td></tr>)}
        </tbody></table></div> : <p className={styles.empty}>No one has shared an email through the CV form yet. Recorded contacts will appear here.</p>}
      </section>
      <aside className={styles.measurement} aria-labelledby="measurement-title"><h2 id="measurement-title">What these numbers mean</h2><p>Visits are anonymous. Visitor-days estimate distinct browsers within each day and add those daily counts; the same person returning tomorrow can count again. They do not identify people or link browsing to a CV email.</p><p>Referrers and device categories can be missing or approximate. Email addresses appear only when visitors share them through the CV form. Historical CV contacts are retained; daily traffic and request charts begin when tracking is enabled.</p></aside>
    </>}
  </main>;
}
