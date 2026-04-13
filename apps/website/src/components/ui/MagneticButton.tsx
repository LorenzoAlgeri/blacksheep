"use client";

import { type ReactNode } from "react";
import { useMagnetic } from "@/hooks/useMagnetic";

interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  fullWidth?: boolean;
}

/**
 * Wrapper that adds a magnetic hover effect to CTA buttons.
 * The button subtly follows the cursor (max 8px), then springs back on leave.
 * Disabled on touch devices and with prefers-reduced-motion.
 */
export function MagneticButton({
  children,
  className = "",
  href,
  type,
  onClick,
  fullWidth = false,
}: MagneticButtonProps) {
  const { ref, onMouseMove, onMouseLeave } = useMagnetic<HTMLDivElement>();

  const inner = href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <button type={type ?? "button"} onClick={onClick} className={className}>
      {children}
    </button>
  );

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={fullWidth ? "block" : "inline-block"}
    >
      {inner}
    </div>
  );
}
