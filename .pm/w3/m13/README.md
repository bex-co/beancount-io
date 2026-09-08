# w3 · m13 — Make account journal filters affect the returned entries

**Worker:** worker3 **Goal:** account journal type and flag selections return matching entries, totals and pages without changing account running balances **Status:** todo

## Tasks (in order)

| id   | title                                                                      | est | depends_on |
| ---- | -------------------------------------------------------------------------- | --- | ---------- |
| t001 | Filter account journal rows before counting and paging                     | 45m | —          |
| t002 | Publish the account filter contract and regenerate the IDL client          | 30m | t001       |
| t003 | Carry account filters through gateway GraphQL, REST and MCP                | 45m | t002       |
| t004 | Connect the account page selectors to the filtered read                    | 40m | t003       |
| t005 | Adoption surface — verify account filtering is discoverable and documented | 20m | t004       |
| t006 | Simplify the account filter changes                                        | 20m | t005       |
| t007 | Test coverage — filter, balance and pagination behavior                    | 45m | t005, t006 |
| t008 | Closeout — verify the journeys and archive the milestone                   | 15m | t007       |

Implementation spans 160 minutes across service, contract and dashboard tasks;
this exceeds the one-hour milestone threshold without counting closing work.

## Reproduced finding

**Severity:** major. Production `https://beancount.io`, 2026-09-07, Chrome 152,
English/light, 1440×1000 and 390×844. Authenticated public-example reader,
`pull: true, push/admin: false`. Source and fetched main `57fc1c27`;
deployed SHA unverified.

1. Fresh-load
   `/ledger/open_ledger/example/account/Income%3AUS%3AHoogle%3ASalary`.
2. In Account Journal, leave Transaction selected and select
   **Pending transactions** (`!`).
3. The button becomes pressed, yet all 20 visible rows remain cleared (`*`),
   starting with the 2017-09-07 Hoogle Payroll entry.
4. Repeat from a fresh load, including 390×844: same 20 cleared rows, zero
   pending rows.
5. As a separate type control, fresh-load the account, select **Open**, then
   deselect **Transaction**. Open is the only selected type, yet the same
   20 transactions remain and no Open row appears.

Expected: matching entries and a matching total/page count; Pending is empty
for this fixture, and Open selects its account opening. Actual: type/subtype
state changes only the button presentation and pagination-reset bookkeeping.

The real account read returns HTTP 200, `total: 72`, 20 rows, all flagged
`*`. Request:
`GetLedgerAccountJournal(ledgerId: "open_ledger/example", query: {account:
"Income:US:Hoogle:Salary", conversion: "at_cost", filter: "", time: "",
with_children: true, limit: 20, offset: 0})`. No type/subtype inputs are sent.
The equivalent REST v1 `account-journal` read with the same account, limit,
offset, children and conversion also returns HTTP 200, total 72, 20 rows.
MCP is traced through the shared `JOURNAL_READS` descriptor, not exercised live.

Working controls: the main `/journal` page's Pending button sends
`directiveTypes: ["Transaction"], transactionSubtypes: ["pending"]` and
returns HTTP 200, total 0, empty data, and **No journal entries found for the
current filters**. Account **Postings** expands the actual posting rows;
mouse page 2 returns the next 20 entries. Thus the account table renders and
pages, but its advertised data selectors do not affect selection.

## Root cause and fix direction

- Dashboard `src/features/reports/account/index.tsx:78–88` stores selector
  state and passes it into `JournalFilters` at 229–242. The query at 113–123
  omits all four filter lists; 217–224 maps every response row unchanged.
  Main Journal at `src/features/journal/pages/journal-page.tsx:135–159`
  supplies those lists.
- Gateway `src/features/ledger/api/resolvers/ledger-journal-resolver.query.ts:127–151`
  and `service/ledger-journal-service.ts:71–80,260–275` have no such account
  inputs. REST `api/rest/v1/journal-reads.ts:63–71` lacks them too. The
  generated Fava client and IDL account-journal operation match that contract.
- Ledger `src/api/journal.ts:71–90` accepts only account/time/expression and
  paging/valuation inputs. `features/ledger/service/ledger-journal-service.ts:639–689`
  computes all account rows and immediately counts/pages them.
- Reuse the ledger's existing directive/subtype predicates. Add optional
  selector lists with the main journal's semantics. Compute account rows and
  running balances under existing account/time/expression rules first; apply
  the display selectors to those rows before total/offset/limit. Filtering
  before running-balance calculation would silently change the meaning of
  balances. Filtering only the downloaded page gives false empty pages/totals.
- Propagate the explicit contract through owned adapters and generated clients,
  then bind the UI. Keep omitted filters backward compatible. Do not
  synthesize unsupported directive-type expressions in the advanced-filter DSL.

## Definition of done

- [ ] The reproduced desktop/narrow Pending selection contains no cleared rows
      and shows an honest empty state for the public Salary fixture.
- [ ] Open-only selection shows account opening rows without payroll rows.
- [ ] Changing/clearing selectors resets paging coherently; returned totals and
      pages are based on the same selected row set.
- [ ] A selected row retains the same change/running balance it had without
      the display selectors; date clamping, conversion and children semantics
      continue to work.
- [ ] Loading does not label the previous unfiltered result as the new selected
      result; empty/error/denied states and retry remain usable.
- [ ] GraphQL, REST and MCP adapter checks cover the newly supported arguments,
      generated schemas are current, and owning-package checks pass.
- [ ] The standing closing tasks pass before moving this milestone to done.

## Source + Goal linkage

- **Source:** repeated `qa-find-bugs-dashboard w3` sweep, 2026-09-07;
  sanitized local evidence in
  `dashboard/tmp/qa-20260907-w3-loop/account-and-pagination-evidence.json`,
  `account-pending-ignored.png`, and `account-pending-narrow.png`.
- **Goal linkage:** **A2 — Frictionless onboarding**: newcomers can inspect a
  public account using the filters the dashboard offers. **A1 — Agent-native
  accounting**: the newly supported read arguments remain usable through the
  documented API surfaces.
- **Expected outcome:** a user or agent can retrieve pending or selected-type
  account entries without inspecting unrelated pages or misreading totals.
- **Why now:** current selected states falsely claim the cleared rows are a
  pending-only or opening-only result. A UI-only page filter would compound
  the defect through misleading counts and balances.
- **Adoption surface:** included because the dashboard and read contracts are
  user/agent-facing; package tables and guidance should be checked for drift,
  without inventing new skills or changing unrelated onboarding text.

## Dedupe, blast radius and limits

Searched all open and completed board files for account journal, type/flag
filters and paging; scanned every open milestone. Completed `w3/done/m7` and
`w1/done/m10/done/t013.md` cover existing account/time/expression and paging
contracts, not these missing account selector arguments. No open overlap or
newer repair on fetched main. Targeted selector history leads to `af5339de`;
no evidence establishes a historical regression.

One account-detail route and two shared JournalFilters callers were found.
Keep main Journal's working server filtering intact. Metadata/Postings are
presentation toggles and must remain independent of data selection.
Document/custom subtype fixtures, conversion/date-clamp combinations, expired
sessions, denied access, network failures and MCP execution were not exercised
live in this finding; regression checks must protect those adjacent states.
No production ledger writes, console errors, or product fixes occurred.
