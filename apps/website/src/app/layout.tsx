import type { Metadata } from "next";
import localFont from "next/font/local";
import { LenisProvider } from "@/providers/LenisProvider";
import "./globals.css";

const arialBlack = localFont({
  src: "../fonts/Arial_Black.ttf",
  variable: "--font-brand",
  display: "swap",
  weight: "900",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.blacksheep-community.com"),
  title: "BLACK SHEEP | The Place To Be — Milano",
  description:
    "Ogni lunedì al 11 Clubroom, Corso Como, Milano. Hip-Hop, R&B, Afrobeats. Red Bull Turn It Up 2025 Winners. Prenota il tuo tavolo.",
  keywords: [
    "black sheep",
    "milano",
    "hip hop",
    "r&b",
    "afrobeats",
    "11 clubroom",
    "corso como",
    "club",
    "lunedì",
  ],
  authors: [{ name: "Black Sheep Community" }],
  icons: { icon: "/bs-logo.svg" },
  openGraph: {
    title: "BLACK SHEEP | The Place To Be",
    description: "Ogni lunedì al 11 Clubroom, Corso Como. Hip-Hop, R&B, Afrobeats.",
    siteName: "BLACK SHEEP",
    type: "website",
    locale: "it_IT",
  },
  twitter: {
    card: "summary_large_image",
    title: "BLACK SHEEP | The Place To Be",
    description: "Ogni lunedì al 11 Clubroom, Corso Como, Milano.",
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
      <body className="min-h-dvh flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:bg-bs-cream focus:text-black focus:px-4 focus:py-2 focus:rounded focus:font-brand focus:text-sm focus:uppercase focus:tracking-wider"
        >
          Salta al contenuto
        </a>
        <LenisProvider>{children}</LenisProvider>
      </body>
    </html>
  );
}
