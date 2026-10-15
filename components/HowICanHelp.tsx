import Link from 'next/link';
import styles from './how-i-can-help.module.css';
const situations = [
  { title:'A lending journey that stalls between teams', output:'Map the move from enquiry to a prepared application: documents, lender requirements and operating handoffs.', slug:'cashkaro-college-money-education-loans' },
  { title:'Partners with different rules and failure modes', output:'Separate the shared workflow from partner policy, then make statuses, exceptions and reconciliation explicit.', slug:'cashkaro-lender-integration-operations' },
  { title:'An AI-assisted review process that needs scrutiny', output:'Build an inspectable prototype, identify human-verification gates and define what would need evaluation.', slug:'cashkaro-eduloans-policy-workflow' },
  { title:'A marketplace promise that depends on operations', output:'Connect the customer journey to agreement, payment and fulfilment, with clear ownership at each handoff.', slug:'absolute-silkroute-marketplace' },
];
export default function HowICanHelp({ id='how-i-can-help' }: { id?:string }) {
  return <section id={id} className={styles.section} aria-labelledby={`${id}-title`} tabIndex={-1}>
    <header><h2 id={`${id}-title`}>Where my experience may be useful</h2><p>If your product depends on banks, partners or operations outside the screen, we can work through the journey and the system behind it.</p></header>
    <dl>{situations.map(situation => <div key={situation.slug}><dt>{situation.title}</dt><dd>{situation.output} <Link href={`/product/${situation.slug}`}>See the related case <span aria-hidden="true">↗</span></Link></dd></div>)}</dl>
    <p className={styles.invitation}>Bring the part of the journey that keeps breaking between teams. We can examine where context is lost, what is missing and what the team should test or build next.</p>
    <div className={styles.actions}><a className="ink-button" href="mailto:Priyam.Sameer.95@gmail.com?subject=Product%20or%20operating%20problem">Discuss a product problem <span aria-hidden="true">↗</span></a><Link className="ink-link" href="/product/independent-founder-advisory">How I approach founder support <span aria-hidden="true">↗</span></Link></div>
  </section>;
}
