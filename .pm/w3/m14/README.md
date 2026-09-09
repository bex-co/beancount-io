# w3 · m14 — Make Statistics postings counts honor the active filters

**Worker:** worker3 **Goal:** the Statistics postings table describes the selected report stream, with the same filtered count read available to API consumers **Status:** todo

## Tasks (in order)

| id   | title                                                             | est | depends_on |
| ---- | ----------------------------------------------------------------- | --- | ---------- |
| t001 | Compute filtered postings counts in the ledger statistics service | 45m | —          |
| t002 | Publish the filtered count IDL contract and regenerate its client | 30m | t001       |
| t003 | Expose the count read through GraphQL, REST and MCP               | 45m | t002       |
| t004 | Connect Statistics to the filtered count read                     | 35m | t003       |
| t005 | Adoption surface — document and verify the selected-report counts | 20m | t004       |
| t006 | Simplify the statistics changes                                   | 20m | t005       |
| t007 | Test coverage — filtering, adapters and browser transitions       | 50m | t005, t006 |
| t008 | Closeout — verify the live journey and archive the milestone      | 15m | t007       |

Implementation is 155 minutes across four owning-package tasks, exceeding the
one-hour milestone threshold before closing work.

## Reproduced finding

**Severity:** major — a filtered Statistics page presents unrelated lifetime
postings counts. Production https://beancount.io, 2026-09-08, Chrome 152,
English/light, authenticated QA account, synthetic public
`open_ledger/crypto-example`. Source `a315c273`; deployed SHA unverified.

1. Open `/ledger/open_ledger/crypto-example/statistics` at 1440×1000.
2. In the header Account filter, select `Liabilities:Crypto:Binance:Margin`;
   leave Time and expression filters empty.
3. Entries Count by Type correctly changes to total 3: one Open and two
   Transactions. Postings per Account still shows **41 Accounts**, including
   unrelated `Assets:Bank:Checking: 23`, `Income:Crypto:Staking: 13`, and
   lifetime Binance BTC/USD counts of 2/12.
4. Reload the generated URL
   `/ledger/open_ledger/crypto-example/statistics?account=Liabilities%253ACrypto%253ABinance%253AMargin`.
   The Account input retains the intended account but all 41 rows remain.
5. Fresh-load that same URL at 390×844: 41 postings rows alongside total 3
   filtered entries. This repeats with the saved filter; the narrow header
   itself hides the filter controls.
6. Independently select Time **2025** with no Account filter. The entry-type
   total changes from 232 to 90, while all 41 lifetime postings counts remain.
   A fresh `?time=2025` load repeats this mismatch.

Actual fresh-page `QueryShell` request, HTTP 200:

```json
{
  "ledgerId": "open_ledger/crypto-example",
  "query": "SELECT account, count(account) ORDER BY account"
}
```

It returns the same 41 account/count rows as the unfiltered page. No filter
arguments or predicates are sent. The sibling `GetLedgerEntriesCountPerType`
request sends the selected account/time and returns HTTP 200 with the totals
above. No console errors.

Independent account control: `GetLedgerJournal` with the exact Margin Account
filter, no time/expression filter, Transaction type, limit 60, offset 0 returns
HTTP 200, total 2. Counting the four returned postings produces exactly:

| account                           | count |
| --------------------------------- | ----- |
| Assets:Crypto:Binance:BTC         | 1     |
| Assets:Crypto:Binance:USD         | 1     |
| Liabilities:Crypto:Binance:Margin | 2     |

These are the expected postings-table rows for that selection: the Account
filter selects matching transactions and retains their counterpart postings.
The table must not retain unrelated accounts or the counterpart accounts'
whole-ledger counts.

## Root cause and fix direction

- Dashboard `src/features/ledger-data/statistics/postings-per-account.tsx:206–217`
  runs a constant whole-ledger BQL query and never reads ledger search params.
  Its one production caller is `statistics/index.tsx:35`.
- The sibling components consume `useLedgerSearchParams`:
  `entries-count-by-type.tsx:173–184` and
  `account-last-entries.tsx:207–218`.
- The query-shell contract accepts only ledger/query. Ledger
  `src/features/ledger/service/ledger-shell-service.ts:94–104` loads the full
  file map and executes that exact BQL; the returned 41 rows are correct for
  the request. Adding UI state alone cannot filter this result.
