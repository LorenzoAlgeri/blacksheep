"use client";

/** Dev-only POC for EventCard V1 — to be removed before deployment. */
import { EventCard, type EventCardData } from "@/components/events/EventCard";

const FAKE_EVENTS: EventCardData[] = [
  {
    id: "evt-1",
    slug: "monday-club-night-may",
    title: "BLACK SHEEP — MONDAY CLUB NIGHT",
    event_date: "2026-05-07T21:00:00+02:00",
    venue: "11 Clubroom · Corso Como · Milano",
    description:
      "Lineup top secret. Dress: dark / streetwear curato. Ingresso lista entro le 1:30.",
    capacity: null,
  },
  {
    id: "evt-2",
    slug: "june-residency",
    title: "RESIDENCY · JUNE",
    event_date: "2026-06-01T22:00:00+02:00",
    venue: "11 Clubroom · Corso Como · Milano",
    description: null,
    capacity: 150,
  },
  {
    id: "evt-3",
    slug: "summer-opening",
    title: "SUMMER OPENING",
    event_date: "2026-07-15T22:30:00+02:00",
    venue: "Tba · Milano",
    description:
      "Outdoor secret venue. Lineup announced 1 week prior. Single ticket-list, no resale.",
    capacity: 350,
  },
  {
    id: "evt-4",
    slug: "after-summer-late-night",
    title: "AFTER SUMMER · LATE NIGHT EXTENDED EDITION VOL.1",
    event_date: "2026-08-30T23:00:00+02:00",
    venue: "11 Clubroom · Corso Como · Milano",
    description:
      "Si torna in città dopo il rituale estivo. Dress code: cura, dark, monochrome. Ingresso fino a mezzanotte poi entrata libera senza priorità di lista.",
    capacity: 200,
  },
];

export default function EventCardPocPage() {
  return (
    <main className="relative z-10 min-h-screen px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <p className="font-[family-name:var(--font-brand)] text-[10px] tracking-[0.45em] text-bs-cream/30 uppercase mb-3">
          Dev preview · v1 editorial drama
        </p>
        <h1 className="font-[family-name:var(--font-brand)] text-2xl tracking-[0.04em] text-bs-cream uppercase mb-12">
          BlackSheep List
        </h1>
        <div className="flex flex-col gap-6 md:gap-8">
          {FAKE_EVENTS.map((e, i) => (
            <EventCard key={e.id} event={e} onRegisterClick={() => {}} index={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
