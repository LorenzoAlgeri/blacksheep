import type { EventCardData } from "./EventCard";
import { EventsListItems } from "./EventsListItems";

interface EventsListProps {
  events: EventCardData[];
}

const HEADING_ID = "bs-list-heading";

/**
 * BlackSheep List section — server-rendered shell that hosts the
 * editorial heading and the events grid.
 *
 * Composition:
 *  - <section role="region" aria-labelledby> for SR landmark
 *  - <h2> as section title (page-level <h1> sits on the brand hero)
 *  - <ol> + <li> for the cards (wrapped in EventsListItems client child
 *    so EventCard can receive its click handler)
 *  - Empty state: editorial copy that holds the same negative space
 *    as the populated list, kept inside the same labelled section
 *
 * Stays a Server Component: no state, no effects, no client-only APIs.
 * The interactivity is delegated to EventsListItems (Client).
 */
export function EventsList({ events }: EventsListProps) {
  const isEmpty = events.length === 0;

  return (
    <section
      aria-labelledby={HEADING_ID}
      className="w-full max-w-3xl mx-auto px-6 min-h-dvh pt-12 md:pt-16 pb-24"
      data-bs-list-section
    >
      <header className="sticky top-0 z-10 mb-10 md:mb-14 bg-[#03124a] pt-6 md:pt-8 pb-4">
        <p className="font-[family-name:var(--font-brand)] text-xs tracking-[0.5em] text-bs-cream/40 uppercase mb-3">
          La lista
        </p>
        <h2
          id={HEADING_ID}
          className="font-[family-name:var(--font-brand)] text-4xl md:text-5xl tracking-[0.02em] text-bs-cream uppercase leading-[0.95] [text-wrap:balance]"
        >
          BLACKSHEEP LIST
        </h2>
      </header>

      {isEmpty ? (
        <div className="animate-fade-in-up border border-bs-cream/[0.08] bg-[linear-gradient(180deg,rgba(255,255,243,0.045),rgba(255,255,243,0.018))] px-7 py-12 md:px-10 md:py-16">
          {/* Editorial counter overline matching the populated cards —
              keeps the empty state in the same visual register as a
              real EventCard instead of dropping into a generic
              "nothing to see here" panel. */}
          <p className="mb-4 font-[family-name:var(--font-brand)] text-[10px] tracking-[0.42em] uppercase text-bs-cream/30">
            00 / prossima uscita
          </p>
          <p className="font-[family-name:var(--font-brand)] text-sm tracking-[0.25em] uppercase text-bs-cream/45">
            Nessun evento in lista
          </p>
          <p className="font-body text-sm leading-relaxed text-bs-cream/40 mt-4 max-w-[44ch] [text-wrap:pretty]">
            Torna presto. Le prossime serate vengono annunciate qui per primi.
          </p>
        </div>
      ) : (
        <EventsListItems events={events} />
      )}
    </section>
  );
}
