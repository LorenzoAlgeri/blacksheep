# PROMPT BLACKSHEEP — Redesign Landing + Email + Admin Config

> Generato da Claude Cowork il 2026-04-07
> Da eseguire in Claude Code nella directory del progetto blacksheep
> Ordine consigliato: PROMPT 1 → 2 → 3 → 4 → 5 (alcuni parallelizzabili)

---

## PROMPT 1 — Layout Redesign Landing Page (priorità alta)

```
[Skill-first] Redesign layout landing page BlackSheep

Consulta PRIMA queste skills:
- cat ~/.claude/skills/superpowers/writing-plans.md
- cat ~/.claude/skills/superpowers/verification-before-completion.md
- cat ~/.claude/skills/react-patterns/SKILL.md
- cat ~/.claude/skills/tailwind-css-patterns/SKILL.md

CONTESTO:
Progetto: apps/newsletter (Next.js 16, React 19, GSAP, Tailwind 4)
File da modificare:
- src/app/page.tsx (layout principale)
- src/components/SubscribeForm.tsx (form + CTA)
- src/components/LandingMotion.tsx (animazioni GSAP)
- src/app/globals.css (stili)

COSA FARE — 7 modifiche in page.tsx e SubscribeForm.tsx:

1. SOSTITUIRE LA SCRITTA "BLACK SHEEP"
   - Rimuovi l'h1 con testo "BLACK SHEEP" (righe 31-44 di page.tsx)
   - Al suo posto, usa il file SVG /public/SCRITTA.svg come <img> o inline SVG
   - Il file SCRITTA.svg contiene la scritta "BLACK SHEEP" in path vettoriali (viewBox="0 0 1643.06 2119.09")
   - Deve essere color cream (#fffff3) — usa fill="currentColor" se inline, o filtro CSS se <img>
   - Dimensione: width circa clamp(200px, 50dvw, 320px) per mantenere proporzioni responsive

2. RIORDINARE IL LAYOUT (ordine dall'alto in basso):
   - SCRITTA SVG (nuovo, sopra a tutto)
   - "EVERY MONDAY" (spostato SOTTO la scritta, non sopra)
   - Logo icona (il SVG inline attuale con viewBox="0 0 1389.1 879.04" — spostato SOTTO)
   - "11 Clubroom · Corso Como · Milano"
   - Divider
   - Form (email + nome)
   - Bottone CTA
   - Icone social (nuove, vedi sotto)
   - Microcopy + consent + footer

3. CAMBIARE IL BOTTONE CTA
   - In SubscribeForm.tsx, cambia il testo del bottone da "THE PLACE TO BE" a "ISCRIVITI"
   - Mantieni lo stile identico (bg-bs-cream, text-black, font brand, tracking, glow)

4. AGGIUNGERE "THE PLACE TO BE" IN PICCOLO
   - Aggiungi la frase "THE PLACE TO BE" come testo decorativo piccolo
   - Posizionalo sotto il divider, prima del form, oppure sopra il footer
   - Stile: font-brand, text-[9px], tracking-[0.3em], opacity 0.15, uppercase
   - Deve dare un tocco di identità senza competere col bottone

5. AGGIUNGERE ICONE SOCIAL sotto il bottone ISCRIVITI
   - Instagram (bianco): link a https://instagram.com/blacksheep.community_
   - TikTok (bianco): link a https://www.tiktok.com/@blacksheepcommunity
   - Icone SVG inline, size 20px, opacity 0.4, hover opacity 0.7
   - Flexbox row con gap-4, centrate, margin-top 12px
   - Aggiungi data-motion="socials" per animazione
   - Rimuovi il footer attuale con @blacksheep.community_ (sostituito dalle icone)

6. DIVIDER DA GOLD A BIANCO
   - In page.tsx, cambia la classe del divider da:
     `bg-gradient-to-r from-transparent via-bs-gold/20 to-transparent`
   - A:
     `bg-gradient-to-r from-transparent via-bs-cream/15 to-transparent`

7. MICROCOPY
   - Cambia "Iscriviti. Lineup e date prima di tutti." in "Non perderti nulla."
   - Riduci opacity da 0.35 a 0.15 (quasi invisibile ma leggibile)
   - Spostala più in basso (subito sopra le icone social o subito sotto)

AGGIORNARE LE ANIMAZIONI in LandingMotion.tsx:
- Aggiungere data-motion="scritta" per la nuova scritta SVG (stessa animazione clip-path reveal del vecchio title)
- Spostare data-motion="every-monday" nel timing dopo la scritta (es. a 2.3s invece di 1.6s)
- Aggiungere nella timeline: data-motion="socials" a 3.3s con opacity 0.4
- Il logo ora appare DOPO la scritta, timing a circa 2.5s

Timeline aggiornata suggerita:
- 0.4s: gradient
- 1.2s: scritta SVG (clip-path reveal + blur come il vecchio title)
- 2.0s: "EVERY MONDAY" fade in
- 2.2s: logo icona (scale + opacity come prima)
- 2.5s: location text
- 2.7s: divider
- 2.8s: inputs
- 3.1s: CTA
- 3.3s: socials, microcopy, consent

Aggiorna anche la sezione hasSeenEntrance con i nuovi data-motion.

VERIFICA FINALE:
- npm run build senza errori
- Tutti i data-motion sono gestiti sia nell'entrance che nel hasSeenEntrance
- Layout responsive: testa mentalmente su iPhone SE (375px) e desktop (480px max)
- Le icone social hanno link corretti e target="_blank" rel="noopener noreferrer"
- Il testo "THE PLACE TO BE" non compete visivamente col bottone ISCRIVITI
- Il divider è bianco/cream, non gold

Dimmi il risultato di ogni step e mostrami il layout finale come lo vedrà l'utente.
```

