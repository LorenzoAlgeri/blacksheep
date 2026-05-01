# Newsletter Segmentation, Search & Tagging

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Each Phase is independently shippable; do NOT bundle Phase 2 and Phase 3 into a single PR.

**Goal:** Give the admin three new capabilities on the newsletter:

1. **Segmented sends** — choose audience at send time (e.g. "tutti i confermati", "confermati nelle ultime 48h", "solo tag gold", "confermati nell'ultima settimana E tag silver+").
2. **Search bar** sulla tabella iscritti (per email/nome).
3. **Tag system** generico — l'admin crea tag arbitrari (esempio bronze/silver/gold ma anche "milano-vip", "press") e li assegna ai subscribers, singoli o batch.

**Architecture:** Estende il sistema esistente senza rompere nulla. Le campagne attive (vedi commit `0e30b0a` e seguenti) continuano a funzionare identiche se non specifichi filtri. Il tag system è una tabella esterna pulita; l'audience filter diventa un campo `audience_filter jsonb` sulla campagna. La segmentazione si risolve **prima** della creazione delle righe in `newsletter_campaign_recipients` — il send orchestrator (`sendCampaignBatch`) non cambia comportamento, riceve solo una lista di destinatari più piccola.

**Tech stack invariato:** Next.js 16 App Router, Supabase, NextAuth v5, Tailwind 4, Zod, react-hook-form, Vitest.

---

## Decisioni da confermare PRIMA di partire

Queste scelte cambiano forma del DB / UX. Non sono blocking, ma se cambi idea dopo Phase 1 il refactor è amaro.

