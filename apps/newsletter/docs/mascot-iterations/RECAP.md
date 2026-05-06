# Mascot Intro — Iteration Log & Recap

> **Per la prossima chat Claude Code:** questo documento contiene
> tutte le iterazioni che sono state tentate sul componente
> `MascotteIntro.tsx` in una sessione di debug, con il feedback
> dell'utente per ognuna. Ogni iterazione è documentata con il
> codice completo (TSX + keyframe CSS) così puoi ripristinarne una
> qualsiasi e testarla, oppure proporre una variante nuova.
>
> **Trilemma irrisolto:** trovare una soluzione che soddisfi
> simultaneamente i tre requisiti dell'utente:
>
> 1. **Smooth** (no scatti) sia su mobile sia su desktop
> 2. **Luccichio bracciale + collana** visibili come nella versione
>    img-element (browser image pipeline native)
> 3. **Niente boot delay** (mascotte visibile dal primo paint)
>
> Tutte le iterazioni hanno trovato 2/3 ma mai 3/3.

---

## 0. Setup

- Stack: Next.js 16 (Turbopack), React 19, Tailwind 4, TypeScript strict
- Source frames: 101 webp portrait `apps/newsletter/public/mascot-frames/m000.webp` … `m100.webp` (1920×1080, alpha channel)
- Source video alternativi (asset esistenti):
  - `intro-mascotte.webm` (1.2MB, 960×540 landscape, 4s, NO alpha)
  - `mascotte-video.webm` (111KB, 884×844, 5s, NO alpha)
  - `intro-sprite.webp` (676KB, 3840×4050, sprite sheet potenziale, alpha?)
- Lifecycle events emessi (consumati da `LandingMotion.tsx` e `EventsListGate.tsx`):
  - `bs-mascotte-start` — frame loop ha iniziato
  - `bs-mascotte-reveal` — raggiunto frame 50 (~1.67s) → triggera GSAP entrance
  - `bs-mascotte-end` — fade-out completato → triggera apertura EventsListGate
  - `bs-mascotte-bypass` — abort segnale (timeout / errore decode)

Costanti tunable comuni (in tutte le versioni):

```ts
const PLAY_UNTIL = 100;
const REVEAL_FRAME = 50;
const FPS = 30;
const HOLD_AFTER_END_MS = 350;
const FADE_OUT_MS = 600;
```

---

## V0 — Versione PRODUCTION DEPLOYED (img.src loop + GPU compositing)

**Stato:** live su `https://newsletter.blacksheep-community.com/newsletter`
**Commit:** `7a57885` (`perf(landing): GPU-composite mascot wrapper to remove mobile jitter`)
**Approccio:** classico frame loop su `<img>` element, src swappato 30 volte/sec via rAF. Pre-load webps come `Image()` all'init. Wrapper con `will-change: transform, opacity` + `translate3d(0,0,0)` per forzare GPU compositing.

**Pro:**

- Luccichio bracciale + collana **VISIBILI** (browser image pipeline native preserva i pixel)
- Mascotte visibile dal primo paint (frame 0 reso da img.src iniziale)
- Pattern semplice e debuggabile

**Contro:**

- Scatti su mobile (browser ridecodifica webp ad ogni src swap su device meno performanti)

**Codice MascotteIntro.tsx:**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

const PLAY_UNTIL = 100;
const REVEAL_FRAME = 50;
const FPS = 30;
const FRAME_DURATION_MS = 1000 / FPS;
const HOLD_AFTER_END_MS = 350;
const FADE_OUT_MS = 600;
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const MASCOT_HEIGHT_DVH = 100;
const OBJECT_POSITION_X_PERCENT = 36;

type MascotteBypassWindow = Window & { __bsSkipMascotte__?: boolean };

export const MASCOTTE_START_EVENT = "bs-mascotte-start";
export const MASCOTTE_REVEAL_EVENT = "bs-mascotte-reveal";
export const MASCOTTE_END_EVENT = "bs-mascotte-end";
export const MASCOTTE_BYPASS_EVENT = "bs-mascotte-bypass";

const framePath = (i: number) => `${BASE_PATH}/mascot-frames/m${String(i).padStart(3, "0")}.webp`;

