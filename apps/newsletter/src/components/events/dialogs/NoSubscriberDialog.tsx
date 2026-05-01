"use client";

import { useId } from "react";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/dialog";

interface NoSubscriberDialogProps {
  open: boolean;
  onClose: () => void;
  /** Callback fired by the CTA — typically scrolls the homepage to the
   * newsletter SubscribeForm or focuses its email input. */
  onSubscribeClick: () => void;
}

/**
 * Shown when a user tries to register for an event with an email that
 * is NOT in `subscribers` (or is blocked/unsubscribed — anti-enumeration
 * collapses those into the same response).
 */
export function NoSubscriberDialog({ open, onClose, onSubscribeClick }: NoSubscriberDialogProps) {
  const titleId = useId();
  const descId = useId();

  return (
    <Dialog open={open} onClose={onClose} ariaLabelledBy={titleId} ariaDescribedBy={descId}>
      <DialogHeader id={titleId}>ISCRIVITI PRIMA ALLA NEWSLETTER</DialogHeader>
      <DialogContent id={descId}>
        <p className="mb-4">
          Per accedere alla lista delle date BlackSheep devi essere iscritto alla newsletter.
        </p>
        <p className="text-xs text-bs-cream/45">
          Iscriviti ora — è veloce. Riceverai un&rsquo;email di conferma e poi potrai entrare in
          lista.
        </p>
      </DialogContent>
      <DialogFooter>
        <button
          type="button"
          onClick={onSubscribeClick}
          className="min-h-[44px] px-6 py-3 bg-bs-cream text-[#0a0a0a] font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.15em] hover:opacity-90 transition-opacity"
        >
          Iscriviti alla newsletter
        </button>
      </DialogFooter>
    </Dialog>
  );
}
