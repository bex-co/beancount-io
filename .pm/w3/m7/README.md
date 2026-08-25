# w3 · m7 — Port the report and journal reads to REST and MCP

**Worker:** worker3 **Goal:** The sixteen reads that answer *what happened in this ledger* — overview, trial balance, journals, account reports, interval totals, entry context — are reachable from REST and MCP, ported as one family over one service call each. **Status:** todo

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Decide the parameter and pagination shape for the family | 30m | — |
| t002 | `v1Route` declarations for the sixteen reads | 60m | t001 |
| t003 | The same sixteen as MCP resource templates | 60m | t001 |
| t004 | Lower both ratchet ceilings, and prove they hold | 20m | t002, t003 |
| t005 | Adoption surface | 20m | t004 |
| t006 | Simplify | 20m | t005 |
| t007 | Test coverage | 30m | t005 |
| t008 | Closeout | 20m | t007 |

## The sixteen

`listUserOwnedLedgers` · `searchLedgers` · `getLedgerOverview` · `getLedgerTrialBalance` · `getLedgerPayeeTransactions` · `getLedgerNarrationTransactions` · `getLedgerPayeeAccounts` · `getLedgerAccountLastEntries` · `getLedgerEntriesCountPerType` · `getLedgerAccountReport` · `getLedgerIntervalTotals` · `getLedgerEntryContext` · `getLedgerPlaintextJournal` · `getLedgerAccountJournal` · `getLedgerAccountDirectives` · `journalEntries`

## Definition of done

Each of the sixteen answers under `/api-gateway/v1/…` and resolves as an MCP resource template, both through the same service call; every one that can return an unbounded result set has a stated and tested bound; `docs/openapi/v1.json` regenerated with the completeness test green; both ratchet ceilings drop by sixteen and CI proves the new numbers are tight; a REST read and a resource read against a revoked grant are both refused; `yarn test`, `yarn lint`, `yarn typecheck` pass.

## Why this family is harder than m6's, and what that buys

m6's eleven were uniform list-shaped reads with no arguments. These are not: most take a date range, an account, an interval, or a filter, and several — `journalEntries`, `getLedgerPlaintextJournal`, `getLedgerAccountJournal` — can return a whole ledger's history. **t001 exists because getting the parameter and bounding shape right once, for the family, is the difference between sixteen consistent endpoints and sixteen improvised ones.**

Two of these also overlap what `runBqlQuery` can already express, which is what the old `coveredByBql` exemption argued. That argument was about not adding sixteen *tools*; as resource templates addressable by URI they cost no tool slots, and a caller who wants a trial balance should not have to write BQL to get one.

## Source + Goal linkage

- **Source:** `backend-cluster/backend-v2/docs/ADR0008-surface-parity.md` D4/D5 — the second porting family, after m6 proves the pattern on the easy one.
- **Goal linkage:** **A1 — agent-native accounting.** These are what an agent reads to answer a question about a ledger rather than to change it, and today it must reconstruct each one in BQL. Secondary **A3** — a v1 REST surface that can produce a trial balance is one an integrator can build a product on.
- **Expected outcome:** Sixteen more verbs off both ceilings — 20% of the REST gap and 17% of the MCP gap. An agent answers "how did I do last quarter" with a read instead of a query it has to compose correctly.
- **Why now:** m6 proves porting-by-family on a family with no design questions. This one has exactly one (t001), and it is better answered while the pattern is fresh than after four more families have each improvised their own.
- **Adoption surface task included:** both surfaces gain endpoints a person and an agent call directly.

## Dependencies

t003 needs m5/t004's resource layer. t002 needs nothing. Sequenced after m6 by preference, not necessity — if m6 surfaces a problem with the pattern, fix it there before doing it sixteen more times.