---

## PROMPT 2 — Animazione SVG Scritta (dopo Prompt 1)

```
[Skill-first] Valutazione e implementazione animazione per SVG SCRITTA.svg

Consulta PRIMA:
- cat ~/.claude/skills/superpowers/brainstorming.md
- cat ~/.claude/skills/superpowers/verification-before-completion.md

CONTESTO:
Il file /public/SCRITTA.svg contiene la scritta "BLACK SHEEP" come path SVG vettoriali.
ViewBox: 0 0 1643.06 2119.09
Contiene 6 path elements dentro un <g>, ognuno è una lettera/gruppo di lettere.
Il progetto usa GSAP 3.14.2 con @gsap/react.

TASK:
Valuta se è possibile replicare un'animazione simile al clip-path reveal attuale (che va da destra a sinistra) sull'SVG SCRITTA.svg.

OPZIONI DA VALUTARE:
1. **Clip-path reveal** — Stesso approccio attuale: clipPath inset(0 100% 0 0) → inset(0 0% 0 0). Funziona su qualsiasi elemento, anche un <img> che carica l'SVG. Questa è la soluzione più semplice e sicura.

2. **Stroke draw** — Se l'SVG fosse inline, si potrebbe fare un effetto "disegno" con stroke-dasharray/dashoffset su ogni path. MA i path della SCRITTA.svg sono filled paths (non stroke), quindi servirebbe convertirli o aggiungerci un outline. Più complesso.

3. **Path-by-path reveal** — Se l'SVG è inline, GSAP può animare ogni <path> individualmente con stagger (una lettera alla volta). Effetto: ogni gruppo di lettere appare con fade + scale in sequenza.

4. **Alternativa ibrida** — Clip-path reveal + leggero blur-to-focus (come già fatto per il titolo attuale). È la più coerente col design system esistente.

RACCOMANDAZIONE:
Implementa l'opzione 4 (clip-path + blur) perché:
- È già provata nel progetto
- Funziona sia con <img> che con SVG inline
- È performante e non richiede modifiche all'SVG
- Mantiene coerenza con l'estetica "stage lights" del club

Se l'SVG è caricato come <img>, il clip-path funziona perfettamente.
Se lo rendi inline, puoi fare ANCHE il path-by-path come seconda animazione ambient (dopo l'entrance).

IMPLEMENTA l'opzione 4 nel file LandingMotion.tsx, usando data-motion="scritta".
Se hai già implementato il Prompt 1, verifica che sia coerente con la timeline.

VERIFICA:
- L'animazione clip-path + blur funziona sulla scritta SVG
- L'animazione non è bloccante (non rallenta il caricamento)
- Il fallback prefers-reduced-motion mostra la scritta statica
- Il hasSeenEntrance skip funziona correttamente
- npm run build OK

Mostrami come appare l'animazione step by step.
```

---

