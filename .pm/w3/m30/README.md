# w3 · m30 — Apply shared account filters to account-journal reads

**Worker:** worker3 **Goal:** the account journal describes the same selected report stream as its chart and incoming drill-down **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Apply a distinct report-account restriction before account-journal balances | 40m | — |
| t002 | Publish the separate account-journal filter in the ledger IDL | 25m | t001 |
| t003 | Expose the restriction through gateway GraphQL, REST and MCP | 40m | t002 |
| t004 | Bind the account page journal to the shared Account filter | 35m | t003 |
| t005 | Adoption surface — document target and report-account meanings | 20m | t004 |
| t006 | Simplify the account-filter changes | 20m | t005 |
| t007 | Test coverage — filtered account streams, adapters and browser transitions | 45m | t005, t006 |
| t008 | Closeout — verify the filtered journey and archive the milestone | 15m | t007 |

Implementation spans 140 minutes across ledger, IDL, gateway and dashboard;
total with closing work is 240 minutes. This is larger than an inbox fix.

## Reproduced finding

Severity: **major**. Production https://beancount.io, September 11, 2026,
QA-owned headless Chrome 152.0.7977.83, English/light, 1440×1000 and 390×844.
Dedicated QA GROWTH account; public synthetic `open_ledger/crypto-example`,
pull:true, push/admin:false. Local and fetched main f1965988; this run started
at f943005d. Implicated dashboard/gateway files are unchanged between them;
the ledger journal's only intervening edit changes let to const. Entry module
main-z45iacYQ.js; deployed SHA is unverified.

1. Open `/ledger/open_ledger/crypto-example/statistics?lang=en` and select
   Account **Liabilities:Crypto:Binance:Margin**, with Time/expression empty.
2. Postings per Account correctly shows BTC **1**, Binance USD **1**, and
   Margin **2**. Reload preserves these counts. Click its **Assets:Crypto:Binance:BTC** link.
3. The destination retains the Margin filter:
   `/ledger/open_ledger/crypto-example/account/Assets%3ACrypto%3ABinance%3ABTC?account=Liabilities%3ACrypto%3ABinance%3AMargin`.
   Account Journal nevertheless shows **two** transactions: June 1's opening
   margin purchase and September 15's **Close margin long: sell 0.05 BTC at $63,000**.
4. Expand Postings. The sale has only BTC, Binance USD and Income:Crypto:Trading:Margin
   postings. It does **not** reference Liabilities:Crypto:Binance:Margin.
   Only the purchase references both the selected account and the BTC account.
5. Fresh direct desktop and narrow loads repeat. The desktop Account input
   retains Margin; the narrow toolbar reports **Filters 1**. The same two journal
   rows appear, with no scope warning. Back returns to the correct three Statistics rows.
6. Clear the shared Account filter on desktop. Both BTC transactions now belong
   in the journal, which remains unchanged. The account-report read correctly
   changes from a sole June 1 balance of **2850 USD** to June 1 **2850 USD** and
   September 15 **0 USD**. Thus the report request honors the filter while the
   journal request does not.

Expected: with the Margin filter active, this BTC account journal contains only
the June 1 purchase, total 1, with its filtered 2850 USD balance. Clearing the
filter restores both transactions and the closing zero. The ledger's actual
unfiltered balance is zero; the filtered report deliberately represents a
selected stream and must not silently mix in excluded entries.

## API evidence and cause

Both fresh runs send GetLedgerAccountReport with accountName=BTC and
account=Margin. Its linechartData contains only June 1, balance.USD="2850";
accountBalanceData retains that value through September. In the same page,
GetLedgerAccountJournal sends query.account=BTC, conversion="at_cost",
filter="", time="", with_children=true, limit=20, offset=0,
directiveTypes=["Transaction"]. There is no separate Margin predicate. HTTP200
returns total=2, hashes `4ea651d5fc4b2b81b9f9a288e6468a38` (sale) and
`562f1499421286af30c28a28fc637023` (purchase).

REST account-journal with those same inputs also returns those two rows.
REST main journal with account=Margin returns purchase plus **Repay margin loan**
(`2a43e261c7fea02aabb17f418aec43df`), not the BTC sale. Intersecting the actual
transaction identities leaves exactly the purchase. Statistics' matching BTC
count is 1. The public archive's transactions/trading.bean confirms the distinct
sale and repayment postings. No API response was replaced.

`dashboard/src/features/reports/account/index.tsx:112–138` supplies the route's
accountName as the journal target and omits ledgerFilters.account. Its chart
query at327–337 correctly supplies both identities. The journal filter/paging
key at146–160 also omits the shared account restriction.

