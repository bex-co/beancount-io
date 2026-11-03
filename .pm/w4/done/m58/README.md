# w4 · m58 — Report each holding's cost currency on the balance reads

**Worker:** worker1 **Goal:** the time-scoped balance reads tell a client, per account, how many units of each commodity are held at a cost in which cost currency and how many are held without a cost, so valuation disclosures stop guessing **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Ledger: `units_by_cost` conversion on the lot-inventory balance reads — **DONE** | 50m | — |
| t002 | backend-v2: carry `units_by_cost` through REST, GraphQL and MCP summaries and docs, with a parity contract test — **DONE** | 50m | t001 |
| t003 | Adoption surface — **DONE** | 20m | t002 |
| t004 | Simplify — **DONE** | 20m | t003 |
| t005 | Test coverage — **DONE** | 30m | t003 |
| t006 | Closeout — **DONE** | 15m | t004, t005 |

## Unblocked

**Unblocked 2026-11-02 via `/unblock w4`** — after the owner's deploy, a signed-out GraphQL `getLedgerTrialBalance` read of the public example ledger answers again and serves the keyword: `conversion=units_by_cost` returns Assets children keyed `"USD {}"`, `"GLD {USD}"`, `"VACHR {}"`, `"RGAGX {USD}"`, … while the `units` control returns the same quantities under bare `"USD"`, `"GLD"`, …. Deployed revisions not recorded; REST, MCP and the backend-v2 summary handling (`e698f49e2`) were not observed. History: blocked 2026-11-01 by `/loopx w4` after all repository work shipped (t001 ledger `123d817e2`, t002 backend-v2 `e698f49e2`, t003 adoption surfaces, t004 `d5d12ea9a`, t005 `f4d2a1c04`; gates passed), because the deployed read was unobservable — a 2026-11-01 probe got `SERVICE_UNAVAILABLE` for every conversion. **Next (t006):** read `units_by_cost` on a synthetic ledger with the m58 fixtures through GraphQL, REST and MCP, confirm the keyed maps and summaries, `/pm unblock` 1031, w21/554 and w21/556 once their fixtures hold, then close. If REST or MCP still shows the pre-`e698f49e2` behavior, re-block on the backend-v2 deploy.

## Closeout

**Done 2026-11-02** (`/loopx w4`): the deployed reads were checked on a disposable QA ledger holding every fixture below plus a mixed-cost control. All five balance reads serve `conversion=units_by_cost` with identical keyed maps on REST, GraphQL and MCP, scoped by `time`. `units` and `at_cost` are unchanged, and the summaries read the keyword as a strategy. The evidence is in [t006](./done/t006.md). 1031, w21/554 and w21/556 were unblocked for their consumer changes in the same ship.

## Definition of done

- `conversion=units_by_cost` on the balance-sheet, income-statement, trial-balance, interval-totals and account-report reads returns, for every account balance, units keyed `<commodity> {<cost currency>}` for lots held at a cost and `<commodity> {}` for lots held without one, time-scoped and filtered like the other conversions; existing conversions are unchanged.
- For the fixtures in [1031](../../blocked/1031.md) (EUR cost; EUR quotes or USD-only quotes), [w21/554](../../../w21/554.md) (1 BTC {USD} + 40 ETH {BTC}; 10 VEUR {EUR} − 400 EUR) and [w21/556](../../../w21/556.md) (500 EUR cash + 10 VTI {EUR}), the result names each holding's cost currency and cost-less remainder with no heuristic: e.g. `{"VTI {EUR}": "10", "EUR {}": "500"}`.
- REST, GraphQL and MCP return the same result for the same input (contract test), summaries treat the keyword as a strategy, not a missing-price currency, and the parity gates stay at zero.
- The ledger and backend-v2 deployment serving the keyword is observed, after which 1031, w21/554 and w21/556 are unblocked for their consumer changes.

## Source + Goal linkage

- **Source:** promoted from inbox note w4/1119 (owner decision 2026-10-31 via `/unblock w4`: provide the facts on the balance reads, not through a client BQL read). Shape chosen during triage 2026-11-01: every balance read already takes a free-form `conversion` that the ledger service resolves and passes through all three surfaces unchanged, and the lot inventory already keys lots by `(commodity, cost currency)`, so a new conversion keyword exposes the facts without a new field or schema change on any surface. `getLedgerHoldings` already groups by cost currency but quotes at `today()` and takes no `time`, so it cannot serve the historical disclosures.
- **Goal linkage:** **A2 — Frictionless onboarding** and **A1 — Agent-native accounting**: newcomers holding foreign-cost or crypto positions see truthful valuation disclosures in the dashboard and mobile app, and agents reading balances over MCP can tell cash from cost-basis holdings.
- **Expected outcome:** the three blocked consumer notes become implementable exactly, without heuristics; the same facts are available to any REST/GraphQL/MCP client.
- **Why now:** it is the shared dependency of three blocked notes across two queues and the owner has chosen the approach.
- **Adoption surface:** included — the keyword is a public API input documented for REST, GraphQL and MCP clients.
