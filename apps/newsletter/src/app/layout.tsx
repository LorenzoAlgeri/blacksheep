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
  icons: {
    icon: [
      { url: "/bs-logo.svg", type: "image/svg+xml" },
      { url: "/favicons/logo/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicons/logo/favicon.ico", sizes: "any" },
      { url: "/favicons/logo/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/favicons/logo/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/favicons/logo/apple-touch-icon.png", sizes: "180x180" }],
  },
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
    <html lang="it" className={`${arialBlack.variable} h-full antialiased`}>
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
