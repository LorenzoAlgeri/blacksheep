import type { Metadata } from "next";
import localFont from "next/font/local";
import { Abril_Fatface } from "next/font/google";
import "./globals.css";

const arialBlack = localFont({
  src: "../fonts/Arial_Black.ttf",
  variable: "--font-brand",
  display: "swap",
  weight: "900",
});

const abrilFatface = Abril_Fatface({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-intro",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BLACK SHEEP — Every Monday",
  description:
    "Iscriviti alla newsletter di BLACK SHEEP. Lineup e date prima di tutti. Ogni lunedì al 11 Clubroom, Corso Como, Milano.",
  icons: { icon: "/bs-logo.svg" },
  openGraph: {
    title: "BLACK SHEEP",
    description: "Lineup e date prima di tutti. Zero spam.",
    siteName: "BLACK SHEEP",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "BLACK SHEEP",
      },
    ],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${arialBlack.variable} ${abrilFatface.variable} h-full antialiased`}
    >
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
