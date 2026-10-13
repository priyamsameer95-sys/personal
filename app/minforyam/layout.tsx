import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Content management',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>
    {/* Private publishing controls use this icon font; public pages do not. */}
    {/* eslint-disable-next-line @next/next/no-page-custom-font */}
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" />
    {children}
  </>;
}
