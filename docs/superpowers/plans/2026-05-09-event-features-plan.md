# Event Auto-Subscribe, Deadline, Attendance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 features to the BLACK SHEEP List event system: (A) auto-subscribe + event registration in one flow, (B) registration deadline per event, (C) admin attendance tracking with Excel export.

**Architecture:** Feature A adds a `pending_event_intents` table and a new `/api/events/register-and-subscribe` endpoint; the existing `/api/confirm` endpoint is extended to process pending intents after email confirmation. Feature B adds an optional `registration_deadline` column to `list_events` with client and server validation. Feature C adds an `event_attendance` table with toggle API, admin UI search/filter, and `.xlsx` export via `exceljs`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Supabase (Postgres), Resend, React Hook Form + Zod v4, exceljs, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-09-event-features-design.md`

**IMPORTANT — files NOT to modify:**

- `src/lib/email-campaign.ts` — production fix, do not touch
- `src/lib/emails/event-cta-button.ts` — production fix, do not touch
- `src/components/dialog/DialogHeader.tsx` — mobile keyboard fix, do not touch

**IMPORTANT — Next.js 16 note:** This project uses Next.js 16+ which has breaking changes. Before writing any code that touches Next.js APIs (route handlers, page components, middleware), read the relevant guide in `node_modules/next/dist/docs/` as noted in `apps/newsletter/AGENTS.md`.

---

## Task 1: Database Migrations

**Files:**

- Create: `apps/newsletter/supabase/migrations/20260509000000_pending_event_intents.sql`
- Create: `apps/newsletter/supabase/migrations/20260509000001_event_registration_deadline.sql`
- Create: `apps/newsletter/supabase/migrations/20260509000002_event_attendance.sql`

All 3 migrations in one task — they're independent DDL with no test coverage needed.

- [ ] **Step 1: Create pending_event_intents migration**

```sql
-- 20260509000000_pending_event_intents.sql
-- Stores the intent "subscriber X wants to register for event Y" while
-- the subscriber's email is still pending double-opt-in confirmation.
-- Processed by GET /api/confirm after status flips to 'confirmed'.

CREATE TABLE public.pending_event_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.list_events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subscriber_id, event_id)
);

ALTER TABLE public.pending_event_intents ENABLE ROW LEVEL SECURITY;

CREATE INDEX pending_event_intents_subscriber_idx
  ON public.pending_event_intents (subscriber_id);
```

- [ ] **Step 2: Create registration_deadline migration**

```sql
-- 20260509000001_event_registration_deadline.sql
-- Optional deadline for event registrations. NULL means no deadline.

ALTER TABLE public.list_events
  ADD COLUMN registration_deadline timestamptz NULL;
```

- [ ] **Step 3: Create event_attendance migration**

```sql
-- 20260509000002_event_attendance.sql
-- Tracks which registered subscribers actually showed up at the event.
-- Toggle: INSERT to mark present, DELETE to unmark.

CREATE TABLE public.event_attendance (
  event_id uuid NOT NULL REFERENCES public.list_events(id) ON DELETE RESTRICT,
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  attended_at timestamptz NOT NULL DEFAULT now(),
  marked_by text,
  PRIMARY KEY (event_id, subscriber_id)
);

ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;

CREATE INDEX event_attendance_event_idx
  ON public.event_attendance (event_id);
```

- [ ] **Step 4: Run migrations against local Supabase**

```powershell
docker exec -i blacksheep-supabase-db-1 psql -U postgres -d postgres < apps/newsletter/supabase/migrations/20260509000000_pending_event_intents.sql
docker exec -i blacksheep-supabase-db-1 psql -U postgres -d postgres < apps/newsletter/supabase/migrations/20260509000001_event_registration_deadline.sql
docker exec -i blacksheep-supabase-db-1 psql -U postgres -d postgres < apps/newsletter/supabase/migrations/20260509000002_event_attendance.sql
```

Expected: Each returns without error.

- [ ] **Step 5: Commit**

```powershell
git add apps/newsletter/supabase/migrations/20260509000000_pending_event_intents.sql apps/newsletter/supabase/migrations/20260509000001_event_registration_deadline.sql apps/newsletter/supabase/migrations/20260509000002_event_attendance.sql
git commit -m "feat(db): add pending_event_intents, registration_deadline, event_attendance"
```

---

## Task 2: Validation Schema + Rate Limiter for Register-and-Subscribe

**Files:**

- Modify: `apps/newsletter/src/lib/validations.ts`
- Modify: `apps/newsletter/src/lib/rate-limit.ts`

- [ ] **Step 1: Add registerAndSubscribeSchema to validations.ts**

Add after the `eventRegisterSchema` block (after line 70):

```typescript
/**
 * /api/events/register-and-subscribe — combined newsletter subscription +
 * event registration for non-subscribers. Creates a pending subscriber and
 * queues an event intent processed after double-opt-in confirmation.
 */
export const registerAndSubscribeSchema = z.object({
  eventId: z.uuid("ID evento non valido"),
  email: z.email("Inserisci un'email valida"),
  name: z.string().max(200).optional(),
  gender: genderSchema,
  consentVersion: z.literal("v1.0"),
  website: z.string().optional(), // honeypot
});

export type RegisterAndSubscribeInput = z.infer<typeof registerAndSubscribeSchema>;
```

- [ ] **Step 2: Add registration_deadline to adminEventSchema**

Replace the existing `adminEventSchema` (lines 98-110) with:

```typescript
export const adminEventSchema = z
  .object({
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve essere lowercase con trattini")
      .min(3, "Slug troppo corto")
      .max(80, "Slug troppo lungo"),
    title: z.string().min(1, "Titolo obbligatorio").max(200, "Titolo troppo lungo"),
    event_date: z.iso.datetime({ message: "Data evento non valida (richiesto formato ISO 8601)" }),
    venue: z.string().min(1, "Venue obbligatorio").max(200, "Venue troppo lungo"),
    description: z.string().max(5000, "Descrizione troppo lunga").optional().nullable(),
    capacity: z.number().int().positive().optional().nullable(),
    status: z.enum(["draft", "published", "archived"]).default("draft"),
    registration_deadline: z.iso
      .datetime({ message: "Data chiusura non valida (richiesto formato ISO 8601)" })
      .optional()
      .nullable(),
  })
  .refine(
    (d) => {
      if (!d.registration_deadline) return true;
      return new Date(d.registration_deadline) < new Date(d.event_date);
    },
    {
      message: "La chiusura iscrizioni deve essere prima della data evento",
      path: ["registration_deadline"],
    },
  );
```

- [ ] **Step 3: Add rate limiter for register-and-subscribe to rate-limit.ts**

Add after the existing `rateLimitEventRegister` definition:

```typescript
export const rateLimitRegisterAndSubscribe = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 3,
});
```

- [ ] **Step 4: Verify types compile**

```powershell
npx tsc --noEmit -p apps/newsletter/tsconfig.json
```

Expected: No errors.

- [ ] **Step 5: Commit**

```powershell
git add apps/newsletter/src/lib/validations.ts apps/newsletter/src/lib/rate-limit.ts
git commit -m "feat: add registerAndSubscribeSchema, registration_deadline to adminEventSchema, rate limiter"
```

---

## Task 3: API — POST /api/events/register-and-subscribe

**Files:**

- Create: `apps/newsletter/src/app/api/events/register-and-subscribe/route.ts`
- Create: `apps/newsletter/src/app/api/events/register-and-subscribe/route.test.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/newsletter/src/app/api/events/register-and-subscribe/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock dependencies before imports
vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(),
}));
vi.mock("@/lib/resend", () => ({
  getResend: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimitRegisterAndSubscribe: vi.fn(() => true),
}));
vi.mock("@/lib/origin-check", () => ({
  isAllowedOrigin: vi.fn(() => true),
}));
vi.mock("@/lib/client-ip", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
  getUserAgent: vi.fn(() => "test-agent"),
}));
vi.mock("@/lib/emails/confirmation", () => ({
  renderConfirmationEmail: vi.fn(() => "<html>confirm</html>"),
}));
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { POST } from "./route";
import { getSupabase } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { rateLimitRegisterAndSubscribe } from "@/lib/rate-limit";
import { isAllowedOrigin } from "@/lib/origin-check";