## PROMPT 3 — Admin Settings con Supabase Real-Time (parallelizzabile)

````
[Skill-first] Feature: pannello admin per configurare testi landing page in real-time

Consulta PRIMA queste skills:
- cat ~/.claude/skills/superpowers/writing-plans.md
- cat ~/.claude/skills/superpowers/test-driven-development.md
- cat ~/.claude/skills/superpowers/verification-before-completion.md
- cat ~/.claude/skills/drizzle-orm-patterns/SKILL.md (se applicabile, altrimenti usa Supabase JS)
- cat ~/.claude/skills/nextjs-app-router-patterns/SKILL.md
- cat ~/.claude/skills/react-patterns/SKILL.md

CONTESTO:
Progetto: apps/newsletter (Next.js 16, Supabase, NextAuth per admin)
Il cliente vuole poter cambiare in tempo reale:
- Il testo "EVERY MONDAY" (es. "EVERY SATURDAY", "SPECIAL EDITION")
- Il testo "11 Clubroom · Corso Como · Milano" (es. altro venue)
L'effetto deve essere IMMEDIATO sul sito senza rebuild.

Supabase è già configurato in src/lib/supabase.ts (singleton con service role key).
L'admin è protetto da NextAuth in src/app/admin/(dashboard)/layout.tsx.

STEP DA SEGUIRE:

1. CREARE TABELLA SUPABASE
   Usa il MCP Supabase (se disponibile) o genera la migration SQL:
   ```sql
   CREATE TABLE IF NOT EXISTS site_config (
     id TEXT PRIMARY KEY DEFAULT 'main',
     tagline TEXT NOT NULL DEFAULT 'EVERY MONDAY',
     venue TEXT NOT NULL DEFAULT '11 Clubroom · Corso Como · Milano',
     updated_at TIMESTAMPTZ DEFAULT now()
   );

   -- Insert default row
   INSERT INTO site_config (id, tagline, venue)
   VALUES ('main', 'EVERY MONDAY', '11 Clubroom · Corso Como · Milano')
   ON CONFLICT (id) DO NOTHING;

   -- RLS: public read, authenticated write
   ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Public read" ON site_config FOR SELECT USING (true);
   CREATE POLICY "Service write" ON site_config FOR ALL USING (true);

   -- Enable realtime
   ALTER PUBLICATION supabase_realtime ADD TABLE site_config;
````

2. CREARE API ROUTE per leggere config
   File: src/app/api/config/route.ts
   - GET: legge site_config dove id='main', restituisce JSON {tagline, venue}
   - Aggiungi header Cache-Control: no-cache, no-store (sempre fresco)

3. CREARE API ROUTE per aggiornare config (protetta)
   File: src/app/api/admin/config/route.ts
   - PUT: aggiorna tagline e/o venue in site_config
   - Proteggi con check sessione NextAuth (come le altre route admin)
   - Valida input con Zod

4. CREARE PAGINA ADMIN SETTINGS
   File: src/app/admin/(dashboard)/settings/page.tsx
   - Form con due campi: "Tagline" e "Venue"
   - Pre-popolati con valori attuali (fetch da API)
   - Bottone "Salva" che fa PUT
   - Feedback visivo: "Salvato!" con fade out
   - Stile coerente con dashboard admin esistente

5. AGGIUNGERE LINK nel layout admin
   In src/app/admin/(dashboard)/layout.tsx, aggiungi link "Impostazioni" nella nav

6. AGGIORNARE LA LANDING PAGE per usare config dinamica
   In src/app/page.tsx:
   - Fetch config lato server: fetch('/api/config') o direttamente da Supabase
   - Usa revalidate: 0 (o dynamic = 'force-dynamic') per avere sempre dati freschi
   - Passa tagline e venue come props ai componenti
   - Sostituisci "Every Monday" hardcoded con {config.tagline}
   - Sostituisci "11 Clubroom · Corso Como · Milano" con {config.venue}

7. (BONUS) REAL-TIME SUL CLIENT
   Se vuoi che il cambio sia ISTANTANEO senza refresh:
   - Crea un hook useSiteConfig() che usa Supabase Realtime
   - Subscribe al canale 'site_config' per ricevere UPDATE events
   - Quando arriva un update, aggiorna lo state locale
   - Fallback: i dati server-side sono sempre quelli iniziali

   Nota: per il real-time client-side serve la NEXT_PUBLIC_SUPABASE_URL e una anon key.
   Se non c'è anon key, il fetch server-side con revalidate:0 è sufficiente (l'utente vede il cambio al refresh).

ALTERNATIVA PIÙ SEMPLICE (se il real-time non è critico):
Invece di Supabase, puoi usare un file JSON in /public/config.json che l'admin aggiorna.
Ma Supabase è meglio perché non richiede redeploy e il dato è persistente.

VERIFICA FINALE:

- La tabella site_config esiste su Supabase con dati default
- L'admin può cambiare tagline e venue da /admin/settings
- La landing page mostra i valori aggiornati (almeno al refresh)
- Le API sono protette (PUT richiede auth)
- npm run build senza errori
- Il layout admin ha il link "Impostazioni"

Dimmi il risultato di ogni step.

```

