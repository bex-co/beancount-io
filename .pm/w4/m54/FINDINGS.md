# Overview Cash Flow leaves refunds and deficit funding unexplained

**Minor · dashboard · A2/A3.** Six fresh production-client reproductions show an unbalanced central hub in ordinary exact USD amounts. This is a directed-flow omission, separate from m53's decimal precision work. No product fix implemented.

## Environment and reproducible inputs

2026-10-23, owned isolated headless Chromium156.0.8078.47, English/light/UTC,1440×1000 and390×844. QA owner opens its designated disposable ledger through Gallery and selects Overview Time2026-Q3. Three successful genuine HTTP200 reads per case are explicitly modeled with complete actual local WASM parser/LedgerFinanceService results: ledger options, Overview and valuation. This proves running client behavior on valid synthetic inputs, not persisted hosted fixture contents. Six contexts closed,18 modeled reads, zero mutations/hosted writes/page or route errors; only the root QA context remains.

For each valid ledger, configure operating currencyUSD and open `Assets:Bank:Checking`, `Income:QaSalary` and `Expenses:QaFees` on2026-01-01. BookJuly1 income100USD (bank+100, income−100). OnJuly2 book an expense against the bank using one amount below. Independent Beancount3.2.3 validates each fixture without errors; Decimal posting sums and the actual producer agree.

| Case | July2 expense / bank | Exact net/bank | Actual hub inflow | Actual hub outflow |
| --- | --- | --- | --- | --- |
| Working surplus |25 /−25|75USD|Income100|Expense25 + Savings75 =100|
| Deficit |125 /−125|−25USD|Income100|Expense125; missing25 of funding|
| Refund |−25 /+25|125USD|Income100; refund absent|Savings125; missing25 of inflow|

After selecting Time2026-Q3, open **Cash Flow → Flows** with Enter (desktop) or Space (narrow). Hover the actual `Income:QaSalary → Cash Flow` band. Open adjacent **Income vs Expenses → Period data** as the working numerical control. Every case repeats in a fresh context at both widths.

Deficit Flows contains exactly `Income:QaSalary → Cash Flow 100.00USD` and `Cash Flow → Expenses:QaFees 125.00USD`. Refund Flows contains exactly `Income:QaSalary → Cash Flow 100.00USD` and `Cash Flow → Savings 125.00USD`, with no refund account. The adjacent table correctly reports100/125/−25 or100/−25/125 respectively. Actual income hover is100USD in every case. Read-only ECharts inspection confirms the actual links and incoming/outgoing sums; native mouse/keyboard actions drive the UI, without chart handler or option injection.

The deficit image shows the hub extending below the100USD incoming band to its125USD outgoing band; the refund does the same for Savings. Three images (desktop deficit, narrow refund and narrow surplus) were visually inspected. The narrow surplus capture only partly includes its bottom row, whose full amount is independently read from the real table. The ordinary surplus control balances, and the main amounts/filters are correct; this is not a query, currency, rounding or negative-number parsing failure.

## Root cause and current-source control

`dashboard/src/features/reports/overview/lib/sankey-data-transformer.ts`:

- At298–308, totals include signed account values and calculate `totalSavings = income − expenses − investing − financing`.
- At319–323, expense links with `value <= 0` are dropped. A−25 refund still raises Savings to125, while its25 incoming contribution has no ribbon or table row.
- At340–345, only positive Savings gets a synthetic node. A−25 deficit produces no corresponding funding source.

`components/cash-flow-sankey.tsx:175–188,214–228` passes those same links to ECharts and Flows. Both therefore inherit the missing source; the table is a faithful alternative to the faulty graph. The sole production caller is Overview in `overview/index.tsx:409`. The separate Cash Flow statement has a different model and is outside this repair.

All six cases load `ledger._ledgerOwner._ledgerName.index-Dt5Wt5tH.js`. Its complete grouping/totals/link tail matches researched current source byte-for-byte, SHA256`303b78891e8bc3f2ac77c736a81a5d2185f07cccc149dda5ff715fe115b32d6e`. The complete option/tooltip/table tail likewise matches, hash`9618b96c50828646b1746ca772d9782bb83a1cf6be31c6e4d93b1d0cc7549496`. Whole modules differ for1020's root-name handling, which is not implicated. The complete current transformer reproduces all three cases with the real unit model/formatter. History73829285/74d87ea5/eed1d9264/7db7cdab9 retains these branches; no current-main repair or whole-build match is claimed.

## Bounded repair and regression boundary

Draw a net-refunded expense account as an incoming positive-width flow of its magnitude, with its real account identity retained. For a negative residual after the eligible flows, add a clearly labeled synthetic shortfall/funding source of the exact gap, distinct from real accounts. This explains a residual; do not claim the application identified a particular real financing transaction or savings account. Keep the existing surplus branch and derive the diagram and Flows from the same final links. Localize new labels in all15 dashboard catalogs.

Retain current snapshot/time/filter semantics, unit selection/omissions, grouping/depth, roles and pending state, parent-own balances and configured roots. Do not redesign account classification, use unlike units to fill a gap, alter producer results or hide the deficit by reducing an expense/Savings value. Coordinate exact sums/link metadata with m53 rather than duplicating decimal helpers. This package owns the omission; no API/backend/dependency change is needed.

## Dedupe and limits

All board states, open milestones and targeted history were searched for Sankey, deficit/shortfall, refunds/clawbacks, conservation, negative flows and Savings. Completed W0/034 fixed mobile deficits and explicitly left this dashboard transformer unchanged. Completed W21/112 chose mobile refund/clawback ribbons and explicitly requests its own dashboard follow-up. Those are precedents, not proof of a dashboard fix. m21 fixed unit/role aggregation; W3/495 exposed the final links as tables; m53 is still open for exact decimal text/arithmetic and does not define missing flow directions. No matching open dashboard repair was found. This is one new dashboard flow-balance group with two implementation tasks, not a reopened mobile item.

Verified evidence under ignored `dashboard/tmp/qa-20261020/dashboard-loop/`: `flow-conservation-{surplus,deficit,refund}.beancount`, actual producer drivers/results and complete GraphQL models; `flow-conservation-{native-controls,independent-control,local-source-control,source-verification,served-sources}.json`; six images. Every cited artifact exists. No product code or formal tests authored. Income clawbacks, negative eligible asset/liability flows, mixed units, declared roles, other locales/engines, real hosted persistence and a repaired deployment remain unverified and are not independent findings here.
