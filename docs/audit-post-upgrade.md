# BLACK SHEEP Newsletter — Audit Post-Upgrade (Fase 5)

> Data: 5 aprile 2026
> Scope: `apps/newsletter` + root monorepo config
> Metodo: Audit completo dopo 5 fasi di upgrade skill-driven

---

## Risultati Pipeline

| Comando            | Risultato                                        |
| ------------------ | ------------------------------------------------ |
| `npm run test`     | 38 test passed (6 file)                          |
| `npm run build`    | Build OK — 19 route compilate                    |
| `npx tsc --noEmit` | 0 errori                                         |
| `npm run lint`     | 0 errori, 1 warning (img in admin — accettabile) |

---

## Scorecard per Area

| #   | Area                 | Pre-upgrade | Post-upgrade | Note                                                                                                        |
| --- | -------------------- | :---------: | :----------: | ----------------------------------------------------------------------------------------------------------- |
| 1   | React Patterns       |     3/5     |   **4/5**    | ComposeEditor decomposto in 4 sotto-componenti + 4 custom hooks, key stabili con `id`, useMemo su emailHtml |
| 2   | Next.js App Router   |    3.5/5    |  **4.5/5**   | not-found.tsx, Suspense su admin, metadata su tutte le pagine, error.tsx + loading.tsx presenti             |
| 3   | Tailwind CSS         |     4/5     |  **4.5/5**   | Rimosso !important su input:focus, opacita standardizzate (/5, /10, /20, /30, /50), focus: via utility      |
| 4   | Responsive Design    |    3.5/5    |  **4.5/5**   | Stats grid responsive (grid-cols-1 sm:grid-cols-3), SubscriberTable card layout su mobile                   |
| 5   | Interaction Design   |     4/5     |  **4.5/5**   | Spinner animate-spin su submit, animate-fade-in su preview tab, animate-fade-in-up su success               |
| 6   | API Design           |    2.5/5    |   **4/5**    | Errori standardizzati `{ error, code }`, LIMIT/offset su subscribers, health check                          |
| 7   | Auth Patterns        |    3.5/5    |   **4/5**    | Rate limiting login (rateLimitLogin), maxAge JWT 3600s, timing-safe cron                                    |
| 8   | Secrets Management   |     3/5     |   **4/5**    | .env.example pulito (rimosso ANON_KEY), validazione startup su tutti i secrets                              |
| 9   | GDPR Compliance      |     2/5     |   **4/5**    | Consent trail (IP, UA, consent_version), Art. 17 erasure, privacy policy completa, link in form             |
| 10  | PostgreSQL Schema    |    2.5/5    |   **4/5**    | NOT NULL su status, LOWER index su email, updated_at, schema documentato                                    |
| 11  | Node.js Backend      |    2.5/5    |   **4/5**    | Logging strutturato [SUBSCRIBE] [SEND] [CRON] [AUTH] [UPLOAD], health check, magic bytes validation upload  |
| 12  | Turborepo Monorepo   |    2.5/5    |   **4/5**    | Task test + typecheck in turbo.json, lint senza dependsOn                                                   |
| 13  | Next.js Performance  |     3/5     |   **4/5**    | dynamic import GSAP (LandingMotionLazy), output: standalone, poweredByHeader: false                         |
| 14  | Testing              |     0/5     |   **4/5**    | 38 test (Vitest + Testing Library): validations 14, rate-limit 9, gdpr 5, components 10                     |
| 15  | Deployment           |    2.5/5    |   **4/5**    | GitHub Actions CI (lint -> typecheck -> test -> build), health check smoke test                             |
| 16  | Developer Experience |    2.5/5    |   **4/5**    | Root tsconfig.json, Prettier, Husky + lint-staged, script test/typecheck in root                            |

---

## Media Punteggi

| Metrica                | Valore            |
| ---------------------- | ----------------- |
| **Media pre-upgrade**  | 2.8/5             |
| **Media post-upgrade** | **4.1/5**         |
| **Miglioramento**      | +1.3 punti (+46%) |
| **Aree sotto 4/5**     | 0 (tutte >= 4/5)  |

---

## Dettaglio Modifiche Fase 5

### 1. Tailwind Polish

- Rimosso `!important` da `input:focus` in globals.css
- Aggiunto `focus:outline-none focus:border-bs-cream/30 focus:ring-1 focus:ring-bs-cream/10` sugli input
- Standardizzato opacita: `/[0.02]` -> `/5`, `/15` -> `/10`, `/8` -> `/10`, `hover:bg-bs-cream/15` -> `/20`

### 2. Responsive Polish

- Stats grid admin: `grid-cols-1 sm:grid-cols-3`
- SubscriberTable: layout card su mobile (`sm:hidden` cards + `hidden sm:block` table)

### 3. Interaction Polish

- Submit button: spinner SVG `animate-spin` + "ISCRIZIONE IN CORSO..."
- Preview tab: `animate-fade-in` (200ms ease-out)
- Form -> Success: `animate-fade-in-up` (500ms cubic-bezier con translateY)
- Tutte le animazioni rispettano `prefers-reduced-motion: reduce`

### 4. Node.js Backend Polish

- Logging strutturato: prefisso `[UPLOAD]` aggiunto alla route upload (tutti gli altri gia presenti)
- Upload: validazione magic bytes (JPEG, PNG, WebP, GIF) oltre al Content-Type

### 5. Test Fix

- SubscriberTable.test.tsx: aggiornato per layout dual (mobile+desktop) con `getAllByText`

---

## Aree per Miglioramenti Futuri (post-MVP)

| Area             | Azione                                              | Priorita           |
| ---------------- | --------------------------------------------------- | ------------------ |
| Rate limiter     | Migrare da in-memory a Redis/Upstash per serverless | Alta (post-deploy) |
| E2E Testing      | Aggiungere Playwright per flusso subscribe completo | Media              |
| Data portability | API export dati utente (Art. 20 GDPR)               | Media              |
| Bundle analysis  | Integrare @next/bundle-analyzer                     | Bassa              |
| Monitoring       | Sentry/LogTail per error tracking in produzione     | Alta (post-deploy) |
| Secret rotation  | Piano di rotazione automatica secrets               | Media              |

---

## Conclusione

Il progetto e passato da una media di **2.8/5** (MVP con lacune in infra e compliance) a **4.1/5** (pronto per deploy con testing, CI/CD, GDPR, e coding standards solidi). Tutte le 16 aree sono ora >= 4/5.
