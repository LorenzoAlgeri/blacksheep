# Design Spec: Event Auto-Subscribe, Registration Deadline, Attendance Tracking

**Date:** 2026-05-09
**Status:** Approved
**Scope:** 3 features for `apps/newsletter` (BLACK SHEEP List)

---

## Feature A: Auto-iscrizione newsletter dal form evento

### Problem

When a non-subscriber clicks "Entra in lista" on an event, the current flow shows `NoSubscriberDialog` with a static message and a CTA redirecting to the newsletter signup. The user must subscribe separately, confirm email, then come back and register again. This causes drop-off.

### Solution

Transform `NoSubscriberDialog` into an inline form that subscribes the user AND queues their event registration intent in one action. After double-opt-in confirmation, the event registration is completed automatically.

### Database

New migration `20260509000000_pending_event_intents.sql`:

```sql
CREATE TABLE public.pending_event_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.list_events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscriber_id, event_id)
);
ALTER TABLE public.pending_event_intents ENABLE ROW LEVEL SECURITY;
```

- `ON DELETE CASCADE` on both FKs: GDPR right-to-erasure (subscriber delete) and event cleanup.
- `UNIQUE (subscriber_id, event_id)`: prevents duplicate intents.
- RLS enabled, no policies (service role only).

### UI: NoSubscriberDialog inline form

The dialog currently in `src/components/events/dialogs/NoSubscriberDialog.tsx` is extended to render an inline form:

**Fields:**

- **Email** — pre-filled from the event registration form, read-only, displayed as text (not input)
- **Nome** — text input, optional (matches newsletter subscribe form)
- **Gender** — radio buttons: Donna / Uomo (required)
- **Privacy consent** — checkbox with link to privacy policy (required)
- **Honeypot** — hidden `website` field (`aria-hidden`, `tabIndex={-1}`)

**Validation:** Zod schema client-side. Gender required, consent required.

**CTA:** "Iscriviti e entra in lista" — single submit button with loading state.

**Success state:** After submit, dialog content changes to a message: "Ti abbiamo inviato un'email di conferma. Confermala per completare l'iscrizione all'evento."

### API: POST /api/events/register-and-subscribe

New endpoint, separate from existing `/api/events/register`.

**Request body:**

```typescript
z.object({
  eventId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().max(200).optional(),
  gender: z.enum(["male", "female"]),
  consentVersion: z.literal("v1.0"),
  website: z.string().optional(), // honeypot
});
```

**Flow:**

1. Origin check + rate limiting (same as `/api/subscribe`)
2. Honeypot: if `website` set, return 200 silently
3. Verify event exists, `status = 'published'`, deadline not passed
4. Upsert subscriber as `pending` (same logic as `/api/subscribe`: preserves token if exists, captures IP/UA/consent)
5. Insert into `pending_event_intents(subscriber_id, event_id)` — ON CONFLICT DO NOTHING
6. Send double-opt-in confirmation email (reuse `renderConfirmationEmail`)
7. Return `{ status: "pending_confirmation" }`

**Edge cases:**

- Subscriber already `confirmed`: skip upsert, directly register to event (same as normal flow), return `{ status: "registered" }`
- Subscriber `blocked`: return `{ status: "no_subscriber" }` (anti-enumeration)
- Subscriber `unsubscribed`: treat as new, upsert back to `pending`
- Event archived/draft: return 404

### Confirm endpoint extension: GET /api/confirm

After the existing `pending → confirmed` transition in `src/app/api/confirm/route.ts`:

1. Query `pending_event_intents` WHERE `subscriber_id = confirmed_subscriber.id`
2. For each intent:
   a. Load event, verify `status = 'published'` and deadline not passed
   b. Insert `list_event_registrations(event_id, subscriber_id, source='form')` — ON CONFLICT DO NOTHING
   c. Send event confirmation email (new template)
3. Delete all intents for this subscriber
4. Redirect to `/confirm?event=true` if any intent was processed, otherwise standard `/confirm`

If event is no longer valid (archived, deadline passed), the intent is silently discarded. Subscriber is still confirmed.

### Email template: event registration confirmed

New file `src/lib/emails/event-registration-confirmed.ts`:

- Subject: "Sei in lista! — {event_title}"
- Body: event name, date (formatted Rome timezone), venue
- Style: dark theme consistent with existing emails
- Unsubscribe link included

### State machine extension