---

## PROMPT 4 — Email di Conferma Redesign + Fix Sfondo Nero

```

[Skill-first] Redesign completo email di conferma BlackSheep + fix sfondo nero forzato

Consulta PRIMA:

- cat ~/.claude/skills/superpowers/verification-before-completion.md

CONTESTO:
File: src/app/api/subscribe/route.ts (righe 99-189 contengono il template HTML email)
Problema attuale: l'email arriva con sfondo bianco su alcuni client (Gmail, Apple Mail).
Il cliente vuole sfondo NERO di default, senza dover cambiare tema.

MODIFICHE DA FARE:

### A) FIX SFONDO NERO FORZATO

Il problema è che molti client email (Gmail, Outlook) ignorano il background del body
e usano il loro sfondo bianco di default. Per forzare il nero:

1. Aggiungi meta tag color-scheme nell'<head>:

   ```html
   <meta name="color-scheme" content="dark" />
   <meta name="supported-color-schemes" content="dark" />
   ```

2. Aggiungi stile inline su <html> e <body>:

   ```html
   <html lang="it" style="background-color:#000000;color-scheme:dark;">
     <body style="margin:0;padding:0;background-color:#000000;color:#FFFFF3;..."></body>
   </html>
   ```

3. Aggiungi uno stile <style> nell'head per i client che lo supportano:

   ```html
   <style>
     :root {
       color-scheme: dark;
     }
     body,
     .body-bg {
       background-color: #000000 !important;
     }
     /* Gmail dark mode override */
     u + .body-bg {
       background-color: #000000 !important;
     }
     /* Outlook dark mode */
     [data-ogsc] body {
       background-color: #000000 !important;
     }
   </style>
   ```

4. Wrap tutto in un div con classe body-bg e sfondo nero inline:
   ```html
   <div class="body-bg" style="background-color:#000000;">
     <table ...></table>
   </div>
   ```

### B) NUOVO COPY EMAIL

Sostituisci il contenuto dell'email con questo design:

**Header:**

- Spacer top 60px (invariato)
- "EVERY MONDAY" (invariato, o meglio: usa la config da site_config se disponibile)
- "BLACK SHEEP" grande (invariato)
- Venue (invariato, o da site_config)

**Divider cream** (invariato)

**Messaggio principale — NUOVO:**

- Titolo: `SEI DEI NOSTRI!` (al posto di "${greeting}")
  Se c'è il nome: `${name}, SEI DEI NOSTRI!`Se non c'è:`SEI DEI NOSTRI!`
- Sotto-testo:
  `Iscrizione confermata. Riceverai tutti gli aggiornamenti per le prossime date in anteprima.`

**CTA Button — NUOVO:**

- Testo: `ENTRA` (al posto di "THE PLACE TO BE")
- Stile: identico (cream bg, black text, font brand, full width)

**Micro copy sotto il bottone — NUOVO:**

- `Un click e sei dentro.` (più diretto e urgente)

**Footer:** invariato (disiscriviti, privacy, @blacksheep)

### C) RENDILO FIGO

Aggiungi questi tocchi premium nell'email:

- Bordino sottile cream (1px, opacity 0.06) attorno all'intera email (sul table interno max-width 520px)
- Un gradiente radiale sottile in cima (come effetto spotlight):
  Aggiungi una riga prima di "EVERY MONDAY":
  ```html
  <tr>
    <td
      style="height:2px;background:radial-gradient(ellipse at center, rgba(255,255,243,0.08) 0%, transparent 70%);"
    ></td>
  </tr>
  ```
- L'intera email deve "respirare" lusso e esclusività. Pochi elementi, molto spazio.

VERIFICA:

- Invia un'email di test (puoi usare Resend con una email temporanea o la tua)
- Verifica che lo sfondo sia nero su Gmail (web e mobile) e Apple Mail
- Il testo "SEI DEI NOSTRI!" è visibile e formattato
- Il bottone "ENTRA" funziona e porta a /api/confirm?token=...
- npm run build OK
- Nessun CSS esterno (tutto inline per compatibilità email)

Dimmi come appare e se il fix sfondo nero funziona.

```

