# BLACK SHEEP Newsletter — Report Completo

> Documento generato il 4 aprile 2026

---

## 1. PANORAMICA PROGETTO

| Campo | Valore |
|-------|--------|
| **Nome progetto** | BLACK SHEEP — Newsletter System |
| **Cliente** | BLACK SHEEP (club night, Milano) |
| **Data inizio** | 4 aprile 2026, ore 14:02 |
| **Stato attuale** | Sviluppo completato, in attesa di deploy in produzione |
| **Durata sviluppo** | ~6 ore (14:02 – 19:49, singola sessione) |

### Stack Tecnologico

| Tecnologia | Versione | Ruolo |
|-----------|---------|-------|
| Next.js | 16.2.2 | Framework full-stack (App Router) |
| React | 19.2.4 | UI library |
| TypeScript | ^5 | Type safety (strict mode) |
| Tailwind CSS | ^4 | Styling utility-first |
| GSAP | ^3.14.2 | Animazioni entrance + ambient |
| @gsap/react | ^2.1.2 | Hook useGSAP per React |
| NextAuth.js | ^5.0.0-beta.30 | Autenticazione admin (JWT + credentials) |
| Supabase | ^2.101.1 | Database PostgreSQL (subscribers, scheduled_newsletters) |
| Resend | ^6.10.0 | Invio email transazionali e newsletter |
| Zod | ^4.3.6 | Validazione input server-side e client-side |
| React Hook Form | ^7.72.1 | Form management + validazione |
| bcryptjs | ^3.0.3 | Hashing password admin |
| Lucide React | ^1.7.0 | Icone SVG (admin panel) |
| Turborepo | ^2.9.3 | Monorepo management |
| ESLint | ^9 + eslint-config-next | Linting |

### Commit (20 totali)

| # | Hash | Messaggio |
|---|------|----------|
| 1 | `db687ab` | chore: initial monorepo setup — newsletter + shared packages |
| 2 | `a86efdf` | feat(newsletter): brand foundation — fonts, colors, animations, layout |
| 3 | `74f08fe` | feat(newsletter): lib — Zod schemas, Supabase client, rate limiter |
| 4 | `e0d450a` | feat(newsletter): POST /api/subscribe with rate limit, honeypot, double opt-in |
| 5 | `23d7573` | feat(newsletter): confirm + unsubscribe flows (double opt-in, GDPR) |
| 6 | `bfccdb6` | feat(newsletter): SubscribeForm + SuccessMessage client components |
| 7 | `be84437` | feat(newsletter): landing page — VIP digital invite design |
| 8 | `95e21c2` | feat(newsletter): security headers + proxy for admin auth |
| 9 | `e0a375d` | feat(newsletter): NextAuth v5 + admin login page |
| 10 | `0612485` | feat(newsletter): admin dashboard with subscriber list + stats |
| 11 | `0a349a3` | feat(newsletter): admin compose + batch send with unsubscribe links |
| 12 | `e577f6d` | fix(newsletter): Suspense boundary for useSearchParams, lint fix |
| 13 | `9f2d9e1` | fix(newsletter): server-side auth check in admin layout |
| 14 | `8cf6359` | fix(newsletter): resolve admin login redirect loop |
| 15 | `6b3cd9b` | fix(newsletter): align color palette with official brand guidelines + add mascot |
| 16 | `ea1803d` | feat(newsletter): redesign landing page with official brand assets |
| 17 | `6887765` | feat(newsletter): VIP atmosphere polish — depth, glow, refined inputs |
| 18 | `de5b396` | feat(newsletter): raw monochrome redesign — black + cream, flash aesthetic |
| 19 | `b1d73e7` | fix(newsletter): debug audit — subscription, admin auth, redirect loop |
| 20 | `fcabfe5` | fix(newsletter): admin auth — base64 encode bcrypt hash to avoid dotenv $ expansion |

---

## 2. STRUTTURA CODEBASE

### File del progetto (esclusi node_modules, .next, lock files)

#### Root monorepo

