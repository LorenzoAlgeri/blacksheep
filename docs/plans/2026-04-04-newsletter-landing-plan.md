# Newsletter Landing Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a premium newsletter landing page for BLACK SHEEP with email subscription (double opt-in), unsubscribe, and admin panel.

**Architecture:** Next.js 16 App Router with Supabase (subscribers DB), Resend (email delivery), NextAuth v5 (admin auth). Mobile-first single-viewport landing page. All brand assets from `@blacksheep/shared`.

**Tech Stack:** Next.js 16, Tailwind CSS 4, Supabase, Resend, NextAuth v5, Zod, react-hook-form, lucide-react

**CRITICAL Next.js 16 changes:**
- `middleware.ts` MAY be renamed to `proxy.ts` — **VERIFY before Task 7** (see note below)
- `params` is a Promise → must `await params`
- `cookies()` is async → must `await cookies()`

**⚠ VERIFY AT TASK 7:** Before creating proxy.ts or middleware.ts, run `npx next --version` and check `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` to confirm if middleware.ts has been renamed to proxy.ts. If still middleware.ts, use `export function middleware()` in `middleware.ts` — the logic is identical, only the file/export name changes.

**Notes for future (non-blocking):**
- Task 10: Inline HTML email templates work for MVP. After launch, migrate to React Email (Resend supports it natively) for richer templates.
- Task 11: Add rate limit verification to smoke test — send 4 consecutive POST to /api/subscribe, verify 4th returns 429.

**Design doc:** `docs/plans/2026-04-04-newsletter-landing-design.md`

---

### Task 1: Foundation — globals.css + layout.tsx + brand integration

**Files:**
- Modify: `apps/newsletter/src/app/globals.css`
- Modify: `apps/newsletter/src/app/layout.tsx`

**Step 1: Replace globals.css with brand design system**

Replace the entire contents of `apps/newsletter/src/app/globals.css` with:

```css
@import "tailwindcss";
@import "@blacksheep/shared/design-system.css";

/* === Noise grain texture (CSS only, no images) === */
@property --noise-opacity {
  syntax: "<number>";
  initial-value: 0.03;
  inherits: false;
}

@theme inline {
  --color-bs-black: var(--bs-black);
  --color-bs-gold: var(--bs-gold);
  --color-bs-cream: var(--bs-cream);
  --color-bs-navy: var(--bs-navy);
  --color-bs-purple: var(--bs-purple);
  --color-bs-burgundy: var(--bs-burgundy);
  --color-bs-green: var(--bs-green);
  --font-heading: var(--bs-font-heading);
  --font-body: var(--bs-font-body);
}

html {
  background: #000000;
}

body {
  background: var(--bs-bg-primary);
  color: var(--bs-text-primary);
  font-family: var(--bs-font-body);
  min-height: 100dvh;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
}

/* Noise overlay */
body::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.03;
  mix-blend-mode: overlay;
  pointer-events: none;
  z-index: 50;
}

/* === CTA breathing glow === */
@keyframes glow-breathe {
  0%, 100% { box-shadow: 0 0 20px rgba(190, 131, 5, 0.15); }
  50% { box-shadow: 0 0 20px rgba(190, 131, 5, 0.25); }
}

/* === Page load animations === */
@keyframes fade-in-scale {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes checkmark-draw {
  from { stroke-dashoffset: 24; }
  to { stroke-dashoffset: 0; }
}

/* Only animate if user allows motion */
@media (prefers-reduced-motion: no-preference) {
  .animate-fade-in-scale {
    animation: fade-in-scale 600ms ease-out both;
  }
  .animate-slide-up {
    animation: slide-up 500ms ease-out both;
  }
  .animate-glow-breathe {
    animation: glow-breathe 2s ease-in-out infinite;
  }
  .animate-glow-breathe:hover {
    animation: none;
    box-shadow: 0 0 30px rgba(190, 131, 5, 0.35);
  }
  .animate-checkmark {
    stroke-dasharray: 24;
    stroke-dashoffset: 24;
    animation: checkmark-draw 400ms ease-out 200ms forwards;
  }
}

/* Reduce motion: no animations, instant display */
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in-scale,
  .animate-slide-up {
    animation: none;
    opacity: 1;
    transform: none;
  }
  .animate-glow-breathe {
    animation: none;
  }
}

/* Gold focus ring for inputs */
input:focus {
  outline: none;
  border-color: var(--bs-gold);
  box-shadow: 0 0 0 1px var(--bs-gold), var(--bs-shadow-gold);
}
```

**Step 2: Replace layout.tsx with brand fonts and metadata**

