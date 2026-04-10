"use client";

import Image from "next/image";
import { Music } from "lucide-react";

/* Inline SVG icons for brands not available in lucide-react */
function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

const SOCIALS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/blacksheep.community_",
    icon: <InstagramIcon size={20} />,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@blacksheep",
    icon: <Music size={20} />,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/blacksheep",
    icon: <FacebookIcon size={20} />,
  },
];

export function Footer() {
  return (
    <footer className="border-t border-bs-cream/5 px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-6">
        {/* Logo */}
        <Image
          src="/bs-logo.svg"
          alt="BLACK SHEEP"
          width={50}
          height={32}
          className="h-8 w-auto opacity-30"
        />

        {/* Social links */}
        <div className="flex gap-6">
          {SOCIALS.map(({ label, href, icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="text-bs-cream/30 transition-colors hover:text-bs-cream/60"
            >
              {icon}
            </a>
          ))}
        </div>

        {/* Bottom text */}
        <div className="text-center text-[10px] uppercase tracking-wider text-bs-cream/20">
          <p>BLACK SHEEP &copy; 2026 &mdash; DESIGNED IN MILANO</p>
          <p className="mt-1">
            <a href="#" className="transition-colors hover:text-bs-cream/40">
              PRIVACY POLICY
            </a>
            {" · "}
            <a href="#" className="transition-colors hover:text-bs-cream/40">
              COOKIE POLICY
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