---

## PROMPT 5 — Pagina Conferma Redesign (dopo Prompt 1)

```

[Skill-first] Redesign pagina di conferma (/confirm) più impattante

Consulta PRIMA:

- cat ~/.claude/skills/superpowers/verification-before-completion.md
- cat ~/.claude/skills/react-patterns/SKILL.md
- cat ~/.claude/skills/tailwind-css-patterns/SKILL.md

CONTESTO:
File: src/app/confirm/page.tsx
Attualmente mostra solo logo + "CI SEI" + frase. Troppo basic.
Il progetto usa GSAP per animazioni sulla landing page (LandingMotion.tsx).

REDESIGN — Rendila FIGA:

1. LAYOUT CENTRATO con più personalità:
   - Logo BS (invariato, ma più grande: width 100px)
   - Titolo grande: `SEI DEI NOSTRI` (al posto di "CI SEI")
   - Sotto-titolo: `Iscrizione confermata. Riceverai tutti gli aggiornamenti per le prossime date in anteprima.`
   - Se already=true: `GIÀ CON NOI` + `La tua email è già confermata. Ci vediamo presto.`

2. ANIMAZIONE D'INGRESSO (client component wrapper):
   Crea un ConfirmMotion.tsx simile a LandingMotion.tsx ma più leggero:
   - Logo: fade-in con scale (0.7 → 1) + back.out easing, 0.6s
   - Titolo: fade-in + slide-up (y:20 → 0), delay 0.3s
   - Sotto-titolo: fade-in, delay 0.5s
   - Effetto particelle o confetti leggero? Opzionale, solo se non appesantisce.
   - Spotlight radiale ambient come sulla landing

3. EFFETTO PREMIUM:
   - Background con grain texture (stesso della landing, è nel globals.css)
   - Gradiente radiale sottile in alto (come la landing)
   - La scritta "SEI DEI NOSTRI" con leggero text-shadow glow
   - Font brand (Arial Black) per il titolo
   - Sotto-titolo in font body con opacity 0.6

4. LINK "TORNA AL SITO"
   - Aggiungi un link discreto in basso: "Torna al sito" che porta a /
   - Stile: text-[10px], opacity 0.2, hover opacity 0.5, uppercase, tracking wide

VERIFICA:

- La pagina /confirm mostra il nuovo design
- La pagina /confirm?already=true mostra il messaggio alternativo
- Le animazioni funzionano e rispettano prefers-reduced-motion
- Il layout è centrato e responsive
- npm run build OK

Mostrami come appare.

```

---

## PROMPT 6 — Video con Mask Reveal (RICHIEDE FILE VIDEO)

