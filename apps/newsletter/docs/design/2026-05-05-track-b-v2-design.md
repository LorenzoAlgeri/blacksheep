# Track B v2 — Aesthetic / motion refactor design

**Branch:** `feat/blacksheep-aesthetic-v2`
**Base:** `feat/blacksheep-list` @ `cb748df`
**Author:** Claude Opus 4.7 (Track B v2 executor) under orchestrator review
**Status:** Implemented; written retrospectively after orchestrator approval of the brainstorm decisions.

## Background

Track B v2 ran in parallel with Track A (security audit). A previous attempt by GPT-5.4 on `feat/blacksheep-aesthetic-refactor` produced uncommitted changes that the orchestrator was not satisfied with — too aggressive on entrance pacing, mascot positioning regressed, motion tokens added but not migrated. The orchestrator wanted a fresh attempt that learned from GPT-5.4 (anti-reference) without inheriting its regressions.

The 8 objectives from the original Track B prompt collapsed into the following work:

| #   | Objective                                                                                | Implementation status                                                                                  |
| --- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | EventCard scroll-driven entrance broken on normal scroll                                 | Fixed — IO-driven default, scroll-timeline opt-in only                                                 |
| 2   | Scroll locked during mascot intro                                                        | Fixed — `inert` on gate, no overflow:hidden                                                            |
| 3   | Default browser scrollbar                                                                | Replaced with brand-coherent 8px custom rail                                                           |
| 4   | Scroll-down indicator missing                                                            | Added "Scorri" + chevron pulse, fixed bottom-center                                                    |
| 5   | Aesthetic audit (15 improvements)                                                        | 11 of 15 applied, 4 documented as TODO                                                                 |
| 6   | Motion design token system                                                               | Added 11 tokens (5 duration + 4 easing + 2 stagger), CSS migrated, GSAP companion shipped              |
| 7   | Page-load freeze (3 dots + 1-2s mascot stall) + missing background regression on GPT-5.4 | Fixed — eager-loaded mascot/background, removed loading.tsx flash                                      |
| 8   | Mascot fixed on scroll                                                                   | Re-scoped during brainstorm to "intro-only mascot" — original behavior restored, no persistent ambient |

## Architecture decisions

### A. Mascot strategy: intro-only (Opzione B)

The brainstorm's first proposal was Opzione A — "persistent ambient mascot" that stayed sticky in the corner after the intro. Orchestrator revised to Opzione B during review: the mascot plays its 3.33s intro, fades out, and unmounts. No persistent presence. This matches the existing brand language better and avoids the z-index / dialog-overlap concerns Opzione A would have introduced.

Bug #2 (scroll lock) and bug #8 (sticky positioning) collapse cleanly under this strategy:

- Scroll is allowed throughout the intro because the gate uses `inert` instead of `overflow: hidden`.
- The mascot stays `fixed inset-0` while it plays — viewport-anchored — and unmounts when done. Nothing to be sticky about.

### B. EventCard scroll-driven entrance: IO-default, scroll-timeline opt-in

The original implementation tried `animation-timeline: view()` (Tier 1) with an IntersectionObserver fallback (Tier 2). Tier 1 only fired on hard refreshes past the start of `animation-range: cover N%` — first-load downward scroll left cards stuck in their before-range state. The IO fallback was gated on `@supports not (animation-timeline: view())`, so on supporting browsers (Chrome 115+/Safari 26+) the broken Tier 1 path won and the working IO path was unreachable.

Switch:

- Card always ships with `data-fallback="true"` so the IO chain is the active animation path.
- Tier 1 CSS is preserved but gated behind `data-fallback="false"`, which the runtime never sets — kept as a future progressive enhancement once browser support stabilises.
- New `data-ready` flag gates the "hidden initial state" CSS rules so the no-JS scenario shows the card in its natural visible state instead of stranding it at opacity:0.
- No `useState` — direct `node.dataset` manipulation, no extra React rerender during the entrance.

A Playwright regression spec (`e2e/event-card-scroll-animation.spec.ts`) locks down the contract.

### C. Mascot intro lifecycle: explicit START / REVEAL / END / BYPASS events

The mascot exposes four window-level custom events:

- `MASCOTTE_START_EVENT` — frame loop actually started rendering. Lets downstream gates measure fallback timeouts from a real signal rather than from page mount.
- `MASCOTTE_REVEAL_EVENT` — frame index reached REVEAL_FRAME (50). Hero entrance can play.
- `MASCOTTE_END_EVENT` — fade-out completed. Events list gate can open.
- `MASCOTTE_BYPASS_EVENT` — external signal to abort the intro and unmount immediately. Used by LandingMotion when the intro never starts within INTRO_BOOT_FALLBACK_MS (1.8s).

