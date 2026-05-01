"use client";

import { useId } from "react";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/dialog";
import { formatEventDate } from "@/lib/dates";

interface RegistrationSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  eventTitle: string;
  eventDate: string | Date;
  eventVenue?: string;
}

/**
 * Success dialog shown after /api/events/register returns
 * `{ status: "registered" }`. Confirms registration with event details
 * and reminds the user that a confirmation email is on the way.
 */
export function RegistrationSuccessDialog({
  open,
  onClose,
  eventTitle,
  eventDate,
  eventVenue,
}: RegistrationSuccessDialogProps) {
  const titleId = useId();
  const descId = useId();
  const formattedDate = formatEventDate(eventDate);

  return (
    <Dialog open={open} onClose={onClose} ariaLabelledBy={titleId} ariaDescribedBy={descId}>
      <DialogHeader id={titleId}>CI SEI</DialogHeader>
      <DialogContent id={descId}>
        <p className="mb-4">
          Sei in lista per <strong className="text-bs-cream">{eventTitle}</strong>.
        </p>
        {formattedDate ? (
          <p className="mb-2 font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.15em] text-bs-cream/65">
            {formattedDate}
          </p>
        ) : null}
        {eventVenue ? <p className="mb-4 text-xs text-bs-cream/45">{eventVenue}</p> : null}
        <p className="text-xs text-bs-cream/45">
          Riceverai un&rsquo;email di conferma e un promemoria il giorno dell&rsquo;evento.
        </p>
      </DialogContent>
      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] px-6 py-3 bg-bs-cream text-[#0a0a0a] font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.15em] hover:opacity-90 transition-opacity"
        >
          Chiudi
        </button>
      </DialogFooter>
    </Dialog>
  );
}
