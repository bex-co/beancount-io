# w2 · m9 — Search Console CTR hygiene for commit detail

**Worker:** worker2 **Goal:** turn Search Console's only near-page-one dashboard hit (commit `c121e11...` at position 4.3, 0% CTR) into a click-worthy result and tighten dashboard-owned classification so future GSC reads are not drowned in CMS noise. **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ------- | --- | ---------- |
| t001 | Add indexable head + canonical to commit detail route and wire `ledgerCommit` SEO keys | 35m | —          | — **DONE** |
| t002 | Create `ledgerCommit` SEO translation entries across 14 locales with short-hash title | 30m | w2/m9/t001 | — **DONE** |
| t003 | Fix locale-prefixed CMS classification in `search-console-report-core.ts` (`/zh/blog` etc → cms) | 20m | —          | — **DONE** |
| t004 | Adoption surface | 20m | w2/m9/t002, w2/m9/t003 | — **DONE** |
| t005 | Simplify | 20m | w2/m9/t004 | — **DONE** |
| t006 | Test coverage | 30m | w2/m9/t004 | — **DONE** |
| t007 | Closeout | 10m | w2/m9/t006 | — **DONE** |

## Definition of done

- `https://beancount.io/ledger/$owner/$name/commit/$sha` emits `title` containing the short commit hash (7 chars) and ledger name, a specific `description` (not the generic commits-list copy), a stable `rel=canonical` without UI query params, and remains indexable with hreflang.
- `yarn search-console-report --markdown --days 28` still shows the amazon commit as `near-page-one` (if still ranking) but its rendered head would now win a click; `classifyDashboardPath("/zh/blog")` returns `cms` not `unknown`; `yarn test` and `yarn lint` pass in `dashboard/`; no secrets or raw GSC rows on the board.

## Source + Goal linkage

- **Source:** Search Console report 2026-08-21 (28-day window): `near-page-one | "amzn-20260630.htm" | /ledger/open_ledger/amazon/commit/c121e11e... | 26 impressions | 4.3 position | 0% CTR` + `ledger/open_ledger/example/account/...?lang=uk|ca` low-CTR dilution. Sitemap health: `api-gateway/sitemap.xml ok`, `/sitemap.xml 3588 errors` (CMS host mismatch, not dashboard-owned). Prior milestone `w2/m8` established indexability policy at `dashboard/src/common/lib/seo/indexability.ts`.
- **Goal linkage:** **A3 — Community & distribution** and **A2 — Frictionless onboarding** — public ledger history should be findable and legible in search; correct classification keeps dashboard GSC signal clean for future iterations.
- **Expected outcome:** The one dashboard URL that already ranks on page one gets a unique, hash-anchored snippet that can convert impressions to clicks without spamming the sitemap or indexing private routes.
- **Why now:** m8 left `commit/$sha` without a route-level head (it reused `ledgerCommits` list copy via `LedgerPageSEO`), which the GSC evidence now proves is the top CTR opportunity. The locale-prefixed CMS bug inflates `unknown` and was already queued as sub-hour inbox note `w2/004.md` — bundle it here to unblock clean reporting before next GSC read.
- **Adoption surface:** included (public ledger commit page is user- and crawler-facing).
