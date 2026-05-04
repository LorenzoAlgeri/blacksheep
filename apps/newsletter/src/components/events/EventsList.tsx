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
      <header className="sticky top-6 md:top-8 z-10 mb-10 md:mb-14">
        <p className="font-[family-name:var(--font-brand)] text-xs tracking-[0.5em] text-bs-cream/40 uppercase mb-3">
          La lista
        </p>
        <h2
          id={HEADING_ID}
          className="font-[family-name:var(--font-brand)] text-4xl md:text-5xl tracking-[0.02em] text-bs-cream uppercase leading-[0.95]"
        >
          BLACKSHEEP LIST
        </h2>
      </header>

      {isEmpty ? (
        <div className="border border-bs-cream/[0.08] bg-bs-cream/[0.025] px-7 py-12 md:px-10 md:py-16">
          <p className="font-[family-name:var(--font-brand)] text-sm tracking-[0.25em] uppercase text-bs-cream/45">
            Nessun evento in lista
          </p>
          <p className="font-body text-sm leading-relaxed text-bs-cream/35 mt-4 max-w-[40ch]">
            Torna presto. Le prossime serate vengono annunciate qui per primi.
          </p>
        </div>
      ) : (
        <EventsListItems events={events} />
      )}
    </section>
  );
}