Replace the entire contents of `apps/newsletter/src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import { Bebas_Neue, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BLACK SHEEP — Every Monday",
  description:
    "Iscriviti alla newsletter di BLACK SHEEP. Lineup e date prima di tutti. Ogni lunedì al 11 Clubroom, Corso Como, Milano.",
  openGraph: {
    title: "BLACK SHEEP — Every Monday",
    description: "Lineup e date prima di tutti. Zero spam.",
    siteName: "BLACK SHEEP",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      className={`${bebasNeue.variable} ${sourceSans.variable} h-full antialiased`}
    >
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
```

**Step 3: Verify it compiles**

Run: `cd apps/newsletter && npx next build` (or `npm run build --workspace=apps/newsletter`)
Expected: Build succeeds with no errors.

**Step 4: Commit**

```bash
git add apps/newsletter/src/app/globals.css apps/newsletter/src/app/layout.tsx
git commit -m "feat(newsletter): brand foundation — fonts, colors, animations, layout"
```

---

### Task 2: Zod schemas + Supabase client + rate limiter

**Files:**
- Create: `apps/newsletter/src/lib/validations.ts`
- Create: `apps/newsletter/src/lib/supabase.ts`
- Create: `apps/newsletter/src/lib/rate-limit.ts`

**Step 1: Create Zod validation schemas**

Create `apps/newsletter/src/lib/validations.ts`:

```ts
import { z } from "zod/v4";

export const subscribeSchema = z.object({
  email: z.email("Inserisci un'email valida"),
  name: z.string().max(100).optional(),
  website: z.string().max(0).optional(), // honeypot: must be empty
});

export const sendNewsletterSchema = z.object({
  subject: z.string().min(1, "Oggetto obbligatorio").max(200),
  body: z.string().min(1, "Contenuto obbligatorio").max(50000),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type SendNewsletterInput = z.infer<typeof sendNewsletterSchema>;
```

> **Note:** Zod v4 uses `z.email()` as a standalone function. Check the installed version — if v3, use `z.string().email()` instead. The package.json shows `"zod": "^4.3.6"` so v4 syntax is correct.

**Step 2: Create Supabase server client**

Create `apps/newsletter/src/lib/supabase.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
```

**Step 3: Create in-memory rate limiter**

Create `apps/newsletter/src/lib/rate-limit.ts`:

```ts
const requests = new Map<string, number[]>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 3;

export function rateLimit(ip: string): boolean {
  const now = Date.now();
  const timestamps = requests.get(ip) ?? [];

  // Remove entries outside the window
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    return false; // rate limited
  }

  recent.push(now);
  requests.set(ip, recent);

  return true; // allowed
}
```

**Step 4: Commit**

```bash
git add apps/newsletter/src/lib/validations.ts apps/newsletter/src/lib/supabase.ts apps/newsletter/src/lib/rate-limit.ts
git commit -m "feat(newsletter): lib — Zod schemas, Supabase client, rate limiter"
```

---

### Task 3: Subscribe API route

**Files:**
- Create: `apps/newsletter/src/lib/resend.ts`
- Create: `apps/newsletter/src/app/api/subscribe/route.ts`

**Step 1: Create Resend client**

Create `apps/newsletter/src/lib/resend.ts`:

```ts
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("Missing RESEND_API_KEY");
}

export const resend = new Resend(process.env.RESEND_API_KEY);
```

**Step 2: Create subscribe API route**

Create `apps/newsletter/src/app/api/subscribe/route.ts`:

```ts
import { NextRequest } from "next/server";
import { subscribeSchema } from "@/lib/validations";
import { supabase } from "@/lib/supabase";
import { resend } from "@/lib/resend";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(ip)) {
    return Response.json(
      { error: "Troppi tentativi. Riprova tra un minuto." },
      { status: 429 },
    );
  }

  const body = await request.json();
  const parsed = subscribeSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Dati non validi." },
      { status: 400 },
    );
  }

  // Honeypot: if "website" field has content, it's a bot
  if (parsed.data.website) {
    // Return 200 to not reveal the honeypot
    return Response.json({ success: true });
  }

  const { email, name } = parsed.data;

  // Insert subscriber (upsert to handle re-subscribes)
  const { data: subscriber, error: dbError } = await supabase
    .from("subscribers")
    .upsert(
      { email, name, status: "pending" },
      { onConflict: "email" },
    )
    .select("token")
    .single();

  if (dbError) {
    console.error("Supabase error:", dbError);
    return Response.json(
      { error: "Errore interno. Riprova." },
      { status: 500 },
    );
  }

  // Send confirmation email
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const confirmUrl = `${siteUrl}/api/confirm?token=${subscriber.token}`;

  const { error: emailError } = await resend.emails.send({
    from: "BLACK SHEEP <noreply@blacksheep.community>",
    to: email,
    subject: "Conferma la tua iscrizione — BLACK SHEEP",
    html: `
      <div style="background:#1F1F1F;color:#FFFFF3;padding:40px;font-family:'Source Sans 3',sans-serif;text-align:center;">
        <h1 style="font-family:'Bebas Neue',sans-serif;color:#BE8305;font-size:32px;letter-spacing:0.1em;">BLACK SHEEP</h1>
        <p style="font-size:18px;margin:24px 0;">Conferma la tua email per entrare nella lista.</p>
        <a href="${confirmUrl}" style="display:inline-block;background:#BE8305;color:#1F1F1F;padding:14px 32px;text-decoration:none;font-weight:700;font-size:16px;letter-spacing:0.05em;">CONFERMA</a>
        <p style="font-size:12px;color:#FFFFF380;margin-top:32px;">Se non hai richiesto l'iscrizione, ignora questa email.</p>
      </div>
    `,
  });

  if (emailError) {
    console.error("Resend error:", emailError);
    return Response.json(
      { error: "Errore nell'invio dell'email. Riprova." },
      { status: 500 },
    );
  }

  return Response.json({ success: true });
}
```

**Step 3: Verify it compiles**

Run: `npx tsc --noEmit --project apps/newsletter/tsconfig.json`
Expected: No type errors.

**Step 4: Commit**

```bash
git add apps/newsletter/src/lib/resend.ts apps/newsletter/src/app/api/subscribe/route.ts
git commit -m "feat(newsletter): POST /api/subscribe with rate limit, honeypot, double opt-in"
```

---

### Task 4: Confirm + Unsubscribe API routes + pages

**Files:**
- Create: `apps/newsletter/src/app/api/confirm/route.ts`
- Create: `apps/newsletter/src/app/api/unsubscribe/route.ts`
- Create: `apps/newsletter/src/app/confirm/page.tsx`
- Create: `apps/newsletter/src/app/unsubscribe/page.tsx`

**Step 1: Create confirm API route**

Create `apps/newsletter/src/app/api/confirm/route.ts`:

```ts
import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return Response.redirect(new URL("/?error=invalid", request.url));
  }

  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("id, status")
    .eq("token", token)
    .single();

  if (!subscriber) {
    return Response.redirect(new URL("/?error=invalid", request.url));
  }

  if (subscriber.status === "confirmed") {
    return Response.redirect(new URL("/confirm?already=true", request.url));
  }

  await supabase
    .from("subscribers")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", subscriber.id);

  return Response.redirect(new URL("/confirm", request.url));
}
```

**Step 2: Create unsubscribe API route**

Create `apps/newsletter/src/app/api/unsubscribe/route.ts`:

```ts
import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return Response.redirect(new URL("/?error=invalid", request.url));
  }

  const { data: subscriber } = await supabase
    .from("subscribers")
    .select("id")
    .eq("token", token)
    .single();

  if (!subscriber) {
    return Response.redirect(new URL("/?error=invalid", request.url));
  }

  await supabase
    .from("subscribers")
    .update({ status: "unsubscribed" })
    .eq("id", subscriber.id);

  return Response.redirect(new URL("/unsubscribe", request.url));
}
```

**Step 3: Create confirm page**

Create `apps/newsletter/src/app/confirm/page.tsx`:

```tsx
import { BSLogo } from "@blacksheep/shared/BSLogo";

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ already?: string }>;
}) {
  const { already } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <BSLogo className="text-bs-gold mb-6" width={80} height={80} />
      <h1 className="font-heading text-4xl tracking-wider text-bs-gold mb-4">
        {already ? "GIÀ CONFERMATO" : "CI SEI"}
      </h1>
      <p className="font-body text-bs-cream/70 text-lg max-w-xs">
        {already
          ? "La tua email è già confermata. Ci vediamo lunedì."
          : "Iscrizione confermata. Riceverai lineup e date prima di tutti."}
      </p>
    </main>
  );
}
```

**Step 4: Create unsubscribe page**

Create `apps/newsletter/src/app/unsubscribe/page.tsx`:

```tsx
import { BSLogo } from "@blacksheep/shared/BSLogo";

export default function UnsubscribePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <BSLogo className="text-bs-cream/30 mb-6" width={80} height={80} />
      <h1 className="font-heading text-3xl tracking-wider text-bs-cream mb-4">
        DISISCRITTO
      </h1>
      <p className="font-body text-bs-cream/50 text-base max-w-xs">
        Non riceverai più le nostre email. Se cambi idea, puoi sempre
        reiscriverti dalla pagina principale.
      </p>
    </main>
  );
}
```

