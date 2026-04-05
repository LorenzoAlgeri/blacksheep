# Newsletter Landing Page — Design Document

**Version**: v3 — Backstage Pass
**Date**: 2026-04-04
**Status**: Approved
**Author**: Claude + Lorenzo

## Context

BLACK SHEEP is a hip-hop/R&B club night every Monday at 11 Clubroom, Corso Como, Milano. 10K+ Instagram followers (@blacksheep.community_), Red Bull Turn It Up Milan 2025 winners. Target audience: 18-30, Milan scene, fashion-conscious. 90%+ traffic from Instagram Stories on iPhone.

The newsletter landing page must convert Instagram visitors into email subscribers with a premium, exclusive-feeling experience.

## Design Direction: "Backstage Pass"

Monochrome black + cream. The page feels like stepping into a dark club — your eyes adjust, the logo appears, then the name hits. Not a signup form — an **access pass**.

### Aesthetic

- **Tone**: Raw monochrome. Club darkness with cream light cutting through.
- **Palette**: Pure black (#000000) background, cream (#FFFFF3) for all content. Gold (#BE8305) reserved ONLY for divider accent and CTA hover details.
- **Font**: Arial Black for all display/heading text. System font stack for body.
- **Memorable element**: Rhythmic breathing across all ambient elements, synchronized to a 4-second base cycle (15 BPM).

### Layout (mobile-first, single viewport)

Everything above-the-fold on iPhone. On desktop, centered at max-width 480px on a black background — looks like an iPhone screen in the center. `overflow: hidden` prevents ambient effects from bleeding outside.

```
┌─────────────────────────┐
│                         │
│      [BS LOGO]          │  Inline SVG, cream via currentColor, ~120px
│                         │
│     EVERY MONDAY        │  Arial Black, cream/30, shimmer sweep
│                         │
│      BLACK              │  Arial Black, 4.5rem, cream, clip+blur reveal
│      SHEEP              │
│                         │
│  11 Clubroom · Corso    │  System font, cream at ghost opacity
│  Como · Milano          │
│                         │
│  ────── gold divider ── │  Gold gradient, ambient pulse (0.2↔0.4)
│                         │
│  ┌───────────────────┐  │
│  │ La tua email      │  │  Input, cream border at 8%
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │ Nome (opzionale)  │  │  Input, more discreet
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │  THE PLACE TO BE  │  │  CTA, cream bg, breathing glow (2s cycle)
│  └───────────────────┘  │
│                         │
│  Iscriviti. Lineup e    │  System font, xs, ghost opacity
│  date prima di tutti.   │
│                         │
│  @blacksheep.community_ │  Footer, ghost opacity
│                         │
└─────────────────────────┘
```

### Visual Details

| Element | Specification |
|---------|--------------|
| Background | Pure black (#000000) + CSS noise grain overlay (opacity 0.06) |
| Logo | Inline SVG, `fill="currentColor"` in `text-bs-cream` wrapper, GSAP glow pulse |
| "EVERY MONDAY" | Arial Black, cream/30, 10px, tracking 0.45em, shimmer sweep every 8s |
| "BLACK SHEEP" | Arial Black, cream, 4.5rem, clip-path + blur entrance reveal |
| Location | System font, cream/15, 10px, ghost element opacity (0.25) |
| Divider | Gold gradient (via-bs-gold/20), ambient pulse between opacity 0.2–0.4 |
| Input fields | Transparent bg, 1px border cream at 8%/6%, focus: cream/30 + glow |
| CTA button | Bg cream, text black, Arial Black, 2s breathing glow |
| Micro-copy | System font, cream/18, ghost opacity (0.35) |
| Desktop | max-width 480px, centered, black body bg, overflow: hidden |
| Noise overlay | CSS SVG inline noise, opacity 0.06, mix-blend-mode: overlay |
| Spotlight | 350px radius, cream at 5% opacity, 12s drift cycle |

### Motion System (GSAP + CSS, respects prefers-reduced-motion)

**Base rhythm**: 4s cycle (15 BPM). All ambient effects are multiples/divisors:

| Effect | Duration | Relation | Notes |
|--------|----------|----------|-------|
| Logo breathing | 4s | Base | scale 1↔1.05, opacity 1↔0.8 |
| Logo glow | 4s | Base | drop-shadow, offset 1s from breathing |
| Divider pulse | 2s | Half | opacity 0.2↔0.4 |
| CTA glow | 2s | Half | CSS box-shadow breathing |
| Shimmer sweep | 1.2s / 8s | Double | fast flash, rare repeat |
| Spotlight drift | 12s | Triple | barely perceptible movement |
| Grain drift | 8s | Double | CSS steps(4) |

**Entrance sequence** (3.5s total, 4 phases):

1. **IL BUIO** (0–1.2s): 400ms of darkness, then gradient fades in
2. **IL RICONOSCIMENTO** (1.2–2.0s): Logo with back.out overshoot + glow
3. **IL DROP** (2.0–2.7s): "BLACK SHEEP" clip-path reveal + blur-to-focus
4. **LA DISCESA** (2.7–3.5s): Form elements appear, CTA breathing starts

**sessionStorage**: Entrance plays once per session. Refresh skips to ambient.

All animations wrapped in `@media (prefers-reduced-motion: no-preference)`.

## Architecture

```
apps/newsletter/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Fonts (Arial Black local), metadata, CSS vars
│   │   ├── page.tsx            # Landing page (Server Component wrapper)
│   │   ├── globals.css         # Brand variables + noise texture + animations
│   │   ├── confirm/
│   │   │   └── page.tsx        # Double opt-in confirmation page
│   │   ├── unsubscribe/
│   │   │   └── page.tsx        # Unsubscribe confirmation page
│   │   ├── admin/
│   │   │   ├── layout.tsx      # Auth wrapper (NextAuth middleware)
│   │   │   ├── page.tsx        # Dashboard: subscriber list + stats
│   │   │   ├── compose/
│   │   │   │   └── page.tsx    # Newsletter editor (textarea + preview)
│   │   │   └── login/
│   │   │       └── page.tsx    # Admin login form
│   │   └── api/
│   │       ├── subscribe/
│   │       │   └── route.ts    # POST: subscribe + send confirmation email
│   │       ├── confirm/
│   │       │   └── route.ts    # GET: double opt-in confirmation
│   │       ├── unsubscribe/
│   │       │   └── route.ts    # GET: unsubscribe (GDPR required)
│   │       ├── admin/
│   │       │   ├── subscribers/
│   │       │   │   └── route.ts  # GET: subscriber list (protected)
│   │       │   └── send/
│   │       │       └── route.ts  # POST: send newsletter (protected)
│   │       └── auth/
│   │           └── [...nextauth]/
│   │               └── route.ts  # NextAuth handler
│   ├── components/
│   │   ├── SubscribeForm.tsx   # Client component: form + validation + honeypot
│   │   ├── SuccessMessage.tsx  # Post-submit animation
│   │   └── admin/
│   │       ├── SubscriberTable.tsx
│   │       └── ComposeEditor.tsx
│   └── lib/
│       ├── supabase.ts         # Supabase client (server-side)
│       ├── resend.ts           # Resend client
│       ├── auth.ts             # NextAuth config
│       ├── rate-limit.ts       # In-memory rate limiter
│       └── validations.ts      # Zod schemas
```

## Data Flow

### Subscription

```
User → POST /api/subscribe
  ├─ Rate limit (IP, 3 req/min)
  ├─ Honeypot check (hidden "website" field must be empty)
  ├─ Zod validation (valid email, optional name)
  ├─ Supabase: INSERT subscribers (status: 'pending')
  ├─ Resend: confirmation email with /confirm?token=<uuid>
  └─ Response 200: success message
```

### Double Opt-In

```
User clicks email link → GET /confirm?token=xxx
  ├─ Supabase: SELECT WHERE token = xxx AND status = 'pending'
  ├─ Supabase: UPDATE status='confirmed', confirmed_at=now()
  └─ Redirect → /confirm (welcome page)
```

### Unsubscribe (GDPR required)

```
User clicks unsubscribe link in email → GET /api/unsubscribe?token=xxx
  ├─ Supabase: SELECT WHERE token = xxx
  ├─ Supabase: UPDATE status='unsubscribed'
  └─ Redirect → /unsubscribe (confirmation page)
```

Every outgoing email MUST include an unsubscribe link in the footer.

### Newsletter Send (admin)

```
Admin → POST /api/admin/send
  ├─ Auth check (NextAuth session)
  ├─ Zod validation (subject, body)
  ├─ Supabase: SELECT confirmed subscribers
  ├─ Resend: batch send (50/batch with delay)
  └─ Response: sent count
```

## Database (Supabase)

```sql
CREATE TABLE subscribers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text UNIQUE NOT NULL,
  name        text,
  status      text DEFAULT 'pending' CHECK (status IN ('pending','confirmed','unsubscribed')),
  token       uuid DEFAULT gen_random_uuid(),
  created_at  timestamptz DEFAULT now(),
  confirmed_at timestamptz
);

CREATE INDEX idx_subscribers_status ON subscribers(status);
CREATE INDEX idx_subscribers_token ON subscribers(token);
```

## Security

| Measure | Implementation |
|---------|---------------|
| Rate limiting | In-memory Map, sliding window, 3 req/min per IP |
| Honeypot | Hidden "website" field via CSS, reject if filled |
| Input validation | Zod schema on every endpoint |
| CSRF | Next.js built-in (SameSite cookies) |
| Admin auth | NextAuth v5, credentials provider, bcrypt hash |
| Admin middleware | middleware.ts protects /admin/* routes |
| Security headers | CSP, X-Frame-Options, HSTS via next.config.ts |
| Double opt-in | One-time UUID token, GDPR compliant |
| HTML sanitization | All user input sanitized before storage |

## Typography

- **Heading / Display**: Arial Black — all-caps, heavy weight, brand identity font
- **Body**: System font stack (-apple-system, BlinkMacSystemFont, Segoe UI, Roboto)
- **Import**: Local font file via next/font/local (Arial_Black.ttf)
- **Fallback**: 'Arial Bold', sans-serif

## Color System (from brand.ts + design-system.css)

| Token | Value | Usage |
|-------|-------|-------|
| --bs-black | #1F1F1F | Primary background |
| --bs-gold | #BE8305 | Accent, CTA, headings |
| --bs-cream | #FFFFF3 | Body text |
| --bs-navy | #031240 | Secondary background |
| --bs-purple | #65305C | Alternative accent |
| --bs-burgundy | #731022 | Error states |
| --bs-green | #334B31 | Success states |

## Success Criteria

1. 90%+ of visitors see the full page without scrolling on iPhone (375px)
2. Subscription form submits in <500ms (perceived)
3. Double opt-in email delivered within 30s
4. Admin panel usable for viewing subscribers and sending newsletters
5. Rate limiting blocks automated abuse
6. Lighthouse score: Performance 90+, Accessibility 100, SEO 90+