| File | Linguaggio | Righe | Descrizione |
|------|-----------|-------|-------------|
| `package.json` | JSON | 18 | Root monorepo con workspaces (apps/*, packages/*) |
| `CLAUDE.md` | Markdown | — | Istruzioni progetto per l'AI assistant |

#### packages/shared (Design System condiviso)

| File | Linguaggio | Righe | Descrizione |
|------|-----------|-------|-------------|
| `brand.ts` | TypeScript | 41 | Costanti brand: colori, font, social, venue |
| `design-system.css` | CSS | 71 | CSS custom properties: colori, tipografia, spacing, shadows, transitions |
| `BSLogo.tsx` | TSX | 32 | Componente React del logo SVG con props configurabili |
| `package.json` | JSON | 4 | Package config per il modulo shared |

**Subtotale shared:** 148 righe di codice

#### apps/newsletter

| File | Linguaggio | Righe | Descrizione |
|------|-----------|-------|-------------|
| **Config** | | | |
| `package.json` | JSON | 38 | Dipendenze, scripts, metadata |
| `next.config.ts` | TypeScript | 27 | Security headers (CSP, HSTS, X-Frame-Options, nosniff) |
| `tsconfig.json` | JSON | — | TypeScript strict configuration |
| `eslint.config.mjs` | JS | — | ESLint config con next/core-web-vitals |
| `postcss.config.mjs` | JS | — | PostCSS con plugin Tailwind |
| `vercel.json` | JSON | 8 | Cron job per invio programmato (ogni 5 min) |
| **Stili** | | | |
| `src/app/globals.css` | CSS | 233 | Design system completo: variabili, animazioni, spacing fluido, grain, shimmer |
| **Pagine** | | | |
| `src/app/layout.tsx` | TSX | 35 | Root layout: font locale Arial Black, metadata SEO, OpenGraph |
| `src/app/page.tsx` | TSX | 86 | Landing page: logo SVG inline, titolo, form, footer Instagram |
| `src/app/confirm/page.tsx` | TSX | 30 | Pagina conferma iscrizione (double opt-in completato) |
| `src/app/unsubscribe/page.tsx` | TSX | 23 | Pagina disiscrizione (GDPR compliance) |
| `src/app/admin/layout.tsx` | TSX | 7 | Layout wrapper area admin |
| `src/app/admin/login/page.tsx` | TSX | 84 | Login admin con NextAuth credentials, Suspense boundary |
| `src/app/admin/(dashboard)/layout.tsx` | TSX | 39 | Layout dashboard: header, nav, auth check server-side |
| `src/app/admin/(dashboard)/page.tsx` | TSX | 10 | Dashboard iscritti con tabella e statistiche |
| `src/app/admin/(dashboard)/compose/page.tsx` | TSX | 12 | Pagina composizione newsletter |
| **Componenti** | | | |
| `src/components/LandingMotion.tsx` | TSX | 284 | Animazioni GSAP: entrance timeline 4-fasi + ambient motion (5 effetti) |
| `src/components/SubscribeForm.tsx` | TSX | 103 | Form iscrizione: React Hook Form + Zod, honeypot, error handling |
| `src/components/SuccessMessage.tsx` | TSX | 31 | Messaggio post-iscrizione con checkmark animato |
| `src/components/admin/ComposeEditor.tsx` | TSX | 1024 | Editor newsletter completo (il componente piu' complesso del progetto) |
| `src/components/admin/SubscriberTable.tsx` | TSX | 103 | Tabella iscritti con statistiche, stati, icone |
| **API Routes** | | | |
| `src/app/api/subscribe/route.ts` | TypeScript | 164 | Iscrizione: rate limit, Zod, honeypot, upsert Supabase, email conferma |
| `src/app/api/confirm/route.ts` | TypeScript | 31 | Conferma email (token UUID) |
| `src/app/api/unsubscribe/route.ts` | TypeScript | 27 | Disiscrizione (token UUID, GDPR) |
| `src/app/api/auth/[...nextauth]/route.ts` | TypeScript | 3 | NextAuth catch-all route |
| `src/app/api/admin/subscribers/route.ts` | TypeScript | 20 | GET iscritti (auth-protected) |
| `src/app/api/admin/send/route.ts` | TypeScript | 66 | Invio newsletter batch (50/batch, delay 1s) |
| `src/app/api/admin/schedule/route.ts` | TypeScript | 32 | Programmazione invio (salva su Supabase) |
| `src/app/api/admin/upload/route.ts` | TypeScript | 59 | Upload immagini su Supabase Storage (max 5MB) |
| `src/app/api/cron/send-scheduled/route.ts` | TypeScript | 84 | Cron job: invia newsletter programmate (batch 50, token auth) |
| **Librerie** | | | |
| `src/lib/auth.ts` | TypeScript | 36 | NextAuth v5 config: credentials provider, bcrypt base64, JWT |
| `src/lib/validations.ts` | TypeScript | 22 | Schemi Zod: subscribe, sendNewsletter, scheduleNewsletter |
| `src/lib/supabase.ts` | TypeScript | 13 | Client Supabase con service role key |
| `src/lib/resend.ts` | TypeScript | 7 | Client Resend per invio email |
| `src/lib/rate-limit.ts` | TypeScript | 21 | Rate limiter in-memory (3 req/min per IP) |
| `src/lib/email-template.ts` | TypeScript | 187 | Template email HTML: palette presets, eventi, lineup, CTA |
| `src/proxy.ts` | TypeScript | 26 | Middleware auth: protegge /admin, check session cookie |

### Totale righe di codice

| Categoria | Righe |
|-----------|-------|
| TypeScript/TSX (apps/newsletter) | 2,931 |
| CSS (apps/newsletter) | 233 |
| TypeScript/TSX (packages/shared) | 73 |
| CSS (packages/shared) | 71 |
| **TOTALE** | **3,079** |

> Escluse: configurazioni auto-generate (next-env.d.ts, postcss.config.mjs, eslint.config.mjs), node_modules, .next, package-lock.json.

---

## 3. FUNZIONALITA' REALIZZATE

### 3.1 Landing Page

**Utente:** Vede una pagina nera elegante con logo animato, titolo "BLACK SHEEP", form di iscrizione e link Instagram. Il design ricorda l'ingresso in un club: buio iniziale, poi il logo emerge con un effetto glow.

**Tecnico:**
- Layout mobile-first (max-width 480px centrato)
- Logo SVG inline (2 path, fill="currentColor") con dimensione fluida `clamp(80px, 12dvh, 120px)`
- Titolo con font-size fluido `clamp(3rem, 10dvw, 4.5rem)`
- Spacing fluido con `dvh`/`dvw` clamp su 10 proprieta'
- Grain overlay SVG via feTurbulence (inline, nessun asset esterno)
- Background radial gradient animato
- Spotlight element con lento drift
- Metadata SEO + OpenGraph completi

**Complessita':** Media

### 3.2 Animazioni GSAP (Entrance + Ambient)

**Utente:** Al primo accesso, la pagina si anima in 4 fasi: buio (0-1.2s), il logo emerge (1.2-2.0s), il titolo si rivela con un "drop" (2.0-2.7s), il form appare (2.7-3.5s). Dopo l'entrance, il logo respira, il divider pulsa, lo shimmer lampeggia. Al ritorno nella stessa sessione, l'entrance viene saltata.

**Tecnico:**
- `LandingMotion.tsx`: 284 righe, componente wrapper con `useGSAP`
- **Entrance timeline (4 fasi):**
  - Fase 1 "Il Buio" (0-1.2s): 0.4s di buio deliberato, poi gradient fade-in
  - Fase 2 "Il Riconoscimento" (1.2-2.0s): logo scale con `back.out(1.7)`, glow drop-shadow, "EVERY MONDAY" fade
  - Fase 3 "Il Drop" (2.0-2.7s): titolo con clip-path reveal + blur-to-focus simultanei, location fade
  - Fase 4 "La Discesa" (2.7-3.5s): divider, input stagger, CTA con glow activation, microcopy
- **Ambient motion (5 effetti sincronizzati su base 4s):**
  1. Logo breathing (4s, sine.inOut, yoyo)
  2. Logo glow drop-shadow (4s, offset 1s)
  3. Spotlight drift (12s, triple cycle)
  4. Divider pulse (2s, half cycle)
  5. "EVERY MONDAY" shimmer (1.2s flash ogni 8s)
- CTA breathing glow via CSS animation (2s cycle)
- Grain drift via CSS steps animation (8s)
- `sessionStorage` per skip entrance al ritorno (con try/catch per Safari private)
- `prefers-reduced-motion`: tutto visibile istantaneamente, nessuna animazione

**Complessita':** Alta

### 3.3 Sistema di Iscrizione

**Utente:** Inserisce email (e opzionalmente nome), clicca "THE PLACE TO BE", vede un'animazione di successo con checkmark. Riceve un'email di conferma brandizzata.

**Tecnico:**
- **Client-side:**
  - React Hook Form con zodResolver
  - Validazione Zod: email required, nome opzionale (max 100 char), campo honeypot
  - Stato di submitting con disabilitazione bottone
  - Errori server visualizzati sotto il form
  - `SuccessMessage` con animazione fade-in-scale + checkmark SVG draw
- **Server-side (`POST /api/subscribe`):**
  - Rate limiting per IP (3 req/min, sliding window 60s)
  - Validazione Zod del body
  - Honeypot check: se il campo `website` ha contenuto, risponde 200 silenziosamente (non rivela il meccanismo)
  - Upsert Supabase: inserisce o aggiorna subscriber con status "pending"
  - Genera token UUID automatico (lato DB)
  - Invia email di conferma via Resend con template HTML brandizzato completo

**Complessita':** Alta

### 3.4 Double Opt-In

**Utente:** Riceve email con bottone "THE PLACE TO BE". Cliccando, viene reindirizzato a pagina di conferma. Se clicca di nuovo, vede "GIA' CONFERMATO".

**Tecnico:**
- `GET /api/confirm?token=UUID`: verifica token, aggiorna status a "confirmed" con timestamp, redirect a `/confirm`
- Pagina `/confirm`: mostra messaggio diverso se `already=true`
- Template email conferma: HTML table-based (compatibilita' email client), completamente brandizzato

**Complessita':** Media

### 3.5 Disiscrizione (GDPR)

**Utente:** Link "Disiscriviti" in ogni email. Cliccando, viene reindirizzato a pagina di conferma disiscrizione.

**Tecnico:**
- `GET /api/unsubscribe?token=UUID`: aggiorna status a "unsubscribed", redirect a `/unsubscribe`
- Link presente in: email di conferma, footer di ogni newsletter
- Token univoco per subscriber (no email in URL per privacy)

**Complessita':** Bassa

### 3.6 Admin — Autenticazione

**Utente:** Accede a `/admin/login`, inserisce email e password, viene reindirizzato alla dashboard.

**Tecnico:**
- NextAuth v5 con strategy JWT e Credentials provider
- Password hash bcrypt memorizzato in `.env.local` come base64 (per evitare problemi di escape con i caratteri `$` di bcrypt in dotenv)
- Decodifica a runtime: `Buffer.from(hash, "base64").toString()`
- Import dinamico di `bcryptjs` per ottimizzare il bundle
- Pagina login con Suspense boundary per `useSearchParams`
- Middleware proxy: controlla cookie sessione (`__Secure-authjs.session-token` o `authjs.session-token`)
- Layout dashboard: `auth()` server-side con redirect se non autenticato

**Complessita':** Alta (debug redirect loop + encoding hash = 3 bugfix commit dedicati)

### 3.7 Admin — Dashboard Iscritti

**Utente:** Vede 3 card con statistiche (Totali, Confermati, In attesa) e una tabella con tutti gli iscritti (email, nome, stato con icona colorata, data).

**Tecnico:**
- `SubscriberTable.tsx`: fetch `/api/admin/subscribers`, state management con useState
- 3 KPI cards con icone Lucide (Users, CheckCircle, Clock)
- Tabella responsive con 3 stati visuali: Confermato (verde), In attesa (grigio), Disiscritto (dimmed)
- `GET /api/admin/subscribers`: auth check, query Supabase ordinata per data desc

**Complessita':** Media

### 3.8 Admin — Editor Newsletter (ComposeEditor)

**Utente:** Editor strutturato per comporre newsletter: oggetto, titolo, messaggio, palette colori (8 preset), foto (upload o URL), multi-evento con lineup builder, CTA personalizzabile. Preview live dell'email. Salvataggio bozze come template. Invio immediato o programmato.

**Tecnico (1024 righe — il componente piu' complesso):**
- **Stato:** 12 campi gestiti via `useState` + `EditorState` interface
- **Auto-save:** debounced (1s) su localStorage con scadenza 7 giorni
- **Template system:** salva/carica/elimina template da localStorage
- **Palette picker:** 8 preset (Classic, Midnight, Monochrome, Burgundy, Purple, Forest, Daylight, Clean) con preview cerchi colorati
- **Photo upload:**
  - Upload file: FormData via `/api/admin/upload` -> Supabase Storage
  - Validazione tipo (JPG/PNG/WebP/GIF) e dimensione (max 5MB)
  - Preview thumbnail con rimozione
  - Oppure incolla URL diretto
- **Multi-evento (max 4):**
  - Titolo evento con data auto-calcolata (prossimo lunedi')
  - Orario e location pre-compilati
  - Lineup builder: aggiungi/rimuovi artisti, 5 ruoli (DJ SET, LIVE, DANCE PERFORMANCE, SPECIAL GUEST, HOST)
  - Riordinamento eventi (up/down)
- **CTA configurabile:** testo e link personalizzabili
- **Contatore destinatari live:** fetch count iscritti confermati
- **Invio programmato:** date picker + time picker, salva su Supabase `scheduled_newsletters`
- **Tab navigation:** Editor / Preview / Bozze
- **Preview:** rendering HTML live con `dangerouslySetInnerHTML`
- **Invio:** conferma modale, feedback batch (N/totale inviati)
- **Reset:** conferma modale, ripristina valori default

**Complessita':** Molto alta

### 3.9 Invio Newsletter (Batch)

**Utente:** Clicca "Invia Newsletter", conferma, vede il risultato "Inviata a X/Y iscritti".

**Tecnico:**
- `POST /api/admin/send`: auth check, validazione Zod
- Query Supabase per iscritti confermati
- Invio in batch di 50 con `Promise.allSettled` (resiliente a singoli errori)
- Delay 1s tra batch (rispetto rate limit Resend)
- Personalizzazione: link disiscrizione unico per subscriber (token-based)
- Sostituzione placeholder `{{UNSUB}}` nel template

**Complessita':** Alta

### 3.10 Invio Programmato (Cron Job)

**Utente:** Programma una newsletter per data/ora futura. Viene inviata automaticamente.

**Tecnico:**
- `POST /api/admin/schedule`: salva su tabella `scheduled_newsletters` con `scheduled_at`
- `GET /api/cron/send-scheduled`: eseguito ogni 5 minuti (Vercel Cron via `vercel.json`)
- Auth via Bearer token (`CRON_SECRET`)
- Query: newsletter non inviate con `scheduled_at <= now()`
- Stesso meccanismo batch dell'invio immediato
- Marca come `sent: true` dopo completamento

**Complessita':** Alta

### 3.11 Template Email HTML

**Utente:** Le email ricevute sono completamente brandizzate, con header BLACK SHEEP, palette colori, eventi con lineup, foto, CTA, footer con disiscrizione.

**Tecnico (`email-template.ts`, 187 righe):**
- `buildEmailHtml()`: genera HTML email table-based (compatibilita' Outlook/Gmail/Apple Mail)
- 8 palette preset con utility `hexAlpha()` per opacita'
- Blocchi: header (logo + "EVERY MONDAY"), divider, titolo, body con `nl2br()`, foto, eventi (multipli con lineup), CTA, footer
- `getNextMonday()`: calcola automaticamente il prossimo lunedi'
- `makeDefaultEvent()`: genera evento default con data, orario, location
- Interfacce TypeScript: `EmailTemplateData`, `EventEntry`, `ArtistEntry`, `EmailPalette`, `PalettePreset`

**Complessita':** Alta

---

## 4. METRICHE TECNICHE

### Sicurezza implementata

| Misura | Dettaglio |
|--------|-----------|
| Rate limiting | 3 req/min per IP su `/api/subscribe` (sliding window in-memory) |
| Honeypot anti-bot | Campo `website` hidden, risposta 200 silenziosa se compilato |
| Validazione Zod | Su OGNI endpoint: subscribe, send, schedule |
| Security headers | CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, HSTS 1 anno, Referrer-Policy |
| Auth admin | NextAuth v5 JWT + bcrypt password hash (base64-encoded) |
| Middleware proxy | Cookie check su tutte le route `/admin/*` (escluso login) |
| CSRF protection | SameSite cookies (default NextAuth) |
| Token-based unsubscribe | UUID token in URL, nessuna email esposta |
| Cron auth | Bearer token per endpoint cron |
| Upload validation | Tipo file (4 formati) + dimensione max (5MB) |

### Conteggi

| Metrica | Valore |
|---------|--------|
| API Routes | 9 |
| Pagine/Route | 6 |
| Layout | 3 |
| Componenti React (file .tsx in components/) | 5 |
| Sub-componenti interni (Divider, Toggle, EventBlock) | 3 |
| Schemi Zod | 3 |
| Librerie custom (src/lib/) | 6 |
| Interfacce/Types TypeScript | 12 |

### API Routes dettaglio

| Route | Metodo | Auth | Descrizione |
|-------|--------|------|-------------|
| `/api/subscribe` | POST | No (rate limited) | Iscrizione con double opt-in |
| `/api/confirm` | GET | No (token) | Conferma email |
| `/api/unsubscribe` | GET | No (token) | Disiscrizione GDPR |
| `/api/auth/[...nextauth]` | GET/POST | — | NextAuth handler |
| `/api/admin/subscribers` | GET | Si (session) | Lista iscritti |
| `/api/admin/send` | POST | Si (session) | Invio newsletter batch |
| `/api/admin/schedule` | POST | Si (session) | Programma invio |
| `/api/admin/upload` | POST | Si (session) | Upload immagini |
| `/api/cron/send-scheduled` | GET | Si (Bearer) | Cron invio programmato |

---

## 5. ASSET E DESIGN

### Font

| Font | Uso | Metodo di caricamento |
|------|-----|----------------------|
| Arial Black | Heading, display, CTA, brand identity | `next/font/local` da file `Arial_Black.ttf`, `--font-brand` CSS variable, `display: swap`, weight 900 |
| System font stack | Body text, form, microcopy | CSS variable `--font-body`: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif |

### Logo SVG

- **1 logo** con 2 implementazioni:
  1. **Inline nella landing page** (`page.tsx`): SVG diretto con `fill="currentColor"`, dimensione fluida `clamp(80px, 12dvh, 120px)`
  2. **Componente riutilizzabile** (`packages/shared/BSLogo.tsx`): props `width`, `height`, `className`, aria-label
- Viewbox: `0 0 1389.1 879.04`
- 2 path SVG (silhouette pecora stilizzata)

### Palette Colori

| Nome | Hex | Uso |
|------|-----|-----|
| Navy | `#031240` | Background primario (design system), palette "Midnight" |
| Cream | `#FFFFF3` | Testo primario, CTA background |
| Gold | `#BE8305` | Accento speciale, palette "Classic"/"Midnight" |
| Black | `#1F1F1F` | Background neutro |
| Green | `#334B31` | Stato "confermato", successo |
| Purple | `#65305C` | Accento alternativo |
| Burgundy | `#731022` | Errori, accento forte |
| Pure Black | `#000000` | Background landing page (scelta finale monochrome) |

8 palette email preset: Classic, Midnight, Monochrome, Burgundy, Purple, Forest, Daylight, Clean.

### Animazioni complete

| Animazione | Tipo | Durata | Proprieta' |
|-----------|------|--------|-----------|
| Background gradient fade | GSAP entrance | 0.8s | opacity (power2.inOut) |
| Logo materialize | GSAP entrance | 0.8s | opacity + scale (back.out 1.7) |
| Logo glow | GSAP entrance | 0.8s | filter drop-shadow (power2.out) |
| "EVERY MONDAY" fade | GSAP entrance | 0.3s | opacity + y (power2.out) |
| Title clip-path reveal | GSAP entrance | 0.8s | clipPath inset (power3.out) |
| Title blur-to-focus | GSAP entrance | 0.6s | filter blur (power2.out) |
| Location fade | GSAP entrance | 0.3s | opacity (power2.out) |
| Divider fade | GSAP entrance | 0.3s | opacity (power2.out) |
| Input slide-up | GSAP entrance | 0.4s | opacity + y, stagger 0.1s (power2.out) |
| CTA appear | GSAP entrance | 0.4s | opacity + scale (power2.out) |
| Microcopy fade | GSAP entrance | 0.3s | opacity (power2.out) |
| Footer fade | GSAP entrance | 0.3s | opacity (power2.out) |
| Spotlight fade | GSAP entrance | 1.5s | opacity (power1.out) |
| Logo breathing | GSAP ambient | 4s loop | scale + opacity (sine.inOut, yoyo) |
| Logo glow pulse | GSAP ambient | 4s loop | filter drop-shadow (sine.inOut, yoyo) |
| Spotlight drift | GSAP ambient | 12s loop | x + y (sine.inOut, yoyo) |
| Divider pulse | GSAP ambient | 2s loop | opacity (sine.inOut, yoyo) |
| Shimmer text | GSAP ambient | 1.2s ogni 8s | backgroundPosition (power2.inOut) |
| CTA glow breathe | CSS animation | 2s loop | box-shadow (ease-in-out) |
| Grain drift | CSS animation | 8s, steps(4) | transform translate |
| Success fade-in-scale | CSS animation | 0.8s | opacity + scale (cubic-bezier) |
| Checkmark draw | CSS animation | 0.4s, delay 0.2s | stroke-dashoffset (ease-out) |

**Totale: 22 animazioni** (13 entrance GSAP, 5 ambient GSAP, 4 CSS)

### Responsive

| Viewport | Strategia |
|----------|----------|
| iPhone SE (375px) | Design primario. Spacing fluido con clamp(min, preferred, max). Padding minimo 24px top, 16px bottom. Font title 3rem |
| iPhone 14 / standard (390-430px) | Scaling fluido automatico via dvh/dvw |
| Desktop (640px+) | Media query per input/CTA sizing. Max-width 480px centrato. Font title fino a 4.5rem |

10 proprieta' fluid spacing implementate con `clamp()` + `dvh`/`dvw`.

---

## 6. COSA MANCA PER IL GO-LIVE

### Azioni tecniche

| # | Azione | Priorita' | Note |
|---|--------|----------|------|
| 1 | Deploy su Vercel | Critica | Collegare repo, configurare env vars |
| 2 | Configurare variabili d'ambiente in Vercel | Critica | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH_B64`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET` |
| 3 | Creare tabella `subscribers` in Supabase | Critica | Colonne: id, email (unique), name, status, token (UUID default), created_at, confirmed_at |
| 4 | Creare tabella `scheduled_newsletters` in Supabase | Critica | Colonne: id, subject, html, scheduled_at, sent (default false), created_at |
| 5 | Creare bucket `newsletter-images` in Supabase Storage | Media | Per upload foto nell'editor |
| 6 | Configurare dominio in Resend | Critica | Verificare dominio per invio da email brandizzata |
| 7 | Configurare dominio custom in Vercel | Alta | DNS setup |
| 8 | Verificare Vercel Cron | Alta | Testare che `/api/cron/send-scheduled` venga eseguito ogni 5 min |
| 9 | Generare `NEXTAUTH_SECRET` per produzione | Critica | `openssl rand -base64 32` |
| 10 | Testare flusso completo in produzione | Alta | Subscribe -> conferma email -> admin login -> compose -> send |

### Azioni del cliente

| # | Azione | Priorita' | Note |
|---|--------|----------|------|
| 1 | Acquistare/fornire dominio | Critica | Es. blacksheep.community o newsletter.blacksheep.community |
| 2 | Fornire credenziali admin definitive | Critica | Email + password per il pannello admin |
| 3 | Fornire logo ufficiale per favicon | Bassa | Attualmente usa default Next.js |
| 4 | Revisione contenuti landing page | Bassa | Testi attualmente in italiano, verificare copy |
| 5 | Prima newsletter di test | Alta | Verificare rendering su diversi email client (Gmail, Apple Mail, Outlook) |

---

## 7. RIEPILOGO QUANTITATIVO

| Metrica | Valore |
|---------|--------|
| File creati/modificati | 38 |
| Righe di codice (TS/TSX/CSS) | 3,079 |
| Commit | 20 |
| Pagine/Route | 6 |
| Layout | 3 |
| API Endpoints | 9 |
| Componenti React (file) | 5 (+3 sub-componenti interni) |
| Animazioni totali | 22 (13 GSAP entrance + 5 GSAP ambient + 4 CSS) |
| Schemi validazione Zod | 3 |
| Palette email preset | 8 |
| Misure di sicurezza | 10 |
| Interfacce TypeScript | 12 |
| Dipendenze runtime | 14 |
| Dipendenze dev | 8 |

### Stima ore di sviluppo (developer senior, senza AI)

| Area | Ore stimate | Motivazione |
|------|-------------|-------------|
| Setup monorepo + Turborepo + config | 2-3h | package.json, workspaces, tsconfig, eslint, tailwind |
| Design system condiviso (brand.ts, CSS vars, logo) | 2-3h | Definizione token, variabili, componente logo |
| Landing page (layout, responsive, fluid spacing) | 4-6h | Design mobile-first, 10 proprieta' fluid, grain overlay |
| Animazioni GSAP (entrance + ambient, 22 effetti) | 8-12h | Timeline 4 fasi, 5 ambient loops, sessionStorage, reduced-motion |
| Form iscrizione (RHF + Zod + honeypot) | 2-3h | Client validation, server validation, honeypot silenzioso |
| API subscribe + double opt-in | 3-4h | Rate limiter, upsert, email template HTML, conferma token |
| Flusso conferma + disiscrizione (GDPR) | 1-2h | 2 API routes, 2 pagine, token-based |
| Auth admin (NextAuth v5 + middleware + debug) | 4-6h | Config JWT, credentials, proxy, redirect loop debug, bcrypt base64 |
| Dashboard iscritti | 2-3h | Fetch, stats cards, tabella, stati visuali |
| Editor newsletter (ComposeEditor, 1024 righe) | 12-16h | Il pezzo piu' complesso: stato, auto-save, palette, foto upload, multi-evento, lineup builder, template system, preview, schedule |
| Template email HTML | 3-4h | Table-based compatibile, palette dynamic, eventi, lineup |
| Invio batch + cron programmato | 3-4h | Batch 50, Promise.allSettled, personalizzazione unsubscribe, cron auth |
| Security headers + CSP + proxy | 1-2h | next.config.ts headers, middleware |
| Upload immagini (Supabase Storage) | 1-2h | FormData, validazione tipo/size, public URL |
| Testing + debug + fix (5 bugfix commit) | 4-6h | Redirect loop, auth encoding, Suspense, palette alignment |
| **TOTALE** | **52-76h** |

### Stima economica

| Parametro | Valore |
|-----------|--------|
| Range ore | 52 – 76h |
| Tariffa senior freelance Milano | EUR 50 – 80/ora |
| **Stima bassa** (52h x EUR 50) | **EUR 2,600** |
| **Stima media** (64h x EUR 65) | **EUR 4,160** |
| **Stima alta** (76h x EUR 80) | **EUR 6,080** |

> La stima considera uno sviluppatore senior full-stack che realizzi tutto da zero — design, animazioni, backend, email template, pannello admin — con la stessa qualita' di codice, lo stesso livello di polish nelle animazioni, e lo stesso livello di sicurezza implementato. Non include: design grafico del logo, scelta del brand, contenuti editoriali.

---

*Report generato automaticamente dall'analisi del codebase BLACK SHEEP newsletter.*