| #   | Decisione                                                                                     | Default proposto                                                                                 | Alternativa                        |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------- |
| D1  | Un tag per subscriber o multipli?                                                             | **Multipli** (M:N tramite tabella di join)                                                       | 1:1 (`tier` enum su `subscribers`) |
| D2  | Tag con ranking (gold > silver > bronze) o solo etichette?                                    | **Etichette + colonna `rank`** opzionale per ordinare la UI; nessuna logica "silver+" automatica | Niente rank, solo set di etichette |
| D3  | "Iscritti da 1 giorno" = rolling 24h o ieri come giorno solare?                               | **Rolling 24h** (più intuitivo per i marketer)                                                   | Cohort giornaliera                 |
| D4  | Tag manuale o auto-rule (es. "gold se apre > 5 newsletter")?                                  | **Solo manuale** in questa iterazione                                                            | Auto-rules in fase futura          |
| D5  | Search bar: full-text su `email + name` o solo `email`?                                       | **Email + name** con `ILIKE %q%`                                                                 | Solo email                         |
| D6  | Bulk tag (selezione multipla nella tabella + "applica tag X")?                                | **Sì** (è la feature che l'admin chiederà subito dopo single-tag)                                | Solo single-tag, bulk in v2        |
| D7  | "Resume" di una campagna segmentata: re-include nuovi iscritti che oggi soddisfano il filtro? | **No, il filtro si risolve UNA volta a campaign-create**                                         | Sì (ricompila ad ogni resume)      |

> **D7 è importante.** Esempio: campagna creata oggi alle 10 con filtro "iscritti negli ultimi 7 giorni" → 200 destinatari snapshottati. Se domani fai resume, restano gli stessi 200. Un nuovo iscritto entrato oggi alle 14 non riceve la mail di ieri: riceverà la prossima newsletter. Questo evita comportamenti sorprendenti.

---

## File mappa — cosa tocca cosa

### Phase 1 — Tag system

| File                                                                  | Tipo | Cosa                                                                                                          |
| --------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------- |
| `apps/newsletter/supabase/migrations/2026MMDD_subscriber_tags.sql`    | new  | Tabelle `tags` + `subscriber_tags`, indici, RLS                                                               |
| `apps/newsletter/src/app/api/admin/tags/route.ts`                     | new  | `GET` (list), `POST` (create)                                                                                 |
| `apps/newsletter/src/app/api/admin/tags/[tagId]/route.ts`             | new  | `PATCH` (rename/recolor), `DELETE`                                                                            |
| `apps/newsletter/src/app/api/admin/subscribers/[id]/tags/route.ts`    | new  | `GET` (tag di un subscriber), `PUT` (sostituisci set), `POST` (bulk: applica tag X a un set di subscriber id) |
| `apps/newsletter/src/components/admin/TagsManager.tsx`                | new  | CRUD tag (modal o pagina dedicata)                                                                            |
| `apps/newsletter/src/components/admin/SubscriberTable.tsx`            | mod  | Colonna "Tag" (chips) + selezione multipla + dropdown bulk                                                    |
| `apps/newsletter/src/lib/tags.ts`                                     | new  | Helper di typing/validazione (slugify, color hex check)                                                       |
| `apps/newsletter/src/lib/validations.ts`                              | mod  | Schema Zod `tagSchema`, `assignTagsSchema`                                                                    |
| `apps/newsletter/src/app/api/admin/subscribers/route.ts`              | mod  | Aggiunge `tags` array nel payload restituito (left join `subscriber_tags`)                                    |
| `apps/newsletter/src/components/admin/__tests__/TagsManager.test.tsx` | new  | Vitest UI                                                                                                     |
| `apps/newsletter/src/lib/tags.test.ts`                                | new  | Vitest helpers                                                                                                |

### Phase 2 — Search bar

| File                                                            | Tipo | Cosa                                                                               |
| --------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------- |
| `apps/newsletter/src/app/api/admin/subscribers/route.ts`        | mod  | Accetta `?q=` per `ILIKE` su email + name + filtro tag opzionale `?tag=`           |
| `apps/newsletter/src/components/admin/SubscriberTable.tsx`      | mod  | Input ricerca con debounce 300ms, chip di filtri attivi, "X risultati su Y totali" |
| `apps/newsletter/src/components/admin/SubscriberTable.test.tsx` | mod  | Test ricerca + clear                                                               |

### Phase 3 — Audience filters at send time

| File                                                                              | Tipo | Cosa                                                                                                                      |
| --------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| `apps/newsletter/supabase/migrations/2026MMDD_campaign_audience.sql`              | new  | `audience_filter jsonb` su `newsletter_campaigns` + RPC `resolve_audience(filter jsonb)` che ritorna i `token`            |
| `apps/newsletter/src/lib/audience.ts`                                             | new  | Tipo `AudienceFilter` + funzione `resolveAudience(filter, supabase)` (delega all'RPC) + `describeAudience(filter)` per UI |
| `apps/newsletter/src/lib/audience.test.ts`                                        | new  | Vitest puro: parsing/serializzazione, edge case                                                                           |
| `apps/newsletter/src/lib/validations.ts`                                          | mod  | `sendNewsletterSchema` accetta `audience: AudienceFilter` opzionale                                                       |
| `apps/newsletter/src/app/api/admin/send/route.ts`                                 | mod  | Risolve audience tramite `resolveAudience` prima di creare campagna; salva `audience_filter` sulla campagna               |
| `apps/newsletter/src/app/api/admin/send/[campaignId]/resume/route.ts`             | mod  | Nessuna modifica (già lavora su `newsletter_campaign_recipients` esistenti)                                               |
| `apps/newsletter/src/app/api/cron/send-scheduled/route.ts`                        | mod  | Stesso flusso del send manuale: risolve audience al claim, salva filter                                                   |
| `apps/newsletter/src/app/api/admin/audience/preview/route.ts`                     | new  | `POST { filter }` → `{ count, sampleEmails: string[] }` per la UI live                                                    |
| `apps/newsletter/src/components/admin/AudiencePicker.tsx`                         | new  | Composito: tab "Tutti" / "Filtro" → date range, tag multi-select (any/all), preview count live                            |
| `apps/newsletter/src/components/admin/SendForm.tsx` (o equivalente in `compose/`) | mod  | Integra `AudiencePicker` sopra il bottone "Invia"                                                                         |
| `apps/newsletter/src/hooks/useEmailSender.ts`                                     | mod  | Manda `audience` nel payload, mostra count nel confirmation modal                                                         |
| `apps/newsletter/src/components/admin/NewsletterHistory.tsx`                      | mod  | Colonna "Audience" con badge testuale (es. "Tutti", "Tag: gold + silver", "Ultimi 7 gg")                                  |
| `apps/newsletter/src/app/api/admin/newsletter-history/route.ts`                   | mod  | Restituisce `audience_filter` parsato per UI                                                                              |

---

## Phase 1 — Tag System

### Schema

```sql
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,                     -- 'gold' | 'milano-vip'
  label text NOT NULL,                    -- display name
  color text,                             -- '#BE8305' optional
  rank integer NOT NULL DEFAULT 0,        -- ordering hint, no logic
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_tags_slug ON public.tags (lower(slug));

CREATE TABLE IF NOT EXISTS public.subscriber_tags (
  subscriber_id uuid NOT NULL REFERENCES public.subscribers(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subscriber_id, tag_id)
);
CREATE INDEX idx_subscriber_tags_tag ON public.subscriber_tags (tag_id);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriber_tags ENABLE ROW LEVEL SECURITY;
-- Service role bypassa RLS — coerente con migration 20260416_enable_rls.sql.
```

### API contract

```typescript
// GET /api/admin/tags
// → { tags: Array<{ id, slug, label, color, rank, subscriberCount }> }

// POST /api/admin/tags
// body: { slug, label, color?, rank? }
// → { tag: ... } | { error, code: 'TAG_EXISTS' }

// PATCH /api/admin/tags/[tagId]
// body: { label?, color?, rank? }    // slug immutabile dopo creazione

// DELETE /api/admin/tags/[tagId]
// → 204 No Content (cascade rimuove subscriber_tags)

// PUT /api/admin/subscribers/[id]/tags
// body: { tagIds: string[] }         // sostituzione totale
// → { subscriber: { id, tags: [...] } }

// POST /api/admin/subscribers/[id]/tags     // bulk-apply pattern
// body: { tagId, subscriberIds: string[] }
// → { applied: number }
```

> **Nota su bulk:** la rotta è `[id]` ma in modalità bulk `id` viene ignorato e si usa `subscriberIds` nel body. Pattern UI-friendly: il client può usare lo stesso endpoint sia single che bulk. In alternativa rotta separata `/api/admin/subscribers/bulk/tags`. Scegli il primo per minimizzare endpoint, il secondo per pulizia REST (decidi tu in implementazione).

### UI

`SubscriberTable.tsx` cresce:

- Checkbox per riga + checkbox "select all visible"
- Colonna "Tag" che renderizza chip colorati (badge `<span>` con `background: tag.color`)
- Bottone "Tag selezionati..." (visibile solo con ≥1 selezione) → dropdown con elenco tag → applica
- Link "Gestisci tag" in alto destra → apre `TagsManager` modal

`TagsManager.tsx`:

- Lista tag con `subscriberCount`
- Form inline per creare nuovo tag (slug, label, color picker, rank)
- Edit inline per rename/recolor
- Delete con conferma esplicita (mostra count subscribers che lo perderanno)

### Test

```typescript
// src/lib/tags.test.ts
describe('slugify', () => {
  it('lowercases and dashes', () => { expect(slugify('Milano VIP')).toBe('milano-vip') });
  it('rejects empty', () => { expect(() => slugify('')).toThrow() });
});

// src/components/admin/__tests__/TagsManager.test.tsx
- renders existing tags from API
- creates a new tag
- shows error on duplicate slug
- delete confirmation requires explicit click
```

API tests: integration via fetch mock + Supabase mock seguendo il pattern di `send-batch.test.ts`.

### UAT (Phase 1)

1. Crea tag "gold" colore `#BE8305`, "silver" colore `#C0C0C0`, "bronze" colore `#CD7F32`
2. Apri tabella iscritti → assegna "gold" a 3 subscriber
3. Verifica che la chip appare nella riga
4. Bulk: seleziona 5 subscriber → applica "silver" → ricarica → 5 chip visibili
5. Rinomina "silver" in "argento" → la modifica si propaga ovunque (lazy fetch dopo mutate)
6. Cancella "bronze" → conferma → tag e relazioni rimossi
7. Re-crea "bronze" con stesso slug → success (era stato hard-deleted)

**Definition of done Phase 1:** lista tag funzionante, assegnazione 1:1 e bulk testate, `npm run build && npx tsc --noEmit && npm run lint && npx vitest run` puliti.

---

## Phase 2 — Search Bar

### Backend

`/api/admin/subscribers` accetta:

- `q` (string, max 80 char): match `ILIKE %q%` su `email` AND `name` (OR tra loro)
- `tag` (string): slug singolo, filtra per `EXISTS (subscriber_tags WHERE tag.slug = ?)`
- Combinabile con `status`, `limit`, `offset` esistenti

Sanitizzazione: rifiuta `q` con caratteri SQL wildcard nudi (`%`, `_`) o esegue escape esplicito (`q.replace(/[%_]/g, '\\$&')`) — Supabase JS già escapa quando usi `.ilike`, ma fai il sanity check anyway.

```typescript
let query = supabase.from("subscribers").select(SELECT, { count: "exact" });
if (q) {
  const escaped = q.replace(/[%_]/g, "\\$&");
  query = query.or(`email.ilike.%${escaped}%,name.ilike.%${escaped}%`);
}
if (tag) {
  // Inner join via PostgREST embedded resource
  query = query.eq("subscriber_tags.tags.slug", tag);
}
```

### UI

`SubscriberTable.tsx`:

- Input `<input type="search">` in cima alla tabella, debounce 300ms via `useEffect` + `setTimeout` cleanup
- Chip "Filtro: tag=gold ✕" quando filtro attivo, click chip = clear
- Counter "X risultati" sotto l'input
- Empty state quando 0 risultati → "Nessun iscritto trovato per «query»"

### Test

```typescript
- typing "luca" debounces and fires API after 300ms
- clearing input removes ?q from API URL
- tag chip click clears tag filter
- 0 results shows empty state with the query echoed
```

### UAT (Phase 2)

1. Cerca "diop" → tabella si filtra a tutti i `*diop*@*` o nomi che contengono "diop"
2. Cancella → torna lista completa
3. Click su tag chip nella tabella → filtra per quel tag
4. Combina ricerca + tag → risultati ridotti
5. 0 risultati mostra messaggio chiaro

**Definition of done Phase 2:** ricerca instant-feedback, no jank, build/test puliti.

---

## Phase 3 — Audience Filters at Send Time

### Tipo `AudienceFilter` (canonical)

```typescript
// src/lib/audience.ts

export type AudienceFilter =
  | { kind: "all" }
  | {
      kind: "segment";
      // Tutti i predicati sono in AND. tagIds vuoto → ignorato.
      confirmedSince?: { hours: number }; // rolling N ore (D3)
      confirmedBefore?: string; // ISO datetime, esclude vecchi
      tagIds?: string[]; // tag in lista
      tagMatch?: "any" | "all"; // default 'any'
    };

// Esempi:
//   { kind: 'all' }
//   { kind: 'segment', confirmedSince: { hours: 24 } }
//   { kind: 'segment', tagIds: ['gold-id', 'silver-id'], tagMatch: 'any' }
//   { kind: 'segment', confirmedSince: { hours: 168 }, tagIds: ['gold-id'] }
```

Lo schema Zod parallelo vive in `validations.ts`.

### RPC PostgreSQL

Risolvere il filtro in PostgreSQL evita il round-trip "fetch tag-subscriber matches → fetch subscriber details" che è inefficiente per audience grandi. Una funzione singola:

```sql
CREATE OR REPLACE FUNCTION public.resolve_audience(filter jsonb)
RETURNS TABLE (subscriber_id uuid, token uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  kind text := filter->>'kind';
  confirmed_since_hours int := (filter->'confirmedSince'->>'hours')::int;
  confirmed_before timestamptz := (filter->>'confirmedBefore')::timestamptz;
  tag_ids uuid[] := ARRAY(SELECT jsonb_array_elements_text(filter->'tagIds'))::uuid[];
  tag_match text := COALESCE(filter->>'tagMatch', 'any');
BEGIN
  RETURN QUERY
  SELECT DISTINCT s.id, s.token, s.email
  FROM public.subscribers s
  WHERE s.status = 'confirmed'
    AND (kind = 'all' OR (
      (confirmed_since_hours IS NULL OR s.confirmed_at >= now() - make_interval(hours => confirmed_since_hours))
      AND (confirmed_before IS NULL OR s.confirmed_at < confirmed_before)
      AND (
        cardinality(tag_ids) = 0
        OR (tag_match = 'any' AND EXISTS (
          SELECT 1 FROM subscriber_tags st
          WHERE st.subscriber_id = s.id AND st.tag_id = ANY(tag_ids)
        ))
        OR (tag_match = 'all' AND NOT EXISTS (
          SELECT t FROM unnest(tag_ids) AS t
          WHERE NOT EXISTS (
            SELECT 1 FROM subscriber_tags st
            WHERE st.subscriber_id = s.id AND st.tag_id = t
          )
        ))
      )
    ));
END $$;

GRANT EXECUTE ON FUNCTION public.resolve_audience(jsonb) TO service_role;
```

Frontend chiama `supabase.rpc('resolve_audience', { filter })`.

### Send route flow

```typescript
// /api/admin/send (extracted pseudo-code)
const { subject, html, audience = { kind: "all" } } = parsed.data;

const { data: recipients, error } = await supabase.rpc("resolve_audience", { filter: audience });

if (error || !recipients || recipients.length === 0) {
  return Response.json(
    { error: "Nessun destinatario per questi filtri", code: "EMPTY_AUDIENCE" },
    { status: 400 },
  );
}

const { data: campaign } = await supabase
  .from("newsletter_campaigns")
  .insert({
    subject,
    source: "manual",
    recipient_count: recipients.length,
    html,
    audience_filter: audience, // ← nuovo campo
  })
  .select("id")
  .single();

await supabase
  .from("newsletter_campaign_recipients")
  .insert(recipients.map((r) => ({ campaign_id: campaign.id, subscriber_token: r.token })));

const result = await runCampaignSend({ campaignId: campaign.id, subject, html, siteUrl });
// ...
```

**Resume non cambia:** la lista `newsletter_campaign_recipients` è già stata snapshottata, `runCampaignSend` itera sui pending. Coerente con D7.

### Migration

```sql
ALTER TABLE public.newsletter_campaigns
  ADD COLUMN IF NOT EXISTS audience_filter jsonb;

CREATE INDEX IF NOT EXISTS idx_campaigns_audience_filter_kind
  ON public.newsletter_campaigns ((audience_filter->>'kind'));
```

### UI: AudiencePicker

```
┌─────────────────────────────────────────┐
│ Audience                                 │
│  ⦿ Tutti gli iscritti confermati (109)  │
│  ⦾ Filtro personalizzato                 │
│     ─────────────────────────            │
│     Confermati negli ultimi              │
│       [24h ▼] [stop ▼]                   │
│     Tag (qualsiasi):                     │
│       [gold ✕] [silver ✕] [+]            │
│     ☐ Devono avere TUTTI i tag           │
│                                          │
│     → 23 destinatari verranno inviati    │
└─────────────────────────────────────────┘
```

Live preview count: chiama `POST /api/admin/audience/preview` con il filtro corrente, debounce 400ms, mostra anche 5 email di esempio per dare riconoscimento ("ah, sì sono questi").

### Test (audience)

```typescript
// src/lib/audience.test.ts
describe('describeAudience', () => {
  it('renders "Tutti" for kind=all', ...);
  it('renders "ultimi 24 ore" for confirmedSince:24h', ...);
  it('renders "tag: gold OR silver" for tagMatch any', ...);
  it('renders "tag: gold AND silver" for tagMatch all', ...);
  it('combines predicates with comma', ...);
});

// integration test: mock RPC, verify the route passes filter through
// resume test: ensure resume of a segmented campaign re-runs only on snapshotted recipients
```

### UAT (Phase 3)

1. Crea campagna con filtro "ultimi 24h" → preview mostra N → invia → verifica solo N email partite
2. Crea campagna "tag: gold" → preview corretto → invia
3. Crea campagna "ultimi 7gg AND tag: silver" → verifica intersezione corretta
4. Audience vuota: tasto "Invia" disabilitato + messaggio "0 destinatari"
5. Resume di una campagna segmentata: nuovo iscritto entrato dopo la creazione NON riceve la mail (D7 verificato)
6. Storico: ogni riga mostra il badge audience corretto
7. Schedulazione: la campagna scheduled persiste il filtro, al cron ribindla agli iscritti che soddisfano il filtro **AL MOMENTO DEL CRON** — questa è una sottigliezza, vedi note sotto

> **Nota scheduled:** per le scheduled, è ragionevole risolvere il filtro `AL MOMENTO DELL'INVIO` perché l'utente l'ha programmato in anticipo aspettandosi "tutti quelli che entro venerdì hanno tag gold". Diverso dal manuale (D7=No). Quindi: scheduled risolve il filtro al cron tick (eccezione documentata in `send-scheduled/route.ts`).

**Definition of done Phase 3:** invio segmentato funziona end-to-end, preview live, storico mostra audience, build/test/lint puliti, UAT passato.

---

## Cross-cutting concerns

### Migration order

Phase 1 e Phase 2 possono essere applicate in qualsiasi ordine. Phase 3 dipende da Phase 1 (perché filtra per tag). Suggerisco:

1. Migration tag system → applica → Phase 1 deploy
2. Phase 2 deploy (no migration)
3. Migration audience_filter + RPC → applica → Phase 3 deploy

Ognuna è idempotente (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`).

### Backward compatibility

- Send API senza `audience` → comportamento attuale invariato (`kind: 'all'`)
- Storico precedente: `audience_filter IS NULL` → UI mostra "Tutti" come default
- Subscribers senza tag: nessun cambio di comportamento

### Performance

- 109 subscribers → trascurabile
- 1k subscribers + 10 tag → RPC < 50ms su Supabase free tier
- 10k subscribers + 100 tag → considerare materializzazione se l'admin filtra spesso (out of scope)

### Sicurezza

- Tutti gli endpoint admin: `auth()` check (pattern esistente)
- RLS: nuove tabelle ENABLE RLS, deny-all per anon (coerente con migration `20260416_enable_rls.sql`)
- RPC `resolve_audience` con `SECURITY DEFINER` → solo `service_role` può eseguirla (lato API)
- Validation Zod su tutti i body
- Rate limiting: il send esistente non ha rate limit interno (è admin-only) → nessun cambio

### Test strategy

Pattern esistente: Vitest + jsdom + mock Supabase/Resend.

- Unit pure (helpers in `tags.ts`, `audience.ts`): puro Vitest, no I/O
- API routes: fetch mock + `getSupabase()` mock (estendi pattern di `send-batch.test.ts`)
- UI: Testing Library + render con MSW se serve (oggi il progetto non usa MSW — fetch mock manuale OK)
- E2E manuale via UAT (i 3 list sopra), nessun Playwright al momento

### Definition of done globale

- `npm run build && npx tsc --noEmit && npm run lint && npx vitest run` → 0 errori
- 4 nuove migration applicate su Supabase di staging E poi production (ordine documentato)
- UAT Phase 1 + 2 + 3 superato manualmente sul preview Vercel prima del merge a `master`
- Nessuna regressione su flow esistente: invio "tutti", subscribe pubblico, unsubscribe, cron scheduled, follow-up

---

## Time estimate (engineer-day)

| Phase               | Backend | Frontend | Test  | Totale    |
| ------------------- | ------- | -------- | ----- | --------- |
| 1. Tag system       | 0.5d    | 0.75d    | 0.25d | **1.5d**  |
| 2. Search bar       | 0.25d   | 0.25d    | —     | **0.5d**  |
| 3. Audience filters | 0.5d    | 0.75d    | 0.25d | **1.5d**  |
| **Totale**          |         |          |       | **~3.5d** |

Con margine per imprevisti (RLS che si blocca, RPC permission glitch, regressioni UI): **4-5 giorni** su una persona.

---

## Order of execution suggerito

1. **Now**: confermare D1-D7 (sopra). Senza queste decisioni, Phase 3 può prendere strade diverse.
2. **Sprint 1**: Phase 1 + Phase 2 in un'unica milestone. Hanno overlap UI minimo (entrambe toccano `SubscriberTable.tsx`), quindi si fanno bene insieme.
3. **Sprint 2**: Phase 3.

In alternativa, se vuoi consegnare valore immediato, **Phase 2 da sola in 4 ore** (zero schema change) sblocca subito la search bar e ti dà tempo per discutere D1-D7 con calma.

---

## Out of scope (esplicitamente non incluso)

- Auto-tagging basato su comportamento (apertura/click) — richiede prima webhook Resend per gli `email.opened`
- Audience builder visuale "drag-and-drop" tipo Mailchimp — overkill per questa scala
- Custom fields liberi sul subscriber (oltre name/email) — non richiesto
- Esportazione CSV con filtri — utile ma non chiesto, 30 minuti se ti serve dopo
- API pubblica per assegnare tag (es. dal sito quando un utente compila un form premium) — futura
- Webhook Resend per bounce/complaint auto-block (proposto in chat ma separato da questo plan)

---

## Domande di chiusura

Prima di partire conferma:

1. D1-D7 (vedi tabella in cima)
2. Vuoi che Phase 1 e Phase 2 vadano insieme o separate?
3. Le tier "bronze/silver/gold" le creiamo come dato seed nella migration o le crei tu manualmente dall'admin dopo deploy?
4. Il colore dei tag deve essere libero (color picker) o limitato a una palette del brand (cream/burgundy/green/orange)?