export function MascotteIntro() {
  const imgRef = useRef<HTMLImageElement>(null);
  const rafRef = useRef<number>(0);
  const [fading, setFading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const runtimeWindow = window as MascotteBypassWindow;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isBypassed = () => runtimeWindow.__bsSkipMascotte__ === true;
    const timeouts: number[] = [];

    const fireStart = () => window.dispatchEvent(new CustomEvent(MASCOTTE_START_EVENT));
    const fireReveal = () => window.dispatchEvent(new CustomEvent(MASCOTTE_REVEAL_EVENT));
    const fireEnd = () => window.dispatchEvent(new CustomEvent(MASCOTTE_END_EVENT));

    const handleBypass = () => {
      runtimeWindow.__bsSkipMascotte__ = true;
      cancelAnimationFrame(rafRef.current);
      timeouts.forEach(window.clearTimeout);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(true);
    };
    window.addEventListener(MASCOTTE_BYPASS_EVENT, handleBypass);

    if (prefersReducedMotion || isBypassed()) {
      fireStart();
      fireReveal();
      fireEnd();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDone(true);
      return () => window.removeEventListener(MASCOTTE_BYPASS_EVENT, handleBypass);
    }

    const frames: HTMLImageElement[] = [];
    for (let i = 0; i <= PLAY_UNTIL; i++) {
      const img = new Image();
      img.src = framePath(i);
      frames.push(img);
    }

    let revealed = false;

    const playFrom = (startTime: number) => {
      fireStart();
      const tick = (now: number) => {
        if (isBypassed()) return;
        const elapsed = now - startTime;
        const frame = Math.min(PLAY_UNTIL, Math.floor(elapsed / FRAME_DURATION_MS));
        const img = imgRef.current;
        if (img && frames[frame]?.src) img.src = frames[frame].src;
        if (!revealed && frame >= REVEAL_FRAME) {
          revealed = true;
          fireReveal();
        }
        if (frame >= PLAY_UNTIL) {
          timeouts.push(
            window.setTimeout(() => {
              setFading(true);
              timeouts.push(
                window.setTimeout(() => {
                  fireEnd();
                  setDone(true);
                }, FADE_OUT_MS),
              );
            }, HOLD_AFTER_END_MS),
          );
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    if (frames[0].complete) playFrom(performance.now());
    else {
      frames[0].addEventListener("load", () => playFrom(performance.now()), { once: true });
      frames[0].addEventListener("error", () => playFrom(performance.now()), { once: true });
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      timeouts.forEach(window.clearTimeout);
      window.removeEventListener(MASCOTTE_BYPASS_EVENT, handleBypass);
    };
  }, []);

  if (done) return null;

  return (
    <div
      aria-hidden="true"
      data-mascotte-intro
      className={`pointer-events-none fixed inset-0 z-[2] overflow-hidden transition-opacity duration-[600ms] ease-out ${fading ? "opacity-0" : "opacity-100"}`}
    >
      <img
        ref={imgRef}
        src={framePath(0)}
        alt=""
        draggable={false}
        loading="eager"
        fetchPriority="high"
        style={{
          height: `${MASCOT_HEIGHT_DVH}dvh`,
          objectPosition: `${OBJECT_POSITION_X_PERCENT}% bottom`,
        }}
        className="absolute inset-0 w-full object-cover select-none"
      />
    </div>
  );
}
```

**Globals.css keyframe (per la slide mobile):**

```css
@keyframes bs-mascot-mobile-shift {
  0%,
  60% {
    transform: translate3d(0, 0, 0);
  }
  100% {
    transform: translate3d(-25vw, 0, 0);
  }
}

@media (max-width: 768px) {
  [data-mascotte-intro] {
    animation: bs-mascot-mobile-shift 3.333s cubic-bezier(0.65, 0, 0.35, 1) both;
  }
}

[data-mascotte-intro] {
  will-change: transform, opacity;
  transform: translateZ(0);
}
[data-mascotte-intro] img {
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
}
```

**Feedback utente:** "va a scatti su mobile" — punto di partenza dei tentativi successivi.

---

## V1 — Refactor a `<video>` element (intro-mascotte.webm 960×540 landscape)

**Approccio:** sostituire frame loop con singolo `<video>` autoplay muted playsInline. Hardware video decoding GPU.

**Pro:** smooth nativo (hardware decoding)
**Contro:**

- Aspect ratio landscape (960×540) → su portrait mobile l'object-cover zooma enormemente la mascotte
- **NO alpha channel** nel video webm → background nero baked-in che rompe il gradient brand
- Animation contenuto potrebbe essere diverso dalla webp sequence

**Feedback utente:** "molto più grande di prima", poi "sfondo nero non lo voglio".

---

## V2 — Video con object-contain + height 95dvh (mascotte-video.webm 884×844)

**Approccio:** cambio video src + `style={{ height: '95dvh', width: 'auto', objectFit: 'contain' }}`.

**Feedback utente:** "ha sfondo nero baked-in (perché video webm non ha alpha), non puoi rimetterla com'era prima?"

**Conclusione:** Video element è scartato per il problema dell'alpha channel. I webm assets disponibili non preservano la trasparenza.

---

## V3 — Rollback a img.src + tunable knobs centralizzati

**Approccio:** torno a img.src loop come V0, ma centralizzo `MASCOT_HEIGHT_DVH` e `OBJECT_POSITION_X_PERCENT` come costanti per facile tuning.

**Feedback utente:** "ok, dimensioni e slide ora spaccano, non toccare". MASCOT_HEIGHT_DVH=100, OBJECT_POSITION_X_PERCENT=36 fissati. Ma scatti mobile presenti.

---

## V4 — Canvas + ImageBitmap pre-decode (DPR cap 2, smoothing high)

**Approccio:** sostituisco `<img>` con `<canvas>` + decode tutti i 101 frames come `ImageBitmap` all'init. `ctx.drawImage(bm, 0, 0, intrinsicW, intrinsicH)` per frame.

```tsx
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = intrinsicW * dpr;
canvas.height = intrinsicH * dpr;
ctx.scale(dpr, dpr);
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

const tick = (now) => {
  ctx.clearRect(0, 0, intrinsicW, intrinsicH);
  ctx.drawImage(bitmaps[frame], 0, 0, intrinsicW, intrinsicH);
};
```

**Pro:** smooth playback (decoded once, drawImage cheap)
**Contro:** **luccichio bracciale RIDOTTO** (canvas re-rasterization perde dettaglio, doppio scaling: bitmap → backing store DPR-scaled → CSS display)

**Boot delay:** 1-2s di pre-decode iniziale → mascotte invisibile fino a quando i bitmap sono pronti.

**Feedback utente:** "OK posizione e slide spaccano, ma luccichio sparito + 2.5s di boot delay".

---

## V5 — V4 + frame 0 placeholder via img (no boot delay)

**Approccio:** mostro `<img src={framePath(0)}>` come placeholder visibile dal primo paint. Sostituisco con canvas (opacity swap) appena i bitmap sono pronti.

```tsx
<img style={{ opacity: bitmapsReady ? 0 : 1 }} ... />
<canvas ref={canvasRef} style={{ opacity: bitmapsReady ? 1 : 0 }} ... />
```

**Risolve:** boot delay
**Persiste:** luccichio ridotto

---

## V6 — V5 + DPR uncap + imageSmoothing high

**Tentativo per ripristinare luccichio:** rimuovo cap `Math.min(dpr, 2)`, uso DPR pieno (3 su retina).

**Feedback utente:** "luccichio ancora non visibile, va PIÙ a scatti rispetto al ultimo prompt".

**Conclusione:** DPR uncap aumenta backing store (9x area), GPU pressure → più scatti. Non risolve il luccichio.

---

## V7 — Rollback img.src + img.decode() pre-warm + image-rendering optimize-contrast

**Approccio:** torno a img element per il luccichio, ma pre-decode con `img.decode()` async per ridurre scatti.

```tsx
const preDecodeAll = async () => {
  const promises = frames.map((f) => f.decode?.().catch(() => undefined));
  await Promise.all(promises);
};

preDecodeAll().then(() => playFrom(performance.now()));
```

```tsx
<img style={{ imageRendering: "-webkit-optimize-contrast" }} ... />
```

**Feedback utente:** "no non ci siamo, troppi scatti, luccichio non presente proprio".

---

## V8 — Canvas + premultiplyAlpha "none" + backing store 1:1 (CURRENT, FAILED)

**Diagnosi del problema canvas perdita-fidelity:**

1. **`premultiplyAlpha: "default"`** moltiplica RGB×alpha durante decode → highlights bianchi semi-trasparenti vengono dimmati
2. **Backing store DPR-scaled** + `ctx.scale(dpr, dpr)` causa scaling interno al canvas (lossy)

**Fix tentato:**

```tsx
createImageBitmap(blob, { premultiplyAlpha: "none", colorSpaceConversion: "default" });
```

```tsx
canvas.width = intrinsicW; // 1920, no DPR multiply
canvas.height = intrinsicH; // 1080
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";
ctx.drawImage(bm, 0, 0); // 1:1 copy, no scale params
```

CSS lascia il browser fare l'unico scaling step (canvas backing 1920×1080 → display ~393×852 portrait).

**Slide:** start +5vw (centra mascotte), end -15vw (poco slide), poi fade-out automatico.

**Feedback utente:** "va molto a scatti da PC, figuriamoci dal cellulare. Prima non era così." → **anche desktop ha scatti** in V8, peggioramento drastico.

**Sospetto causa scatti V8:** memoria — 101 ImageBitmap × 1920×1080×4byte = ~800MB se non-premultiplied (più del cap-DPR-2 di V4 perché premultiplyAlpha:none richiede più storage). Mobile e desktop browser potrebbero evictare bitmap → re-decode on demand → scatti.

---

## Stato del codice ATTUALE in repo (V8)

File: `apps/newsletter/src/components/MascotteIntro.tsx` (HEAD del branch `feat/blacksheep-list`).

Per ripristinare V0 (production deployed):

```bash
git show 7a57885:apps/newsletter/src/components/MascotteIntro.tsx > apps/newsletter/src/components/MascotteIntro.tsx
```

---

## Suggerimenti per la prossima chat

Il trilemma (smooth + luccichio + no-boot-delay) non è stato risolto. Possibili strade non ancora esplorate:

### A. Sprite sheet con `intro-sprite.webp`

- File esiste già: 3840×4050 (probabile 10×10 grid di 384×405 frames)
- **Single image decoded once** → niente per-frame decode, niente bitmap×101
- Animation via `background-position` shift (CSS animation, GPU-composited)
- Trade-off: risoluzione frame ridotta (384×405 vs 1920×1080) → potenziale loss di luccichio
- Verifica con un image viewer se `intro-sprite.webp` ha alpha channel

### B. WebP animato singolo

- Convertire i 101 webp in un unico animated webp (webp animation è supportato dai browser)
- Single image, animated, browser-native rendering = stesso pipeline di img element
- Tools: `webpmux` (webp da Google), `cwebp -mt`
- Comando indicativo: `webpmux -frames m000.webp +33+0+0+0,m001.webp +33+0+0+0,... -o intro-animated.webp`
- Pro: smooth nativo + alpha channel + pixel fidelity preservata
- Contro: file più grande, richiede ri-export (Lorenzo's designer)

### C. CSS animation con sprite stop-frame

- Generare uno sprite verticale dei 101 frame (1920 × 1080×101 = 1920×109080 pixel)
- Container con `overflow: hidden`, height 1080, animation `background-position-y` con `steps(101)`
- Browser rendering native, single decode, no JS rAF loop
- Tools: ImageMagick `convert -append m*.webp intro-vstrip.webp`

### D. Partial pre-decode (sliding window)

- Pre-decode solo i prossimi 10-15 frame ahead, free old ImageBitmaps
- Memory-bounded → no eviction su mobile
- Implementazione complessa ma elimina il trade-off memoria

### E. Lower-resolution decode con createImageBitmap resize

```tsx
createImageBitmap(blob, {
  resizeWidth: 1280,
  resizeHeight: 720,
  resizeQuality: "high",
  premultiplyAlpha: "none",
});
```

- Memoria: 1280×720×4 × 101 ≈ 370MB (vs 800MB). Migliore ma ancora alto su mobile.
- Fidelity: leggermente ridotta.

### F. OffscreenCanvas in Web Worker

- Decoding e rendering nel thread worker
- Main thread libero, niente jank sulla UI
- Refactor invasivo

---

## Riferimenti tecnici (per approfondimento)

- MDN: [createImageBitmap](https://developer.mozilla.org/en-US/docs/Web/API/createImageBitmap) — opzioni `premultiplyAlpha`, `colorSpaceConversion`, `resizeWidth`
- W3C Canvas2D: [imageSmoothingQuality](https://html.spec.whatwg.org/multipage/canvas.html#image-smoothing)
- Browser texture sampling: bilinear vs bicubic difference per `<img>` vs `<canvas>` differs by browser
- WebP animation: [Google WebP Container Spec](https://developers.google.com/speed/webp/docs/webp_lossless_alpha_study)

---

## File correlati

- `apps/newsletter/src/components/MascotteIntro.tsx` — componente
- `apps/newsletter/src/app/globals.css` — keyframes `bs-mascot-mobile-shift` (slide mobile)
- `apps/newsletter/src/components/LandingMotion.tsx` — listener `MASCOTTE_REVEAL_EVENT` per GSAP entrance
- `apps/newsletter/src/components/events/EventsListGate.tsx` — listener `MASCOTTE_END_EVENT` per gate apertura
- `apps/newsletter/public/mascot-frames/m000.webp` … `m100.webp` — source frames
- `apps/newsletter/public/intro-sprite.webp` — sprite sheet alternativo
- `apps/newsletter/public/intro-mascotte.webm` — video webm 960×540 landscape (NO alpha)
- `apps/newsletter/public/mascotte-video.webm` — video webm 884×844 (NO alpha)

---

## Lifecycle events da preservare in qualsiasi nuova versione

```ts
// Devono essere dispatched in quest'ordine:
window.dispatchEvent(new CustomEvent("bs-mascotte-start")); // frame loop iniziato
window.dispatchEvent(new CustomEvent("bs-mascotte-reveal")); // frame ~50 raggiunto (50% intro)
window.dispatchEvent(new CustomEvent("bs-mascotte-end")); // fade-out completato
// Bypass se decode/network failure:
window.dispatchEvent(new CustomEvent("bs-mascotte-bypass"));
```

LandingMotion + EventsListGate dipendono da questi. Non toccare i nomi degli eventi.
