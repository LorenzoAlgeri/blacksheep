# Phase 13 — Rollback Plan

Feature: BLACKSHEEP_LIST_ENABLED  
Branch: feat/blacksheep-list  
Last updated: 2026-05-06

---

## Scenario A — Bug critico in produzione

**Trigger:** crash visibile, 5xx su pagine pubbliche, degradazione Lighthouse > 20 punti.

**Responsabile:** Lorenzo  
**Tempo stimato:** 30 secondi

**Steps:**

1. Apri Vercel Dashboard → progetto `newsletter`
2. Vai su **Deployments**
3. Trova il deployment precedente stabile
4. Click **⋯** → **Promote to Production**

**Oppure via CLI:**

```bash
vercel rollback
```

**Verifica post-rollback:**

- Visita la home → form newsletter funzionante
- Visita `/admin/login` → login funzionante
- `BLACKSHEEP_LIST_ENABLED` rimane `false` in prod (non toccare)

---

## Scenario B — Bug nel feature flag (lista visibile quando non deve)

**Trigger:** la sezione BlackSheep List appare in produzione anche con flag `false`, oppure `/api/events` risponde 200 invece di 404.

**Responsabile:** Lorenzo  
**Tempo stimato:** 2 minuti

**Steps:**

1. Vercel Dashboard → progetto `newsletter` → **Settings** → **Environment Variables**
2. Verifica che `BLACKSHEEP_LIST_ENABLED` sia `false` per l'ambiente Production
3. Se `true` per errore: modifica → `false` → **Save**
4. Forza redeploy: Vercel Dashboard → **Deployments** → ultimo deployment → **⋯** → **Redeploy**

**Oppure via CLI:**

```bash
vercel env rm BLACKSHEEP_LIST_ENABLED production
vercel env add BLACKSHEEP_LIST_ENABLED production
# inserire: false
vercel deploy --prod
```

**Verifica:** curl -I https://<dominio>/api/events → deve rispondere 404.

---

## Scenario C — Problema database (migration corrotta o dati inconsistenti)

**Trigger:** errori Supabase nei log (5xx su `/api/events`, `/api/admin/events`), dati duplicati o inconsistenti in `list_events` o `list_event_registrations`.

**Responsabile:** Lorenzo  
**Tempo stimato:** 5-15 minuti

**Steps:**

1. Disabilita immediatamente la feature: imposta `BLACKSHEEP_LIST_ENABLED=false` (→ Scenario B)
2. Apri Supabase Dashboard → database `newsletter` (prod)
3. Valuta impatto: quante righe corrotte, in quale tabella
4. Se migration corrotta, esegui il file di rollback:

```sql
-- File: apps/newsletter/supabase/migrations/rollback/
-- .rollback_20260501_blacksheep_list_events.sql
-- ATTENZIONE: questo DROP rimuove TUTTI i dati list_events e list_event_registrations
-- Eseguire SOLO in emergenza dopo backup manuale

DROP TABLE IF EXISTS list_event_registrations;
DROP TABLE IF EXISTS list_events;
```

5. Esegui il file di rollback da Supabase SQL Editor (o `supabase db push`)
6. Verifica integrità delle tabelle newsletter rimanenti: `subscribers`, `contact_help_requests`

**Cascading impact:**

- `list_events` eliminata → tutte le registrazioni eventi perse
- `list_event_registrations` eliminata → storico iscrizioni eventi perso
- Newsletter subscribers e form iscrizione: **non impattati**
- Admin panel iscritti: **non impattato**

**Post-rollback:** le tabelle possono essere ricreate con la migration originale dopo debug.

---

## Scenario D — Problema reputazione email (bounce, spam trap)

**Trigger:** Resend dashboard mostra bounce rate > 5%, spam complaints, o dominio `noreply@blacksheep-community.com` inserito in blocklist.

**Responsabile:** Lorenzo  
**Tempo stimato:** 5 minuti (disable) + giorni (recovery reputazione)

**Steps — Disable immediato:**

1. Vercel Dashboard → Environment Variables → rimuovi `RESEND_API_KEY` dalla produzione
2. Forza redeploy (→ Scenario B step 4)
3. Tutte le email di conferma, reinvio, contatto smettono di funzionare

**Oppure — Switch sender domain:**

1. In Resend dashboard: aggiungi dominio alternativo (es. `info@lorenzoalgeri.it`)
2. Aggiorna `RESEND_FROM_EMAIL` in Vercel env: `BLACK SHEEP <info@lorenzoalgeri.it>`
3. Aggiorna `REPLY_TO_EMAIL` se necessario
4. Forza redeploy

**Recovery reputazione:**

- Contatta Resend support per sblocco
- Implementa double opt-in più stringente se necessario
- Rivedi contenuti email per spam trigger words

**Note:** `contact_help_requests` non invia email direttamente — i contatti vengono salvati in DB e notificati via Resend. Disabilitare Resend non perde dati, solo notifiche.

---

## Checklist pre-flag-on (quando Lorenzo decide di abilitare BLACKSHEEP_LIST_ENABLED=true in prod)

- [ ] Smoke test 10/10 completato su preview URL
- [ ] DB prod: almeno 1 evento `published` con `event_date` futuro
- [ ] Resend: email di test ricevuta entro 30s
- [ ] Lighthouse accessibility score >= 90 su dialog principali
- [ ] Lorenzo ha approvato esplicitamente l'abilitazione