**Step 5: Commit**

```bash
git add apps/newsletter/src/app/api/confirm/ apps/newsletter/src/app/api/unsubscribe/ apps/newsletter/src/app/confirm/ apps/newsletter/src/app/unsubscribe/
git commit -m "feat(newsletter): confirm + unsubscribe flows (double opt-in, GDPR)"
```

---

### Task 5: SubscribeForm client component

**Files:**
- Create: `apps/newsletter/src/components/SubscribeForm.tsx`
- Create: `apps/newsletter/src/components/SuccessMessage.tsx`

**Step 1: Create SuccessMessage component**

Create `apps/newsletter/src/components/SuccessMessage.tsx`:

```tsx
"use client";

export function SuccessMessage() {
  return (
    <div className="flex flex-col items-center gap-4 animate-fade-in-scale">
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        fill="none"
        className="text-bs-green"
      >
        <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" opacity="0.4" />
        <path
          d="M14 24l7 7 13-13"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-checkmark"
        />
      </svg>
      <p className="font-heading text-2xl tracking-wider text-bs-gold">
        CI SEI
      </p>
      <p className="font-body text-sm text-bs-cream/50 text-center max-w-[260px]">
        Controlla la tua email e conferma l&apos;iscrizione.
      </p>
    </div>
  );
}
```

**Step 2: Create SubscribeForm component**

Create `apps/newsletter/src/components/SubscribeForm.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { subscribeSchema, type SubscribeInput } from "@/lib/validations";
import { SuccessMessage } from "./SuccessMessage";

export function SubscribeForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SubscribeInput>({
    resolver: zodResolver(subscribeSchema),
  });

  async function onSubmit(data: SubscribeInput) {
    setServerError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setServerError(json.error ?? "Errore. Riprova.");
        return;
      }
      setSubmitted(true);
    } catch {
      setServerError("Errore di rete. Riprova.");
    }
  }

  if (submitted) {
    return <SuccessMessage />;
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-3 w-full animate-slide-up"
      style={{ animationDelay: "400ms" }}
      noValidate
    >
      {/* Honeypot — hidden from humans, visible to bots */}
      <div className="absolute opacity-0 h-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>

      <div>
        <label htmlFor="email" className="sr-only">Email</label>
        <input
          id="email"
          type="email"
          placeholder="La tua email"
          autoComplete="email"
          className="w-full bg-transparent border border-bs-gold/30 rounded-md px-4 py-3 font-body text-bs-cream placeholder:text-bs-cream/30 transition-all duration-300"
          {...register("email")}
        />
        {errors.email && (
          <p className="font-body text-xs text-bs-burgundy mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="name" className="sr-only">Nome (opzionale)</label>
        <input
          id="name"
          type="text"
          placeholder="Nome (opzionale)"
          autoComplete="given-name"
          className="w-full bg-transparent border border-bs-gold/15 rounded-md px-4 py-3 font-body text-bs-cream placeholder:text-bs-cream/20 transition-all duration-300"
          {...register("name")}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-bs-gold text-bs-black font-heading text-xl tracking-widest py-3.5 rounded-md transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed animate-glow-breathe cursor-pointer"
      >
        {isSubmitting ? "..." : "ENTRA NELLA LISTA"}
      </button>

      {serverError && (
        <p className="font-body text-xs text-bs-burgundy text-center">{serverError}</p>
      )}
    </form>
  );
}
```

**Step 3: Commit**

```bash
git add apps/newsletter/src/components/SubscribeForm.tsx apps/newsletter/src/components/SuccessMessage.tsx
git commit -m "feat(newsletter): SubscribeForm + SuccessMessage client components"
```

---

### Task 6: Landing page (page.tsx)

**Files:**
- Modify: `apps/newsletter/src/app/page.tsx`

**Step 1: Replace page.tsx with the landing page**

Replace the entire contents of `apps/newsletter/src/app/page.tsx` with:

