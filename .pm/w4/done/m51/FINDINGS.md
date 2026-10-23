# Interval changes discard the reader's selected commodity series

**Severity:** minor financial-view preference. **Owner:** dashboard. **Sizing:** shared chart update ownership, pending-content lifecycle and meaningful regressions exceed one hour; schedule as one milestone. One new finding group.

## Genuine native reproduction

Production `https://beancount.io`, 2026-10-22, isolated owned headless Chromium 155.0.8059.85, anonymous public `open_ledger/crypto-example`, English/light/UTC. Two retained browser contexts at 390×844 and 1440×1000, plus one exploratory context. Genuine successful report reads throughout the chart checks, without response, clock, CPU or React-state fixtures. No hosted writes.

1. Open `/ledger/open_ledger/crypto-example/balance-sheet?time=2026&lang=en`, keep **Net Worth**, and natively select **Units**. The Monthly chart has twelve points for each of sixteen commodities.
2. Click the actual canvas **BTC** legend item. Readback confirms BTC enabled before every retained interval transition. The narrow initial case has BTC alone; desktop initially has BTC and USD. Claims below rely on the verified BTC selection, not on an assumed successful USD toggle.
3. Change **Select time period** from **Monthly** to **Quarterly**. Its genuine GetLedgerBalanceSheet HTTP200 result has four dates, with BTC values intact. The chart silently turns BTC off and restores USD on. The interval changes as requested, but the reader's selected commodity does not survive.
4. Natively enable BTC again in Quarterly. Return to **Monthly**, whose Units response is already cached. BTC is again turned off and USD restored. This transition sends **zero additional balance reads** and keeps the **same ECharts instance**; it is not only an uncached loading/remount problem. Both widths repeat both transitions.

The uncached Monthly→Quarterly path creates a new chart instance as the page's pending branch unmounts content. The cached Quarterly→Monthly path keeps the instance but applies a new option. Both lose the same selected BTC state. The ledger, Time 2026, Net Worth view and Units conversion remain unchanged.

Working controls: native re-enabling of BTC succeeds after each transition, giving four recovery controls. In the separate genuine `chart-theme-native-legend-continuation-controls.json` control, BTC-only selection survives light→dark→light and 1440→390 resizing; theme text colors actually update and all 192 plot values remain unchanged. Selecting a unit is therefore supported and survives those same-instance appearance changes.

Independent Decimal/date comparison verifies **1,408 plotted date/unit values** across both widths' before, quarterly, re-enabled quarterly, cached monthly and recovered monthly phases against their actual Monthly/Quarterly API responses. Every value and date agrees. No valuation, arithmetic, date grouping, source precision or API defect is claimed.

## Cause and bounded target

`features/reports/balance-sheet/line-chart.tsx:96–110` constructs a fresh legendSelected map from the primary-series default whenever the data/interval-dependent chart option changes; `:151–157` supplies that map as legend.selected. Native legend interactions live only inside ECharts; the component exposes no owner-controlled selection. Applying the next option overwrites that interaction even without a remount. An uncached interval change also crosses Balance Sheet's settled-data/pending boundary and disposes the child entirely, so retaining a child ref alone is insufficient.

Keep the user's selected unit visibility in a suitable scoped report owner through both retained option updates and pending child remounts, and feed it to the shared chart through a small supported contract. Seed primary-series defaults for a new context; reconcile available-unit changes deliberately without treating a user's explicit all-off choice as an uninitialized chart. Preserve correct pending/error/empty data handling rather than keeping an old interactive plot visible. Keep ordinary initial defaults, source values, period-table contents, native legend toggles, theme/resize behavior, selected tab, interval/conversion and current URL/history behavior. No backend, API, dependency or global preference store is required.

Source-derived LineChart callers: Balance Sheet's Net Worth, Assets, Liabilities and Equity views, plus Account Balance. Only Balance Sheet Net Worth was independently live-repeated. Audit Account's same shared consumer during implementation before extending owner-level repair; other report bar-chart implementations are not added failures.

## Dedupe and deployment

All board states/history searched for legend selection, unit visibility, interval reset, retained/cached chart updates and pending remounts. W4/142 and M16 retain the selected chart tab; that still works here. W4/998 concerns Income/Expenses bar mode across an outer scope remount, not this unit-selection map. W4/997 owns a stacked chart's initially all-hidden fallback when the operating unit is absent; the current case has USD and a valid explicit BTC choice. W4/116 owns inactive-label contrast, W4/090 chart sizing, W4/1006 resize-close focus and W4/1008 pending URL-view intent. None retains native legend selections across these interval changes. No matching pending repair found.

Actual loaded `line-chart-rM8Y_Acl.js.map` contains the implicated legend-default block byte-for-byte with current source, SHA256 **d52a941f122df35f8cc724582df10de096f274d057a5054fe7423a478dc78802**. The complete served component SHA is **9a68cb31f50377de55de4d7d8e293ce5e3ea053ab702f4080c9fc6ad31f6af3b**. Full current component differs only in W4/966's number-hook consolidation; preserve that current hook and do not restore the removed useFormatQuantity. No full-module or full-deployment equivalence is claimed.

## Evidence and limits

Ignored evidence in `dashboard/tmp/qa-20261020/dashboard-loop/`: `chart-interval-legend-complete-controls.json`, `chart-interval-legend-source-verification.json`, `chart-interval-legend-source.diff`, `chart-interval-legend-reset-{390,1440}.png`, and the separate theme control above. The narrow interval screenshot was visually inspected: Quarterly/Units remain selected, USD is active, and BTC is inactive.

The narrow retained context initially encountered a root-load refusal; native Try Again recovered before its chart actions. The independent desktop context started successfully. That setup error has separate evidence and does not supply this chart finding. USD was not successfully disabled in every pointer attempt, so only verified enabled-BTC state is required by the retained assertions. Two retained and one exploratory contexts closed; only the original owned context remains. Zero mutation attempts, hosted writes, route errors or browser exceptions during the chart checks. Other LineChart views, Account, other engines/locales, physical assistive technology, failed interval reads and repaired behavior remain unverified.