```

[Skill-first] Integrare video bloccato al frame 500 con animazione mask reveal

Consulta PRIMA:

- cat ~/.claude/skills/superpowers/brainstorming.md
- cat ~/.claude/skills/superpowers/verification-before-completion.md

⚠️ PREREQUISITO: Il file BLUSALUTO0001-0120.mp4 deve essere nella cartella public/ del progetto.
Se non c'è, chiedimi di copiarlo prima.

CONTESTO:
File da modificare:

- src/app/page.tsx (aggiungere il video)
- src/components/LandingMotion.tsx (animazione)
- src/app/globals.css (stili video)
- next.config.ts (se serve aggiornare CSP per video)
- body max-width attuale: 480px — il video potrebbe richiedere un layout più largo

TASK:

1. ESTRARRE IL FRAME 500 dal video
   Usa ffmpeg per estrarre il frame 500 come fallback/poster:

   ```bash
   ffmpeg -i public/BLUSALUTO0001-0120.mp4 -vf "select=eq(n\,500)" -frames:v 1 public/video-poster.jpg
   ```

   Opzionalmente, crea un video corto che parte e si blocca al frame 500:

   ```bash
   # Calcola il timestamp del frame 500 (dipende dal framerate)
   ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate public/BLUSALUTO0001-0120.mp4
   # Se 24fps: frame 500 = ~20.83s
   # Se 30fps: frame 500 = ~16.67s
   ffmpeg -i public/BLUSALUTO0001-0120.mp4 -t [TIMESTAMP] -c copy public/hero-video.mp4
   ```

2. LAYOUT — Video sulla destra del logo
   Il layout attuale è una colonna centrata (max-width 480px).
   Per il video sulla destra serve un layout a due colonne nella zona logo:

   ```
   [Contenuto principale]  |  [Video]
   (scritta, logo, form)   |  (mask reveal)
   ```

   Approccio suggerito:
   - Sopra i 768px (md): grid a 2 colonne, col sinistra = contenuto, col destra = video
   - Sotto 768px: video nascosto o in posizione diversa (sotto il logo, più piccolo)
   - Rimuovi il max-width:480px dal body, e mettilo solo sulla colonna contenuto
   - Il video può avere max-height: 70dvh, border-radius leggero, overflow hidden

3. VIDEO ELEMENT

   ```html
   <video
     data-motion="hero-video"
     src="/hero-video.mp4"
     poster="/video-poster.jpg"
     muted
     playsinline
     preload="auto"
     className="..."
   />
   ```

   - Il video parte in autoplay e si ferma al frame target
   - Oppure: usa solo il poster (immagine statica del frame 500)

4. ANIMAZIONE MASK REVEAL (in LandingMotion.tsx)
   Effetto: maschera circolare che si espande dal centro del video

   ```js
   // Initial state
   gsap.set("[data-motion='hero-video']", {
     clipPath: "circle(0% at 50% 50%)",
     opacity: 0,
   });

   // In timeline, dopo il logo (es. a 2.5s):
   tl.to(
     "[data-motion='hero-video']",
     {
       clipPath: "circle(75% at 50% 50%)",
       opacity: 1,
       duration: 1.2,
       ease: "power2.out",
     },
     2.5,
   );
   ```

   Questo dà un effetto WOW: il video si rivela come se un occhio si aprisse.

5. OTTIMIZZAZIONE
   - Comprimi il video per il web (max 2-3MB)
   - Aggiungi lazy loading se il video è pesante
   - Testa performance su mobile

NOTA IMPORTANTE:
Se il video è troppo pesante o il layout a due colonne rompe il design mobile,
proponi un'alternativa: es. video come sfondo semi-trasparente dietro il contenuto,
o video che appare solo su desktop.

VERIFICA:

- Il video è visibile sulla destra su desktop (>768px)
- Su mobile il layout rimane usabile
- L'animazione mask reveal funziona con la timeline GSAP
- Il video è fermo al frame corretto
- npm run build OK
- Performance: il video non rallenta il caricamento della pagina
- next.config.ts ha la CSP aggiornata se serve

Dimmi il risultato e mostrami screenshot o descrizione del layout.

````

---

## NOTE PER LORENZO

### Ordine di esecuzione consigliato:
1. **PROMPT 1** (layout) — È la base, tutto il resto dipende da questo
2. **PROMPT 2** (animazione scritta) — Subito dopo, completa il lavoro del prompt 1
3. **PROMPT 3** (admin settings) — Parallelizzabile col prompt 2
4. **PROMPT 4** (email) — Indipendente, può andare in parallelo
5. **PROMPT 5** (confirm page) — Indipendente, può andare in parallelo
6. **PROMPT 6** (video) — Per ultimo, richiede il file video e tocca il layout

### File video:
Il file `BLUSALUTO0001-0120.mp4` non è accessibile da Cowork (è in C:\Users\algeri\Downloads\).
Prima di lanciare il Prompt 6, copialo nella cartella del progetto:
```bash
cp "C:\Users\algeri\Downloads\BLUSALUTO0001-0120.mp4" apps/newsletter/public/
````

### Dopo ogni prompt:

Torna qui in Cowork per review. Ti aiuto a verificare i risultati e generare eventuali prompt di fix.

### Test in locale:

Dopo tutti i prompt, lancia in Claude Code:

```bash
cd apps/newsletter && npm run dev
```

E apri http://localhost:3000 per verificare.