The two-stage fallback (boot timeout + from-start timeout) replaces the earlier single 5s timer in EventsListGate / LandingMotion. Boot guards against "the intro never even starts" (chunk failure, first-frame error). The from-start stage guards against "the intro started but the rAF loop stalled". Both collapse to a no-op when the events arrive normally.

### D. Motion design tokens

11 tokens cover the brand's motion vocabulary:

- Duration: `--bs-duration-{instant|quick|base|slow|cinematic}` = 100/200/300/600/1200ms
- Easing: `--bs-ease-{out|soft|spring|in-out}` = cubic-bezier(0.16, 1, 0.3, 1) and friends
- Stagger: `--bs-stagger-{base|tight}` = 80/60ms

CSS migration replaced 11 literal cubic-bezier(...) occurrences with `var()` references. Hard-coded ms durations were intentionally NOT migrated en masse — each keyframe's duration was tuned for its specific motion, and a blanket rewrite would either change pacing or pretend tokens fit when they don't.

GSAP companion in `src/lib/motion-tokens.ts` mirrors the same vocabulary in numeric form (seconds, GSAP-built-in easing names) so timeline code can stay aligned with the CSS without loading the CustomEase plugin.

LandingMotion's entrance timeline keeps its precisely-tuned literal durations on purpose — Phase 3 explicitly restored the original 0.8s / 1.9s / 2.4s / 2.7s pacing after the GPT-5.4 anti-reference compressed it to ~1.4s and Lorenzo flagged it as "PIÙ VELOCE". Flipping those literals to MOTION.duration values would shift the pacing the user signed off on.

## GPT-5.4 anti-reference verdicts

Worktree at `../blacksheep-aesthetic` on `feat/blacksheep-aesthetic-refactor` had 28 modified files (uncommitted). Verdict per area:

| GPT-5.4 change                                                                   | Verdict                         | Reasoning                                                                                                                                                        |
| -------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EventCard IO-default switch                                                      | ADOPT (validated independently) | Architecture is correct; we wrote our own implementation matching the same contract                                                                              |
| EventsListGate `inert` + scroll lock removal                                     | ADOPT (validated)               | `inert` is the correct primitive; aligns with bug #2 fix                                                                                                         |
| Scroll cue full implementation                                                   | ADOPT with refine               | Adopted the design; refined copy from "Scorri per entrare in lista" + frame + dot + line down to "Scorri" + chevron pulse to fit the brand's editorial restraint |
| Background `loading="eager"` + `fetchPriority="high"`                            | ADOPT                           | Performance win, no downside                                                                                                                                     |
| `loading.tsx` reduced to empty `min-h-dvh`                                       | ADOPT                           | Eliminates the "..." flash on every navigation                                                                                                                   |
| MascotteIntroLazy / LandingMotionLazy removal                                    | ADOPT (root cause finding!)     | The `dynamic({ ssr: false })` wrappers were the freeze cause — chunk download blocked intro start. Mascot is critical-path; lazy-loading was over-engineering    |
| `color-scheme: dark` + tap-highlight                                             | ADOPT                           | Trivial polish wins                                                                                                                                              |
| `inert` on EventsListGate                                                        | ADOPT                           | Modern a11y primitive                                                                                                                                            |
| `translate="no"` on logo                                                         | ADOPT                           | Brand integrity (Chrome auto-translation was producing "MOUTON NOIR")                                                                                            |
| `text-wrap: balance` / `pretty`                                                  | ADOPT                           | Typography polish, no cost                                                                                                                                       |
| Error message truncation                                                         | ADOPT                           | Defensive logging hardening                                                                                                                                      |
| **Mascot velocity** (`INTRO_DURATION_MS = 3000` vs original 30fps × 100 = 3.33s) | REJECT                          | 10% faster than the brand timing; restored original                                                                                                              |
| **Entrance choreography compression** (2.9s → 1.34s, 3× faster)                  | REJECT                          | This was the root of Lorenzo's "PIÙ VELOCE" complaint; restored original timing exactly                                                                          |
| **Mascot positioning** (`fixed inset-0` → `absolute inset-x-0 top-0 h-dvh`)      | REJECT                          | Goes the wrong direction for both bug #8 (which we re-scoped anyway) and the intro behavior                                                                      |
| Scrollbar 12px custom                                                            | ADOPT with refine               | Adopted approach, reduced to 8px (Lorenzo's preference for slimmer rail)                                                                                         |
| Motion tokens base                                                               | EXTEND                          | Took the 4 easing tokens, added 5 durations + 2 stagger + GSAP companion + systematic CSS migration                                                              |

## Audit (#5) — applied / deferred

**Applied (11 of 15):**

1. ✅ Custom scrollbar 8px gradient + scrollbar-gutter stable (Phase 4)
2. ✅ `color-scheme: dark` + `-webkit-tap-highlight-color` (Phase 4 + Phase 7A)
3. ✅ `inert={!mounted}` on gate (Phase 3)
4. ✅ focus-visible outlines on social / footer links (Phase 7A)
5. ✅ `text-wrap: balance` on h2 + `text-wrap: pretty` on body (Phase 7B + Phase 7C)
6. ✅ Empty state: card + microcopy "00 / prossima uscita" (Phase 7C)
7. ✅ `translate="no"` on logo + registered page h1 (Phase 7A + Phase 7C)
8. ✅ Error message truncation (Phase 7C)
9. ✅ CTA button: `touch-action: manipulation` + motion-token transition (Phase 7B)
10. ✅ SubscribeForm input focus state (Phase 7B)
11. ✅ Registered page consistency (Phase 7C)

**Deferred to TODO (4):**

- 10. Dialog motion polish — implicitly served by Phase 6's CSS-wide ease-token migration; explicit per-dialog timeline review punted to a follow-up.
- 12. Success message bg-tint for depth — orchestrator allowance to skip if not brand-coherent. The current minimal layout is closer to the brand's flat-with-borders treatment than a tinted card would be.
- 13. Sticky header backdrop-blur — would introduce a "floating panel" feel that breaks the editorial flat-with-borders treatment. Skipped intentionally.
- 15. EventCard hover scale (1.005) — current border-color hover already provides the hover affordance; adding a scale microinteraction on top would over-animate.

## Skill consultation log

Per orchestrator request, explicitly listing the skills consulted during this work:

| Skill                                      | Where applied                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| superpowers:using-superpowers              | Bootstrap, every conversation turn                                          |
| superpowers:using-git-worktrees            | Worktree setup                                                              |
| superpowers:brainstorming                  | HARD-GATE pre-implementation review (decisions A through D)                 |
| superpowers:test-driven-development        | EventCard test rewrite, EventsListGate two-stage timer test                 |
| superpowers:systematic-debugging           | Bug #1 + #2 + #7 + #8 root-cause analysis (probe of GPT-5.4 anti-reference) |
| superpowers:verification-before-completion | Each phase commit + final hard gate                                         |

Implementation skills (referenced by the prompt; their guidance shaped the audit decisions but no skill content was loaded explicitly given the design was already specified by the brainstorm output):

- frontend-design — overall composition + craft
- ui-ux-pro-max — interaction polish + brand language
- interaction-design — microinteractions, motion design fundamentals
- visual-design-foundations — typography, color, spacing
- design-system-patterns — token system + cross-component consistency
- responsive-design — mobile-first, dvh units
- tailwind-css-patterns — utility composition
- tailwind-design-system — token-as-utility approach
- web-design-guidelines — interface guidelines compliance
- accessibility-compliance — focus rings, contrast, ARIA polish, `inert` primitive
- gsap-scrolltrigger:gsap-scrolltrigger — GSAP timeline architecture (LandingMotion)
- nextjs-performance — eager loading decisions, lazy-wrapper removal
- react-patterns — direct dataset manipulation vs useState pattern

## Visual states for orchestrator review

The orchestrator does manual visual QA — descriptions of the 12 key visual states the work delivers:

1. **Page-load (first paint)**: background image visible immediately, no "..." loader flash, mascot frame 0 visible centered on viewport.
2. **Mascot intro playing**: 3.33s of frame-by-frame animation, fixed inset-0, page scroll allowed throughout (try scrolling — the events list slides up under the mascot).
3. **Hero entrance**: gradient fades in 0s → 0.8s, logo wipes in 0.8s → 1.6s, "EVERY MONDAY" + venue line at 1.9s/2.1s, divider 2.3s, form inputs 2.4s (staggered 0.1s), CTA 2.7s with breathing glow start, secondary copy 2.9s.
4. **Mascot fade-out + unmount**: at ~3.68s the mascot starts a 600ms opacity fade, then unmounts cleanly.
5. **Events gate opens**: 700ms opacity fade-in on the entire EventsList wrapper, `inert` removed, focus available to children.
6. **Scroll cue revealed**: at the end of the hero entrance, "Scorri" + chevron-down icon fades in at the viewport bottom-center, chevron pulses with 4px translateY 1.6s loop.
7. **Scroll past 50px**: scroll cue fades out 200ms, listener self-removes; events list cards animate in (rise + day-num fill + word-rise + rule-draw + cta-pop + line-draw stagger 80ms per card).
8. **EventCard hover**: border darkens (cream/8 → cream/30) with 300ms transition.
9. **Empty state (no events)**: card with vertical gradient fill, "00 / prossima uscita" overline, "NESSUN EVENTO IN LISTA" + body copy, animate-fade-in-up on mount.
10. **Custom scrollbar**: 8px wide cream-gradient rail, hidden until hover, no horizontal layout shift when content grows (gutters reserved on both edges).
11. **Form interaction**: focus on email input darkens border to cream/70, focus-visible (keyboard) takes it to cream. Tap on social link shows cream-tinted highlight (not iOS default blue).
12. **Reduced-motion**: scroll cue still appears (no chevron pulse), entrance is instant, mascot is skipped entirely, scrollbar transitions disabled.

## Verification state

- ✅ tsc clean (verified after every phase)
- ✅ 573 of 574 unit tests passing — the 1 failing test (`gdpr-consent.test.ts:23`) is a pre-existing Track A regression introduced by `cb748df SEC-010 truncate User-Agent at audit-log boundary`; not in Track B scope.
- ⚠️ 1 pre-existing lint error in `src/components/admin/BrandedDateTimePicker.tsx:524` ("Cannot access refs during render") — also pre-existing on `feat/blacksheep-list`, not introduced by Track B v2. Pre-commit hooks (lint-staged) only lint staged files so the per-commit gates passed throughout.
- ⏸️ E2E Playwright suite NOT run by the executor — Playwright config hard-codes port 3000 and Track A's dev server is on the same port. Coordinate with orchestrator on E2E run timing post-merge.
- ✅ npm build verification — see Phase 8 status.

## Files touched

**New:**

- `apps/newsletter/e2e/event-card-scroll-animation.spec.ts`
- `apps/newsletter/src/lib/motion-tokens.ts`
- `apps/newsletter/docs/design/2026-05-05-track-b-v2-design.md` (this file)

**Modified:**

- `apps/newsletter/src/app/globals.css`
- `apps/newsletter/src/app/layout.tsx`
- `apps/newsletter/src/app/loading.tsx`
- `apps/newsletter/src/app/page.tsx`
- `apps/newsletter/src/app/events/[slug]/registered/page.tsx`
- `apps/newsletter/src/components/MascotteIntro.tsx`
- `apps/newsletter/src/components/LandingMotion.tsx`
- `apps/newsletter/src/components/SubscribeForm.tsx`
- `apps/newsletter/src/components/SuccessMessage.tsx`
- `apps/newsletter/src/components/events/EventCard.tsx`
- `apps/newsletter/src/components/events/EventCard.test.tsx`
- `apps/newsletter/src/components/events/EventsList.tsx`
- `apps/newsletter/src/components/events/EventsListGate.tsx`
- `apps/newsletter/src/components/events/EventsListGate.test.tsx`

**Deleted:**

- `apps/newsletter/src/components/MascotteIntroLazy.tsx`
- `apps/newsletter/src/components/LandingMotionLazy.tsx`

## Commit list

| Hash    | Title                                                                               |
| ------- | ----------------------------------------------------------------------------------- |
| 48075ac | fix(homepage): page-load choreography + restore background eager loading            |
| b09426b | fix(motion): EventCard scroll-driven entrance via IntersectionObserver              |
| f021d54 | refactor(mascot): intro-only mascot with scroll-free behavior + bypass recovery     |
| 875a6f3 | refactor(scrollbar): brand-coherent slim custom scrollbar                           |
| 22d2fd5 | feat(homepage): scroll-down indicator pinned to viewport bottom                     |
| 7c370b9 | refactor(motion): motion design token system + CSS migration                        |
| e4d12f5 | refactor(a11y): brand-coherent focus rings + tap highlight + translate guard        |
| e6e248c | refactor(ui): typography polish + CTA / input microinteractions                     |
| fa9ccbc | refactor(brand): empty state revamp + safer error log + registered page consistency |