In `useEventRegistration` hook, add handling for the response from the new endpoint:

- `pending_confirmation` → new state, shows success message in NoSubscriberDialog
- If subscriber was already confirmed → `registered` state (existing flow)

### Confirm page extension

`/confirm/page.tsx` reads `?event=true` query param:

- If present: shows additional line "Sei anche in lista per l'evento!"
- If multiple events were pending: generic "Sei in lista per gli eventi a cui ti eri iscritto!"

---

## Feature B: Scadenza iscrizioni evento

### Problem

Events have no registration cutoff. Admin needs to close registrations before the event date (e.g., for capacity planning, venue coordination).

### Solution

Optional `registration_deadline` column. If set and past, registrations are blocked client-side and server-side.

### Database

New migration `20260509000001_event_registration_deadline.sql`:

```sql
ALTER TABLE public.list_events
  ADD COLUMN registration_deadline timestamptz NULL;
```

- `NULL` = no deadline, registrations open until event happens.
- `TIMESTAMPTZ` for timezone-safe comparison (consistent with `event_date`).
- No index needed (read alongside event, never filtered standalone).

### Admin UI

In the event create/edit form:

- New field **"Chiusura iscrizioni"** — `<input type="datetime-local">` with timezone display "(ora italiana)"
- Optional: clearing the field sets it to NULL
- Validation: if set, must be before `event_date` (refine in Zod schema)

**Zod schema extension** (`adminEventSchema`):

```typescript
registration_deadline: z.string().datetime().optional().nullable(),
```

With refine: `registration_deadline` must be before `event_date` if both present.

### Public UI: EventCard

`EventCard.tsx` receives `registration_deadline` in `EventCardData`:

- `deadline === null` → normal CTA ("Entra in lista")
- `deadline > now()` → normal CTA + small badge "Entro il DD/MM"
- `deadline <= now()` → CTA button disabled, text "Iscrizioni chiuse", muted styling

No live timer — server rejects anyway if deadline passes between render and submit.

### Server-side validation

In both `/api/events/register` and `/api/events/register-and-subscribe`:

After verifying event is `published`:

```typescript
if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
  return NextResponse.json({ error: "Iscrizioni chiuse" }, { status: 403 });
}
```

Same check in `/api/confirm` when processing `pending_event_intents`: if deadline passed, discard intent silently (subscriber still confirmed, event registration skipped).

### EventCardData type extension

```typescript
interface EventCardData {
  // ... existing fields
  registration_deadline: string | null;
}
```

---

## Feature C: Admin presenze evento

### Problem

Admin has no way to track who actually showed up at an event. No attendance data means no insight into conversion (registered vs. attended).

### Solution

New `event_attendance` table, toggle API, admin dashboard with search/filter, and Excel export.

### Database

New migration `20260509000002_event_attendance.sql`:

```sql
CREATE TABLE public.event_attendance (
  event_id uuid NOT NULL REFERENCES public.list_events(id) ON DELETE RESTRICT,
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  attended_at timestamptz NOT NULL DEFAULT now(),
  marked_by text,
  PRIMARY KEY (event_id, subscriber_id)
);

ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

CREATE INDEX event_attendance_event_idx ON public.event_attendance (event_id);
```

- Composite PK: one attendance record per subscriber per event.
- `marked_by`: admin email who toggled attendance (audit trail).
- `ON DELETE RESTRICT` for events (preserve attendance records).
- `ON DELETE CASCADE` for subscribers (GDPR).

### API: POST /api/admin/events/[id]/attendance

**Request body:**

```typescript
z.object({
  subscriberId: z.string().uuid(),
});
```

**Behavior (toggle):**

- Query `event_attendance` for `(event_id, subscriber_id)`
- If exists → DELETE, return `{ attended: false }`
- If not exists → INSERT with `marked_by = session.user.email`, return `{ attended: true, attended_at }`

**Auth:** Admin session required (same as other admin endpoints).

### API extension: GET /api/admin/events/[id]/registrations

Extended response shape:

```typescript
{
  registrations: [{
    id: string,
    registered_at: string,
    source: string,
    attended: boolean,       // NEW
    attended_at: string | null, // NEW
    subscriber: {
      id: string,
      email: string,
      name: string | null,
      status: string,
      gender: string | null,
    }
  }],
  total: number,
  attendedCount: number,  // NEW
  page: number,
  pageSize: number,
}
```

