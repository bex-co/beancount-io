# w23 · m16 — Disclose unpriced report conversions

**Worker:** worker1 **Goal:** report conversions that fall back to cost or units say so, holdings-style, on every surface **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Collect unconverted legs during lot valuation | 45m | — |
| t002 | Ledger reports carry valuation + missing_prices | 60m | t001 |
| t003 | backend-v2: surface the disclosure on REST, GraphQL and MCP | 60m | t002 |
| t004 | Docs: report conversion disclosure | 20m | t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 30m | t005 |
| t007 | Test coverage | 45m | t005 |
| t008 | Closeout | 15m | t006, t007 |

## Definition of done

- balance-sheet, income-statement, trial-balance, interval-totals, account-journal and the hierarchy responses carry `valuation` (`complete`|`partial`) and `missing_prices` (`{from,to}[]`) on REST, GraphQL and MCP; a known-but-unpriced `conversion` target answers `partial` with the legs, a fully priced one `complete`.
- Report values are unchanged; the fields are additive.
- OpenAPI snapshot, CLI client, docs and package gates are green.

## Source + Goal linkage

- **Source:** promoted from `w23/180` (2026-10-30, owner chose holdings-style disclosure); follows w23/156.
- **Goal linkage:** A1 (agent-native accounting) — an agent no longer reads unconverted units as target-currency amounts.
- **Expected outcome:** an agent asking for a EUR report on a USD-priced ledger sees which legs were not converted.
- **Why now:** the silent fallback is the one remaining way a report reads as honest while mixing currencies. Adoption surface included — agent-facing report payloads change.
