# w3 · m1 — Budget read-only: Home panel + /budget page

**Worker:** worker3 **Goal:** A mobile user with budget directives sees an at-a-glance Budget panel on Home and a dedicated /budget page with per-account budget-vs-actual visualization. **Status:** in progress (t001–t012 done; t013 closeout blocked on in-app verification against a ledger that has budget directives — code-complete and `yarn test` green, but the DoD requires seeing it run)

## Tasks (in order)

| id   | title | est | depends_on |
| ---- | ----- | --- | ---------- |
| t001 | Spike: can homeCharts.budgets power the Home panel? | 20m | — | — **DONE**
| t002 | Port budget selectors (grouping + daily-equivalent proration, no date-fns) | 45m | — | — **DONE**
| t003 | Port dashboard budget-utils tests verbatim to jest-lite | 30m | t002 | — **DONE**
| t004 | Add GetLedgerIntervalTotals query + codegen | 20m | — | — **DONE**
| t005 | BudgetBarChartD3: actual bars + dashed budget step line | 45m | — | — **DONE**
| t006 | Budget strings (en) + analytics events | 20m | — | — **DONE**
| t007 | BudgetGroupCard: stats, variance badge, progress, chart | 45m | t002, t004, t005, t006 | — **DONE**
| t008 | /budget screen: route, time-span pills, list, empty state | 45m | t007 | — **DONE**
| t009 | Home BudgetCard panel: top 3 by utilization + CTA empty state | 45m | t001, t008 | — **DONE**
| t010 | Adoption surface | 30m | t009 | — **DONE**
| t011 | Simplify | 30m | t010 | — **DONE**
| t012 | Test coverage | 45m | t010 | — **DONE**
| t013 | Closeout | 20m | t012 |

## Definition of done

With budget directives in the ledger, the Home screen shows a Budget panel (top 3 groups by utilization, over-budget rows in error color) that navigates to /budget; /budget renders one card per account+currency with current budget, latest actual, variance badge, progress bar, and a bars-vs-dashed-line chart honoring the time-span pills; empty ledgers see CTA/empty states; skeletons (not spinners) during load; `yarn test` (lint + typecheck + jest-lite) passes, including the ported budget-utils suite.

## Source + Goal linkage

- **Source:** budget-on-mobile PM spec, 2026-08-09 (`/pm` invocation). Reference implementation: `dashboard/src/features/ledger-data/budget/` (directive model, proration semantics, card UX).
- **Goal linkage:** A3 — the mobile app is part of this public monorepo's face and its retention surface; dashboard-parity budget makes it a daily-glance companion instead of a lesser client. Secondary A2 — seeing spending against targets on the phone is the habit loop that keeps newcomers using their ledger.
- **Expected outcome:** Mobile users can see budget-vs-actual without opening the web dashboard; verified in the app against a ledger with budget directives (t013), since the event funnel this line originally named was retired with the analytics sink — see `w3/done/001.md`.
- **Why now:** The backend is already done — every needed GraphQL operation exists in the mobile schema (only `getLedgerIntervalTotals` lacks a codegen'd query); the dashboard reference implementation is current; home-panel conventions (TimeRangePills haptics, DashboardCard) just shipped. Adoption surface task included: this milestone ships a user-facing app surface.
