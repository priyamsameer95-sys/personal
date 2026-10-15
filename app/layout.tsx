/* App Router owns the document head in this root layout. */
import type { Metadata } from "next";
import localFont from "next/font/local";
import { absoluteUrl, serializeJsonLd, siteOrigin, siteStructuredData } from '@/lib/seo';
import "./globals.css";

const geist = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: { default: "Priyam Sameer — Product Leader & Former Founder", template: "%s — Priyam Sameer" },
  description: "Priyam Sameer’s product work across lending, agricultural technology and marketplaces. Explore the products, decisions, evidence and career behind the work.",
  openGraph: {
    title: "Priyam Sameer — Product Leader & Former Founder",
    description: "Lending products, agricultural technology and a farm-to-customer business. Explore product decisions, system design and the original evidence.",
    type: "website",
    locale: "en_IN",
    siteName: 'Priyam Sameer',
    images: [{ url: absoluteUrl('/opengraph-image'), width: 1200, height: 630, alt: 'Priyam Sameer — product leadership' }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Priyam Sameer — Product Leader & Former Founder",
    description: "Product work and experience across lending, agricultural technology and marketplaces.",
    images: [absoluteUrl('/twitter-image')],
  },
  authors: [{ name: 'Priyam Sameer', url: absoluteUrl('/') }],
  creator: 'Priyam Sameer',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable} text-system-primary antialiased`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(siteStructuredData()) }} />
        <a href="#main-content" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
