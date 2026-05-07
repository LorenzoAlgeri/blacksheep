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
 *
 * `autoFocus` + `tabIndex={-1}`: makes the title the first focused
 * element when the native <dialog> opens via showModal(). Without
 * this, focus would land on the first <input> inside the dialog —
 * which on mobile pops the soft keyboard immediately and (in some
 * Safari/Chrome iOS setups) places the caret next to the label
 * instead of inside the input field. With the title focused, the
 * keyboard stays closed; the user taps the input intentionally to
 * activate it (correct caret position guaranteed by the browser).
 * tabIndex=-1 keeps the heading out of the tab order — only
 * programmatic focus from the dialog open lands here.
 */
export function DialogHeader({ id, children, className }: DialogHeaderProps) {
  const base =
    "px-6 pt-8 pb-4 font-[family-name:var(--font-brand)] text-2xl tracking-[0.04em] uppercase text-bs-cream outline-none";
  return (
    <h2 id={id} autoFocus tabIndex={-1} className={className ? `${base} ${className}` : base}>
      {children}
    </h2>
  );
}