const VALID_BODY = {
  eventId: "11111111-1111-1111-1111-111111111111",
  email: "test@example.com",
  name: "Mario",
  gender: "male" as const,
  consentVersion: "v1.0" as const,
};

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/events/register-and-subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockSupabase(overrides: Record<string, unknown> = {}) {
  const mock = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    ...overrides,
  };
  vi.mocked(getSupabase).mockReturnValue(mock as never);
  return mock;
}

function mockResend() {
  const send = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(getResend).mockReturnValue({ emails: { send } } as never);
  return send;
}

describe("POST /api/events/register-and-subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.BLACKSHEEP_LIST_ENABLED = "true";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  });

  it("returns 404 when BLACKSHEEP_LIST_ENABLED is not true", async () => {
    process.env.BLACKSHEEP_LIST_ENABLED = "false";
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("returns 403 when origin is not allowed", async () => {
    vi.mocked(isAllowedOrigin).mockReturnValue(false);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(rateLimitRegisterAndSubscribe).mockReturnValue(false);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid body", async () => {
    mockSupabase();
    const res = await POST(makeRequest({ email: "not-valid" }));
    expect(res.status).toBe(400);
  });

  it("silently accepts honeypot submissions", async () => {
    mockSupabase();
    const res = await POST(makeRequest({ ...VALID_BODY, website: "spam.com" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.status).toBe("pending_confirmation");
  });

  it("returns 404 when event not found", async () => {
    const mock = mockSupabase();
    // event lookup returns null
    mock.from.mockImplementation((table: string) => {
      if (table === "list_events") {
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
          }),
        };
      }
      return mock;
    });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(404);
  });

  it("returns pending_confirmation for new subscriber", async () => {
    const upsertSelect = vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: { id: "sub-1", token: "tok-1" },
        error: null,
      }),
    });
    const mock = mockSupabase();
    const sendEmail = mockResend();

    // Chain: from → select/upsert/insert → eq → single/maybeSingle
    mock.from.mockImplementation((table: string) => {
      if (table === "list_events") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: VALID_BODY.eventId,
                    title: "Test",
                    event_date: "2026-12-01T22:00:00Z",
                    venue: "Club",
                    status: "published",
                    registration_deadline: null,
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "subscribers") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
          upsert: () => ({ select: () => upsertSelect }),
        };
      }
      if (table === "pending_event_intents") {
        return {
          insert: () => Promise.resolve({ error: null }),
        };
      }
      if (table === "site_config") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { tagline: "EVERY MONDAY", venue: "11 Clubroom" },
                  error: null,
                }),
            }),
          }),
        };
      }
      return mock;
    });

    const res = await POST(makeRequest(VALID_BODY));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("pending_confirmation");
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("returns no_subscriber for blocked subscriber", async () => {
    const mock = mockSupabase();

    mock.from.mockImplementation((table: string) => {
      if (table === "list_events") {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: VALID_BODY.eventId,
                    status: "published",
                    registration_deadline: null,
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === "subscribers") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { id: "sub-blocked", status: "blocked" },
                  error: null,
                }),
            }),
          }),
        };
      }
      return mock;
    });

    const res = await POST(makeRequest(VALID_BODY));
    const json = await res.json();
    expect(json.status).toBe("no_subscriber");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```powershell
npx vitest run apps/newsletter/src/app/api/events/register-and-subscribe/route.test.ts
```

Expected: FAIL — module `./route` not found.

- [ ] **Step 3: Write the route implementation**

Create `apps/newsletter/src/app/api/events/register-and-subscribe/route.ts`:

```typescript
import { NextRequest } from "next/server";
import { registerAndSubscribeSchema } from "@/lib/validations";
import { getSupabase } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { rateLimitRegisterAndSubscribe } from "@/lib/rate-limit";
import { isAllowedOrigin } from "@/lib/origin-check";
import { getClientIp, getUserAgent } from "@/lib/client-ip";
import { renderConfirmationEmail } from "@/lib/emails/confirmation";
import { renderEventRegistrationEmail } from "@/lib/emails/event-registration";

export async function POST(request: NextRequest) {
  if (process.env.BLACKSHEEP_LIST_ENABLED !== "true") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!isAllowedOrigin(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  if (!rateLimitRegisterAndSubscribe(ip)) {
    return Response.json({ error: "Troppi tentativi. Riprova tra un minuto." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const parsed = registerAndSubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi." }, { status: 400 });
  }

  if (parsed.data.website) {
    return Response.json({ status: "pending_confirmation" });
  }

  const supabase = getSupabase();
  const userAgent = getUserAgent(request);
  const email = parsed.data.email.toLowerCase();
  const { eventId, name, gender } = parsed.data;

  // 1. Lookup event — must exist, be published, and have open registrations
  const { data: event, error: eventError } = await supabase
    .from("list_events")
    .select("id, title, event_date, venue, description, status, registration_deadline")
    .eq("id", eventId)
    .single();

  if (eventError || !event || event.status !== "published") {
    return Response.json({ error: "Evento non disponibile" }, { status: 404 });
  }

  if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
    return Response.json({ error: "Iscrizioni chiuse" }, { status: 403 });
  }

  // 2. Lookup existing subscriber
  const { data: existing, error: subError } = await supabase
    .from("subscribers")
    .select("id, name, status, token, gender")
    .eq("email", email)
    .maybeSingle();

  if (subError) {
    console.error("[REG_AND_SUB] Subscriber lookup error:", subError.message);
    return Response.json({ error: "Errore interno." }, { status: 500 });
  }

  // 3. Branch on subscriber state
  if (existing?.status === "blocked") {
    return Response.json({ status: "no_subscriber" });
  }

  // Already confirmed — register directly to event
  if (existing?.status === "confirmed") {
    // Check gender
    if (!existing.gender) {
      return Response.json({ status: "gender_required" });
    }

    const { error: insertError } = await supabase.from("list_event_registrations").insert({
      event_id: event.id,
      subscriber_id: existing.id,
      source: "form",
      ip,
      user_agent: userAgent,
      consent_version: "1.0",
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return Response.json({
          status: "already_registered",
          eventTitle: event.title,
          eventDate: event.event_date,
        });
      }
      console.error("[REG_AND_SUB] Insert error:", insertError.message);
      return Response.json({ error: "Errore interno." }, { status: 500 });
    }

    // Send event confirmation email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${existing.token}`;
    await getResend()
      .emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "BLACK SHEEP <noreply@blacksheep.community>",
        replyTo: process.env.REPLY_TO_EMAIL ?? undefined,
        to: email,
        subject: `Sei in lista — ${event.title}`,
        html: renderEventRegistrationEmail({
          name: existing.name ?? undefined,
          eventTitle: event.title,
          eventDate: event.event_date,
          eventVenue: event.venue,
          eventDescription: event.description,
          unsubscribeUrl,
          siteUrl,
        }),
      })
      .catch((err) => console.error("[REG_AND_SUB] Resend error:", err));

    return Response.json({
      status: "registered",
      eventTitle: event.title,
      eventDate: event.event_date,
    });
  }

  // 4. New or unsubscribed subscriber — upsert as pending + create intent
  const { data: subscriber, error: dbError } = await supabase
    .from("subscribers")
    .upsert(
      {
        email,
        name,
        gender,
        status: "pending",
        subscribed_ip: ip,
        subscribed_user_agent: userAgent,
        consent_version: "1.0",
      },
      { onConflict: "email" },
    )
    .select("id, token")
    .single();

  if (dbError || !subscriber) {
    console.error("[REG_AND_SUB] Upsert error:", dbError?.message);
    return Response.json({ error: "Errore interno." }, { status: 500 });
  }

  // Queue event intent
  const { error: intentError } = await supabase.from("pending_event_intents").insert({
    subscriber_id: subscriber.id,
    event_id: event.id,
  });

  if (intentError && intentError.code !== "23505") {
    console.error("[REG_AND_SUB] Intent insert error:", intentError.message);
  }

  // Send double-opt-in confirmation email
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const confirmUrl = `${siteUrl}/api/confirm?token=${subscriber.token}`;
  const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${subscriber.token}`;

  let tagline = "EVERY MONDAY";
  let venue = "11 Clubroom · Corso Como · Milano";
  try {
    const { data: cfg } = await supabase
      .from("site_config")
      .select("tagline, venue")
      .eq("id", "main")
      .single();
    if (cfg) {
      tagline = cfg.tagline;
      venue = cfg.venue;
    }
  } catch {
    // fallback to defaults
  }

  const { error: emailError } = await getResend().emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "BLACK SHEEP <noreply@blacksheep.community>",
    replyTo: process.env.REPLY_TO_EMAIL ?? undefined,
    to: email,
    subject: "Conferma la tua iscrizione — BLACK SHEEP",
    html: renderConfirmationEmail({
      name,
      confirmUrl,
      unsubscribeUrl,
      tagline,
      venue,
      siteUrl,
    }),
  });

  if (emailError) {
    console.error("[REG_AND_SUB] Resend error:", emailError);
    return Response.json({ error: "Errore nell'invio dell'email. Riprova." }, { status: 500 });
  }

  return Response.json({ status: "pending_confirmation" });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npx vitest run apps/newsletter/src/app/api/events/register-and-subscribe/route.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Typecheck**

```powershell
npx tsc --noEmit -p apps/newsletter/tsconfig.json
```

- [ ] **Step 6: Commit**

```powershell
git add apps/newsletter/src/app/api/events/register-and-subscribe/
git commit -m "feat(api): add POST /api/events/register-and-subscribe endpoint"
```

---

## Task 4: useEventRegistration Hook Extension

**Files:**

- Modify: `apps/newsletter/src/hooks/useEventRegistration.ts`
- Modify: `apps/newsletter/src/hooks/useEventRegistration.test.ts`

- [ ] **Step 1: Write failing test for new registerAndSubscribe method**

Add to the existing test file `useEventRegistration.test.ts`:

```typescript
describe("registerAndSubscribe", () => {
  it("transitions to pending_confirmation on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: "pending_confirmation" }),
    });

    const { result } = renderHook(() => useEventRegistration("event-1"));

    await act(async () => {
      await result.current.registerAndSubscribe("test@example.com", "Mario", "male");
    });

    expect(result.current.state.kind).toBe("pending_confirmation");
  });

  it("transitions to registered when subscriber already confirmed", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          status: "registered",
          eventTitle: "Test",
          eventDate: "2026-12-01T22:00:00Z",
        }),
    });

    const { result } = renderHook(() => useEventRegistration("event-1"));

    await act(async () => {
      await result.current.registerAndSubscribe("test@example.com", "Mario", "male");
    });

    expect(result.current.state.kind).toBe("registered");
  });

  it("prevents double submission", async () => {
    let resolveFirst: () => void;
    const firstCall = new Promise<void>((r) => {
      resolveFirst = r;
    });
    global.fetch = vi.fn().mockImplementation(() =>
      firstCall.then(() => ({
        ok: true,
        json: () => Promise.resolve({ status: "pending_confirmation" }),
      })),
    );

    const { result } = renderHook(() => useEventRegistration("event-1"));

    await act(async () => {
      result.current.registerAndSubscribe("test@example.com", "Mario", "male");
    });

    expect(result.current.state.kind).toBe("submitting");

    // Second call should be ignored
    await act(async () => {
      result.current.registerAndSubscribe("test@example.com", "Mario", "male");
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    resolveFirst!();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx vitest run apps/newsletter/src/hooks/useEventRegistration.test.ts
```

Expected: FAIL — `registerAndSubscribe` is not a function.

- [ ] **Step 3: Add pending_confirmation state and registerAndSubscribe method**

In `apps/newsletter/src/hooks/useEventRegistration.ts`:

1. Add `pending_confirmation` to the `RegistrationState` union type:

```typescript
type RegistrationState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "registered"; eventTitle: string; eventDate: string }
  | { kind: "pending_subscriber"; email: string }
  | { kind: "already_registered"; eventTitle: string; eventDate: string }
  | { kind: "no_subscriber" }
  | { kind: "gender_required"; email: string; emailConfirmation: string }
  | { kind: "pending_confirmation" }
  | { kind: "error"; message: string };
```

2. Add `registerAndSubscribe` to the return interface:

```typescript
interface UseEventRegistrationReturn {
  state: RegistrationState;
  isSubmitting: boolean;
  register: (email: string, emailConfirmation: string) => Promise<void>;
  registerAndSubscribe: (email: string, name: string | undefined, gender: Gender) => Promise<void>;
  submitGender: (gender: Gender) => Promise<void>;
  dismiss: () => void;
}
```

3. Add the `registerAndSubscribe` callback before `submitGender`:

```typescript
const registerAndSubscribe = useCallback(
  async (email: string, name: string | undefined, gender: Gender) => {
    if (state.kind === "submitting") return;

    setState({ kind: "submitting" });
    try {
      const res = await fetch(`${basePath}/api/events/register-and-subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, email, name, gender, consentVersion: "v1.0" }),
      });

      const json = await res.json();

      if (!res.ok) {
        setState({
          kind: "error",
          message: json.error ?? "Qualcosa non ha funzionato. Riprova tra qualche secondo.",
        });
        return;
      }

      switch (json.status) {
        case "pending_confirmation":
          setState({ kind: "pending_confirmation" });
          break;
        case "registered":
          setState({
            kind: "registered",
            eventTitle: json.eventTitle,
            eventDate: json.eventDate,
          });
          break;
        case "already_registered":
          setState({
            kind: "already_registered",
            eventTitle: json.eventTitle,
            eventDate: json.eventDate,
          });
          break;
        case "no_subscriber":
          setState({ kind: "no_subscriber" });
          break;
        case "gender_required":
          setState({ kind: "gender_required", email, emailConfirmation: email });
          break;
        default:
          setState({ kind: "error", message: "Risposta non riconosciuta." });
      }
    } catch {
      setState({
        kind: "error",
        message: "Qualcosa non ha funzionato. Riprova tra qualche secondo.",
      });
    }
  },
  [eventId, state.kind],
);
```

4. Return `registerAndSubscribe` from the hook:

```typescript
return {
  state,
  isSubmitting: state.kind === "submitting",
  register,
  registerAndSubscribe,
  submitGender,
  dismiss,
};
```

- [ ] **Step 4: Run tests**

```powershell
npx vitest run apps/newsletter/src/hooks/useEventRegistration.test.ts
```

Expected: All tests PASS (existing + new).

- [ ] **Step 5: Commit**

```powershell
git add apps/newsletter/src/hooks/useEventRegistration.ts apps/newsletter/src/hooks/useEventRegistration.test.ts
git commit -m "feat(hook): add registerAndSubscribe method and pending_confirmation state"
```

---

## Task 5: NoSubscriberDialog Inline Form

**Files:**

- Modify: `apps/newsletter/src/components/events/dialogs/NoSubscriberDialog.tsx`
- Modify: `apps/newsletter/src/components/events/dialogs/NoSubscriberDialog.test.tsx` (create if not exists)

- [ ] **Step 1: Write failing test**

Create or extend `NoSubscriberDialog.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoSubscriberDialog } from "./NoSubscriberDialog";

// Mock HTMLDialogElement
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});

describe("NoSubscriberDialog", () => {
  const defaultProps = {
    open: true,
    email: "test@example.com",
    onClose: vi.fn(),
    onSubmit: vi.fn(),
  };

  it("renders inline form with email, name, gender, and consent fields", () => {
    render(<NoSubscriberDialog {...defaultProps} />);
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByText("Donna")).toBeInTheDocument();
    expect(screen.getByText("Uomo")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("submits with valid data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NoSubscriberDialog {...defaultProps} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/nome/i), "Mario");
    await user.click(screen.getByText("Donna"));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /iscriviti e entra in lista/i }));

    expect(onSubmit).toHaveBeenCalledWith("test@example.com", "Mario", "female");
  });

  it("shows validation error when gender is not selected", async () => {
    const user = userEvent.setup();
    render(<NoSubscriberDialog {...defaultProps} />);

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /iscriviti e entra in lista/i }));

    expect(screen.getByText(/seleziona/i)).toBeInTheDocument();
  });

  it("shows validation error when consent is not checked", async () => {
    const user = userEvent.setup();
    render(<NoSubscriberDialog {...defaultProps} />);

    await user.click(screen.getByText("Uomo"));
    await user.click(screen.getByRole("button", { name: /iscriviti e entra in lista/i }));

    expect(screen.getByText(/accettare/i)).toBeInTheDocument();
  });

  it("shows success message after submission", () => {
    render(<NoSubscriberDialog {...defaultProps} submitted />);
    expect(screen.getByText(/email di conferma/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx vitest run apps/newsletter/src/components/events/dialogs/NoSubscriberDialog.test.tsx
```

Expected: FAIL — props mismatch.

- [ ] **Step 3: Rewrite NoSubscriberDialog with inline form**

Replace `apps/newsletter/src/components/events/dialogs/NoSubscriberDialog.tsx`:

```typescript
"use client";

import { useId, useState } from "react";
import { Dialog, DialogHeader, DialogContent, DialogFooter } from "@/components/dialog";
import type { Gender } from "@/lib/validations";

const genderOptions: { value: Gender; label: string }[] = [
  { value: "female", label: "Donna" },
  { value: "male", label: "Uomo" },
];

interface NoSubscriberDialogProps {
  open: boolean;
  email: string;
  onClose: () => void;
  onSubmit: (email: string, name: string | undefined, gender: Gender) => void;
  submitted?: boolean;
  isSubmitting?: boolean;
}

export function NoSubscriberDialog({
  open,
  email,
  onClose,
  onSubmit,
  submitted = false,
  isSubmitting = false,
}: NoSubscriberDialogProps) {
  const titleId = useId();
  const descId = useId();
  const genderErrorId = useId();
  const consentErrorId = useId();
  const nameId = useId();

  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);

  function handleSubmit() {
    setTouched(true);
    if (!gender || !consent) return;
    onSubmit(email, name.trim() || undefined, gender);
  }

  const showGenderError = touched && !gender;
  const showConsentError = touched && !consent;

  if (submitted) {
    return (
      <Dialog open={open} onClose={onClose} ariaLabelledBy={titleId} ariaDescribedBy={descId}>
        <DialogHeader id={titleId}>CONTROLLA LA TUA EMAIL</DialogHeader>
        <DialogContent id={descId}>
          <p className="mb-4 text-sm">
            Ti abbiamo inviato un&apos;email di conferma. Confermala per completare
            l&apos;iscrizione all&apos;evento.
          </p>
          <p className="text-xs text-bs-cream/60">
            Se non la trovi, controlla la cartella spam.
          </p>
        </DialogContent>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-6 py-3 bg-bs-cream text-[#0a0a0a] font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.15em] rounded-md hover:opacity-90 transition-opacity"
          >
            Ho capito
          </button>
        </DialogFooter>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} ariaLabelledBy={titleId} ariaDescribedBy={descId}>
      <DialogHeader id={titleId}>ISCRIVITI E ENTRA IN LISTA</DialogHeader>
      <DialogContent id={descId}>
        <p className="mb-4 text-sm">
          Per accedere alla lista devi iscriverti alla newsletter. Compila i dati qui sotto.
        </p>

        {/* Email (read-only) */}
        <p className="font-body text-sm text-bs-cream mb-4 px-3 py-2 bg-bs-cream/5 rounded-md border border-bs-cream/10">
          {email}
        </p>

        {/* Name */}
        <div className="mb-4">
          <label htmlFor={nameId} className="block font-body text-xs tracking-wider text-bs-cream/50 mb-1">
            NOME <span className="text-bs-cream/30 normal-case tracking-normal">(opzionale)</span>
          </label>
          <input
            id={nameId}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Come ti chiami?"
            maxLength={200}
            className="w-full bg-transparent border border-bs-cream/20 rounded-md px-3 py-2 font-body text-sm text-bs-cream placeholder:text-bs-cream/30 focus:outline-none focus:border-bs-cream/40"
          />
        </div>

        {/* Gender */}
        <fieldset className="mb-4" aria-describedby={showGenderError ? genderErrorId : undefined}>
          <legend className="font-[family-name:var(--font-brand)] text-[10px] uppercase tracking-[0.3em] text-bs-cream/50 mb-2">
            Genere <span aria-hidden="true">*</span>
          </legend>
          <div className="flex flex-col gap-1.5">
            {genderOptions.map(({ value, label }) => (
              <label key={value} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="subscribe-gender"
                  value={value}
                  checked={gender === value}
                  onChange={() => {
                    setGender(value);
                    setTouched(false);
                  }}
                  className="accent-bs-cream w-3.5 h-3.5 cursor-pointer"
                />
                <span className="font-body text-sm text-bs-cream/70 group-hover:text-bs-cream transition-colors">
                  {label}
                </span>
              </label>
            ))}
          </div>
          {showGenderError && (
            <p id={genderErrorId} role="alert" className="font-body text-xs text-bs-burgundy mt-2">
              Seleziona un&apos;opzione per continuare
            </p>
          )}
        </fieldset>

        {/* Privacy consent */}
        <div className="mb-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                setTouched(false);
              }}
              className="accent-bs-cream w-3.5 h-3.5 mt-0.5 cursor-pointer"
              aria-describedby={showConsentError ? consentErrorId : undefined}
            />
            <span className="font-body text-xs text-bs-cream/50 leading-relaxed">
              Accetto la{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline text-bs-cream/70 hover:text-bs-cream">
                privacy policy
              </a>
            </span>
          </label>
          {showConsentError && (
            <p id={consentErrorId} role="alert" className="font-body text-xs text-bs-burgundy mt-2 ml-6">
              Devi accettare la privacy policy per continuare
            </p>
          )}
        </div>

        {/* Honeypot */}
        <div aria-hidden="true" className="absolute -left-[9999px]" tabIndex={-1}>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </div>
      </DialogContent>
      <DialogFooter>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] px-5 py-3 border border-bs-cream/20 text-bs-cream/60 font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.15em] rounded-md hover:border-bs-cream/40 hover:text-bs-cream/80 transition-all"
        >
          ANNULLA
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          className="min-h-[44px] px-6 py-3 bg-bs-cream text-[#0a0a0a] font-[family-name:var(--font-brand)] text-xs uppercase tracking-[0.15em] rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? "INVIO IN CORSO…" : "ISCRIVITI E ENTRA IN LISTA"}
        </button>
      </DialogFooter>
    </Dialog>
  );
}
```

- [ ] **Step 4: Run tests**

```powershell
npx vitest run apps/newsletter/src/components/events/dialogs/NoSubscriberDialog.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/newsletter/src/components/events/dialogs/NoSubscriberDialog.tsx apps/newsletter/src/components/events/dialogs/NoSubscriberDialog.test.tsx
git commit -m "feat(ui): NoSubscriberDialog inline form with gender, name, consent"
```

---

## Task 6: EventRegistrationFlow — Wire New States

**Files:**

- Modify: `apps/newsletter/src/components/events/EventRegistrationFlow.tsx`
- Modify: `apps/newsletter/src/components/events/EventRegistrationFlow.test.tsx`

- [ ] **Step 1: Write failing test for pending_confirmation and no_subscriber→inline form**

Add to `EventRegistrationFlow.test.tsx`:

```typescript
it("renders NoSubscriberDialog inline form when state is no_subscriber", async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ status: "no_subscriber" }),
  });

  render(<EventRegistrationFlow event={mockEvent} onClose={vi.fn()} onSubscribeClick={vi.fn()} />);

  // Submit email to trigger no_subscriber
  await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
  // ... trigger submit

  // NoSubscriberDialog should show inline form with gender radio buttons
  expect(screen.getByText("Donna")).toBeInTheDocument();
  expect(screen.getByText("Uomo")).toBeInTheDocument();
});

it("renders success message in NoSubscriberDialog when pending_confirmation", async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ status: "pending_confirmation" }),
  });

  // ... trigger registerAndSubscribe flow
  expect(screen.getByText(/email di conferma/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Update EventRegistrationFlow**

Modify `EventRegistrationFlow.tsx`:

1. Pass `email` from the registration form submission to the `no_subscriber` state. The hook already stores this implicitly — we need to capture it. Add local state to track the email entered:

```typescript
const [submittedEmail, setSubmittedEmail] = useState("");

// Wrap register to capture email
function handleRegister(email: string, emailConfirmation: string) {
  setSubmittedEmail(email);
  register(email, emailConfirmation);
}
```

2. Replace the `no_subscriber` rendering block:

```typescript
if (state.kind === "no_subscriber") {
  return (
    <NoSubscriberDialog
      open
      email={submittedEmail}
      onClose={handleClose}
      onSubmit={(email, name, gender) => registerAndSubscribe(email, name, gender)}
      isSubmitting={false}
    />
  );
}

if (state.kind === "pending_confirmation") {
  return (
    <NoSubscriberDialog
      open
      email={submittedEmail}
      onClose={handleClose}
      onSubmit={() => {}}
      submitted
    />
  );
}
```

3. Update imports — `NoSubscriberDialog` no longer needs `onSubscribeClick`. Remove the prop from `EventRegistrationFlowProps` if no longer needed:

```typescript
interface EventRegistrationFlowProps {
  event: EventCardData;
  onClose: () => void;
}
```

4. Update the destructured hook return to include `registerAndSubscribe`:

```typescript
const { state, isSubmitting, register, registerAndSubscribe, submitGender, dismiss } =
  useEventRegistration(event.id);
```

5. Pass `handleRegister` to `EventRegistrationForm`:

```typescript
<EventRegistrationForm
  onSubmit={handleRegister}
  isSubmitting={isSubmitting}
  error={state.kind === "error" ? state.message : null}
/>
```

- [ ] **Step 3: Update parent components that use EventRegistrationFlow**

Search for all usages of `EventRegistrationFlow` and remove the `onSubscribeClick` prop. This likely includes the page or section that renders the event list. The component should now only need `event` and `onClose`.

- [ ] **Step 4: Run all event flow tests**

```powershell
npx vitest run apps/newsletter/src/components/events/
```

Expected: PASS.

- [ ] **Step 5: Typecheck**

```powershell
npx tsc --noEmit -p apps/newsletter/tsconfig.json
```

- [ ] **Step 6: Commit**

```powershell
git add apps/newsletter/src/components/events/EventRegistrationFlow.tsx apps/newsletter/src/components/events/EventRegistrationFlow.test.tsx
git commit -m "feat(flow): wire no_subscriber inline form and pending_confirmation state"
```

---

## Task 7: Confirm Endpoint — Process Pending Event Intents

**Files:**

- Modify: `apps/newsletter/src/app/api/confirm/route.ts`
- Create: `apps/newsletter/src/app/api/confirm/route.test.ts`

- [ ] **Step 1: Write failing test**

Create `apps/newsletter/src/app/api/confirm/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(),
}));
vi.mock("@/lib/resend", () => ({
  getResend: vi.fn(),
}));

import { GET } from "./route";
import { getSupabase } from "@/lib/supabase";
import { getResend } from "@/lib/resend";

function makeRequest(token: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/confirm?token=${token}`);
}

const VALID_TOKEN = "11111111-1111-1111-1111-111111111111";

describe("GET /api/confirm — pending event intents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  });

  it("processes pending event intents after confirming subscriber", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const sendEmail = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(getResend).mockReturnValue({ emails: { send: sendEmail } } as never);

    const mock = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "subscribers") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: "sub-1", status: "pending", token: VALID_TOKEN },
                    error: null,
                  }),
              }),
            }),
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        }
        if (table === "pending_event_intents") {
          return {
            select: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ event_id: "evt-1", subscriber_id: "sub-1" }],
                  error: null,
                }),
            }),
            delete: () => mockDelete,
          };
        }
        if (table === "list_events") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: {
                      id: "evt-1",
                      title: "Test Event",
                      event_date: "2026-12-01T22:00:00Z",
                      venue: "Club",
                      description: null,
                      status: "published",
                      registration_deadline: null,
                    },
                    error: null,
                  }),
              }),
            }),
          };
        }
        if (table === "list_event_registrations") {
          return { insert: mockInsert };
        }
        return mock;
      }),
    };
    vi.mocked(getSupabase).mockReturnValue(mock as never);

    const res = await GET(makeRequest(VALID_TOKEN));

    // Should redirect to /confirm?event=true
    expect(res.status).toBe(302);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/newsletter/confirm?event=true");
    expect(mockInsert).toHaveBeenCalledOnce();
    expect(sendEmail).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx vitest run apps/newsletter/src/app/api/confirm/route.test.ts
```

Expected: FAIL — current route doesn't process intents.

- [ ] **Step 3: Extend the confirm route**

Modify `apps/newsletter/src/app/api/confirm/route.ts`. Add import for `getResend` and `renderEventRegistrationEmail`, then add intent processing after the successful status update:

```typescript
import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { renderEventRegistrationEmail } from "@/lib/emails/event-registration";

export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const token = request.nextUrl.searchParams.get("token");
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!token || !UUID_RE.test(token)) {
    return Response.redirect(new URL("/newsletter/?error=invalid", request.url));
  }

  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("id, email, status, token")
    .eq("token", token)
    .single();

  if (!subscriber) {
    return Response.redirect(new URL("/newsletter/?error=invalid", request.url));
  }

  if (subscriber.status === "confirmed") {
    return Response.redirect(new URL("/newsletter/confirm?already=true", request.url));
  }

  if (subscriber.status !== "pending") {
    return Response.redirect(new URL("/newsletter/?error=invalid", request.url));
  }

  const { error: updateError } = await supabase
    .from("subscribers")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", subscriber.id);

  if (updateError) {
    console.error("[SUBSCRIBE] Confirm update error:", updateError.message);
    return Response.redirect(new URL("/newsletter/?error=server", request.url));
  }

  // Process pending event intents
  let hasEventIntents = false;
  try {
    const { data: intents } = await supabase
      .from("pending_event_intents")
      .select("event_id, subscriber_id")
      .eq("subscriber_id", subscriber.id);

    if (intents && intents.length > 0) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${subscriber.token}`;

      for (const intent of intents) {
        const { data: event } = await supabase
          .from("list_events")
          .select("id, title, event_date, venue, description, status, registration_deadline")
          .eq("id", intent.event_id)
          .single();

        if (!event || event.status !== "published") continue;
        if (event.registration_deadline && new Date(event.registration_deadline) < new Date())
          continue;

        const { error: regError } = await supabase.from("list_event_registrations").insert({
          event_id: event.id,
          subscriber_id: subscriber.id,
          source: "form",
        });

        if (regError && regError.code !== "23505") {
          console.error("[CONFIRM] Event reg insert error:", regError.message);
          continue;
        }

        hasEventIntents = true;

        // Send event confirmation email (best-effort)
        await getResend()
          .emails.send({
            from: process.env.RESEND_FROM_EMAIL ?? "BLACK SHEEP <noreply@blacksheep.community>",
            replyTo: process.env.REPLY_TO_EMAIL ?? undefined,
            to: subscriber.email,
            subject: `Sei in lista — ${event.title}`,
            html: renderEventRegistrationEmail({
              eventTitle: event.title,
              eventDate: event.event_date,
              eventVenue: event.venue,
              eventDescription: event.description,
              unsubscribeUrl,
              siteUrl,
            }),
          })
          .catch((err) => console.error("[CONFIRM] Event email error:", err));
      }

      // Clean up all intents for this subscriber
      await supabase.from("pending_event_intents").delete().eq("subscriber_id", subscriber.id);
    }
  } catch (err) {
    console.error("[CONFIRM] Intent processing error:", err);
  }

  const confirmPath = hasEventIntents ? "/newsletter/confirm?event=true" : "/newsletter/confirm";
  return Response.redirect(new URL(confirmPath, request.url));
}
```

- [ ] **Step 4: Run tests**

```powershell
npx vitest run apps/newsletter/src/app/api/confirm/route.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/newsletter/src/app/api/confirm/route.ts apps/newsletter/src/app/api/confirm/route.test.ts
git commit -m "feat(confirm): process pending event intents after email confirmation"
```

---

## Task 8: Confirm Page — Event Message

**Files:**

- Modify: `apps/newsletter/src/app/confirm/page.tsx`

- [ ] **Step 1: Extend searchParams to accept event flag**

```typescript
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ already?: string; event?: string }>;
}) {
  const { already, event: hasEvent } = await searchParams;
```

- [ ] **Step 2: Add event confirmation message after the subtitle**

After the existing subtitle `<p>` block, add:

```typescript
{hasEvent && !already && (
  <p
    data-confirm="event-note"
    className="font-body text-sm text-bs-cream/50 max-w-xs leading-relaxed mt-3"
  >
    Sei anche in lista per l&apos;evento!
  </p>
)}
```

- [ ] **Step 3: Typecheck**

```powershell
npx tsc --noEmit -p apps/newsletter/tsconfig.json
```

- [ ] **Step 4: Commit**

```powershell
git add apps/newsletter/src/app/confirm/page.tsx
git commit -m "feat(confirm): show event registration message on confirmation page"
```

---

## Task 9: Admin EventForm — Deadline Field

**Files:**

- Modify: `apps/newsletter/src/components/admin/EventForm.tsx`

- [ ] **Step 1: Add registration_deadline to EventFormValues type**

```typescript
type EventFormValues = {
  title: string;
  slug: string;
  event_date: string;
  venue: string;
  description?: string | null;
  capacity?: number | null;
  status: "draft" | "published" | "archived";
  registration_deadline?: string | null;
};
```

- [ ] **Step 2: Add the deadline field in the form JSX**

After the capacity field and before the description field, add:

```typescript
<div>
  <label htmlFor="event-deadline" className={labelClass}>
    CHIUSURA ISCRIZIONI{" "}
    <span className="text-bs-cream/30 normal-case tracking-normal">(opzionale — ora italiana)</span>
  </label>
  <Controller
    control={control}
    name="registration_deadline"
    render={({ field, fieldState }) => (
      <BrandedDateTimePicker
        id="event-deadline"
        value={field.value ? isoToDatetimeLocal(field.value) : ""}
        onChange={(v) => field.onChange(v ? new Date(v).toISOString() : null)}
        invalid={fieldState.invalid}
        aria-describedby={fieldState.error ? "event-deadline-error" : undefined}
      />
    )}
  />
  {errors.registration_deadline && (
    <p id="event-deadline-error" className={errorClass}>
      {errors.registration_deadline.message}
    </p>
  )}
</div>
```

- [ ] **Step 3: Include registration_deadline in the payload**

Update the payload construction in `onSubmit`:

```typescript
const payload = {
  ...data,
  capacity: data.capacity ?? null,
  description: data.description ?? null,
  registration_deadline: data.registration_deadline ?? null,
};
```

- [ ] **Step 4: Typecheck and visual verify**

```powershell
npx tsc --noEmit -p apps/newsletter/tsconfig.json
```

Start dev server and verify the field appears in the admin event form (both create and edit).

- [ ] **Step 5: Commit**

```powershell
git add apps/newsletter/src/components/admin/EventForm.tsx
git commit -m "feat(admin): add registration deadline field to event form"
```

---

## Task 10: EventCard — Deadline Display

**Files:**

- Modify: `apps/newsletter/src/components/events/EventCard.tsx`

- [ ] **Step 1: Add registration_deadline to EventCardData**

```typescript
export interface EventCardData {
  id: string;
  slug: string;
  title: string;
  event_date: string;
  venue: string;
  description?: string | null;
  capacity?: number | null;
  registration_deadline?: string | null;
}
```

- [ ] **Step 2: Add deadline logic and conditional CTA rendering**

Inside the `EventCard` component, add deadline calculation after `const parts`:

```typescript
const deadlinePassed = event.registration_deadline
  ? new Date(event.registration_deadline) < new Date()
  : false;

const deadlineLabel =
  event.registration_deadline && !deadlinePassed
    ? new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit" }).format(
        new Date(event.registration_deadline),
      )
    : null;