New query param: `filter=all|attended|not_attended` (default: `all`).

### Admin UI: registrations page extension

`src/app/admin/(dashboard)/events/[id]/registrations/page.tsx`:

**Layout (mobile-first):**

- **Header:** event title + counters "42 iscritti · 28 presenti"
- **Search box:** text input, debounce 300ms, filters by email or name (server-side query)
- **Filter tabs:** Tutti | Presenti | Assenti
- **Registration list:** card-style rows, each showing:
  - Name + email (or just email if no name)
  - Gender badge (small pill)
  - Toggle button: filled green checkmark if attended, outline if not
  - Touch target ≥ 44px on all interactive elements
- **Export button:** "Esporta Excel" — downloads .xlsx

**Optimistic UI:** Toggle button updates immediately, reverts on API error.

### Export: GET /api/admin/events/[id]/registrations/export.xlsx

New endpoint alongside existing CSV export.

**Library:** `exceljs` (MIT license, mature, streaming support).

**Columns:**
| Email | Nome | Gender | Iscritto il | Fonte | Presente | Presente alle |
|-------|------|--------|-------------|-------|----------|---------------|

**Features:**

- Auto-filter on header row
- Summary row at bottom: `Iscritti: {total} | Presenti: {attended_count}`
- Content-Disposition: `attachment; filename="evento-{slug}-presenze.xlsx"`
- Formula injection prevention: same escaping as CSV export

**Package:** `exceljs` added as dependency to `apps/newsletter`.

### Subscriber counters (cross-event)

Aggregate counts computed on-demand via JOIN query, not materialized:

```sql
SELECT
  s.id, s.email, s.name,
  COUNT(DISTINCT r.event_id) AS iscrizioni_count,
  COUNT(DISTINCT a.event_id) AS presenze_count
FROM subscribers s
LEFT JOIN list_event_registrations r ON r.subscriber_id = s.id
LEFT JOIN event_attendance a ON a.subscriber_id = s.id
GROUP BY s.id
```

Exposed in the Excel export per-row. Not surfaced in the admin UI registrations page (per-event view doesn't need cross-event counters).

---

## Security considerations

- **Anti-enumeration:** The new `register-and-subscribe` endpoint returns identical responses for blocked/missing subscribers.
- **Rate limiting:** Applied to the new endpoint (same limiter as `/api/subscribe`).
- **Honeypot:** Present in the NoSubscriberDialog form.
- **GDPR:** All new tables use `ON DELETE CASCADE` on `subscriber_id`. Consent version captured.
- **CSRF:** All POST endpoints validate origin.
- **Admin auth:** All `/api/admin/*` endpoints require NextAuth session.
- **Input validation:** Zod schemas on all endpoints.
- **Formula injection:** Excel export applies same escaping as CSV export.

## Files changed (summary)

### New files

- `supabase/migrations/20260509000000_pending_event_intents.sql`
- `supabase/migrations/20260509000001_event_registration_deadline.sql`
- `supabase/migrations/20260509000002_event_attendance.sql`
- `src/app/api/events/register-and-subscribe/route.ts`
- `src/app/api/admin/events/[id]/attendance/route.ts`
- `src/app/api/admin/events/[id]/registrations/export.xlsx/route.ts`
- `src/lib/emails/event-registration-confirmed.ts`

### Modified files

- `src/components/events/dialogs/NoSubscriberDialog.tsx` — inline form
- `src/hooks/useEventRegistration.ts` — new state `pending_subscription`
- `src/components/events/EventRegistrationFlow.tsx` — handle new state
- `src/app/api/confirm/route.ts` — process pending intents after confirmation
- `src/app/confirm/page.tsx` — event confirmation message
- `src/components/events/EventCard.tsx` — deadline display + disabled CTA
- `src/app/admin/(dashboard)/events/` — deadline field in create/edit form
- `src/app/admin/(dashboard)/events/[id]/registrations/page.tsx` — search, filter, attendance toggle
- `src/lib/validations.ts` — extended schemas
- `src/app/api/events/register/route.ts` — deadline validation
- `apps/newsletter/package.json` — add `exceljs` dependency

### Not modified (explicitly preserved)

- `src/lib/email-campaign.ts` — production fix, do not touch
- `src/lib/emails/event-cta-button.ts` — production fix, do not touch
- `src/components/dialog/DialogHeader.tsx` — mobile keyboard fix, do not touch
