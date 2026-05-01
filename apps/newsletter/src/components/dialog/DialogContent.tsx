"use client";

import type { ReactNode } from "react";

interface DialogContentProps {
  /** Optional ID linked from `<Dialog ariaDescribedBy={id}>` for SR announcements. */
  id?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Brand-styled body region for BrandedDialog. Holds explanatory text,
 * lists, embedded forms.
 */
export function DialogContent({ id, children, className }: DialogContentProps) {
  const base = "px-6 pb-4 text-sm leading-relaxed text-bs-cream/70 font-body";
  return (
    <div id={id} className={className ? `${base} ${className}` : base}>
      {children}
    </div>
  );
}
