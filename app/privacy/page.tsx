import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PublicShell from '@/components/PublicShell';
import AnalyticsPreference from '@/components/AnalyticsPreference';
import styles from './privacy.module.css';

export const metadata: Metadata = {
  title: 'Privacy and analytics preferences',
  description: 'How this portfolio measures anonymous visits and handles emails shared for a CV.',
  alternates: { canonical: 'https://www.priyamsameer.com/privacy' },
  robots: { index: false, follow: true },
};
export default function PrivacyPage() {
  return <PublicShell><Header /><main id="main-content" className={styles.page}>
    <h1>Privacy, in plain language.</h1>
    <p>This portfolio measures which pages visitors explore, meaningful clicks, media use and active time. It helps me understand which work is useful to readers.</p>
    <section><h2>Anonymous website activity.</h2><p>A first-party browser identifier lasts up to 90 days. Page paths, referring websites, recognised campaign labels, broad device category and actions are recorded for up to 180 days. Different browsers can count separately.</p><p>I don’t record typed form content, browsing screenshots, keystrokes or raw IP addresses in analytics. Visits are not linked to CV email addresses. Google Analytics and Amplitude are not used.</p></section>
    <AnalyticsPreference />
    <section><h2>Email addresses shared for the CV.</h2><p>Submitting the CV form saves your email and the request as a record of your interest. It does not subscribe you to a newsletter. These records are held separately from browsing activity and are only shown in my private report.</p><p>To ask about or remove a CV request, contact <a href="mailto:Priyam.Sameer.95@gmail.com">Priyam.Sameer.95@gmail.com</a>.</p></section>
  </main><Footer compact /></PublicShell>;
}
