import { notFound } from "next/navigation";
import { EventCardPocClient } from "./EventCardPocClient";

/** Dev-only POC for EventCard V1 — hidden in production. */
export default function EventCardPocPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <EventCardPocClient />;
}
