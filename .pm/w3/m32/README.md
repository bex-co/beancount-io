# w3 · m32 — Expose statement hierarchy tables to assistive technology

**Worker:** worker3 **Goal:** readers can identify each statement table and its account/amount relationships while retaining the existing disclosure and navigation controls **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Expose hierarchy rows and amounts as a native table | 50m | — |
| t002 | Label report tables and preserve responsive integration | 35m | t001 |
| t003 | Verify the accessible statement journey | 20m | t001, t002 |
| t004 | Simplify the hierarchy table implementation | 15m | t003 |
| t005 | Test rendered table structure and report regressions | 40m | t003, t004 |
| t006 | Close out hierarchy table accessibility | 15m | t005 |

175 minutes total:85 minutes implementation plus adoption, simplification, meaningful regression coverage and closeout. Severity **minor**, owning package **dashboard**; A2 accessible financial review.

## Definition of done

- [ ] Each shared hierarchy renders a named table with Account, primary-currency and Other column headers; account row headers and amount cells have real row relationships.
- [ ] Tree and summary rows preserve their values, signs, units, indentation, ordering, zero/closed-account options and financial semantics.
- [ ] Named disclosure buttons still expose expanded state and work with Space/Enter; collapsed descendants leave the accessibility tree and reappear with correct row/cell structure.
- [ ] Account links still navigate correctly. Existing tables share one aligned horizontal scroll area at390px without page overflow.
- [ ] Balance Sheet, Income Statement, Cash Flow and direct Trial Balance integration work at desktop/narrow widths, including distinct table names on multi-card pages.
- [ ] Meaningful rendered/browser regressions and dashboard format/lint/test/build pass. No new dependencies, production writes or unrelated table refactors.

## Reproduction and controls

Production https://beancount.io, 2026-09-11, authenticated reader of public synthetic open_ledger/freelancer-invoicing, English/light, isolated headless Chrome152. Fresh1440×1000 and390×1000 open /ledger/open_ledger/freelancer-invoicing/trial-balance?lang=en and wait for Business to render.

The visible financial table shows Account / USD / Other and the account amounts. Chrome's accessibility tree inside .hierarchy-scroll exposes **zero tables, treegrids, rows or column headers**. It instead lists text Account USD Other, links such as Equity/Opening/Income/Consulting and separate text amounts. The values exist, but table navigation and row/column relationships are not exposed. Both fresh widths agree.

Working disclosure control: focus Toggle children of Assets:Bank and pressSpace. aria-expanded becomesfalse and Business disappears; Enter returns expandedtrue and Business. Thus the repaired026 disclosure behavior works and is not this defect.

A temporary **DOM-only diagnostic**, in a separate owned context, adds coherent table/rowgroup/row/header/cell roles to the existing nodes without altering text or data. Chrome then exposes1 named table,3column headers,24rows (header+23data),23rowheaders and46amount cells. This proves the semantic cause; the attributes are not a product patch and no persistence across rerender is claimed. The context is closed.

Independent working UI control: the same ledger's Accounts page exposes1 native table,7headers and16rows. Cash Flow's4 .hierarchy-scroll regions also expose0tables. The exploratory cash-status table expectation was wrong (no native table there); it is not used as a positive control or separately filed in this milestone.

Real Trial Balance GraphQL/REST projections already agree in trial-selection-api.json: Assets30950USD, Income-29492.4, Expenses15042.4, Equity-16500, including selected complete child projections. No missing-data or arithmetic failure is claimed. Existing trial-scroll-control.json and viewed screenshot establish working374px/640px horizontal scroll to266px with documentwidth390.

## Source and repair boundary

features/reports/balance-sheet/hierarchy-list.tsx defines a CSS grid ROW_CLASS at39–40; tree rows at184–191, AmountColumns at127–154, summary rows and the header at427–447 are DIV structures without table semantics. Recursive wrapper DIVs flatten to generic accessibility content. Keep one shared structure for rows and amounts; use native table semantics and existing controls rather than replacing this with an interactive treegrid.

HierarchyList has two production call sites: HierarchyListCard at63 and TrialBalanceContent at287. The card serves Balance Sheet, Income Statement and Cash Flow. Card title markup at54–57 and Trial Balance's existing overview heading can name their tables; preserve stable names and valid DOM relationships without duplicating report logic. Other custom lists/charts, BQL virtualization and Accounts/holdings/document tables are out of scope.

## Dedupe and limits

Searched all open/done board and historical hierarchy/table/semantic/accessibility changes. Read026's full removed record from368d4925: it owns expander name/state, which passes here. Completedm25 fixes role=link on native Accounts/holdings/documents rows; completedm28 fixes BQL's virtual table. Neither owns this shared DIV hierarchy structure. The original structure dates toaf5339de;368d4925 repaired buttons only. Local/fetched origin mainf1965988 has no newer structure fix; full deployed SHA unverified.

Evidence under dashboard/tmp/qa-20260911-w3-loop/: report-table-semantics-{1440,390}.json, report-table-diagnostic.json, report-table-working-control.json, report-table-native-control.json (Cash Flow negative survey despite its exploratory filename), trial-selection-api.json, trial-scroll-control.json and trial-scroll-390.png. The earlier Trial Balance desktop screenshots show the visible account/amount columns; no visual-layout defect is alleged. All diagnostic/repeat contexts closed. No product edits, production writes or shipping. Actual screen-reader speech/commands, other engines and patched behavior remain unverified.