Gateway AccountJournalQueryInput (`ledger-journal-resolver.query.ts:127–160`)
and AccountJournalQueryParams (`ledger-journal-service.ts:75–88`) have only one
account field, meaning the target. The adapter at242–270 and REST/MCP
JOURNAL_READS account-journal descriptor preserve that existing shape.
Ledger `src/api/journal.ts:70–103` and its getAccountJournal at673–738 do the
same. `clampForAccountJournal` at489–525 applies advanced expression/time only;
accountJournalItems subsequently selects the target account and calculates balances.
The current responses are correct for the incomplete requests.

## Repair contract

Keep the existing account parameter as the target; add a separate optional
**filter_account** restriction through the ledger input, IDL/generated client,
gateway service, GraphQL, REST and MCP descriptor, then bind the dashboard's
shared Account filter. Omitted/empty restriction preserves current behavior.
This is a proposed new optional input, not an already deployed capability.

Apply the canonical AccountFilter to the report stream before advanced filtering,
time clamping and target-account running-balance calculation. Keep target
with_children handling and the existing display selectors in their current
roles: type/status filtering happens after running balances, before counts/pages.
Do not overload the target field, filter only the downloaded page, or approximate
the account predicate with a handwritten advanced-expression string. The canonical
filter includes component/regex matching and nontransaction account references.
Preserve authorization, fiscal clamping, source hashes and conversion using the
full price map. No new dependency or engine fork is needed.

## Definition of done

- [ ] The actual Statistics → BTC journey and fresh desktop/narrow destination
      show only the June 1 purchase under Margin, total 1, balance 2850 USD.
- [ ] Clearing Account restores both BTC rows and closing zero; Back/reload
      preserves the selected scope and Statistics continues to show 1/1/2.
- [ ] Filter changes reset journal pagination and hide stale settled results
      while pending. Combined time/expression/type/flag inputs retain their
      documented ordering and running-balance semantics.
- [ ] GraphQL, REST and MCP exercise the optional restriction through real
      adapters/shared service, including omitted defaults, matching/empty
      results, validation and authorization. Generated schemas, resource
      descriptions, OpenAPI snapshot and parity gates are current.
- [ ] Meaningful service/adapter/browser coverage and owning-package checks
      pass; complete the closing tasks before archival.

## Dedupe, scope and limits

Searched open/completed board files, full m13/m14/m15 records and targeted
history. m13 fixes account-journal **type/flag** selectors; m14 supplies the
working Statistics count read; m15 preserves filters in navigation and explicitly
does not add missing API support. This URL is retained correctly. Former023
documents the deliberately narrower plaintext export and does not own account
journal filtering. No overlapping open implementation or newer fix was found.
The dashboard omission dates to af5339de.

One AccountJournalTable production caller exists in AccountPage, reached via
the account-detail route and incoming report/posting/account links. Generic
main Journal and Statistics already handle their own account predicate. The
new optional input must preserve existing CLI/mobile/API callers that omit it;
their consumers are compatibility coverage, not newly reproduced failures.

No page/console errors; relevant reads200. All fresh repeat contexts closed.
No production writes, clipboard, fixes or shipping. Other browsers/locales,
denied/expired/offline states, multi-page combined filters and the new input
itself remain unverified. Live MCP was not exercised during discovery.

Verified ignored evidence under dashboard/tmp/qa-20260911-w3-loop/:
statistics-margin-control.json; statistics-drilldown.json;
account-global-filter-repeat.json and account-global-filter-{1440,390}.png;
account-global-filter-api-controls.json; account-global-filter-clear-control.json
and account-global-filter-cleared-1440.png; crypto-example-main.zip.
Screenshots are1440×1000/390×844; desktop filtered view was visually inspected.
Public text above supplies exact values independently of ignored artifacts.

## Source + Goal linkage

- **Source:** continuous qa-find-bugs-dashboard for w3, September 11, 2026.
- **Goal linkage:** **A2 — Frictionless onboarding** and **A1 — Agent-native accounting**:
  humans and API clients can inspect the same selected account activity.
- **Expected outcome:** a filtered report drill-down has reproducible rows,
  totals and balances, rather than a correctly filtered chart beside a broader journal.
- **Why now:** the dashboard already exposes and retains this filter; the
  account-journal contract needs both account identities before the UI can honor it.
- **Adoption surface:** required because the fix changes a visible financial
  journey and extends public read inputs. Document their distinct meanings and
  preserve the shared Codex/Claude guidance without unrelated instruction edits.
