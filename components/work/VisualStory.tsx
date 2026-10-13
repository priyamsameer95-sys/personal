import type { CaseStudyChart, CaseStudyVisualSummary } from '@/lib/work-types';
import styles from './visual-story.module.css';

const colours = ['#2657ef', '#ff7628', '#f59dc6', '#c5e875', '#ffe348'];

export function formatChartValue(value: number, unit?: string): string {
  const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  if (unit === '%') return `${number}%`;
  if (unit === 'USD') return `$${number}`;
  if (unit === 'INR') return `₹${number}`;
  return unit ? `${number} ${unit}` : number;
}

export function Chart({ chart, compact = false }: { chart: CaseStudyChart; compact?: boolean }) {
  const values = chart.values.filter((item) => Number.isFinite(item.value));
  if (values.length === 0) return null;
  const allFinite = values.length === chart.values.length;
  const total = values.reduce((sum, item) => sum + item.value, 0);
  const isDonut = allFinite && chart.kind === 'donut' && chart.unit === '%' && values.length > 1 && values.every((item) => item.value >= 0 && item.value <= 100) && Math.abs(total - 100) < .01;
  const isComparison = allFinite && chart.kind === 'comparison' && values.every((item) => item.value >= 0 && (chart.unit !== '%' || item.value <= 100)) && values.some((item) => item.value > 0);
  const maximum = chart.unit === '%' ? 100 : Math.max(...values.map((item) => item.value));

  return <figure className={`${styles.chart}${compact ? ` ${styles.compactChart}` : ''}`}>
    <figcaption>{chart.title}</figcaption>
    {isDonut ? <div className={styles.donutLayout}>
      <svg viewBox="0 0 120 120" className={styles.donut} aria-hidden="true" focusable="false">
        {values.map((item, index) => <circle key={index} cx="60" cy="60" r="44" fill="none" stroke={colours[index % colours.length]} strokeWidth="13" pathLength="100" strokeDasharray={`${item.value} ${100 - item.value}`} strokeDashoffset={-values.slice(0, index).reduce((sum, previous) => sum + previous.value, 0)} transform="rotate(-90 60 60)" />)}
        <text x="60" y="65" textAnchor="middle">{formatChartValue(values[0].value, '%')}</text>
      </svg>
      <dl className={styles.legend}>{values.map((item, index) => <div key={index}><dt><span className={styles.colourKey} style={{ backgroundColor: colours[index % colours.length] }} aria-hidden="true" />{item.label}</dt><dd>{formatChartValue(item.value, chart.unit)}</dd></div>)}</dl>
    </div> : isComparison ? <><ul className={styles.comparison}>{values.map((item, index) => <li key={index}>
      <div className={styles.barLabel}><span>{item.label}</span><strong>{formatChartValue(item.value, chart.unit)}</strong></div>
      <div className={styles.barTrack} aria-hidden="true"><span style={{ width: `${item.value / maximum * 100}%`, backgroundColor: colours[index % colours.length] }} /></div>
    </li>)}</ul><p className={styles.chartScale} aria-hidden="true"><span>0</span><span>{formatChartValue(maximum, chart.unit)}</span></p></> : <dl className={styles.metrics}>{values.map((item, index) => <div key={index} style={{ borderColor: colours[index % colours.length] }}><dt>{item.label}</dt><dd>{formatChartValue(item.value, chart.unit)}</dd></div>)}</dl>}
    <p className={styles.chartNote}>{chart.note}</p>
  </figure>;
}

export function VisualStory({ summary, compact = false }: { summary: CaseStudyVisualSummary; compact?: boolean }) {
  const charts = compact ? summary.charts?.slice(0, 1) : summary.charts;
  return <div className={`${styles.visualStory}${compact ? ` ${styles.compact}` : ''}`}>
    {!compact && <dl className={styles.framing}><div><dt>The challenge</dt><dd>{summary.challenge}</dd></div><div><dt>My decision</dt><dd>{summary.decision}</dd></div></dl>}
    {summary.workflow.steps.length > 0 && <figure className={styles.workflow}>
      <figcaption>{summary.workflow.label}</figcaption>
      <ol>{summary.workflow.steps.map((step, index) => <li key={`${step.title}-${index}`}>
        <span className={styles.stepNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><strong>{step.title}</strong>{!compact && step.detail && <p>{step.detail}</p>}
      </li>)}</ol>
      {summary.workflow.note && <p className={styles.workflowNote}>{summary.workflow.note}</p>}
    </figure>}
    {!!charts?.length && <div className={styles.charts}>{charts.map((chart) => <Chart key={chart.id} chart={chart} compact={compact} />)}</div>}
    {!compact && summary.impact && <p className={styles.impact}><strong>Result and scope</strong>{summary.impact}</p>}
  </div>;
}

export default VisualStory;
