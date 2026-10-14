/* App Router owns the document head in this root layout. */
import type { Metadata } from "next";
import localFont from "next/font/local";
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

const siteAddress = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

export const metadata: Metadata = {
  ...(siteAddress ? { metadataBase: new URL(siteAddress) } : {}),
  title: { default: "Priyam Sameer — Product Leader & Former Founder", template: "%s — Priyam Sameer" },
  description: "Priyam Sameer’s product work across lending, agricultural technology and marketplaces. Explore the products, decisions, evidence and career behind the work.",
  openGraph: {
    title: "Priyam Sameer — Product Leader & Former Founder",
    description: "Lending products, agricultural technology and a farm-to-customer business. Explore product decisions, system design and the original evidence.",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: "Priyam Sameer — Product Leader & Former Founder",
    description: "Product work and experience across lending, agricultural technology and marketplaces.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable} text-system-primary antialiased`}>
        <a href="#main-content" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