```tsx
import { BSLogo } from "@blacksheep/shared/BSLogo";
import { SubscribeForm } from "@/components/SubscribeForm";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 relative">
      {/* Logo */}
      <div
        className="animate-fade-in-scale"
        style={{ animationDelay: "0ms" }}
      >
        <BSLogo
          className="text-bs-gold drop-shadow-[0_0_12px_rgba(190,131,5,0.3)]"
          width={120}
          height={120}
        />
      </div>

      {/* Title block */}
      <div className="mt-6 mb-8 text-center">
        <p
          className="font-heading text-lg tracking-[0.2em] text-bs-cream/80 animate-fade-in-scale"
          style={{ animationDelay: "100ms" }}
        >
          EVERY MONDAY
        </p>
        <h1
          className="font-heading text-[4rem] leading-none tracking-[0.15em] text-bs-gold animate-fade-in-scale"
          style={{ animationDelay: "200ms" }}
        >
          BLACK SHEEP
        </h1>
        <p
          className="font-body text-sm text-bs-cream/40 mt-2 animate-fade-in-scale"
          style={{ animationDelay: "300ms" }}
        >
          11 Clubroom &middot; Corso Como &middot; Milano
        </p>
      </div>

      {/* Form */}
      <div className="w-full max-w-[320px]">
        <SubscribeForm />
      </div>

      {/* Micro-copy */}
      <p
        className="font-body text-xs text-bs-cream/40 mt-5 text-center animate-slide-up"
        style={{ animationDelay: "600ms" }}
      >
        Lineup e date prima di tutti. Zero spam.
      </p>

      {/* Social proof footer */}
      <p
        className="font-body text-xs text-bs-cream/25 mt-auto pt-8 animate-slide-up"
        style={{ animationDelay: "700ms" }}
      >
        IG @blacksheep.community_ &middot; 10K+
      </p>
    </main>
  );
}
```

**Step 2: Verify it compiles**

Run: `npm run build --workspace=apps/newsletter`
Expected: Build succeeds.

**Step 3: Visual check**

Run: `npm run dev --workspace=apps/newsletter`
Open `http://localhost:3000` on desktop — should appear as a 480px-wide dark page centered on a black background. Use Chrome DevTools mobile view (iPhone 14 Pro, 393px) to verify everything is above the fold.

**Step 4: Commit**

```bash
git add apps/newsletter/src/app/page.tsx
git commit -m "feat(newsletter): landing page — VIP digital invite design"
```

---

### Task 7: Security headers + proxy (auth protection)

**Files:**
- Modify: `apps/newsletter/next.config.ts`
- Create: `apps/newsletter/src/proxy.ts` OR `apps/newsletter/src/middleware.ts` (see Step 0)

**Step 0: Verify middleware vs proxy convention**

Run: `npx next --version`
Then read: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`

- If the doc says `middleware` is deprecated and renamed to `proxy` → create `proxy.ts` with `export function proxy()`
- If `middleware.ts` is still the convention → create `middleware.ts` with `export function middleware()`
- The code logic in Step 2 is identical either way — only file name and export name change.

**Step 1: Update next.config.ts with security headers**

Replace the entire contents of `apps/newsletter/next.config.ts` with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

**Step 2: Create proxy.ts for admin route protection**

> **CRITICAL:** Next.js 16 renamed `middleware.ts` → `proxy.ts`. Export `proxy` not `middleware`.

Create `apps/newsletter/src/proxy.ts`:

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /admin routes (except /admin/login)
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    // Check for session token (NextAuth v5 uses __Secure- prefix in production)
    const token =
      request.cookies.get("__Secure-authjs.session-token") ??
      request.cookies.get("authjs.session-token");

    if (!token) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
```

**Step 3: Commit**

```bash
git add apps/newsletter/next.config.ts apps/newsletter/src/proxy.ts
git commit -m "feat(newsletter): security headers + proxy for admin auth"
```

---

### Task 8: NextAuth v5 config + admin login

**Files:**
- Create: `apps/newsletter/src/lib/auth.ts`
- Create: `apps/newsletter/src/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/newsletter/src/app/admin/login/page.tsx`

**Step 1: Create NextAuth config**

Create `apps/newsletter/src/lib/auth.ts`:

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (
          email !== process.env.ADMIN_EMAIL ||
          !process.env.ADMIN_PASSWORD_HASH
        ) {
          return null;
        }

        // Dynamic import to avoid bundling bcrypt on client
        const { compare } = await import("bcryptjs");
        const valid = await compare(password, process.env.ADMIN_PASSWORD_HASH);

        if (!valid) return null;

        return { id: "1", email, name: "Admin" };
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  session: { strategy: "jwt" },
});
```

> **Note:** `bcryptjs` needs to be installed: `npm install bcryptjs --workspace=apps/newsletter && npm install -D @types/bcryptjs --workspace=apps/newsletter`

**Step 2: Create NextAuth route handler**

Create `apps/newsletter/src/app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

**Step 3: Create admin login page**

