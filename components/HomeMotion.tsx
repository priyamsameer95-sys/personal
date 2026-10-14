import type { ReactNode } from 'react';
import styles from './home-motion.module.css';

/** One restrained entrance; all content and media remain visible without JavaScript. */
export default function HomeMotion({ children }: { children: ReactNode }) {
  return <div className={styles.root}>{children}</div>;
}
