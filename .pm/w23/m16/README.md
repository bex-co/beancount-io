# w23 · m16 — Disclose unpriced report conversions

**Worker:** worker1 **Goal:** summary reports that could not convert say so, holdings-style, on REST, MCP and GraphQL **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Derive missing-price legs from converted balances | 40m | — |
| t002 | Summary shapes carry missingPrices (REST and MCP) | 50m | t001 |
| t003 | GraphQL report types carry missingPrices | 40m | t002 |
| t004 | Docs: report conversion disclosure | 20m | t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 30m | t005 |
| t007 | Test coverage | 45m | t005 |
| t008 | Closeout | 15m | t006, t007 |

## Definition of done

- The balance-sheet, income-statement, overview and interval-totals summaries (REST and the MCP resources) and the GraphQL balance sheet, income statement and overview carry missingPrices (a list of from/to legs, present only when non-empty): a conversion target the ledger has no price path for lists the currencies that were not converted, and a fully priced conversion omits it.
- Report values are unchanged; the field is additive. Raw payloads (shape=fava, trial balance, account journal, hierarchy) are documented as already exposing the unconverted currencies through their currency-keyed balances.
- OpenAPI snapshot, CLI client, docs and package gates are green.

## Source + Goal linkage

- **Source:** promoted from `w23/180` (2026-10-30, owner chose holdings-style disclosure); follows w23/156.
- **Goal linkage:** A1 (agent-native accounting) — an agent no longer reads unconverted units as target-currency amounts.
- **Expected outcome:** an agent asking for a EUR report on a USD-priced ledger sees which legs were not converted.
- **Why now:** the silent fallback is the one remaining way a report reads as honest while mixing currencies. Adoption surface included — agent-facing report payloads change.
