import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";

const arialBlack = localFont({
  src: "../fonts/Arial_Black.ttf",
  variable: "--font-brand",
  display: "swap",
  weight: "900",
});

export const metadata: Metadata = {
  title: "BLACK SHEEP",
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
  manifest: "/newsletter/manifest.json",
  other: {
    "theme-color": "#03124a",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${arialBlack.variable} h-full antialiased`}>
      {/* Preload tag rimosso intenzionalmente: il componente
          MascotteIntro carica il webp con cache-buster runtime per
          aggirare il bug WebKit 217897 (animated WebP cached non
          riparte su iOS Safari). Un preload con URL statico
          divergerebbe dal cache-buster client → fetch duplicato. */}
      <body className="min-h-dvh flex flex-col">
        <Script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid="dff080ac-afb5-4db6-a106-34b33f135e10"
          data-blockingmode="auto"
          strategy="beforeInteractive"
        />
        <div className="site-bg" aria-hidden>
          <img
            src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/sfondo.png`}
            alt=""
            draggable={false}
            loading="eager"
            fetchPriority="high"
          />
        </div>
        <div
          className="site-skyline"
          aria-hidden
          style={{
            backgroundImage: `url(${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/bs-collage.jpg)`,
          }}
        />
        <div className="hero-blur" aria-hidden />
        {children}
      </body>
    </html>
  );
}
