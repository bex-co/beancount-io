# w23 · m41 — Diff the report engine against stock beancount in a release gate

**Worker:** worker1 **Goal:** The overview, income statement, balance sheet, trial balance and holdings are replayed against checked-in stock beanquery results, so a report that disagrees with stock beancount turns the gate red. **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| -- | ----- | --- | ---------- |
| t001 | Map each report to the stock statement that defines it | 45m | — |
| t002 | Extend the oracle generator to emit stock report results offline | 45m | t001 |
| t003 | Replay the reports against the corpus | 60m | t002 |
| t004 | Value a position one way everywhere (w1/229) | 45m | t003 |
| t005 | Allowlist deviations with references and document the command | 25m | t003 |
| t006 | Adoption surface | 20m | t004, t005 |
| t007 | Simplify | 20m | t006 |
| t008 | Test coverage | 30m | t006 |
| t009 | Closeout | 15m | t008 |

## Definition of done

`yarn verify:rustledger` (from `backend-cluster/ledger`) replays each report on a fixed fixture set and compares it per account and currency with stock results from a checked-in, offline-reproducible corpus; the `w1/229` position gets one valuation across holdings, BQL `value()` and net worth; every allowlisted deviation cites a reference; an out-of-date corpus fails naming its regeneration command.

## Source + Goal linkage

- **Source:** `w1/229`; `/pm-brainstorm more for w23` 2026-11-10, proposal 4 (carried over from the 2026-11-10 proposal 1). Reuses `w23/done/m20` infrastructure.
- **Goal linkage:** A1 — Agent-native accounting.
- **Expected outcome:** A report number matches what stock beancount computes, and the same position is valued the same way everywhere an agent can ask.
- **Why now:** BQL has a stock oracle (`w23/m20`) but the reports do not, and QA already found a position priced 90 USD by holdings and BQL while net worth leaves it out. Aligning to stock is the cheapest way to end that class (do not re-implement upstream: this compares, it does not copy).
- **Adoption surface:** included: report semantics are user-facing and the oracle command goes in the ledger package docs.
