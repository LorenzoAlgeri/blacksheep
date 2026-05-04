"use client";

import { useState } from "react";
import { EventCard, type EventCardData } from "./EventCard";
import { EventRegistrationFlow } from "./EventRegistrationFlow";

interface EventsListItemsProps {
  events: EventCardData[];
}

export function EventsListItems({ events }: EventsListItemsProps) {
  const [activeEvent, setActiveEvent] = useState<EventCardData | null>(null);

  function handleSubscribeClick() {
    setActiveEvent(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <ol className="flex flex-col gap-6 md:gap-8 list-none p-0">
        {events.map((event, index) => (
          <li key={event.id}>
            <EventCard event={event} index={index} onRegisterClick={setActiveEvent} />
          </li>
        ))}
      </ol>
      {activeEvent && (
        <EventRegistrationFlow
          event={activeEvent}
          onClose={() => setActiveEvent(null)}
          onSubscribeClick={handleSubscribeClick}
        />
      )}
    </>
  );
}
