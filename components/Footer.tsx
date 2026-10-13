import styles from './site-chrome.module.css';

export default function Footer() {
  return <footer id="global-footer" className={`${styles.footer} no-print`}>
    <div>
      <p className={styles.footerLabel}>Have something in mind?</p>
      <h2>Let’s talk.</h2>
      <a href="mailto:Priyam.Sameer.95@gmail.com" className={styles.email}>Priyam.Sameer.95@gmail.com <span aria-hidden="true">↗</span></a>
    </div>
    <div className={styles.footerSide}>
      <p>Product, partnerships or a good idea.</p>
      <div className={styles.connections}>
        <a href="https://www.linkedin.com/in/priyam-sameer" target="_blank" rel="noopener noreferrer">LinkedIn <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
        <a href="tel:+918238452277">Call</a>
        <a href="https://wa.me/918238452277" target="_blank" rel="noopener noreferrer">WhatsApp <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
      </div>
      <p className={styles.copyright}>© {new Date().getFullYear()} Priyam Sameer</p>
    </div>
  </footer>;
}
