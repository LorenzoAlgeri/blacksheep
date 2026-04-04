import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const arialBlack = localFont({
  src: "../fonts/Arial_Black.ttf",
  variable: "--font-brand",
  display: "swap",
  weight: "900",
});

export const metadata: Metadata = {
  title: "BLACK SHEEP — Every Monday",
  description:
    "Iscriviti alla newsletter di BLACK SHEEP. Lineup e date prima di tutti. Ogni lunedì al 11 Clubroom, Corso Como, Milano.",
  openGraph: {
    title: "BLACK SHEEP — Every Monday",
    description: "Lineup e date prima di tutti. Zero spam.",
    siteName: "BLACK SHEEP",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${arialBlack.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