```

- [ ] **Step 3: Replace the CTA button section**

Replace the existing button `<div>` (the `pt-3` div containing the "Entra in lista" button) with:

```typescript
<div className="pt-3">
  {deadlinePassed ? (
    <span className="inline-flex items-center gap-2 min-h-[44px] px-7 py-3 border border-bs-cream/10 text-bs-cream/30 font-[family-name:var(--font-brand)] text-sm tracking-[0.2em] uppercase rounded-sm cursor-not-allowed">
      Iscrizioni chiuse
    </span>
  ) : (
    <>
      <button
        type="button"
        onClick={() => onRegisterClick(event)}
        data-bs-cta
        className="group/cta inline-flex items-center gap-3 min-h-[44px] px-7 py-3 bg-bs-cream text-[#0a0a0a] font-[family-name:var(--font-brand)] text-sm tracking-[0.2em] uppercase rounded-sm shadow-[0_0_0_1px_rgba(255,255,243,0.08)] hover:shadow-[0_0_0_1px_rgba(255,255,243,0.3),0_8px_32px_rgba(255,255,243,0.1)] transition-shadow duration-300 motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-bs-cream/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        Entra in lista
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          width="14"
          height="14"
          className="transition-transform duration-300 group-hover/cta:translate-x-1 motion-reduce:transition-none"
        >
          <path
            d="M2 8h11M9 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="square"
          />
        </svg>
      </button>
      {deadlineLabel && (
        <p className="font-body text-[10px] tracking-[0.15em] text-bs-cream/30 mt-2">
          Entro il {deadlineLabel}
        </p>
      )}
    </>
  )}
