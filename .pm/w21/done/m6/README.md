# w21 · m6 — `bea report` CSV output for every report

**Worker:** worker1 **Goal:** every report prints CSV that matches its JSON, for spreadsheets and agents **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Define the report CSV contract — **DONE** | 30m | — |
| t002 | Shared CSV rendering with spreadsheet-safe prefixing — **DONE** | 45m | t001 |
| t003 | Wire `--format csv` and `-o` into all 8 reports — **DONE** | 60m | t002 |
| t004 | Fixture tests: CSV totals match JSON, formula safety, empty period — **DONE** | 40m | t003 |
| t005 | Adoption surface — **DONE** | 20m | t004 |
| t006 | Simplify — **DONE** | 20m | t005 |
| t007 | Test coverage — **DONE** | 30m | t005 |
| t008 | Closeout — **DONE** | 15m | t007, t006 |

## Definition of done

All 8 `bea report` commands accept `--format csv` and `-o`; a test asserts CSV totals equal `--json` totals on the fixture ledger; `--spreadsheet-safe` prefixes formula-like text; `make check-all` passes.

## Source + Goal linkage

- **Source:** `/pm-brainstorm for w21` 2026-11-05, candidate 1; `bea query` already has `--format csv`
- **Goal linkage:** **A2 — Frictionless onboarding** (spreadsheet users migrating in get their numbers) and **A1** (stable tabular output for agents); prerequisite for the report pack (m9).
- **Expected outcome:** Users open any report in Excel/Sheets without BQL; `bea report` usage and migration-journey completions rise.
- **Why now:** Cheapest item and the front half of m9; reports are complete so the contract is stable.
- **Parity:** CLI-native output only; no REST/GraphQL/MCP change.
- **Adoption surface:** included — a user-facing option
