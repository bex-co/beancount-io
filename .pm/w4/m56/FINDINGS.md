# Exclude entirely noncash transactions from Cash Flow activities

**Minor · dashboard · A2/A3 · approximately3h15m across7 tasks.** Residual of [m2](../done/m2/README.md)'s direct-method, cash-account-centric statement. Twenty purchases charged wholly to a credit card become **425.83 USD operating cash outflows** and **425.83 USD financing cash inflows**, although none has a cash/equivalent posting. The net cash change remains correctly zero.

## Native reproducer — 2026-10-23

Production `https://beancount.io`, anonymous public `open_ledger/example`, isolated owned headless Chromium156.0.8078.47, English/light/UTC. Two fresh journey contexts at1440×1000 and390×844; genuine public reads throughout, with no response substitution or ledger writes.

1. Open Income Statement, Time **2016-04**, advanced Filter **#trip-los-angeles-2016**. Its expenses are **425.83 USD** and its CSV presents **Net Income −425.83 USD**. Keep this accrual result.
2. Use Related Pages → **Cash Flow**. Both filters remain in the destination URL; conversion is **At Cost**, interval **Monthly**.
3. Read the Operating and Financing activity lists and net cash reconciliation. Export → **Spreadsheet CSV**; reload and repeat the readouts.
4. At390px, scroll each activity table horizontally to its USD column. Native cell bounds confirm both totals are fully visible; separate inspected captures show the operating and financing totals.

| Readout | Expected cash activity | Actual, both widths / CSV |
| --- | --- | --- |
| Net Cash from Operating Activities | zero / no cash activity | **−425.83 USD** |
| Net Cash from Financing Activities | zero / no cash activity | **+425.83 USD** |
| Net Change in Cash & Equivalents | zero | correct; CSV0.00 USD |
| Income Statement expense / loss | 425.83 / −425.83 USD | correct |

The actual GetLedgerCashFlow HTTP200 result contains expense interval425.83USD, liability interval−425.83USD, and **empty asset account changes**. The transactions post solely to three food expense accounts and `Liabilities:US:Chase:Slate`. Independent Beancount3.2.3 accepts the downloaded public source with zero errors; Decimal sums verify all20 individually balanced transactions, total425.83, and **zero postings to any of the ledger's three cash/equivalent accounts**. This is eligible-transaction selection before activity classification.

## Working controls and bounded repair direction

The same native filter control accepts this existing FQL predicate:

```text
(#trip-los-angeles-2016) any(account:"^(Assets:US:BofA:Checking|Assets:US:ETrade:Cash|Assets:US:Vanguard:Cash)$")
```

At both widths it returns genuine HTTP200 reads with every interval account map empty and the honest **No cash flow data found for this ledger** state. The named cash accounts come from this public ledger's existing definitions; no declaration or ledger content is edited.

A real cash-payment control, advanced Filter `payee:"EDISON POWER"` with the same month, shows **Operating −65.00 USD / net cash change −65.00 USD** and matching CSV. Adding the cash-leg predicate leaves its complete primary response and rendered statement tables unchanged. Both cases retain the intended source filters. Six native CSV downloads (Income Statement, original Cash Flow, cash-payment Cash Flow at each width) were parsed independently.

Two additional valid local fixtures distinguish the required behavior: one100USD credit-card purchase without a cash leg, and a100USD cash borrowing followed by a100USD cash payment. Each has zero net cash movement and equivalent noncash account deltas. The complete current model reports−100 operating/+100 financing for both. Only the second fixture has those actual cash flows. Preserve the second case; suppressing every zero-net interval would be wrong. These are parser/model controls, not additional hosted reproductions.