</div>
```

- [ ] **Step 4: Typecheck**

```powershell
npx tsc --noEmit -p apps/newsletter/tsconfig.json
```

- [ ] **Step 5: Commit**

```powershell
git add apps/newsletter/src/components/events/EventCard.tsx
git commit -m "feat(ui): show deadline badge and disabled CTA when registrations closed"
```

---

## Task 11: Server-Side Deadline Validation in Register API

**Files:**

- Modify: `apps/newsletter/src/app/api/events/register/route.ts`

- [ ] **Step 1: Add registration_deadline to the event select**

Change the select query (line 61) to include `registration_deadline`:

```typescript
.select("id, title, event_date, venue, description, status, registration_deadline")
```

- [ ] **Step 2: Add deadline check after event validation**

After the event existence check (line 66-67), add:

```typescript
if (event.registration_deadline && new Date(event.registration_deadline) < new Date()) {
  return Response.json({ error: "Iscrizioni chiuse" }, { status: 403 });
}
```

- [ ] **Step 3: Run existing tests**

```powershell
npx vitest run apps/newsletter/src/app/api/events/register/
```

Expected: PASS (existing tests should still work — they don't mock `registration_deadline` so it's null/undefined which passes the check).

- [ ] **Step 4: Commit**

```powershell
git add apps/newsletter/src/app/api/events/register/route.ts
git commit -m "feat(api): add registration_deadline server-side validation"
```

---

## Task 12: Install exceljs

**Files:**

- Modify: `apps/newsletter/package.json`

- [ ] **Step 1: Install exceljs**

```powershell
cd apps/newsletter; npm install exceljs
```

- [ ] **Step 2: Verify installation**

```powershell
node -e "require('exceljs')"
```

Expected: No error.

- [ ] **Step 3: Commit**

```powershell
git add apps/newsletter/package.json apps/newsletter/package-lock.json
git commit -m "chore: add exceljs dependency for attendance Excel export"
```

Note: `package-lock.json` may be at root level in the monorepo. Adjust path as needed.

---

## Task 13: Admin Attendance Toggle API

**Files:**

- Create: `apps/newsletter/src/app/api/admin/events/[id]/attendance/route.ts`
- Create: `apps/newsletter/src/app/api/admin/events/[id]/attendance/route.test.ts`

- [ ] **Step 1: Write failing test**

Create `route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { email: "admin@test.com" } }),
}));
vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(),
}));

