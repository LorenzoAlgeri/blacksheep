import type { EventCardData } from "@/components/events/EventCard";

interface FetchActiveEventsOptions {
  /** Override base URL — primarily for tests. Production uses NEXT_PUBLIC_SITE_URL. */
  baseUrl?: string;
}

/**
 * Server-side fetcher for the public events list.
 *
 * Calls the gated `/api/events` endpoint over HTTP so the BLACKSHEEP_LIST_ENABLED
 * flag and Supabase access stay encapsulated server-side. Throws on any non-2xx,
 * malformed payload, or transport error — Server Component error boundaries
 * (`error.tsx`) catch and render the fallback.
 *
 * `next: { revalidate: 60 }` opts the fetch into Next.js ISR cache so the list
 * regenerates at most once per minute under static rendering. Pages with
 * `dynamic = "force-dynamic"` bypass the cache and refetch on every request,
 * which is also acceptable behaviour for this surface.
 */
export async function fetchActiveEvents(
  opts: FetchActiveEventsOptions = {},
): Promise<EventCardData[]> {
  const baseUrl = opts.baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/newsletter/api/events`;

  const res = await fetch(url, { next: { revalidate: 60 } });

  if (!res.ok) {
    throw new Error(`fetchActiveEvents: API responded ${res.status}`);
  }

  const data: unknown = await res.json();
  if (
    !data ||
    typeof data !== "object" ||
    !("events" in data) ||
    !Array.isArray((data as { events: unknown }).events)
  ) {
    throw new Error("fetchActiveEvents: malformed payload");
  }

  return (data as { events: EventCardData[] }).events;
}
