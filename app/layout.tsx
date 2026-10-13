/* App Router owns the document head in this root layout. */
/* eslint-disable @next/next/no-page-custom-font */
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

export const metadata: Metadata = {
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} bg-system-bg text-system-primary antialiased`}>
        <a href="#main-content" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
