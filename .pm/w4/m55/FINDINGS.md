# Budget loses a recorded whole unit before comparing target and actual

**Minor · dashboard · A2/A3.** Residual of m45's Budget precision work. Both directions of a one-dollar difference collapse to On target because a valid decimal string crosses the exact integer range of Number. No product fix implemented.

## Reproducer and controls

2026-10-23, production client, owned isolated headless Chromium156.0.8078.47, English/light/UTC. Three fixtures each run in a fresh designated-QA-ledger owner context at1440×1000 and390×844. Each case explicitly models two successful genuine HTTP200 reads with complete local producer results: the budget Custom journal and Last year's daily interval totals. Six contexts closed,12 modeled reads, zero hosted writes/mutations/page or route errors. Unrelated reads remain real. These are running-client reproductions, not claims about stored hosted fixtures.

Each valid ledger has operating currencyUSD and opens `Assets:Bank` and `Expenses:QaDaily` on2025-01-01. It has one `2025-12-31 custom "budget" Expenses:QaDaily "daily" <target> USD` and a balanced December31 transaction posting `<actual> USD` to Expenses:QaDaily and its negative to Assets:Bank. The browser's current year is2026. Open Budget, choose **Last year**, and open native **Period data**:

| Case | Exact targetUSD | Exact actualUSD | Expected variance | Actual card and final Period data row |
| --- | --- | --- | --- | --- |
| Target loses a digit |9007199254740993|9007199254740992|Below target/−1.00USD|Both9,007,199,254,740,992.00; On target/0.00USD|
| Actual loses a digit |9007199254740992|9007199254740993|Above target/+1.00USD|Both9,007,199,254,740,992.00; On target/0.00USD|
| Ordinary working control |100.00|99.00|Below target/−1.00USD|100.00/99.00; Below target/−1.00USD|

Every value repeats at both widths. In the first case the native history table and its Delete label still contain `9007199254740993 USD`, directly contradicting the card's rounded target. No Update/Delete/Add action is activated. The complete365-row table has364 empty/zero intervals followed by the December31 comparison. Daily cadence performs one day's calculation for that last target, eliminating accumulated monthly-proration round-off as an explanation.

Actual WASM parsing plus `LedgerJournalService.getJournal` and `LedgerDataService.getIntervalTotals` preserve the exact Custom amount, interval balance and per-account balance. All three fixtures have zero parser errors. Independent Beancount3.2.3 and Decimal confirm variances−1,+1 and−1.00. The compact browser projection losslessly reconstructs every empty interval and the actual last row; it does not invent an abbreviated series. Four of the six viewport images were visually inspected: both large-target widths, the narrow large-actual case and the narrow ordinary control. Full history/final-table text is separately retained.

## Root cause and source match

`dashboard/src/features/ledger-data/budget/budget-utils.ts`:

- `parseBudgetAmount:34–38` converts the target's decimal text to `Number.parseFloat`.
- `calculateBudgetForInterval:190–224` uses that numeric target for daily-equivalent summation.9007199254740993 has already become9007199254740992 before the single daily addition.
- `readSparseBalanceAmount:305–315` converts the interval's exact actual string with parseFloat, losing the other case's actual digit.

`budget-chart-card.tsx:109–116,138–161,196–241` uses those values for the configured target, period rows, latest actual, ended-period target and variance; `showAmount:175–180` still receives only a number. The native history table separately writes `entry.amount` verbatim, explaining its working exact-source control. The sole production BudgetChartCard caller is Budget's group list; no statement/API consumer needs changing.

The complete current utility reproduces both failures with the real grouping, period calculation and978's repaired `budgetVariance(actual,target,2)`: both raw subtractions are already0. The ordinary control returns−1. Group/history source strings remain exact. Thus loosening/tightening the variance tolerance or adding formatter digits cannot recover the lost unit.

Served asset`ledger._ledgerOwner._ledgerName.budget-XApaodkF.js` predates m45/978, so whole modules differ from current source. Its complete source-conversion/calculation blocks still match researched local HEAD`663531d21` byte-for-byte: parseBudgetAmount SHA256`f1e82d03398b1bcc41054bdffdabe610aaf27c155db07c83993857131075e2da`; calculateBudgetForInterval`1c0d735e8e82dea524ea1b012e0861d4921e28757d61cd5b9ae529baff735275`; readSparseBalanceAmount`8793dafa8a5312c6573046afef28ae533a536b3f82e20bb15566ca59163a0cb0`. Fetched main`b35df662f` retains the conversion. The complete current-helper diagnostic proves this is not merely those completed fixes awaiting deployment; no whole-build match is claimed.

## Bounded repair

Carry exact target and actual decimals alongside approximate plot values. Preserve exact amounts through effective-target selection and compatible daily-equivalent proration, and calculate variance from exact amounts before selecting the badge/favorability. Format monetary text from the exact decimal with the shared source-aware formatter. Derived prorated values need a deliberate bounded decimal precision policy that preserves current currency/commodity rules and exact-match behavior; avoid adding another arbitrary display cap or exposing rational/floating residue.

Reuse/extend the package's existing decimal infrastructure; no new dependency, API/backend, setting or ledger mutation is required. Keep cadence precedence, sparse inventories, income signs, current/ended/rolling spans and existing history behavior. Numeric chart coordinates and the current progress-percentage policy remain compatible. m53's separate Overview unit model is not this Budget model.

## Dedupe and limits

All board states/open milestones and targeted history were searched for Budget exact/unsafe integers, large amounts, decimal source strings and false variance. m45 (promoted331) restored non-ISO fraction digits, retaining numeric computed amounts.978 repaired visible differences that were still representable, specifically31×2^40 and±1 below2^53; this fixture loses a digit before that comparison.130 owns ordinary proration residue; m52/1015 and1001 own other exact-text pipelines. No pending Budget source/arithmetic repair was found. Record this as a residual of the Budget precision group, not a new historical finding group; do not reopen completed m45 or978.

Verified ignored evidence under `dashboard/tmp/qa-20261020/dashboard-loop/`: `budget-exact-unit-{large,above,ordinary}.beancount`, actual producer controls and driver; lossless compact models; `budget-exact-unit-{native-controls,independent-control,local-source-control,source-verification,served-sources}.json`; six images. Hosted persistence, other locales/engines, large prorated monthly/yearly/income cases, actual chart tooltips and repaired deployment remain unverified. No product code or formal tests authored.
