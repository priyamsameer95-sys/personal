import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Priyam Sameer — Portfolio",
  description: "Builder. Product manager. Painter. Built with structural integrity.",
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
        <link href="https://fonts.googleapis.com/css2?family=B612:ital,wght@0,400;0,700;1,400&family=B612+Mono:wght@400;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" />
      </head>
      <body className="bg-[#FAFAFA] text-[#1A1A1A] antialiased">
        {children}
      </body>
    </html>
  );
}
