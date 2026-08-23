# w2 · m11 — Acquisition snippet CTR for login, sign-up and forgot-password

**Worker:** worker2 **Goal:** turn the only 3 indexable dashboard auth pages from generic `Sign In`/`Create Account` snippets into brand + keyword + differentiator snippets that convert near-page-one impressions to sign-ups **Status:** done

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ------- | --- | ---------- |
| t001 | Rewrite EN acquisition SEO strings for login/sign-up/forgot-password — **DONE** | 30m | — |
| t002 | Propagate to 13 locale SEO files and run prepare-translations — **DONE** | 40m | w2/m11/t001 |
| t003 | Spot-check rendered heads, OG images, canonical and hreflang on the 3 pages — **DONE** | 20m | w2/m11/t002 |
| t004 | Adoption surface — **DONE** | 20m | w2/m11/t003 |
| t005 | Simplify — **DONE** | 20m | w2/m11/t004 |
| t006 | Test coverage — **DONE** | 30m | w2/m11/t004 |
| t007 | Closeout — **DONE** | 10m | w2/m11/t006 |

## Definition of done

- EN `seo.login.title` = `Sign In to Beancount — Free Plain-Text Accounting` (52 chars), `seo.signUp.title` = `Create Free Beancount Account — Git-Backed Accounting` (56), `seo.forgotPassword.title` = `Reset Beancount Password — Secure Access` (44) with 120–134 char descriptions containing brand + `plain-text` keyword + one differentiator (`open-source`, `Git-backed`, `Fava`).
- All 13 locale `dashboard/src/i18n/locales/seo/*.ts` files mirrored (not literal English copy where unnatural) and `yarn prepare-translations` / `flatten-translation-keys` pass.
- `/auth/login`, `/auth/sign-up`, `/auth/forgot-password` each emit exactly one `title`, one `meta description`, `og:title/description`, self `rel=canonical` via `getSelfCanonicalUrl`, and 13 `hreflang` + `x-default` alts on both SSR and client. `/login`/`/sign-up` 302s land on those canonicals. OG image URL reflects new title.
- `yarn lint && yarn test` pass in `dashboard/`; next `yarn search-console-report --markdown --days 14` no longer lists these 3 pages as `low-ctr` for branded `beancount login`/`beancount sign up` queries (or documents insufficient impressions).

## Source + Goal linkage

- **Source:** Diagnosis C from Search Console CTR audit 2026-08-22 (`dashboard/scripts/search-console-report-core.ts` thresholds `lowCtr 0.03, position 4–20`): current EN ships `Sign In` (7 chars / ~49px), `Create Account` (14 chars), `Forgot Password` (15 chars) + 69–94 char boilerplate descriptions at `dashboard/src/i18n/locales/seo/en.ts:238` with zero `beancount`/`plain-text` tokens, competing against millions of identical snippets. `m10` fixed `?lang=` canonical dilution, leaving snippet CTR as the bottleneck.
- **Goal linkage:** **A3 — Community & distribution** — branded navigational queries (`beancount login`) gain a brand + keyword snippet that wins the click; **A2 — Frictionless onboarding** — the click lands on the first step of zero-to-ledger (login/sign-up are `indexability.ts:18` acquisition surfaces: `login, sign-up, and forgot password` stay indexable).
- **Expected outcome:** Same position (6–9) but CTR 1.6–2.5% → >3% (exits `low-ctr` table, stays `near-page-one` until ranking improves), measured by `yarn search-console-report --markdown --days 14` and GSC URL Inspection (all `PASS`). Downstream `sign_up` completion measurable once analytics events ship.
- **Why now:** `m10` (done) consolidated `?lang=` variants; the next GSC read would otherwise re-surface the same 3 auth pages as top `low-ctr` opportunities. Fixing titles costs minutes per locale but unlocks the acquisition funnel that all later onboarding work depends on.
- **Adoption surface:** included — ships on 3 public crawler- and user-facing acquisition pages (SSR heads, OG, hreflang).
