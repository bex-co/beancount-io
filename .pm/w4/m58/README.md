# w4 · m58 — Report each holding's cost currency on the balance reads

**Worker:** worker1 **Goal:** the time-scoped balance reads tell a client, per account, how many units of each commodity are held at a cost in which cost currency and how many are held without a cost, so valuation disclosures stop guessing **Status:** todo (t001–t004 done)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Ledger: `units_by_cost` conversion on the lot-inventory balance reads — **DONE** | 50m | — |
| t002 | backend-v2: carry `units_by_cost` through REST, GraphQL and MCP summaries and docs, with a parity contract test — **DONE** | 50m | t001 |
| t003 | Adoption surface — **DONE** | 20m | t002 |
| t004 | Simplify — **DONE** | 20m | t003 |
| t005 | Test coverage | 30m | t003 |
| t006 | Closeout | 15m | t004, t005 |

## Definition of done

- `conversion=units_by_cost` on the balance-sheet, income-statement, trial-balance, interval-totals and account-report reads returns, for every account balance, units keyed `<commodity> {<cost currency>}` for lots held at a cost and `<commodity> {}` for lots held without one, time-scoped and filtered like the other conversions; existing conversions are unchanged.
- For the fixtures in [1031](../blocked/1031.md) (EUR cost; EUR quotes or USD-only quotes), [w21/554](../../w21/blocked/554.md) (1 BTC {USD} + 40 ETH {BTC}; 10 VEUR {EUR} − 400 EUR) and [w21/556](../../w21/blocked/556.md) (500 EUR cash + 10 VTI {EUR}), the result names each holding's cost currency and cost-less remainder with no heuristic: e.g. `{"VTI {EUR}": "10", "EUR {}": "500"}`.
- REST, GraphQL and MCP return the same result for the same input (contract test), summaries treat the keyword as a strategy, not a missing-price currency, and the parity gates stay at zero.
- The ledger and backend-v2 deployment serving the keyword is observed, after which 1031, w21/554 and w21/556 are unblocked for their consumer changes.

## Source + Goal linkage

- **Source:** promoted from inbox note w4/1119 (owner decision 2026-10-31 via `/unblock w4`: provide the facts on the balance reads, not through a client BQL read). Shape chosen during triage 2026-11-01: every balance read already takes a free-form `conversion` that the ledger service resolves and passes through all three surfaces unchanged, and the lot inventory already keys lots by `(commodity, cost currency)`, so a new conversion keyword exposes the facts without a new field or schema change on any surface. `getLedgerHoldings` already groups by cost currency but quotes at `today()` and takes no `time`, so it cannot serve the historical disclosures.
- **Goal linkage:** **A2 — Frictionless onboarding** and **A1 — Agent-native accounting**: newcomers holding foreign-cost or crypto positions see truthful valuation disclosures in the dashboard and mobile app, and agents reading balances over MCP can tell cash from cost-basis holdings.
- **Expected outcome:** the three blocked consumer notes become implementable exactly, without heuristics; the same facts are available to any REST/GraphQL/MCP client.
- **Why now:** it is the shared dependency of three blocked notes across two queues and the owner has chosen the approach.
- **Adoption surface:** included — the keyword is a public API input documented for REST, GraphQL and MCP clients.
