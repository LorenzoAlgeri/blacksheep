"use client";

import type { ReactNode } from "react";

interface DialogFooterProps {
  children: ReactNode;
  className?: string;
}

/**
 * Layout container for dialog action buttons. Stacked column on mobile,
 * row on md+. Buttons should have min 44x44px touch targets (WCAG 2.5.5).
 */
export function DialogFooter({ children, className }: DialogFooterProps) {
  const base = "px-6 pt-4 pb-8 flex flex-col gap-3 md:flex-row md:justify-end md:gap-2";
  return <div className={className ? `${base} ${className}` : base}>{children}</div>;
}
