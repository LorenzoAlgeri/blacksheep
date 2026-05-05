"use client";

import { useId } from "react";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/dialog";
import { formatEventDate } from "@/lib/dates";

interface AlreadyRegisteredDialogProps {
  open: boolean;
  onClose: () => void;
  eventTitle: string;
  eventDate: string | Date;
}

/**
 * Shown when /api/events/register returns `status: "already_registered"`
 * (UNIQUE violation 23505 on list_event_registrations).
 *
 * Reuses formatEventDate from lib/dates so the rendering is identical to
 * RegistrationSuccessDialog and EventCard.
 */
export function AlreadyRegisteredDialog({
  open,
  onClose,
  eventTitle,
  eventDate,
}: AlreadyRegisteredDialogProps) {
  const titleId = useId();
  const descId = useId();
  const formatted = formatEventDate(eventDate);

  return (
    <Dialog open={open} onClose={onClose} ariaLabelledBy={titleId} ariaDescribedBy={descId}>
      <DialogHeader id={titleId}>SEI GIÀ DENTRO</DialogHeader>
      <DialogContent id={descId}>
        <p className="mb-4">
          Sei già iscritto alla lista di <strong className="text-bs-cream">{eventTitle}</strong>
          {formatted ? <> il {formatted}</> : null}.
        </p>
        <p className="text-xs text-bs-cream/60">Ci vediamo lì.</p>
      </DialogContent>
      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] px-6 py-3 bg-bs-cream text-[#0a0a0a] font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.15em] rounded-md hover:opacity-90 transition-opacity"
        >
          Chiudi
        </button>
      </DialogFooter>
    </Dialog>
  );
}