import { POST } from "./route";
import { getSupabase } from "@/lib/supabase";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/admin/events/evt-1/attendance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/events/[id]/attendance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 without auth", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null);

    const res = await POST(makeRequest({ subscriberId: "sub-1" }), {
      params: Promise.resolve({ id: "evt-1" }),
    });
    expect(res.status).toBe(401);
  });

  it("inserts attendance when not present (toggle ON)", async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mock = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "event_attendance") {
          return {
            select: () => ({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
            insert: mockInsert,
          };
        }
        return mock;
      }),
    };
    vi.mocked(getSupabase).mockReturnValue(mock as never);

    const res = await POST(makeRequest({ subscriberId: "sub-1" }), {
      params: Promise.resolve({ id: "evt-1" }),
    });
    const json = await res.json();

    expect(json.attended).toBe(true);
    expect(mockInsert).toHaveBeenCalledOnce();
  });

  it("deletes attendance when already present (toggle OFF)", async () => {
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
    const mock = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "event_attendance") {
          return {
            select: () => ({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: () =>
                    Promise.resolve({
                      data: {
                        event_id: "evt-1",
                        subscriber_id: "sub-1",
                        attended_at: "2026-05-09T22:00:00Z",
                      },
                      error: null,
                    }),
                }),
              }),
            }),
            delete: () => mockDelete,
          };
        }
        return mock;
      }),
    };
    vi.mocked(getSupabase).mockReturnValue(mock as never);

    const res = await POST(makeRequest({ subscriberId: "sub-1" }), {
      params: Promise.resolve({ id: "evt-1" }),
    });
    const json = await res.json();

    expect(json.attended).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npx vitest run apps/newsletter/src/app/api/admin/events/[id]/attendance/route.test.ts
