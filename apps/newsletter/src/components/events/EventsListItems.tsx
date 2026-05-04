"use client";

import { EventCard, type EventCardData } from "./EventCard";

interface EventsListItemsProps {
  events: EventCardData[];
}

/**
 * Client-side wrapper that owns the click handler bridging EventCard
 * (a Client Component requiring a function prop) and EventsList (a
 * Server Component that cannot pass functions down).
 *
 * Phase 6B: handler is a no-op stub — registration dialog wiring lands
 * in Phase 6C, which will replace this body with the real flow
 * (open dialog, dispatch action, etc.).
 */
export function EventsListItems({ events }: EventsListItemsProps) {
  const handleRegisterClick = (_event: EventCardData) => {
    // Phase 6C will wire the registration dialog here.
  };

  return (
    <ol className="flex flex-col gap-6 md:gap-8 list-none p-0">
      {events.map((event, index) => (
        <li key={event.id}>
          <EventCard event={event} index={index} onRegisterClick={handleRegisterClick} />
        </li>
      ))}
    </ol>
  );
}
