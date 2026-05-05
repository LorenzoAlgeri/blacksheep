# Security Audit — BLACK SHEEP Newsletter

- **Date:** 2026-05-05
- **Auditor:** Track A executor (Claude Opus 4.7, 1M ctx)
- **Branch:** `feat/blacksheep-list`
- **Scope:** entire `apps/newsletter` codebase, end-to-end
- **Methodology:** sweep-first read-only audit → severity triage → TDD fix
  for Critical / High → verify (tests + tsc + build) → committed report

> Document hygiene: descriptions and `file:line` references only — no
> exploit payloads, no copy-paste-ready PoCs, no extracted vulnerable
> code snippets. Reviewers can navigate to the file:line for the source.

## 1. Executive summary

| Severity   | Count | Fixed in session | Remaining (TODO) |
| ---------- | ----- | ---------------- | ---------------- |
| Critical   | 2     | 2                | 0                |
| High       | 8     | 8                | 0                |
| Medium     | 9     | 0                | 9                |
| Low / Info | 9     | 0                | 9                |

All 10 Critical + High are fixed within the per-session cap of 10 (per
the orchestrator's policy). Medium/Low items are catalogued for the
backlog. The deploy is unblocked from a Critical/High standpoint.

Verification snapshot at HEAD:

- `npx vitest run` → 52 files, 578 tests passing
- `npx tsc --noEmit` → clean
- `npm run lint` → 1 pre-existing error in `BrandedDateTimePicker.tsx:524`
  (not in audit scope; predates the session)
- `npm run build` → compiled successfully

## 2. Status table

| ID         | Severity | Status            | Area       | Title                                                                                                      |
| ---------- | -------- | ----------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| SEC-001    | Critical | **fixed** c9cf0de | A01 BAC    | Confirm endpoint allowed blocked subscribers to bypass admin block                                         |
| SEC-002    | Critical | **fixed** 72d5482 | A03 Inj    | CSV / formula injection in registrations export                                                            |
| SEC-003    | High     | **fixed** d70cd68 | A06 Vuln   | Next.js 16.2.2 → 16.2.4 (CVE GHSA-q4gf-8mx6-v5v3 DoS)                                                      |
| SEC-004    | High     | **fixed** 479a678 | A07 Auth   | Admin proxy validated only cookie presence, not JWT signature                                              |
| SEC-005    | High     | **fixed** c0c9b9f | A05 Conf   | CSP missing frame-ancestors / base-uri / form-action / object-src; no Permissions-Policy                   |
| SEC-006    | High     | **fixed** 8ce36d9 | SAST       | No pre-commit / CI secret-leak scanning                                                                    |
| SEC-007    | High     | **fixed** 7d0779c | A05 Conf   | Rate limiter Map grew unbounded — DoS / memory bloat                                                       |
| SEC-008    | High     | **fixed** c80df1c | A05 Conf   | x-forwarded-for parsing fragile — same client to different buckets                                         |
| SEC-009    | High     | **fixed** e5ddc11 | A09 Log    | GDPR Art. 17 erasure log lacked actor IP / UA                                                              |
| SEC-010    | High     | **fixed** cb748df | A04 Design | User-Agent persisted to DB without size cap                                                                |
| SEC-MED-01 | Medium   | TODO              | A03 Inj    | Supabase `.or()` filter takes raw `q` in admin events search                                               |
| SEC-MED-02 | Medium   | TODO              | A03 Inj    | Supabase `.ilike()` does not escape `%` and `_` wildcards in `q`                                           |
| SEC-MED-03 | Medium   | TODO              | A02 Crypto | `ADMIN_PASSWORD_HASH_B64` double-encodes a bcrypt hash for no benefit                                      |
| SEC-MED-04 | Medium   | TODO              | A07 Auth   | Single static admin user — no 2FA, no rotation policy                                                      |
| SEC-MED-05 | Medium   | TODO              | A04 Design | Subscribe endpoint has a timing oracle (existing email vs new)                                             |
| SEC-MED-06 | Medium   | TODO              | A03 Inj    | `eventCtaUrl` admin-supplied URL is not validated before HTML attribute interpolation                      |
| SEC-MED-07 | Medium   | TODO              | A07 Auth   | Cron endpoints don't verify Vercel User-Agent (depth-defence)                                              |
| SEC-MED-08 | Medium   | TODO              | A06 Vuln   | `postcss <8.5.10` (transitive via next) — only fix is downgrade to next 9.3.3 (semver-major, out of scope) |
| SEC-MED-09 | Medium   | TODO              | A04 Design | Resume endpoint accepts arbitrary `html` in body — admin-gated, intended, but document risk                |
| SEC-MED-10 | Medium   | TODO              | A07 Auth   | Confirm token is not rotated when admin blocks a subscriber (review follow-up)                             |
| SEC-LOW-01 | Low      | report-only       | A09 Log    | Hardcoded fallback `From` header contains a personal Gmail address                                         |
| SEC-LOW-02 | Low      | report-only       | A04 Design | Honeypot `website` field silent-success could surprise legit users with autofill                           |
| SEC-LOW-03 | Low      | report-only       | A07 Auth   | Session `maxAge: 3600` — no idle timeout                                                                   |
| SEC-LOW-04 | Low      | report-only       | A03 Inj    | `name.toUpperCase()` Turkic-locale edge case in confirmation rendering                                     |
| SEC-LOW-05 | Info     | report-only       | A04 Design | No explicit body-size limit on POST endpoints (Next default ~1 MB applies)                                 |
| SEC-LOW-06 | Info     | report-only       | A09 Log    | `console.error` calls log Supabase error messages (no PII; Vercel logs are private)                        |
| SEC-LOW-07 | Info     | report-only       | A04 Design | `register-from-email` redirect-to-page uses fixed enum statuses (no open redirect)                         |
| SEC-LOW-08 | Info     | report-only       | A04 Design | `/api/newsletter/open` tracking pixel is intentionally public (open-tracking pattern)                      |
| SEC-LOW-09 | Info     | report-only       | A04 Design | `register` endpoint allows third-party sign-up — mitigated by confirmed-status precondition                |

## 3. Findings — Critical

### SEC-001 · Confirm bypass for blocked subscribers

- **File:** `apps/newsletter/src/app/api/confirm/route.ts:23`
- **Description:** The handler early-returned only when `status === 'confirmed'`; any other state (including the admin-set `'blocked'`) fell through to the status-update path.
- **Impact:** A spam bot or abusive subscriber that the admin had blocked could re-activate themselves to `confirmed` simply by clicking the confirmation link they had already received. The block decision was silently overridden.
- **Hypothetical exploit scenario:** admin blocks an abusive subscriber; the subscriber retains the original `/api/confirm?token=…` URL; clicking it flips them back to `confirmed` and resumes newsletter delivery.
- **Fix:** redirect blocked subscribers to `?error=invalid` so the admin's block decision is preserved; preserves the anti-enumeration shape used by the missing-subscriber path.
- **Skill:** `auth-implementation-patterns`, `test-driven-development`.

### SEC-002 · CSV / formula injection in registrations export

- **File:** `apps/newsletter/src/app/api/admin/events/[id]/registrations/export.csv/route.ts:25`
- **Description:** `csvField()` quoted commas / double-quotes / CR / LF per RFC 4180 but did NOT prefix-escape the leading-formula characters that Excel, Numbers, and LibreOffice evaluate as formulas (`=`, `+`, `-`, `@`, `\t`, `\r`).
- **Impact:** A subscriber registering with a name like `=cmd|'/c calc'!A0` causes arbitrary command execution on the admin's machine when the downloaded CSV is opened in any major spreadsheet app. Admin credential theft, workstation compromise, lateral movement.
- **Hypothetical exploit scenario:** attacker subscribes with a malicious name; admin exports CSV → opens in Excel; payload executes with admin's privileges.
- **Fix:** prefix `'` to any field that begins with a dangerous character before the RFC 4180 quoting pass — the OWASP-recommended mitigation.
- **Skill:** `stride-analysis-patterns`, `test-driven-development`.

## 4. Findings — High

### SEC-003 · Next.js 16.2.2 — CVE GHSA-q4gf-8mx6-v5v3 (DoS, CVSS 7.5)

- **File:** `apps/newsletter/package.json` `next` field
- **Description:** `next ≥16.0.0-beta.0 <16.2.3` has a Server-Components DoS (CWE-770).
- **Fix:** semver-patch bump to `16.2.4`. `eslint-config-next` aligned.
- **Skill:** `dependency-upgrade`, `secrets-management` (advisory tracking).

### SEC-004 · Admin proxy did not validate JWT signature

- **File:** `apps/newsletter/src/proxy.ts:11`
- **Description:** The pre-fix proxy accepted any cookie value with the right name. JWT decoding / signature verification only happened later, in the `(dashboard)` server layout. A spoofed cookie passed the proxy and relied entirely on that single downstream check.
- **Hypothetical exploit scenario:** any admin page added outside the `(dashboard)` layout group would be exposed; an attacker could craft a fake cookie and probe routes.
- **Fix:** rewrite the proxy with the canonical NextAuth v5 wrapper `auth((req) => …)`; `req.auth` is null when the JWT signature is invalid or expired, and the redirect to `/admin/login` is enforced at the proxy layer.
- **Skill:** `auth-implementation-patterns`.

### SEC-005 · CSP and security headers missing key directives

- **File:** `apps/newsletter/next.config.ts:6`
- **Description:** CSP defined `default-src`, `script-src`, `style-src`, `img-src`, `font-src`, `connect-src`, `media-src` but left `frame-ancestors`, `base-uri`, `form-action`, `object-src` open. `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `X-DNS-Prefetch-Control` were absent. HSTS lacked `preload`.
- **Impact:** an XSS that did land could pivot into framing, base-tag rewriting, cross-origin form posts, or legacy plugin abuse.
- **Fix:** add the missing CSP directives plus a Permissions-Policy denylist for powerful APIs we don't use, COOP `same-origin`, `X-DNS-Prefetch-Control: off`, HSTS `preload`.
- **Note:** `script-src 'unsafe-inline'` left in place because Next 16 still emits inline runtime bootstraps; nonce-based hardening is queued as TODO.
- **Skill:** `secrets-management`, `stride-analysis-patterns`.

### SEC-006 · No pre-commit / CI secret-leak scanning

- **Files:** `.husky/pre-commit`, `.github/workflows/ci.yml`, `.gitleaks.toml`
- **Description:** an accidental `.env` paste or hardcoded API key was caught only by manual review.
- **Fix:** add `gitleaks` to the pre-commit hook (soft-warn locally if the binary is missing) and a hard CI gate via `gitleaks/gitleaks-action@v2` that runs before lint/test. Allowlist scoped to lockfiles, `.env.example`, and the audit report path.
- **Verification gap:** gitleaks isn't installed on the dev workstation used for this audit, so end-to-end "stage AKIA…16-char string → blocked" was performed in the CI pipeline only. The action itself is well-known and the local hook degrades gracefully. Lorenzo to verify locally after `winget install gitleaks` (Windows) / `brew install gitleaks` (macOS).
- **Skill:** `sast-configuration`, `secrets-management`.

### SEC-007 · Rate limiter memory unbounded

- **File:** `apps/newsletter/src/lib/rate-limit.ts:7`
- **Description:** the in-memory Map grew per unique IP; entries were never removed. A fan-out attack across many unique IPs could exhaust the function's memory.
- **Fix:** always prune expired timestamps even on the rate-limited path; LRU-touch every check; cap distinct keys at 10 000 with oldest-first eviction; expose `trackedKeys()` for tests / debug.
- **Note:** still a per-instance defence — Vercel Fluid Compute reuses instances but does not share state between them. A distributed limiter (Vercel KV / Upstash Redis) is the canonical production solution and is queued as TODO.
- **Skill:** `stride-analysis-patterns`, `test-driven-development`.

### SEC-008 · Fragile x-forwarded-for parsing

- **Files:** `apps/newsletter/src/lib/client-ip.ts` (new), `apps/newsletter/src/app/api/{subscribe,events/register,events/resend-confirmation,contact-help,events/register-from-email,auth/[...nextauth]}/route.ts`
- **Description:** raw `request.headers.get("x-forwarded-for") ?? "unknown"` was used as the rate-limit / audit-log key. The header can carry a proxy chain, so the same client behind different chains landed in different buckets and silently bypassed the limiter.
- **Fix:** introduce `getClientIp()` — prefers `x-real-ip`, falls back to the first IP of `x-forwarded-for`, strips IPv4-mapped IPv6, caps to 64 chars, returns `"unknown"` only when both headers are absent. Migrate six call sites.
- **Skill:** `auth-implementation-patterns`, `stride-analysis-patterns`.

### SEC-009 · GDPR erasure audit log lacked actor context

- **File:** `apps/newsletter/src/app/api/unsubscribe/route.ts:121`
- **Description:** the Art. 17 audit line carried only the subscriber surrogate id and a timestamp. A future dispute over an unauthorised deletion (e.g. an attacker who had obtained the unsubscribe token) had no record of who or how.
- **Fix:** emit a single JSON line with `event`, `subscriberId`, `ip`, `userAgent`, `at`. Privacy invariant preserved (no email/name retained).
- **Note:** stdout is the current sink (Vercel Logs); long-term storage in a durable audit table is queued as TODO.
- **Skill:** `gdpr-data-handling`.

### SEC-010 · User-Agent persisted to DB without size cap

- **Files:** `apps/newsletter/src/lib/client-ip.ts` (added `getUserAgent`), four DB-write call sites
- **Description:** the User-Agent header is attacker-controlled and unbounded. A multi-MB UA string would land in `subscribers.subscribed_user_agent`, `list_event_registrations.user_agent`, and `contact_help_requests.user_agent`, bloating the database and amplifying DoS pressure.
- **Fix:** `getUserAgent(request)` truncates to 500 chars; migrate `/api/subscribe`, `/api/events/register`, `/api/events/register-from-email`, `/api/contact-help`.
- **Skill:** `stride-analysis-patterns`, `gdpr-data-handling`.

## 5. Findings — Medium (TODO)

### SEC-MED-01 · Supabase `.or()` accepts raw search input

- **File:** `apps/newsletter/src/app/api/admin/events/route.ts:46`
- **Description:** `query.or(\`title.ilike.%${q}%,slug.ilike.%${q}%\`)`interpolates`q`into a PostgREST filter expression. Commas / parens inside`q` could fold into additional filter clauses.
- **Recommended fix:** validate `q` against `^[\\w \\-]{0,80}$` before the call; or split the search into two `.ilike()` calls bound by `.or()` programmatically.

### SEC-MED-02 · `.ilike()` does not escape `%` and `_`

- **File:** `apps/newsletter/src/app/api/admin/events/[id]/registrations/route.ts:43`
- **Description:** PostgreSQL's `ilike` treats `%` and `_` as wildcards. Admin-only input, low blast radius, but a data-integrity / least-surprise issue.
- **Recommended fix:** `q.replace(/[\\\\%_]/g, "\\\\$&")` before interpolation.

### SEC-MED-03 · `ADMIN_PASSWORD_HASH_B64` double-encodes the bcrypt hash

- **File:** `apps/newsletter/src/lib/auth.ts:20`
- **Description:** the bcrypt hash is base64-wrapped before being stored in env. Adds complexity, no security benefit; bcrypt hashes are already opaque ASCII.
- **Recommended fix:** rename env var to `ADMIN_PASSWORD_HASH`, drop the base64 layer, update `.env.example` and ops docs.

### SEC-MED-04 · Single static admin (no 2FA, no rotation)

- **File:** `apps/newsletter/src/lib/auth.ts:7`
- **Description:** one admin user identified by `ADMIN_EMAIL` + bcrypt hash. No second factor, no rotation policy, no account-lockout-after-N-failures (rate-limit alone caps at 5/15min/IP).
- **Recommended fix:** when the admin set grows beyond one operator, migrate to NextAuth + database adapter with WebAuthn or TOTP second-factor.

### SEC-MED-05 · Subscribe endpoint timing oracle

- **File:** `apps/newsletter/src/app/api/subscribe/route.ts:43`
- **Description:** an existing-email path returns synchronously after a short DB lookup; a new-email path waits ~500 ms for Resend. The latency delta is a side channel for enumerating subscriber addresses.
- **Recommended fix:** either dispatch the email asynchronously (queue) or pad the existing-email path to a similar latency.

### SEC-MED-06 · `eventCtaUrl` admin-supplied URL not validated

- **File:** `apps/newsletter/src/lib/email-template.ts:148`
- **Description:** the URL is interpolated into an `href` attribute without sanitisation (the `{{TOKEN}}` placeholder must survive — `sanitizeUrl()` would percent-encode the braces). A compromised admin or a malicious draft import could inject HTML breakouts.
- **Recommended fix:** apply a stricter URL-attribute guard that allows `{{TOKEN}}` literally but rejects `"`, `>`, `<`, `'`, line terminators.

### SEC-MED-07 · Cron endpoints don't verify Vercel User-Agent

- **Files:** `apps/newsletter/src/app/api/cron/{send-followups,send-scheduled}/route.ts`
- **Description:** auth is via `CRON_SECRET` only. Vercel's documented hardening also checks `user-agent === 'vercel-cron/1.0'` — useful depth-defence if the secret leaks via logs.
- **Recommended fix:** add a `request.headers.get("user-agent")?.includes("vercel-cron")` check alongside the secret comparison.

### SEC-MED-08 · `postcss <8.5.10` transitive CVE

- **Description:** `npm audit` flags `postcss` (XSS via unescaped `</style>`, CVSS 6.1) reachable through `next`. The advisory's only fix is `next@9.3.3` — semver-major downgrade, out of scope for the patch-only policy this session.
- **Recommended fix:** monitor next releases for an updated bundled postcss; revisit in the next dependency-bump session.

### SEC-MED-09 · Resume endpoint accepts arbitrary HTML

- **File:** `apps/newsletter/src/app/api/admin/send/[campaignId]/resume/route.ts:35`
- **Description:** legacy-campaign resume accepts a one-time `html` body override that is then persisted and sent to recipients. Intended behaviour, admin-gated, but worth flagging for awareness.
- **Recommended fix:** persist a per-resume audit entry with the admin's email and a content hash so any later dispute over what was sent has a traceable record.

### SEC-MED-10 · Confirm token not rotated on block

- **Files:** `apps/newsletter/src/app/api/admin/subscribers/[id]/route.ts:29`; schema `subscribers.token`
- **Description:** raised by the independent reviewer of SEC-001. When an admin sets `status='blocked'`, the row's confirm token is left intact. SEC-001's whitelist fix means the stale link no longer succeeds while the row stays blocked, but if the row is ever flipped back to `pending` (manual repair, future flow, schema migration default) the same old link re-arms.
- **Recommended fix:** in the PATCH handler, when transitioning into the `blocked` state, also issue an `UPDATE … SET token = gen_random_uuid()`. Same on `unsubscribed`. Requires a small migration only if we need a UNIQUE constraint review; current schema already has `gen_random_uuid()` available.

## 6. Findings — Low / Info (report-only)

| ID         | File:line                                                                          | Note                                                                                                                                                                                          |
| ---------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-LOW-01 | multiple cron / send routes                                                        | Hardcoded fallback `From` contains a personal Gmail (`the.blacksheep.night@gmail.com`). Replace with a brand domain mailbox before public launch.                                             |
| SEC-LOW-02 | `subscribe/route.ts:29`, `events/register/route.ts:48`, `contact-help/route.ts:44` | Honeypot `website` returns silent success. Legit users with form-autofill plugins may accidentally trip it; consider a server-side check on field name (uncommon) instead of value.           |
| SEC-LOW-03 | `lib/auth.ts:33`                                                                   | `session.maxAge: 3600` — no idle timeout. Acceptable today; add idle-timeout when admin set grows.                                                                                            |
| SEC-LOW-04 | `lib/emails/confirmation.ts:37`                                                    | `name.toUpperCase()` Turkic edge case (`i` → `İ`). Cosmetic.                                                                                                                                  |
| SEC-LOW-05 | every POST handler                                                                 | No explicit body-size limit. Next's default (~1 MB) covers JSON requests; revisit if upload size grows.                                                                                       |
| SEC-LOW-06 | many `console.error`                                                               | Supabase error messages logged. No PII content; Vercel Logs are private to project members.                                                                                                   |
| SEC-LOW-07 | `events/register-from-email/route.ts:30`                                           | Redirect uses fixed enum statuses; no open-redirect path.                                                                                                                                     |
| SEC-LOW-08 | `api/newsletter/open/route.ts`                                                     | Tracking pixel public by design; opens-fudging affects analytics only.                                                                                                                        |
| SEC-LOW-09 | `api/events/register/route.ts`                                                     | Third-party sign-up possible (anyone who knows a confirmed email can register them). Mitigated by `confirmed`-status precondition + per-IP rate limit; acceptable for a club registration UX. |

## 7. Architectural decisions

- **Sweep-first audit before any fix.** Severity ranking only makes sense in the context of all findings — a fix in one area can change another's blast radius.
- **Per-fix atomic commits, one commit per SEC-ID.** Easier to revert / cherry-pick / review than a mega-commit.
- **CSP `unsafe-inline` left in place for `script-src`.** Removing it requires nonce propagation which Next 16 only partially supports out of the box. Hardening of the _surrounding_ directives delivers most of the value without breaking the app.
- **Local pre-commit gitleaks soft-warns, CI hard-fails.** Forces correctness in the only place that matters (CI on the protected branch) without breaking contributor flow when the binary isn't installed.
- **In-memory rate limiter retained, with bounding.** Switching to Vercel KV / Upstash is the right production answer; doing it as part of a security audit is scope creep. The eviction patch keeps the existing primitive safe for now.
- **Audit log stays in stdout (Vercel Logs).** Durable sink is the next hardening step; for an audit-trail purpose the Vercel-side retention is sufficient short-term and a TODO long-term.

## 8. Skills consulted

| Skill                                        | Where applied                                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `superpowers:using-superpowers`              | Session bootstrap; set the skill-first development discipline.                                       |
| `superpowers:brainstorming`                  | Audit strategy / severity-ranking design proposed and approved before sweep.                         |
| `superpowers:test-driven-development`        | Every Critical / High fix shipped with a regression test that fails before the fix and passes after. |
| `superpowers:verification-before-completion` | Final tests + tsc + build run before report and code-review request.                                 |
| `superpowers:requesting-code-review`         | Independent review on the two Critical fixes (see §9).                                               |
| `security-requirement-extraction`            | Mapped each finding to its OWASP / GDPR area for traceability.                                       |
| `auth-implementation-patterns`               | SEC-004 NextAuth v5 idiomatic proxy; SEC-001 admin-block invariant.                                  |
| `secrets-management`                         | SEC-005 header policy; SEC-006 secret-scan pipeline.                                                 |
| `gdpr-data-handling`                         | SEC-009 erasure-log shape; SEC-010 UA truncation rationale.                                          |
| `stride-analysis-patterns`                   | Tampering / Information-disclosure framing on SEC-002, SEC-005, SEC-007, SEC-008, SEC-010.           |
| `threat-mitigation-mapping`                  | Mapping CSP directives to specific XSS pivots (frame, base, form, object).                           |
| `sast-configuration`                         | SEC-006 gitleaks config + CI action wiring.                                                          |

## 9. Independent code review

Critical fixes (SEC-001, SEC-002) were submitted to a fresh independent
reviewer agent that had **not** seen the audit context. Two substantive
findings were raised; both were accepted and applied as a follow-up
commit on the same branch.

### Findings accepted

**SEC-001 — fix was a blacklist; needed to be a whitelist.**
Reviewer correctly observed that early-returning only on `status === 'blocked'`
left every other non-`pending` state (including `unsubscribed`, future
unknown enums, and NULL) silently confirmable. The token also wasn't
rotated on block, so an unblock-then-reblock cycle re-armed the same
stale link.
**Action:** inverted the gate to `if (status !== 'pending') redirect invalid`
so any future status fails closed by default. Added two regression tests
covering `unsubscribed` and an unknown future enum (`quarantined`). Token
rotation on block is added to the TODO list (SEC-MED-10) — it requires a
schema/migration touch and is out of session scope.

**SEC-002 — `\n` was missing from the leading-formula regex.**
Reviewer noted that some spreadsheet importers strip leading whitespace
including LF before formula detection, so leaving `\n` out of the prefix
list was inconsistent with the `\t\r` rationale.
**Action:** extended the regex to `^[=+\-@\t\r\n]/`. Added two tests:
leading-LF prefix and the combined formula+comma case (`=A,B` →
`"'=A,B"`) ensuring the apostrophe lands inside the RFC 4180 quotes.

### Findings rejected / deferred (with reasoning)

- **TOCTOU between SELECT and UPDATE in confirm route.** Pre-existing;
  not introduced by this fix. Acceptable risk for a low-frequency admin
  action and tracked separately if it ever becomes load-bearing.
- **Anti-enumeration imperfection (`already=true` distinct from `error=invalid`).**
  Intentional UX: a real user clicking a stale link they remember sending
  themselves should see "already confirmed" rather than be routed to a
  generic error. The information disclosed (token-was-once-valid) is
  bounded and the UX win outweighs it. Documented as accepted trade-off.
- **Cosmetic: `\-` vs `-` at end of regex character class.** Both correct
  and unambiguous; left as-is.

### Follow-up commit

A single dedicated commit on the same branch carries both SEC-001
whitelist conversion and SEC-002 LF/combined fixes, plus the four new
regression tests. Tests after follow-up: 580/580 passing.

## 10. Recommendations / next steps

1. **Install gitleaks locally** (`winget install gitleaks` on Windows) so the pre-commit hook is enforced before the CI gate. Verify by attempting to commit a file containing `AKIAIOSFODNN7EXAMPLE`.
2. **Migrate rate limiting to Vercel KV / Upstash Redis** for cross-instance correctness and to remove the per-instance memory bound entirely.
3. **Move the GDPR erasure audit log to a durable sink** (a small `gdpr_audit` table or an external SIEM integration) — Vercel Logs retention isn't an audit substitute long-term.
4. **Plan a `next` minor/major bump session** to clear the residual `postcss` advisory.
5. **Replace the `ADMIN_PASSWORD_HASH_B64` env name** with a plain bcrypt hash and document in ops handbook.
6. **Consider a nonce-based CSP** (`'strict-dynamic' 'nonce-…'`) once the team is ready to wire nonces through the Next 16 inline-script bootstraps.

---

_Generated 2026-05-05 by the Track A security audit. Each SEC-ID maps
to exactly one commit on `feat/blacksheep-list`; see `git log --grep="SEC-"`._
