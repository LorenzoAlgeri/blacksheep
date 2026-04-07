# Responsive Audit — BLACK SHEEP Newsletter

**Data:** 2026-04-07
**Fase:** 1 — Diagnosi

---

## Stato attuale — Landing Page Mobile

### Architettura responsive

La landing page usa un approccio **mobile-first con vincolo max-width: 480px** sul body (`globals.css:40`). Questo significa che su desktop la pagina e' una colonna centrata di 480px — elegante e intenzionale. Su mobile (375px), lo stesso contenuto ha meno respiro.

**Breakpoint usati:** Solo 1 — `640px` (sm:) in `globals.css:294-306` e `globals.css:346-353`.
**Breakpoint mancanti:** Nessun `md:` (768px), `lg:` (1024px), `xl:` (1280px).

---

### Sezione per sezione

#### 1. Hero — Brand Scritta SVG (`page.tsx:27-62`)

|                     | Desktop (>640px)                                        | Mobile (375px)                        |
| ------------------- | ------------------------------------------------------- | ------------------------------------- |
| **Aspetto**         | Scritta centrata, elegante, 170px wide                  | Scritta piu' piccola, 100px wide      |
| **Classi**          | Inline: `clamp(100px, 22dvw, 170px)`, maxHeight `28dvh` | Stessi valori, clamp scatta al minimo |
| **Problemi mobile** | Nessuno                                                 | OK — clamp gestisce bene lo scaling   |

#### 2. Mascotte Video (`page.tsx:29-39`, `globals.css:334-353`)

|                     | Desktop (>640px)                                                     | Mobile (<640px)                                                                                                                                                                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aspetto**         | Mascotte a sinistra della scritta, drop-shadow, altezza fino a 200px | Piu' piccola, niente drop-shadow, altezza max 140px                                                                                                                                                                                                                                                         |
| **Posizione**       | `right: calc(100% - clamp(16px, 3dvw, 40px))`                        | `right: calc(100% - 10px)`                                                                                                                                                                                                                                                                                  |
| **Altezza**         | `clamp(80px, 22dvh, 200px)`                                          | `clamp(60px, 16dvh, 140px)`                                                                                                                                                                                                                                                                                 |
| **Problemi mobile** | Nessuno                                                              | **MEDIA** — Su schermi stretti (375px) la mascotte si sovrappone al bordo sinistro. `mix-blend-mode: screen` nasconde lo sfondo ma la posizione `right: calc(100% - 10px)` la mette quasi fuori dal viewport. Su iPhone SE la mascotte rischia di essere tagliata dal `overflow-x: hidden` del contenitore. |

#### 3. Logo Icon (`page.tsx:65-76`)

|                     | Desktop                       | Mobile                   |
| ------------------- | ----------------------------- | ------------------------ |
| **Aspetto**         | Icona 56px, ben proporzionata | Icona 36px, funziona     |
| **Classi**          | `clamp(36px, 5dvh, 56px)`     | Stessi valori            |
| **Problemi mobile** | Nessuno                       | OK — clamp gestisce bene |

#### 4. "EVERY MONDAY" — Tagline (`page.tsx:79-84`)

|                     | Desktop                               | Mobile                                                                                                                                                    |
| ------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aspetto**         | Testo micro, effetto shimmer elegante | Testo micro identico                                                                                                                                      |
| **Classi**          | `text-[10px] tracking-[0.45em]`       | Stessi valori                                                                                                                                             |
| **Problemi mobile** | Nessuno                               | **BASSA** — 10px e' molto piccolo ma e' intenzionalmente decorativo. Il tracking largo (0.45em) puo' causare problemi di leggibilita' su schermi piccoli. |

#### 5. Location (`page.tsx:87-92`)

|                     | Desktop                                                  | Mobile                                                                                                                                                      |
| ------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aspetto**         | "11 Clubroom · Corso Como · Milano" a 10px, ben spaziato | Identico                                                                                                                                                    |
| **Classi**          | `text-[10px] text-bs-cream/25 tracking-[0.15em]`         | Stessi valori                                                                                                                                               |
| **Problemi mobile** | Nessuno                                                  | **BASSA** — Stringa lunga su singola riga. Su 375px con px-6 (48px di padding totale) restano 327px. Con tracking e font 10px dovrebbe stare, ma al limite. |

#### 6. Divider (`page.tsx:95-100`)

