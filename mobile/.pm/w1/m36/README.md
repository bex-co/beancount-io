# w1 · m36 — Merchant view: stats and transaction history

**Worker:** worker1 **Goal:** tapping a merchant in the directory opens a per-merchant screen — per-currency totals, count, first/last dates, and the merchant's full transaction history — going one step beyond Monarch, which offers only an edit sheet plus a filtered list. **Status:** todo

## Tasks (in order)

| id   | title                                                  | est | depends_on |
| ---- | ------------------------------------------------------ | --- | ---------- |
| t001 | Route, navigation, and detail-source wiring            | 30m | —          |
| t002 | Stats header from a per-payee rollup                   | 45m | t001       |
| t003 | Payee-filtered transaction list                        | 45m | t001       |
| t004 | Paging, skeleton, and empty/error states               | 30m | t002, t003 |
| t005 | UX pass (light/dark, RTL, translations, analytics)     | 30m | t004       |
| t006 | Simplify pass over the milestone's diff                | 30m | t005       |
| t007 | Test coverage for escaping, filtering, stats selectors | 45m | t005       |
| t008 | Closeout                                               | 15m | t007       |

## Definition of done

Tapping any directory row opens the merchant view: a stats header (per-currency total — never summed across currencies — transaction count, first and last dates) and the merchant's transactions grouped by date, exact-matched on payee, paged past the first journal window. Tapping a transaction opens the existing transaction-detail screen with a `"merchants"` source. Light/dark verified; translation gate green; `yarn test` green.

## Source + Goal linkage

- **Source:** same `/pm` hand-off 2026-08-19 (Monarch parity research). Monarch's per-merchant surface is the Edit sheet + a "History · N transactions" link into a filtered list; the research recommends exceeding that with a stats header, which our per-payee data supports cheaply.
- **Goal linkage:** Pillar 3 (analytics & insights) — per-merchant spend at a glance. Pillar 4 respected: read-only.
- **Expected outcome:** "how much have I spent at X, since when" answered in three taps.
- **Why now:** sequenced directly after m35 — it navigates from m35's list and reuses its `queryShell` plumbing; m37's recurring toggle needs this screen as its surface.
