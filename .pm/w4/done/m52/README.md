# w4 · m52 — Preserve exact Net Worth amounts and monthly changes

**Worker:** worker1 **Goal:** a valid recorded balance and its same-currency change keep their decimal value in Overview **Status:** done

**Severity:** minor financial display. **Estimate:** 155m across six tasks, dashboard only. Exact source amounts, locale/currency formatting and decimal subtraction cross the shared amount model and its consumer; this is more than a sub-hour one-line renderer fix.

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Retain exact source amounts through Net Worth text formatting — **DONE** | 45m | — |
| [t002](./done/t002.md) | Compute same-currency monthly changes with exact decimals — **DONE** | 35m | t001 |
| [t003](./done/t003.md) | Adoption surface: verify the existing report contract — **DONE** | 15m | t001, t002 |
| [t004](./done/t004.md) | Simplify the changed amount paths — **DONE** | 10m | t003 |
| [t005](./done/t005.md) | Test exact totals, changes and compatibility controls — **DONE** | 35m | t003 |
| [t006](./done/t006.md) | Close out after the observed values are correct — **DONE** | 15m | t004, t005 |

## Definition of done

- [x] Source balances9007199254740992→9007199254740993 USD render the exact latter headline and both distinct monthly table values, with **+1.00 USD** change. The reverse reads **−1.00 USD**; the nearby990→991 control remains correct.
- [x] Text formatting and subtraction retain exact source decimals until their deliberate currency/display rounding. ECharts may still use approximate numeric coordinates. Existing grouping, locale, ISO minor units, zero/negative display and source-driven commodity behavior remain compatible.
- [x] Existing first-period/missing values, selection, named/focusable table, view URL, responsive controls and valuation details remain usable. Preserve the separate currency-matching repair [993](../993.md); this milestone does not reopen it.
- [x] Shared-helper consumers are audited, with owning regressions for changed behavior rather than an unrelated Overview rewrite. Coordinate common formatting work with [1001](../../1001.md).
- [x] Meaningful tests and native1440/390 controls on the built change reproduce the exact producer-backed inputs, with honest model/deployment labeling. Dashboard gates pass, evidence and any deployment limit are recorded, and all closing tasks are complete.

## Source + Goal linkage

- **Source:** continuous dashboard QA,2026-10-22; [verified findings](./FINDINGS.md), five retained browser contexts, current ledger producer and independent Beancount controls.
- **Goal linkage:** A2 — Frictionless onboarding: a reader should be able to reconcile a valid ledger balance and a one-unit monthly change against the dashboard's headline and text alternative.
- **Expected outcome:** valid large decimal balances remain distinguishable and a real gain/loss is not shown as zero.
- **Why now:** early Number conversion destroys the recorded digit before formatting and subtraction. Existing LineChart/average-cost precision repairs have different consumers; use compatible shared formatting rather than parallel policies. Include Adoption surface because the change affects a reader-facing financial report.
