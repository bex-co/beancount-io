# w23 · m19 — Fill balances.discrepancy from the validator

**Worker:** worker1 **Goal:** `SELECT account, discrepancy FROM balances` returns the difference for a failing balance assertion on REST, GraphQL and MCP, as stock does **Status:** blocked (t001–t007 done)

## Tasks (in order)

| id | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Recognize a balances query that selects discrepancy — **DONE** | 45m | — |
| t002 | Fill discrepancy from the validator's balance diffs — **DONE** | 60m | t001 |
| t003 | Refuse discrepancy where it cannot be right — **DONE** | 30m | t001 |
| t004 | Parity and docs — **DONE** | 30m | t002, t003 |
| t005 | Adoption surface — **DONE** | 20m | t004 |
| t006 | Simplify — **DONE** | 30m | t005 |
| t007 | Test coverage — **DONE** | 45m | t005 |
| t008 | Verify on production and close out | 20m | t006, t007 |

## Definition of done

- A plain projection selecting `discrepancy` returns the validator's difference for each failing assertion and null for passing ones, with the same cells on REST, GraphQL and MCP; other balances queries return exactly what they did.
- `discrepancy` used where it cannot be answered correctly (filters, ordering, grouping, aggregates) is refused with the supported form named, never answered silently wrong.
- Docs state the rule and link the upstream issue; checks and the parity gate are green; the production rerun passes.

## Source + Goal linkage

- **Source:** promoted from `w23/196` (2026-11-01, owner chose service-side enrichment over waiting for the engine; upstream rustledger/rustledger#2823 stays filed).
- **Goal linkage:** A1 (agent-native accounting): an agent auditing balance health through BQL must see by how much an assertion fails, not a blank.
- **Expected outcome:** a failing balance assertion is quantified in one query.
- **Why now:** the dtype half shipped and the value stays blank; the triage's open question (how to key a row) is answered by adding the keys to the query, not guessing.

## Blocked

**Re-blocked 2026-11-01** — the owner reported both services deployed, but the rerun could not start: production answers HTTP 401 `unauthorized` to the QA token in `./.env` (expired or revoked), so no authenticated call can be made. The deploy condition is met; the credential is the only blocker. **Unblock:** the owner mints a fresh short-lived read/write QA key (`bcio_…`) on the dedicated QA account, pinned to a synthetic ledger, and stores it as `QA_MCP_TOKEN` in the repo-root `./.env` (never on the board or in chat); a worker then reruns the production repro and records the observed revision. Who can clear it: the repository owner (credential), then a worker (rerun).

Earlier record: **Unblocked 2026-11-01** — the owner reported that ledger service is deployed with the latest `main` (carrying `9b1d03ae8`); revision not recorded. Only t008 remains: a worker reruns the production repro on a disposable QA ledger and records the observed revision and result. Earlier block, kept for history: **Blocked 2026-11-01** — t001 to t007 shipped (`9b1d03ae8`). Only t008 remains, a production check: after the next ledger-service deploy, a failing balance assertion on a disposable QA ledger must read its difference through `SELECT account, discrepancy FROM balances` on REST, GraphQL and MCP. Not exercised against production.

