# w4 · m51 — Preserve selected chart units when regrouping periods

**Worker:** worker1 **Goal:** interval regrouping keeps the reader's chosen commodity series visible. **Status:** done

**Severity:** minor. **Estimate:** 150m across six tasks, dashboard only. One new finding group; cached option updates and uncached content remounts both discard enabled BTC. Shipped in `0b93bbc43` (dashboard).

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| [t001](./done/t001.md) | Preserve native unit choices on retained LineChart updates — **DONE** | 35m | — |
| [t002](./done/t002.md) | Retain selected chart units through report loading lifecycles — **DONE** | 40m | t001 |
| [t003](./done/t003.md) | Verify adoption surfaces for unit-selection continuity — **DONE** | 15m | t002 |
| [t004](./done/t004.md) | Simplify the scoped legend state integration — **DONE** | 10m | t003 |
| [t005](./done/t005.md) | Prove cached and uncached interval selection continuity — **DONE** | 35m | t003 |
| [t006](./done/t006.md) | Verify the unit-selection outcome and archive the milestone — **DONE** | 15m | t004, t005 |

## Definition of done

- [x] Balance Sheet Net Worth with Units preserves a native enabled BTC choice through Monthly→Quarterly's uncached read and Quarterly→Monthly's cached result at desktop/narrow widths.
- [x] Cached option updates and uncached pending child remounts both preserve selection; native re-enabling remains usable. Initial defaults and deliberate all-off are distinguished, and available-unit changes are reconciled.
- [x] The actual requested period, Net Worth view, Units conversion and exact dates/financial values remain correct. Pending/error/empty guards stay honest; an old interactive plot is not exposed as the requested result.
- [x] Existing light/dark, resize, legend contrast and period-data alternatives retain their behavior. Other Balance Sheet LineChart views and the Account Balance caller receive meaningful shared-code regression checks, with runtime limits recorded.
- [x] Real lifecycle regressions fail on the old behavior, fresh native controls establish the repaired outcome, and dashboard gates pass.
- [x] Adoption, simplification, test review and /pm closeout complete only after the observable outcome holds.

## Source + Goal linkage

- **Source:** continuous $qa-find-bugs-dashboard, 2026-10-22; [genuine reproduction, source trace, working controls and evidence](./FINDINGS.md).
- **Goal linkage:** **A2 — Frictionless onboarding.** A newcomer comparing a crypto position can regroup its timeline without unexpectedly switching the displayed commodity back to USD.
- **Expected outcome:** the existing unit legend remains a reliable report control across both loading and cached updates, with no extra re-selection step.
- **Why now:** independent narrow/desktop runs prove both lifecycles and all 1,408 plotted date/unit values match the actual API; numerical data is correct, but the chosen view is discarded. Shared state ownership and real regressions exceed one hour, so this is a milestone rather than a sub-hour note.
- **Adoption surface included:** the existing customer-facing chart/interval workflow changes; t003 verifies guidance and discoverability without inventing a new preference UI.

## Scope and dedupe

Repair the LineChart unit-selection contract and the owning report lifecycle. Preserve current number-hook consolidation, all exact values and independent initial-default fallback work. W4/142/M16 retain chart tabs, 998 retains bar mode, 997 fixes a stacked default, and 116/090 own contrast/sizing; none owns this legend state. Only Balance Sheet Net Worth is a live-repeated failure. The Account Balance caller is explicit audit/regression scope, not a second claimed bug; other chart implementations remain unverified. No backend/API or dependency changes, global preference store, stale-data guard weakening or unrelated formatter work.
