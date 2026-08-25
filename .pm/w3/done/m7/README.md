# w3 · m7 — Port the report and journal reads to REST and MCP

**Worker:** worker3 **Goal:** The sixteen reads that answer *what happened in this ledger* — overview, trial balance, journals, account reports, interval totals, entry context — are reachable from REST and MCP, ported as one family over one service call each. **Status:** done

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Decide the parameter and pagination shape for the family | 30m | — | — **DONE**
| t002 | `v1Route` declarations for the sixteen reads | 60m | t001 | — **DONE**
| t003 | The same sixteen as MCP resource templates | 60m | t001 | — **DONE**
| t004 | Lower both ratchet ceilings, and prove they hold | 20m | t002, t003 | — **DONE**
| t005 | Adoption surface | 20m | t004 | — **DONE**
| t006 | Simplify | 20m | t005 | — **DONE**
| t007 | Test coverage | 30m | t005 | — **DONE**
| t008 | Closeout | 20m | t007 | — **DONE**

## The ten

`listUserOwnedLedgers` · `searchLedgers` · `getLedgerOverview` · `getLedgerTrialBalance` · `getLedgerPayeeTransactions` · `getLedgerNarrationTransactions` · `getLedgerPayeeAccounts` · `getLedgerAccountLastEntries` · `getLedgerEntriesCountPerType` · `getLedgerAccountReport` · `getLedgerIntervalTotals` · `getLedgerEntryContext` · `getLedgerPlaintextJournal` · `getLedgerAccountJournal` · `getLedgerAccountDirectives` · `journalEntries`

## Amended during t001 — ten, not sixteen

Six of the sixteen carry reasons that are **still true**, checked one at a time rather than assumed:

| Verb | Reason | Verdict |
| --- | --- | --- |
| `journalEntries` | `legacy` — kept for older mobile builds, on the removal path | Stays. Porting extends its life |
| `listUserOwnedLedgers`, `searchLedgers` | `coveredByV1List` — `GET /v1/ledgers` returns every reachable ledger | Stays. Owner-filter and search are client-side work over a list you already hold |
| `getLedgerPlaintextJournal`, `getLedgerAccountJournal` | `coveredByV1Journal` | Stays. `/journal` takes the same account/filter/time narrowing **and** pages with `limit`/`offset` |
| `getLedgerOverview` | `dashboardShaped` | Stays. Eleven parallel chart series and hierarchy trees assembled for one page — this is what the category was written for |

That last one is the useful contrast with m6: there, `dashboardShaped` was pasted onto a `string[]` of payees and was false. Here it is exact. **The category was never the problem; applying it without re-reading the row was.**

The other ten are ported.

## Definition of done

Each of the ten answers under `/api-gateway/v1/…` and resolves as an MCP resource template, both through the same service call; every one that can return an unbounded result set has a stated and tested bound; `docs/openapi/v1.json` regenerated with the completeness test green; both ratchet ceilings drop by ten (see the amendment above) and CI proves the new numbers are tight; a REST read and a resource read against a revoked grant are both refused; `yarn test`, `yarn lint`, `yarn typecheck` pass.

## Why this family is harder than m6's, and what that buys

m6's eleven were uniform list-shaped reads with no arguments. These are not: most take a date range, an account, an interval, or a filter, and several — `journalEntries`, `getLedgerPlaintextJournal`, `getLedgerAccountJournal` — can return a whole ledger's history. **t001 exists because getting the parameter and bounding shape right once, for the family, is the difference between sixteen consistent endpoints and sixteen improvised ones.**

Two of these also overlap what `runBqlQuery` can already express, which is what the old `coveredByBql` exemption argued. That argument was about not adding sixteen *tools*; as resource templates addressable by URI they cost no tool slots, and a caller who wants a trial balance should not have to write BQL to get one.

## Closeout notes (2026-08-25)

**Ported: 10 of 16.** REST 34 → 44 (gap 70 → 60); MCP 19 → 29 (gap 81 → 71). Six keep reasons that survived re-reading — see the amendment above.

**t001's bounding question answered itself.** The three reads that could return a ledger's whole history are exactly the three already covered by the paged `/journal` endpoint, so they stay deferred against it rather than being ported and bounded a second way. Nothing else in the family is unbounded.

**A tooling limit, not a decision: optional filters are REST-only.** The MCP SDK's `UriTemplate.match` implements no RFC 6570 form-style expansion — a `{?account,filter}` template matches nothing, and a bare template stops matching once a caller appends `?`. Required parameters ride the path instead. Recorded in ADR 0008 D5a and in `mcp-resources.ts`, because someone will otherwise rediscover it.

**One bug found by the simplify pass.** `getIntervalTotals` and `getAccountReport` defaulted `accountName` *before* spreading `...query`, so a caller omitting it sent `undefined` to a service expecting a string. `JSON.stringify` hides that difference; the regression test asserts the argument the service actually received, and was confirmed to fail against the old order.

**Cost per verb: higher than m6, as predicted.** m6's ten were one uniform array; these ten have per-read query schemas and three different services behind them. The `ANALYSIS_READS` list still gave both surfaces one source, which is the property that made the port safe rather than fast.

## Source + Goal linkage

- **Source:** `backend-cluster/backend-v2/docs/ADR0008-surface-parity.md` D4/D5 — the second porting family, after m6 proves the pattern on the easy one.
- **Goal linkage:** **A1 — agent-native accounting.** These are what an agent reads to answer a question about a ledger rather than to change it, and today it must reconstruct each one in BQL. Secondary **A3** — a v1 REST surface that can produce a trial balance is one an integrator can build a product on.
- **Expected outcome:** Sixteen more verbs off both ceilings — 20% of the REST gap and 17% of the MCP gap. An agent answers "how did I do last quarter" with a read instead of a query it has to compose correctly.
- **Why now:** m6 proves porting-by-family on a family with no design questions. This one has exactly one (t001), and it is better answered while the pattern is fresh than after four more families have each improvised their own.
- **Adoption surface task included:** both surfaces gain endpoints a person and an agent call directly.

## Dependencies

t003 needs m5/t004's resource layer. t002 needs nothing. Sequenced after m6 by preference, not necessity — if m6 surfaces a problem with the pattern, fix it there before doing it sixteen more times.