```

- [ ] **Step 3: Write the route**

Create `route.ts`:

```typescript
import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

const bodySchema = z.object({
  subscriberId: z.uuid("ID subscriber non valido"),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id: eventId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi." }, { status: 400 });
  }

  const { subscriberId } = parsed.data;
  const supabase = getSupabase();

  // Check if attendance record exists
  const { data: existing } = await supabase
    .from("event_attendance")
    .select("event_id, subscriber_id, attended_at")
    .eq("event_id", eventId)
    .eq("subscriber_id", subscriberId)
    .maybeSingle();

  if (existing) {
    // Toggle OFF — delete
    const { error } = await supabase
      .from("event_attendance")
      .delete()
      .eq("event_id", eventId)
      .eq("subscriber_id", subscriberId);

    if (error) {
      console.error("[ATTENDANCE] Delete error:", error.message);
      return Response.json({ error: "Errore interno." }, { status: 500 });
    }

    return Response.json({ attended: false });
  }

  // Toggle ON — insert
  const adminEmail = (session as { user?: { email?: string } }).user?.email ?? "unknown";
  const { error } = await supabase.from("event_attendance").insert({
    event_id: eventId,
    subscriber_id: subscriberId,
    marked_by: adminEmail,
  });

  if (error) {
    console.error("[ATTENDANCE] Insert error:", error.message);
    return Response.json({ error: "Errore interno." }, { status: 500 });
  }

  return Response.json({ attended: true, attended_at: new Date().toISOString() });
}
```

- [ ] **Step 4: Run tests**

```powershell
npx vitest run apps/newsletter/src/app/api/admin/events/[id]/attendance/route.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/newsletter/src/app/api/admin/events/[id]/attendance/
git commit -m "feat(api): add POST /api/admin/events/[id]/attendance toggle endpoint"
```

---

## Task 14: Registrations Page — Search, Filter, Attendance Toggle

**Files:**

- Modify: `apps/newsletter/src/app/admin/(dashboard)/events/[id]/registrations/page.tsx`
- Modify: `apps/newsletter/src/components/admin/RegistrationsTable.tsx`
- Modify: `apps/newsletter/src/app/api/admin/events/[id]/registrations/route.ts`

This task extends the admin UI. It's a larger task — the steps below are still atomic.

- [ ] **Step 1: Extend the registrations GET API to include attendance data**

In `apps/newsletter/src/app/api/admin/events/[id]/registrations/route.ts`, modify the query to join with `event_attendance`. If the API route exists, update the select. If the data is fetched directly in the page server component, update there instead.

The data is fetched directly in the page component (`page.tsx`). Update the Supabase query to also fetch attendance:

After fetching registrations, fetch attendance records for the event:

```typescript
// Fetch attendance records for this event
const { data: attendanceData } = await supabase
  .from("event_attendance")
  .select("subscriber_id, attended_at")
  .eq("event_id", id);

const attendanceMap = new Map((attendanceData ?? []).map((a) => [a.subscriber_id, a.attended_at]));
```

Enrich each registration with attendance:

```typescript
const all: RegistrationRow[] = ((allData ?? []) as unknown as RegistrationRow[]).map((r) => ({
  ...r,
  attended: r.subscriber ? attendanceMap.has(r.subscriber.id) : false,
  attended_at: r.subscriber ? (attendanceMap.get(r.subscriber.id) ?? null) : null,
}));
```

- [ ] **Step 2: Extend RegistrationRow type**

In `RegistrationsTable.tsx`, add attendance fields:

```typescript
export type RegistrationRow = {
  id: string;
  registered_at: string | null;
  source: string | null;
  attended: boolean;
  attended_at: string | null;
  subscriber: {
    id: string;
    email: string | null;
    name: string | null;
    status: string | null;
    gender: string | null;
  } | null;
};
```

- [ ] **Step 3: Add search box to RegistrationsTable**

Add a search input above the filter tabs:

```typescript
const [searchQuery, setSearchQuery] = useState("");

// Filter by search locally
const visibleRegistrations = searchQuery.trim()
  ? registrations.filter((r) => {
      const q = searchQuery.toLowerCase();
      return (
        r.subscriber?.email?.toLowerCase().includes(q) ||
        r.subscriber?.name?.toLowerCase().includes(q)
      );
    })
  : registrations;
```

Render:

```typescript
<div className="mb-4">
  <input
    type="search"
    placeholder="Cerca per email o nome..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="w-full bg-transparent border border-bs-cream/20 rounded-md px-3 py-2 font-body text-sm text-bs-cream placeholder:text-bs-cream/30 focus:outline-none focus:border-bs-cream/40"
    aria-label="Cerca registrazioni"
  />
</div>
```

Use `visibleRegistrations` instead of `registrations` in the rendering.

- [ ] **Step 4: Add attendance stats to the stats cards**

Add attendance counter to the stats grid:

```typescript
const attendedCount = registrations.filter((r) => r.attended).length;
```

Add a new stats card:

```typescript
<div className="bg-bs-cream/5 rounded-lg p-4">
  <p className="font-body text-xs text-bs-cream/40 uppercase tracking-widest mb-1">Presenti</p>
  <p className="font-[family-name:var(--font-brand)] text-2xl text-bs-cream">{attendedCount}</p>
</div>
```

- [ ] **Step 5: Add attendance toggle button to each registration row**

For mobile cards, add a button:

```typescript
<button
  type="button"
  onClick={() => handleToggleAttendance(reg.subscriber?.id)}
  className={`min-h-[44px] min-w-[44px] px-3 py-2 rounded-md font-body text-xs transition-colors ${
    reg.attended
      ? "bg-bs-green/20 text-bs-green border border-bs-green/30"
      : "bg-bs-cream/5 text-bs-cream/40 border border-bs-cream/10 hover:border-bs-cream/30"
  }`}
  aria-pressed={reg.attended}
  aria-label={reg.attended ? "Rimuovi presenza" : "Segna presente"}
