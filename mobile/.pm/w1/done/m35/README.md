# w1 · m35 — Merchants directory in the drawer

**Worker:** worker1 **Goal:** the user opens the left drawer, taps Merchants at the bottom, and sees every payee of the selected ledger as a searchable, sortable directory — logo, name, transaction count, last date — with exact counts regardless of ledger size. **Status:** **done** 2026-08-19 — Merchants directory from the drawer with server-side payee rollups, search, count/alpha sort, logos, light/dark/RTL

## Tasks (in order)

| id   | title                                                 | est | depends_on            |
| ---- | ----------------------------------------------------- | --- | --------------------- |
| t001 | Wire `queryShell` as internal aggregation plumbing    | 45m | — — **DONE**          |
| t002 | `aggregate-payees` selector: BQL rows → typed rollups | 30m | t001 — **DONE**       |
| t003 | Drawer row, route, and screen scaffold                | 30m | — — **DONE**          |
| t004 | Directory list UI + skeleton                          | 45m | t002, t003 — **DONE** |
| t005 | Search and count/alphabetical sort                    | 30m | t004 — **DONE**       |
| t006 | UX pass (light/dark, RTL, translations, analytics)    | 30m | t005 — **DONE**       |
| t007 | Simplify pass over the milestone's diff               | 30m | t006 — **DONE**       |
| t008 | Test coverage for selectors and sort/search logic     | 45m | t006 — **DONE**       |
| t009 | Closeout                                              | 15m | t008 — **DONE**       |

## Definition of done

From the drawer's bottom menu section, the user opens a Merchants screen that lists every payee of the selected ledger with a brand logo (curated-match fallback glyph), name, exact transaction count, and last-transaction date. Search filters the list; a sort control toggles transaction count (default) / alphabetical, matching Monarch's two sorts. Counts come from server-side aggregation, so they are correct on ledgers far larger than one journal page. Light and dark themes verified; all new strings pass the translation-integrity gate; `yarn test` green.

## Anti-goal reconciliation (`DO_NOT_DO.md:18`)

The 2026-07-14 owner decision bans a **BQL console / raw-query surface** — its stated rationale is "typing queries on a phone is a poor fit." This milestone does not build a query surface: `queryShell` is used as internal data plumbing with **fixed, app-authored statements** (a payee rollup), invisible to the user, exactly the way Reports uses its dedicated queries. No screen accepts or displays BQL. If the owner reads the anti-goal as banning the operation outright, t001 documents the fallback (client-side aggregation over a `getLedgerJournal` window) and its known defect: counts silently wrong past the fetched window — the failure mode `select-account-transactions.ts` already documents.

## Source + Goal linkage

- **Source:** `/pm` hand-off 2026-08-19 from the Monarch Merchants parity research (Mobbin captures of Monarch iOS v2.0.37 — drawer bottom placement, list = search + count/alpha sort + logo·name·count rows, e.g. mobbin.com/screens/d1d5ef16-2b2f-4c70-be2e-3f776efba9ec; help.monarch.com; hammem/monarchmoney GraphQL client).
- **Goal linkage:** Pillar 3 (analytics & insights) — the ledger's payees become browsable insight ("whom do I pay, how often, since when") without spreadsheets. Pillar 4 respected: read-only derivation from the ledger, nothing written.
- **Expected outcome:** any beancount.io user can answer "who are my merchants and how often do I transact with them" in two taps from any tab.
- **Why now:** owner request 2026-08-19. m5 created the drawer's bottom menu section this slots into; m13's brand-matcher supplies logos for free; m36 (merchant view) and m37 (recurring grouping) both build on this screen and its aggregation plumbing.

## Outcome note (2026-08-19)

**Shipped**

- Drawer bottom menu: Merchants row (`storefront-outline`) above Settings; tap closes drawer and opens `/(app)/merchants`.
- Fixed app-authored `queryShell` BQL rollup (`PAYEE_ROLLUP_BQL`) with codegen hook + `ENTRIES_FIELDS` invalidation — exact counts regardless of journal page size.
- Pure `aggregatePayees` / `filterMerchants` / `sortMerchants` selector (column-by-name, soft-fail, duplicate merge).
- Directory list: brand logo via `AccountTypeIcon`, name, pluralized transaction count, short last date; skeleton; blank / no-results / error branches; pull-to-refresh.
- Client search + count/alphabetical sort toggle with `merchants_sort_change` analytics.
- All new strings in `en` + 12 locales; fr `merchantsTransactionCount` excused as SAME_AS_ENGLISH (loanword).

**Deliberately not built**

- Row navigation to a merchant view (m36).
- Recurring grouping (m37).
- Server-side search / frecency ranking.
- Promoting `getLedgerPayees` into `ENTRIES_FIELDS` (called out in t001 as a separate decision).

**Verified**

- Live `queryShell` against `open_ledger/minimax` returns payee/count/first/last columns for the aliased statement.
- Simulator: light + dark Merchants screen; drawer shows Merchants beside Settings and navigates; Persian RTL mirrors search/sort/row (date on leading edge, logo on trailing).
- `yarn test` green (1439 passed).

**Screenshots:** `tmp/m35/merchants-light.png`, `merchants-dark.png`, `drawer-light.png`, `from-drawer.png`, `merchants-fa.png`.
