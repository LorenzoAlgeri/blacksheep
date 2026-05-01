"use client";

import type { ReactNode } from "react";

interface DialogHeaderProps {
  /** Stable ID linked from `<Dialog ariaLabelledBy={id}>`. */
  id: string;
  children: ReactNode;
  className?: string;
}

/**
 * Brand-styled heading for BrandedDialog. Use Arial Black uppercase
 * letterspacing to match the BlackSheep visual language.
 *
 * The `id` prop is required and MUST match the parent Dialog's
 * `ariaLabelledBy` so screen readers announce the title on open.
 */
export function DialogHeader({ id, children, className }: DialogHeaderProps) {
  const base =
    "px-6 pt-8 pb-4 font-[family-name:var(--font-brand)] text-2xl tracking-[0.04em] uppercase text-bs-cream";
  return (
    <h2 id={id} className={className ? `${base} ${className}` : base}>
      {children}
    </h2>
  );
}