>
  {reg.attended ? "✓ Presente" : "Presente"}
</button>
```

For desktop table, add a new column with the same toggle.

- [ ] **Step 6: Add handleToggleAttendance function**

```typescript
async function handleToggleAttendance(subscriberId: string | undefined) {
  if (!subscriberId) return;

  try {
    const res = await fetch(`${basePath}/api/admin/events/${eventId}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriberId }),
    });

    if (res.ok) {
      router.refresh();
    }
  } catch {
    // Silently fail — the page refresh will show correct state
  }
}
```

Note: `RegistrationsTable` needs `basePath` imported. Add: `import { basePath } from "@/lib/base-path";`

- [ ] **Step 7: Add Excel export button alongside CSV**

Add an `.xlsx` export link next to the CSV button:

```typescript
<a
  href={`${basePath}/api/admin/events/${eventId}/registrations/export.xlsx`}
  download
  className="font-body text-xs px-4 py-2 rounded border border-bs-cream/20 text-bs-cream/70 hover:text-bs-cream hover:border-bs-cream/40 transition-colors text-center"
>
  ↓ ESPORTA EXCEL
</a>
```

- [ ] **Step 8: Typecheck**

```powershell
npx tsc --noEmit -p apps/newsletter/tsconfig.json
```

- [ ] **Step 9: Visual verification**

Start dev server and verify:

- Search box filters registrations
- Attendance toggle works (button changes state)
- Stats show attendance counter
- Excel export button appears

- [ ] **Step 10: Commit**

```powershell
git add apps/newsletter/src/app/admin/(dashboard)/events/[id]/registrations/page.tsx apps/newsletter/src/components/admin/RegistrationsTable.tsx
git commit -m "feat(admin): add search, attendance toggle, and Excel export to registrations page"
```

---

## Task 15: Excel Export Endpoint

**Files:**

- Create: `apps/newsletter/src/app/api/admin/events/[id]/registrations/export.xlsx/route.ts`

- [ ] **Step 1: Write the Excel export route**

```typescript
import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface RegistrationRow {
  registered_at: string | null;
  source: string | null;
  subscriber: {
    id: string;
    email?: string | null;
    name?: string | null;
    status?: string | null;
    gender?: string | null;
  } | null;
}

interface AttendanceRow {
  subscriber_id: string;
  attended_at: string | null;
}

function sanitize(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (/^[=+\-@\t\r\n]/.test(str)) return `'${str}`;
  return str;
}

export async function GET(_request: NextRequest, ctx: RouteContext) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const supabase = getSupabase();

  const { data: event } = await supabase
    .from("list_events")
    .select("slug, title")
    .eq("id", id)
    .maybeSingle();

  if (!event) {
    return Response.json({ error: "Evento non trovato" }, { status: 404 });
  }

  const { data: regData, error: regError } = await supabase
    .from("list_event_registrations")
    .select("registered_at, source, subscriber:subscribers(id, email, name, status, gender)")
    .eq("event_id", id)
    .order("registered_at", { ascending: false });

  if (regError) {
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  const { data: attendanceData } = await supabase
    .from("event_attendance")
    .select("subscriber_id, attended_at")
    .eq("event_id", id);

  const attendanceMap = new Map(
    ((attendanceData ?? []) as AttendanceRow[]).map((a) => [a.subscriber_id, a.attended_at]),
  );

  // Count cross-event stats per subscriber
  const subscriberIds = ((regData ?? []) as unknown as RegistrationRow[])
    .map((r) => r.subscriber?.id)
    .filter((id): id is string => !!id);

  let regCountMap = new Map<string, number>();
  let attCountMap = new Map<string, number>();

  if (subscriberIds.length > 0) {
    const { data: regCounts } = await supabase
      .from("list_event_registrations")
      .select("subscriber_id")
      .in("subscriber_id", subscriberIds);

    if (regCounts) {
      for (const r of regCounts) {
        regCountMap.set(r.subscriber_id, (regCountMap.get(r.subscriber_id) ?? 0) + 1);
      }
    }

    const { data: attCounts } = await supabase
      .from("event_attendance")
      .select("subscriber_id")
      .in("subscriber_id", subscriberIds);

    if (attCounts) {
      for (const a of attCounts) {
        attCountMap.set(a.subscriber_id, (attCountMap.get(a.subscriber_id) ?? 0) + 1);
      }
    }
  }

  const rows = (regData ?? []) as unknown as RegistrationRow[];
  const attendedTotal = rows.filter(
    (r) => r.subscriber && attendanceMap.has(r.subscriber.id),
  ).length;

  // Build Excel workbook
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Registrazioni");

  sheet.columns = [
    { header: "Email", key: "email", width: 30 },
    { header: "Nome", key: "name", width: 20 },
    { header: "Genere", key: "gender", width: 10 },
    { header: "Iscritto il", key: "registered_at", width: 18 },
    { header: "Fonte", key: "source", width: 12 },
    { header: "Presente", key: "attended", width: 10 },
    { header: "Presente alle", key: "attended_at", width: 18 },
    { header: "Tot. iscrizioni", key: "reg_count", width: 14 },
    { header: "Tot. presenze", key: "att_count", width: 14 },
  ];

  // Style header
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: "A1", to: "I1" };

  for (const r of rows) {
    const sub = r.subscriber;
    const subId = sub?.id;
    const attended = subId ? attendanceMap.has(subId) : false;

    sheet.addRow({
      email: sanitize(sub?.email),
      name: sanitize(sub?.name),
      gender: sub?.gender === "female" ? "Donna" : sub?.gender === "male" ? "Uomo" : "",
      registered_at: r.registered_at
        ? new Date(r.registered_at).toLocaleString("it-IT", { timeZone: "Europe/Rome" })
        : "",
      source: sanitize(r.source),
      attended: attended ? "Sì" : "No",
      attended_at:
        attended && subId
          ? new Date(attendanceMap.get(subId)!).toLocaleString("it-IT", { timeZone: "Europe/Rome" })
          : "",
      reg_count: subId ? (regCountMap.get(subId) ?? 0) : 0,
      att_count: subId ? (attCountMap.get(subId) ?? 0) : 0,
    });
  }

  // Summary row
  sheet.addRow({});
  sheet.addRow({
    email: `Iscritti: ${rows.length}`,
    name: `Presenti: ${attendedTotal}`,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `evento-${event.slug}-presenze.xlsx`;

  return new Response(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
```

- [ ] **Step 2: Typecheck**

```powershell
npx tsc --noEmit -p apps/newsletter/tsconfig.json
```

- [ ] **Step 3: Commit**

```powershell
git add apps/newsletter/src/app/api/admin/events/[id]/registrations/export.xlsx/
git commit -m "feat(api): add Excel (.xlsx) export for event registrations with attendance"
```

---

## Task 16: Full Build + Lint Verification

**Files:** None (verification only)

- [ ] **Step 1: Full typecheck**

```powershell
npx tsc --noEmit -p apps/newsletter/tsconfig.json
```

Expected: Zero errors.

- [ ] **Step 2: Lint**

```powershell
cd apps/newsletter; npx eslint src
```

Expected: Zero errors (warnings OK).

- [ ] **Step 3: Run all tests**

```powershell
npx vitest run --workspace=apps/newsletter
```

If vitest doesn't support `--workspace`, run from the newsletter directory:

```powershell
cd apps/newsletter; npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Full build**

```powershell
npm run build --workspace=apps/newsletter
```

Expected: Build succeeds.

- [ ] **Step 5: Visual verification**

Start dev server and test:

1. **Feature A:** Go to an event card → click "Entra in lista" → enter a non-subscriber email → NoSubscriberDialog shows inline form → fill gender + name + consent → submit → see confirmation message
2. **Feature B:** Admin panel → edit event → set registration deadline → save → public EventCard shows deadline badge or "Iscrizioni chiuse"
3. **Feature C:** Admin → event registrations → search works → attendance toggle works → Excel export downloads

Get Lorenzo's visual confirmation before declaring done.