Create `apps/newsletter/src/app/admin/login/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { BSLogo } from "@blacksheep/shared/BSLogo";

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      callbackUrl,
      redirect: false,
    });

    if (result?.error) {
      setError("Credenziali non valide.");
      setLoading(false);
    } else if (result?.url) {
      window.location.href = result.url;
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6">
      <BSLogo className="text-bs-cream/20 mb-8" width={60} height={60} />
      <h1 className="font-heading text-2xl tracking-wider text-bs-cream mb-6">ADMIN</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-[300px]">
        <label htmlFor="admin-email" className="sr-only">Email</label>
        <input
          id="admin-email"
          name="email"
          type="email"
          placeholder="Email"
          required
          className="w-full bg-transparent border border-bs-cream/20 rounded-md px-4 py-3 font-body text-bs-cream placeholder:text-bs-cream/30"
        />
        <label htmlFor="admin-password" className="sr-only">Password</label>
        <input
          id="admin-password"
          name="password"
          type="password"
          placeholder="Password"
          required
          className="w-full bg-transparent border border-bs-cream/20 rounded-md px-4 py-3 font-body text-bs-cream placeholder:text-bs-cream/30"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-bs-cream/10 text-bs-cream font-heading text-lg tracking-wider py-3 rounded-md hover:bg-bs-cream/20 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? "..." : "ACCEDI"}
        </button>
        {error && <p className="font-body text-xs text-bs-burgundy text-center">{error}</p>}
      </form>
    </main>
  );
}
```

**Step 4: Install bcryptjs**

Run: `npm install bcryptjs --workspace=apps/newsletter && npm install -D @types/bcryptjs --workspace=apps/newsletter`

**Step 5: Commit**

```bash
git add apps/newsletter/src/lib/auth.ts apps/newsletter/src/app/api/auth/ apps/newsletter/src/app/admin/login/
git commit -m "feat(newsletter): NextAuth v5 + admin login page"
```

---

### Task 9: Admin dashboard — subscriber list

**Files:**
- Create: `apps/newsletter/src/app/api/admin/subscribers/route.ts`
- Create: `apps/newsletter/src/components/admin/SubscriberTable.tsx`
- Create: `apps/newsletter/src/app/admin/page.tsx`
- Create: `apps/newsletter/src/app/admin/layout.tsx`

**Step 1: Create subscribers API route (protected)**

Create `apps/newsletter/src/app/api/admin/subscribers/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const { data: subscribers, error } = await supabase
    .from("subscribers")
    .select("id, email, name, status, created_at, confirmed_at")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  return Response.json({ subscribers });
}
```

**Step 2: Create SubscriberTable component**

Create `apps/newsletter/src/components/admin/SubscriberTable.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Users, CheckCircle, Clock, XCircle } from "lucide-react";

type Subscriber = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  created_at: string;
  confirmed_at: string | null;
};

export function SubscriberTable() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/subscribers")
      .then((res) => res.json())
      .then((data) => {
        setSubscribers(data.subscribers ?? []);
        setLoading(false);
      });
  }, []);

  const confirmed = subscribers.filter((s) => s.status === "confirmed").length;
  const pending = subscribers.filter((s) => s.status === "pending").length;

  if (loading) {
    return <p className="font-body text-bs-cream/50 text-center py-12">Caricamento...</p>;
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-bs-cream/5 rounded-lg p-4 text-center">
          <Users size={20} className="text-bs-gold mx-auto mb-1" />
          <p className="font-heading text-2xl text-bs-cream">{subscribers.length}</p>
          <p className="font-body text-xs text-bs-cream/40">Totali</p>
        </div>
        <div className="bg-bs-cream/5 rounded-lg p-4 text-center">
          <CheckCircle size={20} className="text-bs-green mx-auto mb-1" />
          <p className="font-heading text-2xl text-bs-cream">{confirmed}</p>
          <p className="font-body text-xs text-bs-cream/40">Confermati</p>
        </div>
        <div className="bg-bs-cream/5 rounded-lg p-4 text-center">
          <Clock size={20} className="text-bs-gold/60 mx-auto mb-1" />
          <p className="font-heading text-2xl text-bs-cream">{pending}</p>
          <p className="font-body text-xs text-bs-cream/40">In attesa</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full font-body text-sm">
          <thead>
            <tr className="text-bs-cream/50 text-left border-b border-bs-cream/10">
              <th className="pb-2 pr-4">Email</th>
              <th className="pb-2 pr-4">Nome</th>
              <th className="pb-2 pr-4">Stato</th>
              <th className="pb-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((sub) => (
              <tr key={sub.id} className="border-b border-bs-cream/5">
                <td className="py-2 pr-4 text-bs-cream">{sub.email}</td>
                <td className="py-2 pr-4 text-bs-cream/60">{sub.name ?? "—"}</td>
                <td className="py-2 pr-4">
                  {sub.status === "confirmed" && (
                    <span className="text-bs-green flex items-center gap-1">
                      <CheckCircle size={14} /> Confermato
                    </span>
                  )}
                  {sub.status === "pending" && (
                    <span className="text-bs-gold/60 flex items-center gap-1">
                      <Clock size={14} /> In attesa
                    </span>
                  )}
                  {sub.status === "unsubscribed" && (
                    <span className="text-bs-cream/30 flex items-center gap-1">
                      <XCircle size={14} /> Disiscritto
                    </span>
                  )}
                </td>
                <td className="py-2 text-bs-cream/40">
                  {new Date(sub.created_at).toLocaleDateString("it-IT")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {subscribers.length === 0 && (
        <p className="font-body text-bs-cream/30 text-center py-8">Nessun iscritto ancora.</p>
      )}
    </div>
  );
}
```

