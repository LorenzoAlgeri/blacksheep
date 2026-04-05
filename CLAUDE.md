# BLACK SHEEP — Monorepo

## Progetto

Monorepo con due app per il brand BLACK SHEEP (club night Milano):

- `apps/newsletter` — Landing page + sistema newsletter con admin panel
- `apps/website` — Sito principale single-page (Chrome Noir Editorial)
- `packages/shared` — Design system, logo, brand constants condivisi

## Tech Stack

- Framework: Next.js 16+ (App Router, TypeScript strict, React 19)
- Styling: Tailwind CSS 4 + CSS Custom Properties (design system in packages/shared)
- Email: Resend (React Email templates)
- Database: Supabase (subscribers, analytics)
- Auth: NextAuth.js v5 (admin panel only, credenziali)
- Forms: React Hook Form + Zod validation
- Animazioni (sito): GSAP + Lenis + Three.js via React Three Fiber
- Deploy: Vercel (monorepo con Turborepo)
- Monorepo: Turborepo + npm workspaces

---

## REGOLA ZERO — Skill-First Development

<rules>
<rule>PRIMA di scrivere qualsiasi codice, CERCA la skill pertinente: grep -rl "keyword" ~/.claude/skills/ --include="SKILL.md" | head -5</rule>
<rule>Se esiste una skill rilevante, LEGGILA prima di procedere.</rule>
<rule>Segui SEMPRE: BRAINSTORM → PLAN → TDD → VERIFY</rule>
<rule>SEMPRE esegui verification-before-completion prima di dichiarare un task finito.</rule>
<rule>Per UI/UX: consulta SEMPRE ui-ux-pro-max e shadcn-ui PRIMA di scrivere componenti.</rule>
<rule>Per debug: usa SEMPRE systematic-debugging, MAI fix casuali.</rule>
</rules>

---

## Skill Mapping per Questo Progetto

### Sempre attive (ogni task)

| Trigger          | Skill                            |
| ---------------- | -------------------------------- |
| Inizio lavoro    | `brainstorming`                  |
| Scrittura codice | `test-driven-development`        |
| Fine task        | `verification-before-completion` |
| Bug              | `systematic-debugging`           |

### Per dominio

| Quando lavori su...    | Leggi prima                                                |
| ---------------------- | ---------------------------------------------------------- |
| Componenti React       | `react-patterns`, `react-state-management`                 |
| Pagine/Routing Next.js | `nextjs-app-router-patterns`, `nextjs-data-fetching`       |
| Styling/Tailwind       | `tailwind-css-patterns`, `tailwind-design-system`          |
| Landing page design    | `ui-ux-pro-max`, `interaction-design`, `responsive-design` |
| Performance            | `nextjs-performance`, `vercel-react-best-practices`        |
| Email/Newsletter       | `nodejs-backend-patterns`, `api-design-principles`         |
| Database Supabase      | `postgresql-table-design`                                  |
| Auth NextAuth          | `auth-implementation-patterns`, `secrets-management`       |
| Deploy Vercel          | `nextjs-deployment`, `deployment-pipeline-design`          |
| Monorepo Turborepo     | `turborepo-monorepo`, `turborepo-caching`                  |
| Sicurezza              | `security-requirement-extraction`, `gdpr-data-handling`    |
| Testing                | `javascript-testing-patterns`, `e2e-testing-patterns`      |
| Git workflow           | `git-advanced-workflows`, `finishing-a-development-branch` |

---

## Comandi

```
npm run dev --workspace=apps/newsletter    # Dev newsletter
npm run dev --workspace=apps/website       # Dev sito
npm run build                              # Build tutto
npm run lint                               # Lint tutto
npx tsc --noEmit                           # Typecheck tutto
```

---

## Regole

- TypeScript strict mode su tutto
- Ogni componente: loading + error + empty state
- Animazioni: SEMPRE rispettare prefers-reduced-motion
- Font: Arial Black (heading + display) — MAI Inter/Roboto/Bebas Neue. Body text: system font stack.
- Colori: SEMPRE via CSS variables, mai hardcodare hex
- Secrets: .env.local per i secrets, .env.example come template
- Git: conventional commits (feat:, fix:, chore:)
- Prima di dire "ho finito": npm run build && npx tsc --noEmit && npm run lint
- Contenuti del sito in italiano, codice e commenti in inglese
- Non committare MAI .env.local, node_modules, .next

---

## Docs di Riferimento

- Design spec sito: @docs/blacksheep-website-prompt.md
- Piani implementazione: @docs/plans/
- Decisioni architetturali: @docs/decisions/

---

## Sicurezza

- Rate limiting su tutte le API pubbliche (subscribe, contact)
- Validazione input con Zod su OGNI endpoint
- CSRF protection attiva
- Admin panel protetto con NextAuth + middleware
- Honeypot field nel form iscrizione (anti-bot)
- Sanitizzazione HTML in tutti gli input utente
- Headers di sicurezza: CSP, X-Frame-Options, HSTS

---

## Promemoria Skills

Se stai lavorando e non hai consultato nessuna skill negli ultimi 15 minuti, FERMATI:

1. C'e' una skill che potrebbe aiutarmi? → `grep -rl "keyword" ~/.claude/skills/ --include="SKILL.md" | head -5`
2. Ho seguito il workflow BRAINSTORM → PLAN → TDD → VERIFY?
3. Ho verificato con verification-before-completion?
