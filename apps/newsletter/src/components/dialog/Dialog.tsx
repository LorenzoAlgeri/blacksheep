"use client";

import { useEffect, useRef, type ReactNode, type SyntheticEvent } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** ID of the heading element used as accessible name (h2 in DialogHeader). */
  ariaLabelledBy?: string;
  /** ID of the descriptive paragraph announced after the title. */
  ariaDescribedBy?: string;
  /** Extra Tailwind classes appended to the brand-default styling. */
  className?: string;
}

/**
 * BrandedDialog primitive for BlackSheep List.
 *
 * Built on the native HTML `<dialog>` element. Calling `showModal()` gives us
 * focus trap, ESC handling, and the `::backdrop` pseudo-element for free —
 * no custom focus-trap or escape-key hooks needed.
 *
 * Behavioral contract:
 *  - `open=true` → showModal() (focus moves into the dialog, page is inert)
 *  - `open=false` → close() (only if currently open)
 *  - ESC key → React `onCancel` handler runs, calls preventDefault() + onClose
 *    (so React state stays the source of truth — without preventDefault the
 *    browser closes the dialog and our state would still say `open=true`)
 *  - Click on the dialog element itself (not its children) → onClose
 *    (the bubbled click event target equals the dialog ref when the user
 *    clicked the backdrop region)
 */
export function Dialog({
  open,
  onClose,
  children,
  ariaLabelledBy,
  ariaDescribedBy,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onClose();
  };

  const handleClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === ref.current) {
      onClose();
    }
  };

  const baseClass =
    "max-w-md w-full bg-[#0a0a0a] text-bs-cream border border-[rgba(255,255,243,0.08)] p-0 m-auto rounded-lg open:flex open:flex-col";

  return (
    <dialog
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      onCancel={handleCancel}
      onClick={handleClick}
      className={className ? `${baseClass} ${className}` : baseClass}
    >
      {children}
    </dialog>
  );
}
