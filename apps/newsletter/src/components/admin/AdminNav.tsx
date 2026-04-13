"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Iscritti" },
  { href: "/admin/compose", label: "Invia" },
  { href: "/admin/settings", label: "Impostazioni" },
] as const;

export function AdminNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden sm:flex gap-4 font-body text-xs text-bs-cream/40">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`hover:text-bs-cream transition-colors ${
              pathname === item.href ? "text-bs-cream" : ""
            }`}
          >
            {item.label}
          </Link>
        ))}
        <span className="text-bs-cream/10">|</span>
        <a
          href="/newsletter"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-bs-cream transition-colors"
        >
          Vedi sito ↗
        </a>
      </nav>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="sm:hidden p-2 text-bs-cream/50 hover:text-bs-cream transition-colors"
        aria-label={isOpen ? "Chiudi menu" : "Apri menu"}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile dropdown */}
      {isOpen && (
        <nav className="sm:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-sm border-t border-bs-cream/10 py-2 z-50">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-3 text-sm font-body transition-colors ${
                pathname === item.href ? "text-bs-cream" : "text-bs-cream/50 hover:text-bs-cream"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="mx-4 my-1 h-px bg-bs-cream/10" />
          <a
            href="/newsletter"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="block px-4 py-3 text-sm font-body text-bs-cream/50 hover:text-bs-cream transition-colors"
          >
            Vedi sito ↗
          </a>
        </nav>
      )}
    </>
  );
}
