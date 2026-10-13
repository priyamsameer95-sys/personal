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
  title: { default: "Priyam Sameer — Product Leadership", template: "%s — Priyam Sameer" },
  description: "Product leadership from strategy to scale. Priyam Sameer’s work, experience and decisions across lending, marketplaces and agritech.",
  openGraph: {
    title: "Priyam Sameer — Product Leadership",
    description: "Product leadership from strategy to scale. Explore Priyam Sameer’s work and experience across lending, marketplaces and agritech.",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary",
    title: "Priyam Sameer — Product Leadership",
    description: "Product leadership from strategy to scale. Work and experience across lending, marketplaces and agritech.",
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
