import { Fragment } from 'react';
import type { CaseStudyChart, CaseStudyVisualSummary } from '@/lib/work-types';
import styles from './visual-story.module.css';

const colours = ['#2657ef', '#cbc4b7', '#958c7c', '#635d52', '#191714'];

export function formatChartValue(value: number, unit?: string): string {
  const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  if (unit === '%') return `${number}%`;
  if (unit === 'USD') return `$${number}`;
  if (unit === 'INR') return `₹${number}`;
  const displayUnit = value === 1 ? unit?.replace(/days$/, 'day').replace(/hours$/, 'hour') : unit;
  return displayUnit ? `${number} ${displayUnit}` : number;
}

function metricValue(value: number, unit?: string): string {
  if (unit === 'USD' && Math.abs(value) >= 1000000) {
    return `$${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value)}`;
  }
  return formatChartValue(value, unit);
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
      <table className={styles.legend}>
        <caption className="sr-only">{chart.title}: data</caption>
        <thead className="sr-only"><tr><th scope="col">Measure</th><th scope="col">Value</th></tr></thead>
        <tbody>{values.map((item, index) => <tr key={index}><th scope="row"><span className={styles.colourKey} style={{ backgroundColor: colours[index % colours.length] }} aria-hidden="true" />{item.label}</th><td>{formatChartValue(item.value, chart.unit)}</td></tr>)}</tbody>
      </table>
    </div> : isComparison ? <><table className={styles.comparison}>
      <caption className="sr-only">{chart.title}: data</caption>
      <thead className="sr-only"><tr><th scope="col">Measure</th><th scope="col">Value</th></tr></thead>
      <tbody>{values.map((item, index) => <Fragment key={index}>
        <tr><th scope="row">{item.label}</th><td><strong>{formatChartValue(item.value, chart.unit)}</strong></td></tr>
        <tr className={styles.barRow} aria-hidden="true"><td colSpan={2}><div className={styles.barTrack}><span style={{ width: `${item.value / maximum * 100}%`, backgroundColor: index === values.length - 1 ? colours[0] : colours[3] }} /></div></td></tr>
      </Fragment>)}</tbody>
    </table><p className={styles.chartScale} aria-hidden="true"><span>0</span><span>{formatChartValue(maximum, chart.unit)}</span></p></> : <dl className={styles.metrics}>{values.map((item, index) => <div key={index} style={{ borderColor: colours[index % colours.length] }}><dt>{item.label}</dt><dd>{metricValue(item.value, chart.unit) !== formatChartValue(item.value, chart.unit) ? <abbr title={formatChartValue(item.value, chart.unit)}>{metricValue(item.value, chart.unit)}</abbr> : formatChartValue(item.value, chart.unit)}</dd></div>)}</dl>}
    <p className={styles.chartNote}>{chart.note}</p>
  </figure>;
}

export function Workflow({ workflow, compact = false }: { workflow: CaseStudyVisualSummary['workflow']; compact?: boolean }) {
  if (workflow.steps.length === 0) return null;
  return <figure className={styles.workflow}>
      <figcaption>{workflow.label}</figcaption>
      <ol>{workflow.steps.map((step, index) => <li key={`${step.title}-${index}`}>
        <span className={styles.stepNumber} aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><strong>{step.title}</strong>{!compact && step.detail && <p>{step.detail}</p>}
      </li>)}</ol>
      {workflow.note && <p className={styles.workflowNote}>{workflow.note}</p>}
    </figure>;
}

export function VisualStory({ summary, compact = false }: { summary: CaseStudyVisualSummary; compact?: boolean }) {
  const charts = compact ? summary.charts?.slice(0, 1) : summary.charts;
  return <div className={`${styles.visualStory}${compact ? ` ${styles.compact}` : ''}`}>
    {!compact && <dl className={styles.framing}><div><dt>The challenge</dt><dd>{summary.challenge}</dd></div><div><dt>My decision</dt><dd>{summary.decision}</dd></div></dl>}
    <Workflow workflow={summary.workflow} compact={compact} />
    {!!charts?.length && <div className={styles.charts}>{charts.map((chart) => <Chart key={chart.id} chart={chart} compact={compact} />)}</div>}
    {!compact && summary.impact && <p className={styles.impact}><strong>Result and scope</strong>{summary.impact}</p>}
  </div>;
}

export default VisualStory;
