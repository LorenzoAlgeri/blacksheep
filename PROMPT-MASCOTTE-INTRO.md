# PROMPT: Mascotte Intro Animation — BlackSheep Landing Page

> Copia questo prompt in Claude Code nella sessione del progetto blacksheep.
> NON mandare in produzione — solo implementazione locale per test.

---

## Contesto

Voglio ridisegnare l'animazione d'ingresso della landing page BlackSheep. L'idea è:

1. **Pagina nera** — lo schermo è completamente nero
2. **La mascotte appare grande** al centro dello schermo e fa il gesto del saluto (animazione "BLUSALUTO")
3. **A metà del saluto** (circa frame 50 su 120, ~1.67s a 30fps), la landing page attuale inizia ad animarsi sotto/dietro la mascotte
4. **Quando il saluto finisce** (~4s), la mascotte **svanisce elegantemente** (fade out + leggero scale down, NON di botto)
5. **La landing page rimane** con tutti gli elementi visibili come adesso

La mascotte NON deve essere centrata al centro dello schermo. Deve essere posizionata nella **metà inferiore della pagina**, ancorata al fondo, come se fosse "in piedi" a piè di pagina. Deve essere **più grande** di come è ora (ora occupa ~25% dell'altezza), circa **40-50% dell'altezza viewport** su mobile. Su desktop proporzionalmente simile. L'intera mascotte deve essere **sempre visibile senza scrollare** — i piedi devono toccare (o quasi) il bordo inferiore del viewport, la testa deve restare ben dentro lo schermo. Centrata orizzontalmente (o leggermente a sinistra come adesso, valuta cosa rende meglio).

## Approccio tecnico: Canvas + Sprite Sheet

**NON usare `<video>` per l'intro.** Il file MP4 non ha canale alpha e `mix-blend-mode: screen` causa aloni bianchi/azzurri su iOS WebKit. Invece, uso una **sprite sheet WebP con alpha reale** + playback via `<canvas>`.

### Asset già pronti in `public/`

- **`public/intro-sprite.webp`** — sprite sheet 3840x4050px, griglia 8 colonne × 15 righe, 120 frame totali. Ogni frame è 480x270px. Ha canale alpha reale (RGBA). Pesa 660KB. Le dimensioni sono sotto il limite canvas iOS di 4096x4096.
- **`public/intro-frames/f001.webp` ... `f120.webp`** — i 120 frame individuali come fallback (480x270 WebP con alpha, ~5KB ciascuno, 640KB totali). Usali SOLO se la sprite sheet non funziona per qualche motivo.

### Perché canvas e non video?

1. **Trasparenza reale** — canvas drawImage() rispetta perfettamente il canale alpha del WebP, zero aloni su qualsiasi browser/OS
2. **iOS compatibile** — nessun problema con mix-blend-mode, nessun hack CSS
3. **Leggero** — 660KB per tutta l'animazione vs MB di video
4. **Controllo preciso** — possiamo sapere esattamente a quale frame siamo per sincronizzare con GSAP

## Situazione tecnica attuale

### File rilevanti

- `src/app/page.tsx` — struttura HTML della landing
- `src/components/LandingMotion.tsx` — logica GSAP delle animazioni (347 righe)
- `src/components/LandingMotionLazy.tsx` — lazy wrapper
- `src/app/globals.css` — stili mascotte (da riga 327)

### Struttura attuale di page.tsx

La mascotte attualmente è DENTRO `.brand-hero`, posizionata absolute a sinistra della scritta:

```tsx
<div className="brand-hero">
  <video data-motion="mascotte" className="mascotte-video mascotte-desktop">
    ...
  </video>
  <img data-motion="mascotte-img" className="mascotte-video mascotte-mobile" />
  <div data-motion="scritta">...</div>
</div>
```

### Animazione attuale (LandingMotion.tsx)

- GSAP timeline con fasi: BUIO (0-1.2s) → RICONOSCIMENTO (1.2-2.5s) → DISCESA (2.7-3.5s)
- La mascotte entra con slide da sinistra a t=1.5s
- `sessionStorage("bs-entrance-seen")` traccia se l'utente ha già visto l'intro
- Dopo l'entrance, partono ambient animations (breathing, shimmer, spotlight)

## Analisi timing attuale (da screen recording)

Ho analizzato una registrazione schermo della landing attuale su desktop. Ecco il timing reale:

```
t=0.0-1.5s  Compilazione/caricamento — pagina bianca poi nera
t=~1.5s     Pagina nera pura — GSAP carica
t=~2.5s     Mascotte appare (piccola, basso-sinistra, mix-blend-mode screen)
t=~3.0-4.0s Mascotte da sola su nero — saluta, alza il braccio
t=~4.5s     Scritta "black sheep" inizia clip-path reveal (sfocata) — SI SOVRAPPONE alla mascotte
t=~5.0s     Scritta visibile + logo S icon materializza
t=~5.5s     "EVERY MONDAY" + location appaiono
t=~6.0s     Location + divider
t=~7.0s     Form completo, mascotte scomparsa, landing finale
```

### Problemi identificati:

1. **Mascotte troppo piccola e decentrata** — sta in basso a sinistra (posizionata relative alla scritta), non grande al centro come vogliamo
2. **2 secondi di mascotte sola su nero** (2.5s→4.5s) — troppo lento, utente si annoia
3. **Scritta si sovrappone alla mascotte** — a t=5s la scritta è sopra la testa della mascotte, brutto
4. **Mascotte non scompare elegantemente** — resta visibile durante la landing, poi sparisce di colpo

### Timing OTTIMALE per la nuova versione:

La nuova intro deve essere **più veloce e fluida**. Obiettivo: dall'apertura al form interattivo in max **5.5s** (vs ~7s attuali).

```
NUOVA TIMELINE:
t=0s        Pagina nera
t=0.2s      Canvas fade in RAPIDO (duration 0.3s) + sprite play()
            La mascotte appare GRANDE al centro (70dvh mobile, 50dvh desktop)
t=~1.3s     Frame 40 — il braccio è al massimo del saluto → trigger landing
            (frame 40, NON 50! Il saluto è al peak a frame 40, poi inizia a scendere)
t=~1.3s     Overlay background inizia fade: #000 → transparent (duration 1.2s)
t=~1.3s     Landing entrance parte SOTTO l'overlay:
            - Scritta clip-path reveal (0.8s)
            - Logo materializza (0.8s, delay 0.6s)
t=~2.5s     Landing quasi tutta visibile, mascotte ancora visibile sopra ma il saluto sta finendo
t=~3.5s     Frame 105 — mascotte ha abbassato il braccio, è ferma → inizia fade out:
            opacity 0, scale 0.95, filter blur(4px), duration 0.8s
t=~3.6s     Overlay bg già transparent → autoAlpha: 0 sull'overlay
t=~4.3s     Mascotte completamente sparita
t=~4.5s     Form, socials, microcopy finiscono di apparire
t=~5.0s     Landing completa, ambient animations partono
```

### Nota sul frame trigger:

Dall'analisi dei frame BLUSALUTO:

- Frame 1-10: mascotte tiene qualcosa, braccia vicine al corpo
- Frame 20-30: inizia il gesto, braccia si allargano (coverage 22%→26%)
- **Frame 35-45: PEAK del saluto** — braccio alzato al massimo, mascotte più larga (coverage 26%)
- Frame 50-60: braccio ancora alto ma inizia a scendere
- Frame 80+: braccia tornano giù, mascotte si "compatta" (coverage scende a 15%)
- Frame 110-120: mascotte ferma, braccia lungo il corpo

**Trigger la landing a frame 40** (peak del saluto) e **inizia il fade out a frame 105** (mascotte quasi ferma). NON aspettare frame 120 — gli ultimi 15 frame sono quasi identici e il fade out deve sovrapporsi alla fine dell'animazione per un risultato fluido.

## Cosa implementare

### 1. Nuovo componente: IntroCanvas.tsx

Crea `src/components/IntroCanvas.tsx` — componente React che gestisce il canvas e il playback della sprite sheet.

```tsx
"use client";
import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";

// Sprite sheet config
const SPRITE_COLS = 8;
const SPRITE_ROWS = 15;
const FRAME_W = 480;
const FRAME_H = 270;
const TOTAL_FRAMES = 120;
const FPS = 30;

export interface IntroCanvasHandle {
  play: () => Promise<void>;
  getCurrentFrame: () => number;
  isComplete: () => boolean;
}

export const IntroCanvas = forwardRef<
  IntroCanvasHandle,
  {
    onFrameUpdate?: (frame: number) => void;
    onComplete?: () => void;
    className?: string;
  }
>(function IntroCanvas({ onFrameUpdate, onComplete, className }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<HTMLImageElement | null>(null);
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isCompleteRef = useRef(false);

  // Preload sprite sheet
  useEffect(() => {
    const img = new Image();
    img.src = "/intro-sprite.webp";
    img.onload = () => {
      spriteRef.current = img;
    };
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Set canvas size based on container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    const sprite = spriteRef.current;
    if (!canvas || !sprite) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const col = frameIndex % SPRITE_COLS;
    const row = Math.floor(frameIndex / SPRITE_COLS);
    const rect = canvas.getBoundingClientRect();

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Calculate sizing: fit frame in canvas maintaining aspect ratio
    const frameAspect = FRAME_W / FRAME_H;
    const canvasAspect = rect.width / rect.height;
    let drawW: number, drawH: number, drawX: number, drawY: number;

    if (canvasAspect > frameAspect) {
      drawH = rect.height;
      drawW = drawH * frameAspect;
    } else {
      drawW = rect.width;
      drawH = drawW / frameAspect;
    }
    drawX = (rect.width - drawW) / 2;
    drawY = (rect.height - drawH) / 2;

    ctx.drawImage(
      sprite,
      col * FRAME_W,
      row * FRAME_H,
      FRAME_W,
      FRAME_H, // source
      drawX,
      drawY,
      drawW,
      drawH, // destination
    );
  }, []);

  const play = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (!spriteRef.current) {
        // Wait for sprite to load
        const checkLoaded = setInterval(() => {
          if (spriteRef.current) {
            clearInterval(checkLoaded);
            startPlayback(resolve);
          }
        }, 50);
        return;
      }
      startPlayback(resolve);
    });

    function startPlayback(resolve: () => void) {
      frameRef.current = 0;
      isPlayingRef.current = true;
      isCompleteRef.current = false;
      lastTimeRef.current = performance.now();

      const frameDuration = 1000 / FPS;

      const tick = (now: number) => {
        if (!isPlayingRef.current) return;

        const elapsed = now - lastTimeRef.current;
        if (elapsed >= frameDuration) {
          lastTimeRef.current = now - (elapsed % frameDuration);
          drawFrame(frameRef.current);
          onFrameUpdate?.(frameRef.current);

          frameRef.current++;
          if (frameRef.current >= TOTAL_FRAMES) {
            isPlayingRef.current = false;
            isCompleteRef.current = true;
            onComplete?.();
            resolve();
            return;
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    }
  }, [drawFrame, onComplete, onFrameUpdate]);

  useImperativeHandle(ref, () => ({
    play,
    getCurrentFrame: () => frameRef.current,
    isComplete: () => isCompleteRef.current,
  }));

  return <canvas ref={canvasRef} className={className} style={{ width: "100%", height: "100%" }} />;
});
```

### 2. Aggiorna page.tsx

Aggiungi il layer intro SOPRA il contenuto attuale:

```tsx
import { IntroCanvas } from "@/components/IntroCanvas";

// ... dentro il return di Home():
<LandingMotion>
  {/* INTRO LAYER — mascotte grande che saluta, sopra tutto */}
  <div data-motion="intro-overlay" className="intro-overlay">
    <div className="intro-canvas-wrapper">
      <canvas data-motion="intro-canvas" />
      {/* Il canvas vero viene montato da LandingMotion tramite IntroCanvas */}
    </div>
  </div>

  {/* LANDING — contenuto attuale invariato */}
  <main className="relative z-10 ...">... tutto come adesso ...</main>
</LandingMotion>;
```

**NOTA:** Il componente IntroCanvas potrebbe dover essere integrato direttamente in LandingMotion.tsx per avere accesso al ref e alla timeline GSAP. Valuta tu l'architettura migliore — l'importante è che:

- Il canvas sia dentro un overlay fixed z-100 sopra tutto
- LandingMotion.tsx possa controllare play/pause/frame del canvas
- La sprite sheet venga preloadata appena il componente monta

### 3. CSS per l'intro (globals.css)

Aggiungi dopo i commenti esistenti della mascotte:

```css
/* === Intro Overlay — mascotte greeting fullscreen === */
.intro-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end; /* mascotte ancorata al fondo */
  justify-content: center;
  padding-bottom: 2dvh; /* piccolo margine dal bordo inferiore */
  background: #000;
  /* pointer-events gestito da GSAP (autoAlpha) */
}

.intro-canvas-wrapper {
  width: 100%;
  height: 45dvh; /* ~45% viewport, mascotte ben visibile ma non gigante */
  max-width: 500px; /* cap larghezza */
  max-height: 500px; /* cap altezza */
}

@media (min-width: 641px) {
  .intro-canvas-wrapper {
    height: 40dvh; /* proporzionalmente simile su desktop */
    max-height: 450px;
  }
}
```

### 4. Nuova timeline GSAP (LandingMotion.tsx)

Integra la logica dell'intro nella timeline esistente. Il flusso è:

```
FASE 0 — INTRO MASCOTTE (0s – 4.3s):
  t=0s:       intro-overlay visibile (sfondo nero), canvas opacity 0
  t=0.2s:     canvas fade in RAPIDO (opacity 0→1, duration 0.3s, ease: power2.out)
  t=0.2s:     introCanvas.play() — avvia sprite playback a 30fps

  CALLBACK onFrameUpdate(frame):
    if frame === 40 → {                    // PEAK del saluto (braccio al massimo)
      startLandingEntrance()               // landing anima SOTTO l'overlay
      fadeOverlayBackground()              // overlay bg: #000 → transparent (1.2s)
    }
    if frame === 105 → {                   // Mascotte quasi ferma
      fadeOutMascotte()                    // canvas fade out elegante (0.8s)
    }

  FADE OUT MASCOTTE (triggered a frame 105, ~3.5s):
    gsap.to(canvasWrapper, {
      opacity: 0,
      scale: 0.95,
      filter: "blur(4px)",
      duration: 0.8,
      ease: "power2.inOut"
    })
    // Dopo 0.9s → overlay autoAlpha: 0

LANDING ENTRANCE (triggered a frame 40, ~1.33s):
  Parte SOTTO l'overlay che sta diventando trasparente.
  Stessa sequenza della timeline attuale — tempi relativi identici.
  Form e socials arrivano per ultimi (~+2.5s dal trigger = ~3.8s assoluti).
```

### Perché frame 40 e non 50?

Dall'analisi dei frame BLUSALUTO:

- Frame 35-45: PEAK del saluto — braccio alzato al massimo (coverage 26%)
- Frame 50+: braccio sta già scendendo
- Frame 80+: braccia tornano giù (coverage 15%)
- Frame 105-120: mascotte ferma, quasi identici tra loro

Triggeriamo a frame 40 (peak) così la landing inizia mentre il saluto è ancora al massimo impatto visivo. Il fade out inizia a frame 105 (non 120) così si sovrappone agli ultimi frame statici per un risultato fluido.

**Implementazione suggerita:**

```typescript
// Dentro useGSAP, dopo le initial hidden states:

// Funzione che avvia l'entrance della landing (estratta dalla timeline attuale)
function startLandingEntrance() {
  const landingTl = gsap.timeline();

  // FASE 1-3 della landing: copia esatta della timeline attuale
  // ma come timeline separata triggerata dal frame 50
  landingTl.to("[data-motion='gradient']", { opacity: 1, duration: 0.8, ease: "power2.inOut" }, 0);
  landingTl.to("[data-motion='scritta']", { clipPath: "inset(0 0% 0 0)", duration: 0.8, ease: "power3.out" }, 0.8);
  // ... tutto il resto della sequenza attuale con gli stessi tempi relativi
}

// Setup intro
const introOverlay = containerRef.current?.querySelector("[data-motion='intro-overlay']");
const introCanvas = /* ref al canvas */;

if (!hasSeenEntrance && introOverlay) {
  // Set initial states
  gsap.set(introOverlay, { autoAlpha: 1 });
  gsap.set(".intro-canvas-wrapper", { opacity: 0, scale: 1 });

  // Intro timeline
  const introTl = gsap.timeline();

  // Fade in canvas
  introTl.to(".intro-canvas-wrapper", {
    opacity: 1,
    duration: 0.5,
    ease: "power2.out"
  }, 0.3);

  // Start sprite playback
  introTl.call(() => {
    introCanvasRef.current?.play();
  }, [], 0.3);

  // Il trigger per la landing entrance avviene nel callback onFrameUpdate
  // quando frame === 50, chiama startLandingEntrance()
}
```

### 5. Gestione onComplete (fade out mascotte)

Quando l'animazione sprite finisce (120 frame completati), la callback `onComplete` deve:

```typescript
function handleIntroComplete() {
  // Fade out elegante della mascotte
  gsap.to(".intro-canvas-wrapper", {
    opacity: 0,
    scale: 0.95,
    filter: "blur(4px)",
    duration: 0.8,
    ease: "power2.inOut",
  });

  // Sfondo overlay da nero a trasparente
  gsap.to("[data-motion='intro-overlay']", {
    backgroundColor: "transparent",
    duration: 0.6,
    ease: "power2.inOut",
    delay: 0.1,
  });

  // Rimuovi overlay dopo il fade
  gsap.to("[data-motion='intro-overlay']", {
    autoAlpha: 0, // opacity:0 + visibility:hidden → no pointer intercept
    duration: 0.1,
    delay: 0.9,
  });
}
```

### 6. Skip al revisit

Il `sessionStorage` check esistente deve saltare TUTTA l'intro:

```typescript
if (hasSeenEntrance) {
  // Nascondi overlay immediatamente
  gsap.set("[data-motion='intro-overlay']", { autoAlpha: 0 });
  // Set everything to final visible state (come adesso)
  // ... codice esistente del revisit path ...
  startAmbientMotion();
  return;
}
```

### 7. Mascotte piccola accanto alla scritta

La mascotte piccola (`data-motion="mascotte"` e `data-motion="mascotte-img"`) nell'HTML attuale:

- **NON rimuoverla** dal codice
- Nascondila con `gsap.set("[data-motion^='mascotte']", { autoAlpha: 0 })` all'inizio
- Dopo che l'intro è finita, NON mostrarla (la mascotte scompare e basta)
- Al revisit, stessa cosa — mascotte piccola nascosta
- Commenta con `// DISABLED: mascotte piccola, sostituita da intro animation` per chiarezza

## IMPORTANTE: Niente flash bianco al caricamento

La pagina deve essere NERA dal primo istante. Aggiungi in `globals.css` o nel `<html>` tag:

```css
html,
body {
  background-color: #000;
}
```

Se non c'è già, questo evita il flash bianco che si vede durante il caricamento di Next.js prima che GSAP prenda il controllo. L'overlay nero dell'intro si fonde seamlessly con lo sfondo nero della pagina.

## Nota sul "feeling premium"

La sincronizzazione deve dare un senso di **coreografia intenzionale**, non di "cose che appaiono a caso":

- La mascotte NON deve restare sola per più di ~1.3s (frame 1→40)
- Quando il saluto raggiunge il peak, la landing DEVE iniziare a emergere — come se la mascotte la stesse "presentando"
- Il fade dell'overlay da nero a trasparente crea un effetto "sipario che si alza"
- La mascotte che svanisce alla fine è il "ti lascio qui, goditi il club" — non deve essere brusco

## Vincoli

- **NON pushare/deployare** — solo implementazione locale per test con `pnpm dev`
- **NON eliminare** codice della mascotte piccola — solo nasconderlo
- **Mantieni il sessionStorage** skip al revisit
- **Mantieni le ambient animations** (breathing, shimmer, spotlight) — partono dopo che l'intro è finita
- **ZERO mix-blend-mode** nell'intro — il canvas disegna direttamente con alpha, nessun hack CSS
- **Testa la performance** su mobile dev tools (canvas a 30fps deve essere smooth)

## Attenzione: aloni

Il problema principale che vogliamo risolvere con questo refactoring è **eliminare gli aloni bianchi/azzurri** che apparivano su iOS con la mascotte attuale. La sprite sheet ha **alpha reale** (RGBA, ~87% pixel completamente trasparenti, ~12% completamente opachi, <1% semi-trasparenti). Il canvas `drawImage()` renderizza l'alpha nativamente senza bisogno di blend modes. Se vedi QUALSIASI alone o bordo intorno alla mascotte, c'è un problema — verifica che:

1. Il canvas abbia `background: transparent` (nessuno sfondo applicato)
2. Non ci siano filtri CSS (drop-shadow, blur) applicati al canvas durante il playback
3. L'overlay background passi da `#000` a `transparent` SOLO dopo che il canvas ha finito

## Skill da consultare

```bash
grep -rl "canvas\|animation\|gsap" ~/.claude/skills/ --include="SKILL.md" | head -10
grep -rl "react-patterns\|performance" ~/.claude/skills/ --include="SKILL.md" | head -10
```

## Test checklist

- [ ] Su desktop Chrome: mascotte grande al centro, saluto animato 30fps smooth, fade a landing
- [ ] Su mobile dev tools (390x844): stessa cosa, mascotte 70dvh, nessun alone
- [ ] A frame 50 del saluto: la landing inizia ad apparire sotto
- [ ] Fade out mascotte elegante (scale down + blur, ~0.8s)
- [ ] Revisit (reload): skip intro, landing diretta
- [ ] Il form è cliccabile dopo che l'intro è finita (overlay rimosso)
- [ ] Nessun layout shift quando l'overlay scompare
- [ ] Canvas non blocca lo scroll/touch dopo la fine dell'intro
- [ ] Build passa (`pnpm build`)
- [ ] TypeScript ok (`pnpm typecheck`)
- [ ] Nessun errore in console
