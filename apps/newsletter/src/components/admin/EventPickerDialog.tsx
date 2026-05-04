"use client";

import { useId } from "react";
import { Dialog } from "@/components/dialog/Dialog";
import { DialogHeader } from "@/components/dialog/DialogHeader";
import { DialogContent } from "@/components/dialog/DialogContent";
import { usePublishedEvents } from "@/hooks/usePublishedEvents";
// Re-export so existing consumers (EditorTab) keep their import path.
import type { PickableEvent } from "@/hooks/usePublishedEvents";
export type { PickableEvent };

interface EventPickerDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called with the selected event; dialog closes automatically after. */
  onSelect: (event: PickableEvent) => void;
}

/**
 * Modal dialog that lists published events and lets the editor pick one
 * to insert its registration deep-link URL into the email body.
 */
export function EventPickerDialog({ open, onClose, onSelect }: EventPickerDialogProps) {
  const headerId = useId();
  const { events, loading, error } = usePublishedEvents(open);

  function handleSelect(event: PickableEvent) {
    onSelect(event);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} ariaLabelledBy={headerId}>
      <DialogHeader id={headerId}>SELEZIONA EVENTO DA LINKARE</DialogHeader>

      <DialogContent className="pb-6">
        {loading && (
          <p
            role="status"
            aria-live="polite"
            className="text-center py-6 text-bs-cream/40 text-xs font-body"
          >
            Caricamento...
          </p>
        )}

        {error && (
          <p role="alert" className="text-center py-6 text-red-400 text-xs font-body">
            {error}
          </p>
        )}

        {!loading && !error && events.length === 0 && (
          <p className="text-center py-6 text-bs-cream/40 text-xs font-body leading-relaxed">
            Nessun evento pubblicato.
            <br />
            Creane uno prima dalla sezione <strong className="text-bs-cream/60">Eventi</strong>.
          </p>
        )}

        {!loading && !error && events.length > 0 && (
          <ul
            role="listbox"
            aria-label="Seleziona evento da linkare"
            className="flex flex-col gap-0.5 max-h-64 overflow-y-auto"
          >
            {events.map((event) => (
              <li key={event.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => handleSelect(event)}
                  className="w-full text-left px-3 py-2.5 rounded hover:bg-bs-cream/10 active:bg-bs-cream/15 transition-colors cursor-pointer min-h-[44px] flex flex-col justify-center"
                >
                  <span className="font-[family-name:var(--font-brand)] text-[11px] tracking-[0.12em] text-bs-cream block">
                    {event.title}
                  </span>
                  {event.event_date && (
                    <span className="font-body text-[10px] text-bs-cream/40 mt-0.5 block">
                      {new Date(event.event_date).toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        timeZone: "Europe/Rome",
                      })}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
