# w3/m35 — Keep report results and exports tied to their completed request

**Worker:** worker3 **Goal:** prevent pending report reads from mislabeling retained financial data or exporting it under an unfinished selection **Status:** todo

## Reproduced problem

Severity: **major** for mislabeled exports, with the earlier route-pending feedback issue retained from [129](../129.md). This is the sole implementation queue for the promoted finding; do not create a parallel repair for129.

Production https://beancount.io, 2026-09-11, isolated headless Chrome152, English/light, authenticated QA reader, public open_ledger/example. Fresh1440×1000 and390×1000. Local/fetched main f1965988; exact deployed SHA unverified. Reads are delayed only inside the owned browser; the server responses and ledger data are not fabricated.

1. Open /ledger/open_ledger/example/balance-sheet?lang=en&time=2016 with At Cost and wait for data.
2. Hold only GetLedgerBalanceSheet requests whose conversion is units. Select Units and wait1.2s while the request is held.
3. The Units control is selected, the old chart/result remains, no main aria-busy appears, and Export stays enabled. Download Spreadsheet CSV.
4. Both fresh viewport runs produce a filename ending in **units-2026-09-11.csv** and rows with **conversion=units**, but Assets still contains **USD80149.80683 / VACHR25**, the At Cost result. The print portal simultaneously says Conversion Units and has the same old data.
5. Release the unchanged real request. It returns200; the next CSV, with the same declared units basis, contains **USD6763.51, GLD17, ITOT95, VEA36, VHT39, VACHR25, RGAGX394.75, VBMPX136.632**. The selected basis was applied only after completion.

Independent REST Balance Sheet controls return exactly those respective At Cost/Units maps. Python csv.DictReader confirms both pending files declare Units but match the At Cost map, and both settled files exactly match Units. This is a data/metadata mismatch, not ordinary display rounding or a backend calculation failure. Screenshot inspection confirms the pending Units selector above the old chart. All held requests were released and contexts closed; no page errors or additional write attempts occurred.

The earlier129 route-loader case is a separate phase of the same pending-state work: January→February changes on Trial Balance, Balance Sheet, Income Statement, Cash Flow and Overview leave old results without feedback while a real read is held. In that route phase the tested CSV remains internally labeled January, unlike the newly confirmed Apollo conversion phase. Preserve this distinction; the old route evidence did not demonstrate mislabeled CSV.

## Cause and scope

Balance Sheet index.tsx:67 retains data or previousData, only replacing content with loading UI when no previous result exists. Its content receives the newly selected conversion at102. balance-sheet-content.tsx:125 builds the export document from that new conversion and old hierarchies. StatementExportMenu only knows action-busy/data-present state, not report-read readiness, and its print portal renders the resulting document. Income Statement/Cash Flow/Trial Balance have related retained-data paths; their local-conversion export mismatches are source-traced risks, not separately claimed live reproductions.

Keep each completed result paired with the conversion/interval/filter inputs that produced it. Show truthful pending state for router and Apollo phases, and guard export/print content until coherent. No API/schema or financial-sign change is indicated. Coordinate147 toolbar layout,148 narrow conversion visibility,133 error classification and134 Cash Flow error recovery without absorbing their separate fixes. Prior020 settled print-document repair remains working; the new failure occurs before replacement data completes.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Show pending feedback for report route reads | 35m | — |
| t002 | Keep report data paired with its completed input snapshot | 45m | t001 |
| t003 | Guard exports and print content while replacement data is pending | 35m | t002 |
| t004 | Adoption surface — explain usable pending report behavior | 15m | t003 |
| t005 | Simplify the pending-report changes | 20m | t004 |
| t006 | Test delayed reads, downloads and recovery | 45m | t004, t005 |
| t007 | Close out the pending-report milestone | 15m | t006 |

Implementation totals115minutes; all seven tasks total210minutes, so the expanded work exceeds the sub-hour inbox limit.

## Definition of done

- [ ] The original January→February route-delay journeys show a clear pending state and recover correctly after success/error.
- [ ] Retained At Cost data never acquires Units metadata, including visible reports, CSV, Markdown, filenames and printable statements.
- [ ] Pending export actions cannot produce a misleading document. Browser-print content outside the menu remains coherent too.
- [ ] After successful Units completion, actual CSV Assets rows match the eight-unit API map above at both widths.
- [ ] Cached results, rapid input changes and errors preserve request/result identity without stale completion overwrites or permanent busy state.
- [ ] Meaningful async/export tests and dashboard format/lint/test/build checks pass before closeout.

## Source + Goal linkage

- **Source:** promoted129 and repeated continuous dashboard QA for w3 on2026-09-11. Its completedm15 residual pending-state coverage remains part of this queue; no duplicate historical group is added for the promotion.
- **Goal linkage:** A2 — Frictionless onboarding, with A3 credibility: readers can trust the scope and basis printed on downloaded financial reports.
- **Expected outcome:** changing a report selection cannot produce a successful-looking export containing values from another calculation basis.
- **Why now:** the new controlled-delay reproduction turns an unannounced stale view into a confirmed mislabeled financial download. Resolving both async phases and guarding exports needs multiple tasks.
- **Adoption surface:** included because pending feedback and export availability are user-facing. No new package or skill is introduced.
- **Dedupe:** extends129; completedm15 owns its route-pending residual.020 concerns old settled print snapshots;133/134/147/148 have different causes. Source and export call sites were traced on fetched main before promotion.

Verified ignored evidence in dashboard/tmp/qa-20260911-w3-loop/: pending-conversion-{1440,390}.json/.png/.csv, settled-conversion-{1440,390}.csv, pending-conversion-rest.json, pending-conversion-csv-control.json, plus the earlier129 route-delay artifacts named in129. New CSV/print mismatch is reproduced only for Balance Sheet; other statement variants, native print dialogs and a patched implementation remain unverified. No product fix, commit or shipping in this QA run.
