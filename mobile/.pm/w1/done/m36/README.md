# w1 · m36 — Merchant view: stats and transaction history

**Worker:** worker1 **Goal:** tapping a merchant in the directory opens a per-merchant screen — per-currency totals, count, first/last dates, and the merchant's full transaction history — going one step beyond Monarch, which offers only an edit sheet plus a filtered list. **Status:** **done** 2026-08-20 — Merchant view with per-currency stats, dated transaction history, paging/skeleton, recurring toggle retained from m37; light/dark/RTL verified

## Tasks (in order)

| id   | title                                                  | est | depends_on            |
| ---- | ------------------------------------------------------ | --- | --------------------- |
| t001 | Route, navigation, and detail-source wiring            | 30m | — — **DONE**          |
| t002 | Stats header from a per-payee rollup                   | 45m | t001 — **DONE**       |
| t003 | Payee-filtered transaction list                        | 45m | t001 — **DONE**       |
| t004 | Paging, skeleton, and empty/error states               | 30m | t002, t003 — **DONE** |
| t005 | UX pass (light/dark, RTL, translations, analytics)     | 30m | t004 — **DONE**       |
| t006 | Simplify pass over the milestone's diff                | 30m | t005 — **DONE**       |
| t007 | Test coverage for escaping, filtering, stats selectors | 45m | t005 — **DONE**       |
| t008 | Closeout                                               | 15m | t007 — **DONE**       |

## Definition of done

Tapping any directory row opens the merchant view: a stats header (per-currency total — never summed across currencies — transaction count, first and last dates) and the merchant's transactions grouped by date, exact-matched on payee, paged past the first journal window. Tapping a transaction opens the existing transaction-detail screen with a `"merchants"` source. Light/dark verified; translation gate green; `yarn test` green.

## Source + Goal linkage

- **Source:** same `/pm` hand-off 2026-08-19 (Monarch parity research). Monarch's per-merchant surface is the Edit sheet + a "History · N transactions" link into a filtered list; the research recommends exceeding that with a stats header, which our per-payee data supports cheaply.
- **Goal linkage:** Pillar 3 (analytics & insights) — per-merchant spend at a glance. Pillar 4 respected: read-only.
- **Expected outcome:** "how much have I spent at X, since when" answered in three taps.
- **Why now:** sequenced directly after m35 — it navigates from m35's list and reuses its `queryShell` plumbing; m37's recurring toggle needs this screen as its surface.

## Outcome note (2026-08-20)

**Shipped**

- `merchant-detail` route + directory navigation (`merchants_tap_row` with `recurring`) + `TransactionDetailSource` includes `"merchants"`.
- Stats header: logo, count, date span, per-currency totals via fixed `queryShell` (`buildMerchantMetaBql` / `buildMerchantCurrencyTotalsBql`) with `escapeBqlString` (double-quoted `\`/`\"` escapes).
- Transaction list: `getLedgerJournal` + `journalSearchFilter` (strips `.` — server 500s on `"Inc."`) + `filterExactPayee`, `groupToSections` / `EntryRow` / `DateSectionHeader`, row tap → transaction detail with source `"merchants"`.
- Paging (`fetchMore`, auto-fill while exact matches < page size, cap 25 pages), skeleton, pull-to-refresh, error retry, empty state.
- m37 recurring toggle + cadence chip retained on this screen.

**Verified**

- `open_ledger/minimax` / MiniMax Group Inc.: 32 transactions, 2,679.83 MUSD, Dec 31 2022–2025; yearly list rows match.
- Row tap opens transaction detail; light/dark/Persian RTL screenshots in `tmp/m36/`.
- `yarn test` green.

**Deliberately not built**

- Spend-over-time sparkline (candidate inbox).
- Merchant rename / ledger rewrite (inbox `032`).

**Screenshots:** `tmp/m36/detail-light.png`, `detail-dark.png`, `detail-fa.png`, `after-tx-tap.png`.
