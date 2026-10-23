# Overview distribution amounts lose source digits

**Minor · dashboard · A2/A3.** Residual of [1015](../done/1015.md)'s source-precision work in a separate pipeline. Both actual renderers and their readable Breakdown lose commodity fractions, and the pie loses an integer digit before formatting. No product fix implemented.

## Reproducer

Create a valid BTC-only ledger with operating currency BTC, `commodity BTC`, the accounts below opened on2026-01-01, and `Equity:QaOpening BTC`. Each2026-07-01 transaction posts the listed amount to its asset and the exact negation to Equity; use `qa-20261023` payees. Time is **2026-Q3**.

| Fixture | Asset own balances | Correct total |
| --- | --- | --- |
| digits | Assets:QaMain4.00995BTC; Assets:QaSmall−0.00001BTC | 4.00994BTC |
| large | Assets:QaLarge9007199254740993BTC; Assets:QaSmall1BTC | 9007199254740994BTC |

Native Gallery → synthetic ledger → Time2026-Q3 → Overview Balance Sheet → Assets Distribution → Breakdown. Hover the actual rendered main bar/slice with the mouse. The negative small group uses the existing bar fallback; the positive large fixture uses the pie.

| Readout | Expected | Actual at both widths |
| --- | --- | --- |
| Main bar Breakdown | 4.00995BTC | **4.01BTC** |
| Main bar actual hover | 4.00995 | **4.01** |
| Negative Other Breakdown | −0.00001BTC | **−0BTC** |
| Main pie Breakdown/actual hover | 9007199254740993 | **9007199254740992** |
| Large fixture Other | 1BTC | correct |
| Large fixture Net Worth total | 9007199254740994BTC | correct |

The last two are native working controls: the pie/table's large holding loses a digit even beside a correct total. Its plotted coordinate may remain an approximate number; the financial text needs the recorded decimal. A rounded0% share for an extremely small slice is not a separate finding.

## Evidence and controls — 2026-10-23

Running `https://beancount.io`, isolated headless Chromium156.0.8078.47, English/light, UTC; dedicated QA owner viewing its designated synthetic ledger. Four fresh complete contexts: digits/bar and large/pie, each1440×1000 and390×844. Native controls, Breakdown disclosures and actual canvas mouse hovers; no chart action or application handler was injected.

**Modeled fixture reads:** three successful HTTP200 substitutions per context: GetLedger public options and Overview/valuation for2026-Q3. Each replaces a genuine successful read with explicit projections of actual local WASM parser and `LedgerFinanceService` outputs. Complete storage snapshots include parsed Fava unrealized-account metadata. Other reads remain genuine; the hosted ledger was not changed.

Both fixtures parse without errors. The actual producer preserves all four own balances as decimal strings and their correct totals through each monthly point. Independent Python Beancount/Decimal sums agree. Read-only ECharts observation after animation confirms the bar still holds numeric4.00995/−0.00001, while pie data has already become9007199254740992/1. Native hovers yield the table above; the complete actual tooltip strings are retained locally.

All four chart-card images were visually inspected. The long pie tooltip extends outside the card in those images; complete text was read from its actual DOM. Tooltip geometry is outside this precision repair and overlaps the existing [127](../done/127.md) class; no additional clipping issue is filed. Both narrow table amounts remain reachable, though the wrong large value wraps across lines.

All four contexts closed, root context only; twelve modeled HTTP200 results, zero hosted writes/mutations, page/route errors or modeled-route diagnostics. Other widgets' served commodity formatting can still predate1015; that deployment state is not being reopened here.

## Cause and fix target

- `overview/lib/unit-amounts.ts:23–54` decodes each amount with Number into `UnitAmounts = Map<string, number>`. `buildDistributionData` (`overview-utils.ts:523–560`) retains only numeric `value` for each item. This destroys the unsafe integer before any tooltip/table can format it.
- `distribution-chart/utils.ts:1–40` defines a Number-only DistributionItem and sums Other with numeric addition. Source precision/decimals have no surviving channel.
- `distribution-pie.tsx:32–46` and `distribution-bar.tsx:40–48` format numeric values with `formatNum(value)`. Breakdown (`distribution-data-table.tsx:57`) uses `formatNum(item.value, unit)`, with no source digit budget. BTC's fallback rounds4.00995 to4.01 and−0.00001 to−0.

Preserve the source decimal alongside numeric coordinates through distribution item construction and exact Other aggregation. Reuse existing decimal utilities and `useFormatNumber(value, unit, fractionDigitsOf(source))`; format text from that decimal, retaining ISO minor-unit rules and supported commodity digits. Keep numeric coordinates, chart selection, ordering, percentages and the1% grouping policy compatible. Do not change the shared unit model's behavior for unrelated charts or try to recover digits after Number conversion.

Production callers: DistributionChart is the sole owner of `buildDistributionData` and `groupDistributionData`; Overview renders it for assets and liabilities. The two renderer paths and their shared Breakdown are the consumer scope. Both variants were exercised on assets; liability inversion and mixed-unit runtime remain acceptance controls to retain, not independently failed cases. Coordinate the shared builder with1030; these fixtures use leaf accounts and do not depend on its repair.

Actual native asset `ledger._ledgerOwner._ledgerName.index-Dt5Wt5tH.js`: **whole served modules equal current source** for unit-amounts, distribution grouping, pie, bar and Breakdown. The complete `buildDistributionData` block also equals current source; only its larger utility module differs due to other fixes. SHA-256 examples: unit-amounts `055d2224d9311f62b3b809aa22ecb01d82155346b4744cee6737b9c02ea6a085`; grouping `a9e9a36ebf6340c3ae610fa35231199425c8432df79d4e2cf1279f5676a01429`. All module/block hashes are retained. Research HEAD `4fd4b8bd9`; no whole-build match is claimed. Direct execution of the complete current pure modules plus current formatter reproduces every erroneous text amount.

## Dedupe, scope and artifacts

All board states and targeted distribution/quantity/precision searches were checked. [W3/627](../../w3/done/627.md) fixed floating residue and locale formatting in three tables, retaining the numeric source; its source-driven commodity case was not exercised. m21 fixed unit separation, m52 and1015 exact card text, and1001 the separate shared LineChart text pipeline. None preserves decimals in these distribution items/grouping/renderers. No matching open distribution precision repair was found. Record a residual of1015, without reopening those completed scopes.

This needs data/grouping and renderer changes plus meaningful regression/native coverage, so it is a milestone rather than a sub-hour note. Dashboard only; no backend/API/dependency change, new unit preference, persistent state or product flow is needed. Income-vs-expenses and Sankey precision are not established by these cases and are outside this milestone.

Ignored `dashboard/tmp/qa-20261020/dashboard-loop/`: `distribution-precision-{digits,large}` valid fixtures, actual producers, explicit GraphQL models and four images; `distribution-precision-native-controls.json`, `-independent-control.json`, `-local-source-control.json`, `-source-verification.json`, served sources and drivers. Hosted persistence, liability/multi-unit/other-locale runtime, other engines and repaired deployment remain unverified. No product changes or tests were authored.
