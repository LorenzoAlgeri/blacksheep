"use client";

import { EventCard, type EventCardData } from "@/components/events/EventCard";

export type PreviewEventStatus = "draft" | "published" | "archived";

export interface EventPreviewClientProps {
  event: EventCardData;
  status: PreviewEventStatus;
}

const BANNER_CONFIG = {
  draft: {
    wrapperClass: "bg-bs-burgundy/20 border-b border-bs-burgundy/40",
    textClass: "text-bs-cream",
    dotClass: "bg-bs-burgundy",
    label: "ANTEPRIMA — questo evento NON è ancora visibile pubblicamente",
  },
  published: {
    wrapperClass: "bg-bs-green/20 border-b border-bs-green/40",
    textClass: "text-bs-green",
    dotClass: "bg-bs-green",
    label: "ANTEPRIMA — questo evento è già pubblico",
  },
  archived: {
    wrapperClass: "bg-bs-cream/[0.05] border-b border-bs-cream/10",
    textClass: "text-bs-cream/50",
    dotClass: "bg-bs-cream/30",
    label: "ANTEPRIMA — questo evento è archiviato",
  },
} satisfies Record<
  PreviewEventStatus,
  { wrapperClass: string; textClass: string; dotClass: string; label: string }
>;

/**
 * Client shell for the admin event preview page.
 * Renders the status banner (sticky) and the EventCard exactly as the
 * public homepage would, but with a no-op register handler.
 */
export function EventPreviewClient({ event, status }: EventPreviewClientProps) {
  const config = BANNER_CONFIG[status];

  return (
    <div>
      {/* Sticky preview banner — full-width via negative x-margins to escape main p-4 */}
      <div
        data-preview-status={status}
        className={`sticky top-0 z-10 -mx-4 px-4 py-2.5 ${config.wrapperClass}`}
      >
        <div className="mx-auto max-w-3xl flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={`shrink-0 w-1.5 h-1.5 rounded-full ${config.dotClass}`}
          />
          <p
            className={`font-[family-name:var(--font-brand)] text-[10px] tracking-[0.2em] uppercase ${config.textClass}`}
          >
            {config.label}
          </p>
        </div>
      </div>

      {/* Event card — identical to homepage rendering */}
      <div className="mx-auto max-w-3xl py-8">
        <EventCard event={event} onRegisterClick={() => {}} index={0} />
      </div>
    </div>
  );
}
