import Icon from '@/components/Icon';
import styles from './site-chrome.module.css';
import EmailContact from './EmailContact';

export default function Footer({ compact = false }: { compact?: boolean } = {}) {
  if (compact) return <footer id="global-footer" className={`${styles.compactFooter} no-print`}><p>© {new Date().getFullYear()} Priyam Sameer</p></footer>;
  return <footer id="global-footer" className={`${styles.footer} no-print`}>
    <div>
      <p className={styles.footerLabel}>Have something in mind?</p>
      <h2>Let’s talk.</h2>
      <EmailContact linkClassName={styles.email}>Priyam.Sameer.95@gmail.com <span aria-hidden="true"><Icon name="arrow-up-right" /></span></EmailContact>
    </div>
    <div className={styles.footerSide}>
      <p>Bengaluru, India</p>
      <div className={styles.connections}>
        <a href="https://www.linkedin.com/in/priyam-sameer" target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true"><Icon name="arrow-up-right" /></span><span className="sr-only"> (opens in a new tab)</span></a>
        <a href="tel:+918238452277">Call</a>
        <a href="https://wa.me/918238452277" target="_blank" rel="noopener noreferrer">WhatsApp <span aria-hidden="true"><Icon name="arrow-up-right" /></span><span className="sr-only"> (opens in a new tab)</span></a>
      </div>
      <p className={styles.copyright}>© {new Date().getFullYear()} Priyam Sameer</p>
    </div>
  </footer>;
}
