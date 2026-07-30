/**
 * Tally how many event registrations each subscriber has, across ALL events.
 *
 * Input is the raw `list_event_registrations` rows (one row = one subscriber
 * registered to one event; UNIQUE(event_id, subscriber_id) guarantees a row
 * counts a distinct event). The result maps subscriber_id -> total events.
 */
export type RegistrationCountRow = { subscriber_id: string | null };

export function tallyEventCounts(rows: RegistrationCountRow[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const id = row.subscriber_id;
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}