- Add a dedicated **postings-per-account analysis read**, using the ledger's
  existing `accountEntryCounts` helper in
  `src/features/ledger/utils/account-entries.ts:130–142`. Apply the canonical
  Statistics report filtering first, then count postings, sort by account,
  and omit zero-count accounts. Reuse
  `LedgerDataService.clampReportDirectives`, as
  `getEntriesCountPerType` at 450–470 does.
- Time statistics intentionally count the Fava-compatible **clamped report
  stream**, including generated opening/transfer transactions. Preserve that
  contract, fiscal-year handling and filter errors. Do not silently replace it
  with raw date truncation or call the 2025 total of 90 itself a defect.
  Account Last Entries intentionally keeps full-ledger last dates and account
  enumeration while filtering balances; that separate documented contract
  also remains unchanged.
- Carry optional `account`, `filter`, `time` through the ledger HTTP/IDL
  contract, gateway service and all three public adapters. The planned result
  is an account-sorted array of `{account: string, count: number}`.
  Use GraphQL `getLedgerPostingsPerAccount`, REST
  `GET /api-gateway/v1/ledgers/{owner}/{name}/postings-per-account`, and the
  `ledgerPostingsPerAccount` MCP resource through `ANALYSIS_READS`.
  These are proposed adapters, not capabilities claimed as already deployed.
- Replace this table's constant BQL with that read. Generic BQL execution and
  its existing callers keep their contract. Do not fetch only one journal page
  and call its local counts complete, or translate arbitrary filter expressions
  into handwritten approximate BQL.

## Definition of done

- [ ] Selecting the reproduced Margin account shows exactly the three count
      rows above; clearing it restores the baseline 41 rows.
- [ ] Time changes use the same selected/clamped report stream as Statistics
      entry-type counts, including fiscal boundaries and documented generated
      entries. Combined account/expression/time filters compose.
- [ ] Fresh reload and the observed narrow saved-filter route keep the same
      results. Ledger/filter changes do not label old counts as current.
- [ ] Loading, zero matches, malformed filters, denied reads and source failures
      have distinct usable states; a failed read is not presented as zero.
- [ ] GraphQL, HTTP REST and an MCP client exercise equivalent inputs/defaults,
      values, ordering and relevant authorization/validation failures through
      real adapters and the shared domain implementation.
- [ ] The protected service uses the canonical ledger-report read action;
      registration/discovery, generated clients, OpenAPI and the zero-gap
      parity gate are current. No eligibility or credential policy is weakened.
- [ ] Owning-package checks and standing closing tasks pass before archival.

## Source + Goal linkage

- **Source:** ongoing `qa-find-bugs-dashboard w3` sweep, 2026-09-08.
  Local sanitized evidence:
  `dashboard/tmp/qa-20260907-w3-loop/statistics-filter-evidence.json`,
  `statistics-time-mismatch.png`, `statistics-account-mismatch-1440.png`
  and `statistics-account-mismatch-390.png`. Text evidence is included above
  so the public board does not depend on ignored screenshots.
- **Goal linkage:** **A2 — Frictionless onboarding**: readers can use the
  example's report filters without interpreting unrelated lifetime activity.
  **A1 — Agent-native accounting**: agents can request the same counts through
  the documented analysis read.
- **Expected outcome:** humans and agents obtain reproducible per-account
  counts for a selected report, including counterpart postings.
- **Why now:** the header currently changes only two of the three Statistics
  panels. The missing filtered read needs a shared implementation before UI
  wiring, under the repository's required REST/GraphQL/MCP parity workflow.
- **Adoption surface:** included because this changes a visible report and adds
  a public read contract. Check relevant docs/guidance without unrelated rewrites.

## Dedupe, blast radius and limits

Searched all open/completed board records for postings-per-account, statistics
filters and filtered counts; scanned every open milestone. No overlap found.
Completed `w3/done/m7` and `w1/done/m10` expose existing analysis contracts;
neither supplies this missing filtered count read. `w3/m13` concerns account
journal directive selectors, a separate cause. Targeted source history and
`git log -S 'SELECT account, count(account) ORDER BY account'` trace the
unfiltered query to `af5339de`; no newer fix exists on current main.

One Statistics route and one postings component caller were found. Baseline,
Account, Time, fresh reload and a narrow saved-filter route were exercised.
Advanced-expression combinations, live MCP, API denial/outage and a patched
implementation remain unverified. No production mutation, query-history write,
commit or push was performed by this QA agent for this finding.
