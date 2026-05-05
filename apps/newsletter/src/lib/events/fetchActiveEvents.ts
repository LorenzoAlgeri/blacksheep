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
 * `cache: "no-store"` opts the fetch out of Next.js Data Cache so updates
 * to events are reflected on every page request, consistent with the parent
 * page's `dynamic = "force-dynamic"`. If ISR is ever needed for production
 * performance, switch to `{ next: { revalidate: 60 } }` and call
 * `revalidatePath("/")` from the admin PATCH route.
 */
export async function fetchActiveEvents(
  opts: FetchActiveEventsOptions = {},
): Promise<EventCardData[]> {
  const baseUrl = opts.baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = `${baseUrl}/newsletter/api/events`;

  // `cache: "no-store"` opts out of Next.js Data Cache so every request hits
  // the API fresh — consistent with the parent page's `dynamic = "force-dynamic"`.
  const res = await fetch(url, { cache: "no-store" });

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
