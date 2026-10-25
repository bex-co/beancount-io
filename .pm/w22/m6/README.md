# w22 · m6 — Backend parity for holdings, register, and capital-gains

**Worker:** worker1 **Goal:** the three CLI reports are readable through REST, GraphQL, and MCP with CLI-equivalent shapes and inputs **Status:** todo (t001–t002 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Holdings end to end on all three surfaces — **DONE** | 3h | — |
| t002 | Register end to end on all three surfaces — **DONE** | 2h30m | — |
| t003 | Capital-gains end to end on all three surfaces | 3h | — |
| t004 | Adoption surface | 30m | t003 |
| t005 | Simplify | 30m | t004 |
| t006 | Test coverage | 1h | t004 |
| t007 | Closeout | 15m | t005, t006 |

## Definition of done

- `holdings`, `register`, and `capital-gains` each read through REST, GraphQL, and MCP with result shapes mirroring the CLI report and the inputs each backend engine can honor exactly. Documented deltas (t001): no `time`/`filter`/`interval`/`allow-errors` (BQL positions are all-time; Fava-expression filters don't translate; no period grouping for a snapshot; Fava load errors fail the read), no per-quote `price_date`/provenance (unobservable via BQL), number strings normalized rather than scale-preserved, quotes pinned at `today()` (deliberately excluding future-dated prices, as the dashboard does). Documented deltas (t002): rows are per entry with subtree postings (not per posting — per-posting balances would need quotes the service cannot see); unconvertible rows value by Fava fallback (the CLI strict-fails instead, and reports no partial legs); a time window carries the opening balance (Fava clamp; the CLI restarts at zero); `at_value`/currency conversions value at each entry's date (Fava) rather than the period end (CLI); root resolution reads window-aware posting/balance accounts.
- The parity gate holds: `surface-parity` gaps stay zero, `parity-baseline` is intact, `op-class-coverage` passes, and `docs/openapi/v1.json` is regenerated with no drift.
- Each report's contract tests drive REST, GraphQL, and MCP against controlled dependencies; service-call-only mocks are not enough.
- `yarn typecheck`, `yarn test`, and `yarn generate-v1-openapi` pass from `backend-cluster/backend-v2/`.

## Source + Goal linkage

- **Source:** promoted from `w22/003` (inbox note, recorded by w22/m3/t006, extended by w22/m4/t004): the backend finance mirror covers overview, income-statement, balance-sheet, and trial-balance only, while the CLI ships holdings, register, and capital-gains. Triage verified the gap still holds and sized it past the sub-hour note limit: three reports times three surfaces plus op classification, parity rows, and OpenAPI regen.
- **Goal linkage:** A1 (agent-native accounting) — coding agents reach hosted-ledger reports through MCP resources and the REST/GraphQL contracts, not just the local CLI.
- **Expected outcome:** hosted-ledger clients can read holdings, register, and capital-gains on any of the three surfaces with the same shapes the CLI prints.
- **Why now:** m3/m4 shipped the CLI shapes; every release without the mirror widens the documented parity gap the repo rule forbids.
- **Adoption surface:** included, because the milestone ships agent-facing MCP resources and public REST/GraphQL contracts.