**Step 3: Create admin layout**

Create `apps/newsletter/src/app/admin/layout.tsx`:

```tsx
import { BSLogo } from "@blacksheep/shared/BSLogo";
import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-dvh">
      <header className="flex items-center justify-between px-4 py-3 border-b border-bs-cream/10">
        <div className="flex items-center gap-3">
          <BSLogo className="text-bs-cream/30" width={28} height={28} />
          <span className="font-heading text-sm tracking-wider text-bs-cream/50">ADMIN</span>
        </div>
        <nav className="flex gap-4 font-body text-xs text-bs-cream/40">
          <Link href="/admin" className="hover:text-bs-cream transition-colors">Iscritti</Link>
          <Link href="/admin/compose" className="hover:text-bs-cream transition-colors">Invia</Link>
        </nav>
      </header>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
```

**Step 4: Create admin dashboard page**

Create `apps/newsletter/src/app/admin/page.tsx`:

```tsx
import { SubscriberTable } from "@/components/admin/SubscriberTable";

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="font-heading text-xl tracking-wider text-bs-cream mb-4">ISCRITTI</h1>
      <SubscriberTable />
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add apps/newsletter/src/app/api/admin/subscribers/ apps/newsletter/src/components/admin/SubscriberTable.tsx apps/newsletter/src/app/admin/layout.tsx apps/newsletter/src/app/admin/page.tsx
git commit -m "feat(newsletter): admin dashboard with subscriber list + stats"
```

---

### Task 10: Admin compose + send newsletter

**Files:**
- Create: `apps/newsletter/src/app/api/admin/send/route.ts`
- Create: `apps/newsletter/src/components/admin/ComposeEditor.tsx`
- Create: `apps/newsletter/src/app/admin/compose/page.tsx`

**Step 1: Create send newsletter API route**

Create `apps/newsletter/src/app/api/admin/send/route.ts`:

```ts
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { resend } from "@/lib/resend";
import { sendNewsletterSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = sendNewsletterSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }

  const { subject, body: content } = parsed.data;

  // Get confirmed subscribers
  const { data: subscribers, error: dbError } = await supabase
    .from("subscribers")
    .select("email, token")
    .eq("status", "confirmed");

  if (dbError || !subscribers) {
    return Response.json({ error: "Errore database" }, { status: 500 });
  }

  if (subscribers.length === 0) {
    return Response.json({ error: "Nessun iscritto confermato" }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Send in batches of 50
  const batchSize = 50;
  let sentCount = 0;

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);

    const promises = batch.map((sub) =>
      resend.emails.send({
        from: "BLACK SHEEP <noreply@blacksheep.community>",
        to: sub.email,
        subject,
        html: `
          <div style="background:#1F1F1F;color:#FFFFF3;padding:40px;font-family:'Source Sans 3',sans-serif;">
            <h1 style="font-family:'Bebas Neue',sans-serif;color:#BE8305;font-size:28px;letter-spacing:0.1em;text-align:center;">BLACK SHEEP</h1>
            <div style="margin:24px 0;font-size:16px;line-height:1.6;">${content}</div>
            <hr style="border:none;border-top:1px solid #FFFFF320;margin:32px 0;" />
            <p style="font-size:11px;color:#FFFFF340;text-align:center;">
              <a href="${siteUrl}/api/unsubscribe?token=${sub.token}" style="color:#FFFFF340;text-decoration:underline;">Disiscriviti</a>
            </p>
          </div>
        `,
      }),
    );

    const results = await Promise.allSettled(promises);
    sentCount += results.filter((r) => r.status === "fulfilled").length;

    // Small delay between batches
    if (i + batchSize < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return Response.json({ sent: sentCount, total: subscribers.length });
}
```

**Step 2: Create ComposeEditor component**

