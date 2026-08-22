# w2 · m10 — Self-canonical hygiene for all indexable dashboard pages

**Worker:** worker2 **Goal:** every indexable dashboard page emits exactly one self-referencing `rel=canonical` (path + supported `lang` param only), ending the query-param variant dilution Search Console shows on account pages and making the GSC report rank real pages instead of crawl variants. **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Add `getSelfCanonicalUrl` helper to `indexability.ts` (path + valid `lang` only, UI-state params stripped) — **DONE** | 30m | — |
| t002 | Emit `rel=canonical` from `LedgerSEO`/`PageSEO` on indexable pages; reconcile with existing route-level canonicals — **DONE** | 40m | w2/m10/t001 |
| t003 | Aggregate `?lang=`/param variants under their canonical page in `search-console-report-core.ts` — **DONE** | 30m | — |
| t004 | Adoption surface — **DONE** | 20m | w2/m10/t002, w2/m10/t003 |
| t005 | Simplify — **DONE** | 20m | w2/m10/t004 |
| t006 | Test coverage — **DONE** | 30m | w2/m10/t004 |
| t007 | Closeout — **DONE** | 10m | w2/m10/t006 |

## Definition of done

- Every page that does not emit `noindex` emits exactly one `rel=canonical`: `https://beancount.io` + pathname, plus `?lang=xx` iff a supported `lang` param was present in the request. `?lang=<unsupported>` canonicalizes to the clean path.
- UI-state params (`editMode`, line numbers, journal filters, search/query params) never appear in a canonical URL.
- Commit-detail, blob, and ask pages keep their m8/m9 canonicals and no page emits two canonical tags.
- Canonical and hreflang stay consistent: each `?lang=xx` alternate self-canonicalizes, so hreflang remains valid.
- `yarn search-console-report --markdown` groups `?lang=` variants of the same page (e.g. the `Expenses:Financial:Fees` account page's `?lang=uk` / `?lang=ca` rows) into one aggregated row with summed clicks/impressions, impression-weighted position, and a variant count.
- `yarn lint && yarn test` pass in `dashboard/`.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-08-21 (Search Console, 28-day window): `?lang=uk` / `?lang=ca` variants of `/ledger/open_ledger/example/account/Expenses:Financial:Fees` indexed separately at positions 88–97 with 0 clicks. `LedgerSEO` / `PageSEO` emit no canonical; only commit-detail (m9), blob, and ask (m8) routes do. Design decision recorded there: self-canonical preserving `lang` (keeps hreflang valid) over canonicalizing `?lang=` to the clean path (which would make Google ignore the 14-locale hreflang setup).
- **Goal linkage:** **A3 — Community & distribution** — public ledger content ranks with consolidated signal, one URL per page per language; **A2 — Frictionless onboarding** secondary (login/sign-up acquisition pages gain canonicals too).
- **Expected outcome:** GSC "Duplicate without user-selected canonical" and indexed `?lang=`/param variants drop; impressions consolidate onto canonical URLs in the next 28-day report, which then ranks real pages.
- **Why now:** m8 opened the indexable surface and m9 proved the canonical pattern on one route; GSC now shows the predicted variant dilution on account pages. Closing the gap before Google indexes more param variants is cheaper than cleaning up after.
- **Adoption surface:** included — the change ships on public crawler/user-facing pages (m8/m9 precedent).