Resolve the complete supported cash/equivalent membership before reading activity intervals, using unfiltered account definitions and the existing role/ancestor/name policy. The selected report's closing assets hierarchy is empty in the failing case and cannot supply that membership. Compose a correctly quoted, escaped exact-member `any(account:...)` predicate with the user's advanced filter, preserving parentheses/OR precedence. Existing interval reads support this selection. Apply it internally to activity interval reads; keep the visible URL/filter draft and the existing account/time/conversion scope intact, and retain the original scoped closing-balance and metadata reads. A compatible equivalent using existing typed reads is acceptable. Reuse the role resolver and eligibility consistently in the loader and rendered query. An empty resolved cash set yields no cash activity; unresolved/failed membership yields pending/retry rather than an unfiltered fallback or a false successful zero.

This work remains in dashboard using existing eligible API inputs/results. Retain ADR003's classification choices, declarations and inference notices after eligibility; preserve the current treatment of real credit-card payments and cash transfers. Keep reconciliation, exact decimals, currencies, charts, exports and cash balances compatible. Partially cash-funded transactions with additional noncash legs were not independently evaluated and are outside this bounded reproduction.

## Cause and source comparison

`dashboard/src/features/reports/cash-flow/graphql/cash-flow.graphql` gives all five interval reads the user's unchanged filter, as do the page query at `cash-flow/index.tsx:98–104` and loader. `lib/merge-intervals.ts:20–46` merges the resulting account deltas. `lib/model.ts:358–395` skips cash-account rows, then negates **every other account change** into an activity bucket, without establishing that its transaction touched cash. Removing cash rows after aggregation cannot remove a wholly noncash transaction's two noncash legs. The reconciliation guard passes because those legs balance and their activity totals cancel.

The native client loaded `ledger._ledgerOwner._ledgerName.cash-flow-Dmy8Fc_M.js` and `model-47EqeN5v.js`. Fresh source maps and an additional genuine query capture confirm the six relevant queried fields (five intervals and closing Balance Sheet) use the same user filter without a cash-leg predicate. The activity-accumulation block matches served source, working source and fetched main `ba2cbfa9e` byte-for-byte: SHA256 **330b99d1775e71bf529d3aced17eebd70a6945f2a45f5651e29ed383a7ea547d**. The complete merge module also matches. Whole model/component modules differ due to other changes, including root-name handling; no whole-build equality is claimed. Executing the complete current merge → cash membership → statement model on all eight genuine captured results reproduces the failing case and every control. The implementation gap remains on main.

## Dedupe and limits

All board states and targeted history were searched for wholly noncash purchases/transactions, cash-leg selection, direct-method activity and cash predicates. [m2](../done/m2/README.md) and ADR002 promise cash-account-centric activity; [m3](../done/m3/README.md)/ADR003 own classification overrides. Their documented credit-card classification tradeoff does not establish a cash leg for a purchase. [198](../done/198.md)'s converted-movement reconciliation guard correctly checks conservation and passes this balanced case. [1022](../done/1022.md) owns renamed roots; [996](../done/996.md) owns chart alternatives; [289](../done/289.md) owns print amount wrapping. Those completed repairs remain intact. The Overview Sankey's separate model is outside this finding. No matching open eligibility repair was found. Record one m2 residual, without adding a historical finding group or reopening completed work.

Two retained journey contexts, two additional native amount-visibility contexts and one query/source probe closed, leaving the original context only. Four preparatory contexts were excluded, including two filter-button activations before hydration. Retained narrow controls wait for the client and applied URL. Eight primary HTTP200 reads, six native CSVs, zero hosted writes, attempted mutations, route errors or page exceptions in the retained journeys. Ignored evidence under `dashboard/tmp/qa-20261020/dashboard-loop/`, prefix `noncash-flow-`: native and visibility JSON, parsed-CSV/Beancount/Decimal controls, complete current-source execution, source maps/verification, query capture, six CSVs, inspected native images and the two local fixtures/counterexample results. No product changes or formal tests were authored. Other conversions, renamed roots, declarations, partial cash transactions, loading/failure paths, physical print, other locales/engines and repaired deployment remain unverified; planned regression scope is not claimed as completed coverage.
