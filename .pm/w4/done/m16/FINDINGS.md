# Statement view resets after an uncached interval change

Severity: minor interaction regression. Owning package: dashboard. This is one causal cluster across three statement pages.

Environment: production https://beancount.io, anonymous synthetic open_ledger/public-company-template, isolated headless Chromium149.0.7827.55, English/light1440×1000 and fresh390×844. Local main26d54a9db7d33c31a549bd12a0454a1c01f3f038; deployed main-BIr0jJni.js, exact deployed commit unverified. No injected latency or interception.

## Reproduction and controls

1. Open Cash Flow, choose By Activity, then change Monthly to previously uncached Quarterly. The successful GetLedgerCashFlow response has interval=quarterly, HTTP200. The interval control stays Quarterly, but the selected chart resets to Net Cash Flow.
2. Choose By Activity again and return to cached Monthly. By Activity stays selected. This isolates the pending-read lifecycle from deliberate interval-selection policy.
3. Open Income Statement, choose Income, then change Monthly to uncached Yearly. GetLedgerIncomeStatement returns200/yearly; the chart changes to Net Profit.
4. Open Balance Sheet, choose Assets, then change Monthly to uncached Weekly. GetLedgerBalanceSheet returns200/weekly; the chart changes to Net Worth.
5. Fresh narrow Cash Flow: select By Activity through the named View combobox, then Monthly→uncached Weekly. The successful200/weekly read completes with View reset to Net Cash Flow. The URL remains the same Cash Flow path throughout the interval change.

The initial keyboard ArrowRight transition between Cash Flow tabs works and settles with correct aria-selected/panel association; an immediate pre-settlement snapshot was not treated as a defect. Template cash-flow totals also reconcile: 3,000 operating −18,000 investing +20,000 financing =5,000 MUSD net change. No API calculation failure is claimed.

## Source and repair boundary

- cash-flow/cash-flow-content.tsx:114 owns selectedTab with useState("netCashFlow"); its parent cash-flow/index.tsx:126 returns ReportLoadingState while settled.pending, removing that owner.
- income-statement/income-statement-content.tsx:83 owns selectedTab("netProfit"); income-statement/index.tsx:86 has the same pending replacement.
- balance-sheet/balance-sheet-content.tsx:81 owns selectedTab("netWorth"); balance-sheet/index.tsx:79 has the same pending replacement.
- All paths are under dashboard/src/features/reports/. Each content component has its corresponding page as its production owner.
- lib/select-settled-report-data.ts intentionally classifies every loading response as pending. Its documented stale-data contract is correct and must remain.
- Commit05c78c69 replaced Cash Flow's old isLoading && !statement condition with the unconditional settled.pending branch and made analogous sibling changes. It repaired completed w3/m35's stale-report/export problem. Current main has no later selection-lifetime repair.

Move selection ownership to a lifetime that survives these same-page reads, or preserve an equivalent stable owner without rendering stale financial content. Keep the view selectors controlled and validated against each report's valid options. Avoid a global store, cross-feature imports, new dependencies, or restoring previousData rendering. Coordinate outer router remount behavior with w4/m13 without claiming that changing its boundary alone fixes this local-query reproduction.

## Dedupe and verification scope

Searched all .pm including done/blocked for chart/tab reset, interval selection, retained view and report preferences. Completed w3/m35 owns request/data identity; this is a regression introduced by that safeguard, not a request to weaken it. Completed w3/158 concerns hierarchy expansion on unrelated rerenders. Completed w3/160 concerns Holdings grouping after drill-down/Back. Open w4/m13 concerns Accounts input and Journal offsets at the separate route boundary. No matching active chart-selection repair was found.

Verified artifact: dashboard/tmp/qa-20260917/report-tab-reset.json records before/after selections, successful operation intervals, the cached Cash Flow positive control and the fresh narrow result. Actual screen-reader speech, other browsers, failed-read recovery and a patched implementation remain unverified. Test the latter before closing. No product changes, production mutations, commit or shipping in this QA run.


## Additional Trial Balance reproduction (same pending boundary)

On production Chromium 149 at 1440×1000, `/ledger/open_ledger/stock-example/trial-balance`, select Equity and change At Cost to Units. The URL stays unchanged, GetLedgerTrialBalance returns 200 with conversion `units`, and the selected tab resets to Assets. Reload, select Equity, and change to the previously unused At Market Value: another 200 (`at_value`) resets to Assets. At Cost and Units transitions already cached after reload retain Equity, a positive control; do not describe the cached At Cost transition as a failed fresh reproduction.

`trial-balance/index.tsx` uses the same `selectSettledReportData` pending return before rendering TrialBalanceContent; `trial-balance-content.tsx:62` owns `selectedTab` initialized to assets. This is the same report-content lifetime defect, independent of interval versus conversion input. Expand the bounded state repair to this fourth report; preserve pending financial-data safeguards and the ledger-specific conversion cookie. Local evidence: `dashboard/tmp/qa-20260917/trial-balance-tab-reset.json`. Conversion restored to At Cost afterward. Fresh 390px reload also reproduces this through the named View selector: Equity → change conversion from At Cost to Converted to USD → View becomes Assets, with the URL unchanged. Evidence: `dashboard/tmp/qa-20260917/trial-balance-tab-reset-narrow.json`. The native View control is correctly named; conversion naming remains the separate w4/079 issue. Restored At Cost after this repeat.