Create `apps/newsletter/src/components/admin/ComposeEditor.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Send } from "lucide-react";

export function ComposeEditor() {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSend() {
    if (!subject.trim() || !body.trim()) return;

    const confirmed = window.confirm(
      `Stai per inviare la newsletter "${subject}" a tutti gli iscritti confermati. Confermi?`,
    );
    if (!confirmed) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult(`Errore: ${data.error}`);
      } else {
        setResult(`Inviata a ${data.sent}/${data.total} iscritti.`);
        setSubject("");
        setBody("");
      }
    } catch {
      setResult("Errore di rete.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor="nl-subject" className="font-body text-xs text-bs-cream/40 mb-1 block">Oggetto</label>
        <input
          id="nl-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Oggetto della newsletter"
          className="w-full bg-transparent border border-bs-cream/20 rounded-md px-4 py-3 font-body text-bs-cream placeholder:text-bs-cream/20"
        />
      </div>
      <div>
        <label htmlFor="nl-body" className="font-body text-xs text-bs-cream/40 mb-1 block">Contenuto (HTML)</label>
        <textarea
          id="nl-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Scrivi il contenuto della newsletter..."
          rows={12}
          className="w-full bg-transparent border border-bs-cream/20 rounded-md px-4 py-3 font-body text-bs-cream placeholder:text-bs-cream/20 resize-y"
        />
      </div>
      <button
        onClick={handleSend}
        disabled={sending || !subject.trim() || !body.trim()}
        className="flex items-center justify-center gap-2 bg-bs-gold text-bs-black font-heading text-lg tracking-wider py-3 rounded-md hover:bg-bs-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        <Send size={18} />
        {sending ? "INVIO IN CORSO..." : "INVIA NEWSLETTER"}
      </button>
      {result && (
        <p className={`font-body text-sm text-center ${result.startsWith("Errore") ? "text-bs-burgundy" : "text-bs-green"}`}>
          {result}
        </p>
      )}
    </div>
  );
}
```

**Step 3: Create compose page**

Create `apps/newsletter/src/app/admin/compose/page.tsx`:

```tsx
import { ComposeEditor } from "@/components/admin/ComposeEditor";

export default function ComposePage() {
  return (
    <div>
      <h1 className="font-heading text-xl tracking-wider text-bs-cream mb-4">INVIA NEWSLETTER</h1>
      <ComposeEditor />
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add apps/newsletter/src/app/api/admin/send/ apps/newsletter/src/components/admin/ComposeEditor.tsx apps/newsletter/src/app/admin/compose/
git commit -m "feat(newsletter): admin compose + batch send with unsubscribe links"
```

---

### Task 11: Build verification + final check

**Step 1: Run typecheck**

Run: `npx tsc --noEmit --project apps/newsletter/tsconfig.json`
Expected: No errors.

**Step 2: Run linter**

Run: `npm run lint --workspace=apps/newsletter`
Expected: No errors.

**Step 3: Run build**

Run: `npm run build --workspace=apps/newsletter`
Expected: Build succeeds with no errors.

**Step 4: Manual smoke test**

Run: `npm run dev --workspace=apps/newsletter` and verify:
- [ ] Landing page loads at `/` with correct fonts, colors, animations
- [ ] Page is centered at 480px on desktop with black body bg
- [ ] Everything above fold on iPhone 14 (393px) in DevTools
- [ ] CTA has subtle breathing gold glow
- [ ] Form validates (empty email shows error)
- [ ] Honeypot field is invisible
- [ ] `/admin/login` shows login form
- [ ] `/confirm` and `/unsubscribe` pages render correctly
- [ ] `prefers-reduced-motion: reduce` disables all animations

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore(newsletter): build verification passed"
```

---

## Summary

| Task | Description | Key files |
|------|-------------|-----------|
| 1 | Foundation: CSS + layout | globals.css, layout.tsx |
| 2 | Lib: Zod, Supabase, rate limiter | lib/*.ts |
| 3 | Subscribe API | api/subscribe/route.ts |
| 4 | Confirm + Unsubscribe | api/confirm, api/unsubscribe, pages |
| 5 | SubscribeForm component | components/SubscribeForm.tsx |
| 6 | Landing page | page.tsx |
| 7 | Security headers + proxy | next.config.ts, proxy.ts |
| 8 | NextAuth + admin login | lib/auth.ts, admin/login |
| 9 | Admin dashboard | admin/page.tsx, SubscriberTable |
| 10 | Admin compose + send | admin/compose, api/admin/send |
| 11 | Build verification | Final checks |

**Prerequisites before starting:**
1. Supabase project created with `subscribers` table (SQL in design doc)
2. `.env.local` populated with all values from `.env.example`
3. Resend API key configured with verified domain
4. Admin password hash generated: `npx bcryptjs hash "your-password"`