|                     | Desktop                                | Mobile        |
| ------------------- | -------------------------------------- | ------------- |
| **Aspetto**         | Linea sottile con gradiente, max 320px | Identico      |
| **Classi**          | `max-w-[320px] w-full h-px`            | Stessi valori |
| **Problemi mobile** | Nessuno                                | OK            |

#### 7. Form — SubscribeForm (`page.tsx:103-105`, `SubscribeForm.tsx`)

|                     | Desktop (>640px)                     | Mobile (<640px)                                                                                                                                                                                                                                                                                                                                       |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Input padding**   | 12px (fisso via media query)         | `clamp(10px, 1.5dvh, 14px)`                                                                                                                                                                                                                                                                                                                           |
| **Input font**      | 13px (media query `globals.css:298`) | 14px (`text-sm` Tailwind)                                                                                                                                                                                                                                                                                                                             |
| **CTA padding**     | 14px (fisso)                         | `clamp(12px, 2dvh, 16px)`                                                                                                                                                                                                                                                                                                                             |
| **CTA font**        | 15px (media query `globals.css:303`) | 18px (`text-lg` Tailwind)                                                                                                                                                                                                                                                                                                                             |
| **Problemi mobile** | Nessuno                              | **MEDIA** — La media query a 640px RIDUCE le dimensioni su desktop (input 14px→13px, CTA 18px→15px). Questo e' controintuitivo: il design mobile-first dovrebbe avere base piccola che CRESCE. Attualmente il CTA e' piu' grande su mobile (18px) che su desktop (15px). Non e' necessariamente un bug (e' un design luxe-minimalist) ma e' insolito. |

#### 8. Social Icons (`page.tsx:116-157`)

|                     | Desktop                            | Mobile                                                                                                                                                                                                                                 |
| ------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Aspetto**         | Due icone SVG 16x16px, opacity 25% | Identico                                                                                                                                                                                                                               |
| **Classi**          | `gap-3`, opacity 25%, hover 50%    | Stessi valori                                                                                                                                                                                                                          |
| **Problemi mobile** | Nessuno                            | **ALTA** — Touch target 16x16px e' ben sotto il minimo di 44x44px raccomandato. Su mobile, premere queste icone e' difficile. Il `gap-3` (12px) rende anche piu' difficile distinguere i target. Non c'e' padding aggiuntivo sul link. |

#### 9. Microcopy e Consent (`page.tsx:108-113`, `SubscribeForm.tsx:119-125`)

|                     | Desktop                                       | Mobile                                                                                                                  |
| ------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Aspetto**         | Testo 10px, quasi invisibile (opacity 15-20%) | Identico                                                                                                                |
| **Classi**          | `text-[10px] text-bs-cream/15`                | Stessi valori                                                                                                           |
| **Problemi mobile** | Nessuno                                       | **BASSA** — 10px con opacity 15% e' quasi illeggibile, ma e' intenzionale (micro-legal text). OK come scelta di design. |

#### 10. Animazioni GSAP (`LandingMotion.tsx`)

|                             | Desktop                                    | Mobile                                                                                                                                                                                                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Comportamento**           | Full entrance timeline + ambient breathing | Identico                                                                                                                                                                                                                                                                                                                                                                  |
| **prefers-reduced-motion**  | Rispettato — disabilita tutto              | Rispettato                                                                                                                                                                                                                                                                                                                                                                |
| **matchMedia per viewport** | **NON presente**                           | **NON presente**                                                                                                                                                                                                                                                                                                                                                          |
| **Problemi mobile**         | Nessuno                                    | **MEDIA** — Le animazioni GSAP non hanno `matchMedia` per ridurre/disabilitare su mobile. Il timeline di entrata (3.5s) e le animazioni ambient (breathing scale, spotlight drift 12s, shimmer) girano identiche su tutti i dispositivi. Su device economici con GPU debole questo puo' causare jank. Il video autoplay potrebbe fallire su iOS senza interazione utente. |

---

## Stato attuale — Admin Menu Mobile

### File coinvolto

`apps/newsletter/src/app/admin/(dashboard)/layout.tsx` — righe 14-56

### Struttura attuale

```
<header> (flex, justify-between, px-4 py-3)
  ├── Logo section (flex, gap-3)
  │   ├── SVG logo 28x18px (opacity 30%)
  │   └── "ADMIN" text (text-sm, tracking-wider)
  └── <nav> (flex, gap-4, text-xs)
      ├── "Iscritti" → /admin
      ├── "Invia" → /admin/compose
      ├── "Impostazioni" → /admin/settings
      ├── "|" separatore
      └── "Vedi sito ↗" → / (target=_blank)
```

### Analisi

- **Voci totali:** 4 link + 1 separatore = 5 elementi visibili
- **Disposizione mobile:** Tutte le voci su UNA riga orizzontale, `flex gap-4`
- **Hamburger menu:** **NON presente**
- **Breakpoint di passaggio:** **Nessuno** — il menu non cambia mai layout
- **Font:** `text-xs` (12px), `text-bs-cream/40` (40% opacity)

### Calcolo spazio disponibile (375px)

| Elemento                 | Larghezza stimata |
| ------------------------ | ----------------- |
| Padding header (px-4 x2) | 32px              |
| Logo SVG + gap + "ADMIN" | ~85px             |
| Spazio nav disponibile   | ~258px            |
| "Iscritti"               | ~40px             |
| "Invia"                  | ~28px             |
| "Impostazioni"           | ~70px             |
| "\|"                     | ~8px              |
| "Vedi sito ↗"            | ~65px             |
| Gap (gap-4 x4)           | ~64px             |
| **Totale nav**           | **~275px**        |

**Risultato:** 275px richiesti vs 258px disponibili = **overflow di ~17px**. Su 375px le voci si schiacciano o vanno a capo in modo brutto. "Impostazioni" e' la voce piu' lunga e crea il problema principale.

### Componenti UI disponibili

- **shadcn/ui:** NON installato nel progetto
- **Radix UI:** NON presente
- **Lucide icons:** Presente (usato per SubscriberTable, non per nav)

---

## Stato attuale — Email Dark Mode

### Template 1: Conferma iscrizione (`subscribe/route.ts:116-222`)

| Check                                                  | Stato                                                            |
| ------------------------------------------------------ | ---------------------------------------------------------------- |
| `<meta name="color-scheme" content="dark">`            | **PRESENTE** (riga 122)                                          |
| `<meta name="supported-color-schemes" content="dark">` | **PRESENTE** (riga 123)                                          |
| `:root { color-scheme: dark; }` CSS                    | **PRESENTE** (riga 125)                                          |
| `@media (prefers-color-scheme: dark)`                  | **ASSENTE** — non necessario (email sempre dark)                 |
| Sfondo                                                 | `#000000` hardcoded (righe 126-133)                              |
| Testo                                                  | `#FFFFF3` hardcoded (riga 131)                                   |
| Bottone                                                | bg `#FFFFF3`, text `#0a0a0a` — buon contrasto                    |
| Link                                                   | `rgba(255,255,243,0.15)` — basso contrasto                       |
| Gmail selector hack                                    | **PRESENTE**: `u + .body-bg`, `[data-ogsc] body` (righe 127-128) |

**Verdetto:** Questo template e' ben configurato per dark mode. Forza lo schema scuro. Funziona su Apple Mail, Gmail, Outlook.

### Template 2: Newsletter (`email-template.ts:114-174`)

| Check                                   | Stato                                                            |
| --------------------------------------- | ---------------------------------------------------------------- |
| `<meta name="color-scheme">`            | **ASSENTE**                                                      |
| `<meta name="supported-color-schemes">` | **ASSENTE**                                                      |
| `:root { color-scheme: ... }` CSS       | **ASSENTE**                                                      |
| `@media (prefers-color-scheme: dark)`   | **ASSENTE**                                                      |
| `<style>` block                         | **ASSENTE** — tutto inline                                       |
| Sfondo                                  | Dinamico via palette: `${p.bg}`                                  |
| Testo                                   | Dinamico via palette: `${p.text}`                                |
| Bottone                                 | Invertito: bg=`${p.text}`, text=`${p.bg}` — intelligente         |
| Link unsubscribe                        | `${hexAlpha(p.text, 0.25)}` — basso contrasto su entrambi i temi |
| Gmail/Outlook hacks                     | **ASSENTI**                                                      |

### Palette system (`email-template.ts:46-55`)

| Preset       | Sfondo      | Testo       | Tipo      |
| ------------ | ----------- | ----------- | --------- |
| Classic      | #000000     | #FFFFF3     | Dark      |
| Midnight     | #031240     | #FFFFF3     | Dark      |
| Monochrome   | #000000     | #FFFFF3     | Dark      |
| Burgundy     | #0a0a0a     | #FFFFF3     | Dark      |
| Purple       | #0a0a0a     | #FFFFF3     | Dark      |
| Forest       | #0a0a0a     | #FFFFF3     | Dark      |
| **Daylight** | **#FFFFF3** | **#1F1F1F** | **Light** |
| **Clean**    | **#FFFFF3** | **#1F1F1F** | **Light** |

### Problema principale

Senza meta tag `color-scheme`, i client email non sanno come gestire il template:

1. **Dark palette su iOS dark mode:** Apple Mail potrebbe tentare di "schiarire" un'email gia' scura, invertendo i colori e rendendo lo sfondo grigio chiaro con testo scuro — brutto.
2. **Light palette su iOS dark mode:** L'email appare con sfondo `#FFFFF3` (bianco/crema) che e' accecante in dark mode. Nessun fallback dark.
3. **Gmail dark mode:** Senza `color-scheme`, Gmail applica la propria logica di inversione, che puo' rompere i colori accent.
4. **Outlook:** Ignora `color-scheme` ma rispetta gli inline styles — meno problematico.

---

## Lista problemi ordinata per gravita'

### ALTA

| #   | Problema                                                                                                                                                                                                                            | File                                 | Impatto                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| 1   | **Newsletter template senza meta tag dark mode** — Nessun `color-scheme`, nessun CSS dark mode, nessun hack per Gmail/Outlook. Email con palette dark vengono invertite da iOS Mail. Email con palette light accecano in dark mode. | `email-template.ts:141-144`          | Email illeggibili/brutte per utenti iOS in dark mode (~50%+ degli utenti mobile) |
| 2   | **Social icons touch target 16x16px** — Ben sotto il minimo 44x44px. Impossibili da premere con precisione su mobile.                                                                                                               | `page.tsx:124-138, 147-155`          | Usabilita' mobile compromessa                                                    |
| 3   | **Admin nav overflow su 375px** — 5 elementi + separatore in 258px disponibili, servono ~275px. Voci schiacciate o troncate.                                                                                                        | `admin/(dashboard)/layout.tsx:32-51` | Admin inutilizzabile su telefoni piccoli                                         |

### MEDIA

| #   | Problema                                                                                                                                                                         | File                                                  | Impatto                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- |
| 4   | **Mascotte video posizionamento mobile** — `right: calc(100% - 10px)` posiziona la mascotte quasi fuori viewport su schermi stretti. Rischio di taglio con `overflow-x: hidden`. | `globals.css:346-353`                                 | Elemento visivo brand parzialmente nascosto                               |
| 5   | **Animazioni GSAP identiche su tutti i device** — Nessun `matchMedia` per viewport width. Spotlight drift, breathing, shimmer girano identici su device economici.               | `LandingMotion.tsx`                                   | Potenziale jank su device low-end                                         |
| 6   | **Media query 640px riduce dimensioni** — CTA passa da 18px a 15px su desktop, input da 14px a 13px. Design controintuitivo (normalmente si ingrandisce per desktop).            | `globals.css:294-306`                                 | Confusione design, CTA meno prominente su desktop                         |
| 7   | **Link unsubscribe a contrasto bassissimo** — `rgba(255,255,243,0.15)` nella conferma, `hexAlpha(text, 0.25)` nella newsletter. Quasi invisibili.                                | `subscribe/route.ts:205-207`, `email-template.ts:138` | Accessibilita' + compliance GDPR (link disiscriviti deve essere visibile) |

### BASSA

| #   | Problema                                                                                                                                                    | File                        | Impatto                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------- |
| 8   | **Testo 10px diffuso** — Tagline, location, microcopy, consent tutti a `text-[10px]`. Sotto il minimo 16px body raccomandato dalle best practice.           | `page.tsx:81,89,110`        | Accessibilita' — ma e' testo decorativo/legale, scelta intenzionale |
| 9   | **Nessun breakpoint intermedio** — Solo 640px. Nessun `md:`, `lg:`, `xl:`. Il design 480px max-width rende questo meno critico, ma limita la flessibilita'. | `globals.css`               | Basso impatto grazie al vincolo 480px                               |
| 10  | **Video autoplay potrebbe fallire su iOS** — try-catch gestisce il fallback al poster, ma non c'e' un messaggio visivo.                                     | `LandingMotion.tsx:287-300` | UX degradata silenziosamente su iOS senza interazione               |
