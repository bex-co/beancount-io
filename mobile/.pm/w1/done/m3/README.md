# w1 · m3 — Monarch-style Reports tab

**Worker:** worker1 **Goal:** A Reports tab with a chart + breakdown over a selectable time range, with drill-down to the underlying entries. **Status:** done (shipped as a combined dashboard, not the four-segment switcher this milestone specced)

## Tasks (in order)

| id   | title                                                           | est | depends_on             | outcome             |
| ---- | --------------------------------------------------------------- | --- | ---------------------- | ------------------- |
| t001 | Income-statement GraphQL op + use-income-statement hook         | 30m | w1/m2/t001             | **DONE**            |
| t002 | Reports tab route + shell: segment switcher + shared time range | 40m | —                      | **DONE**            |
| t003 | Spending report: monthly bar chart + category breakdown list    | 60m | t001, t002             | **DONE** (reshaped) |
| t004 | Income report over incomeData/incomeHierarchyData               | 30m | t003                   | **DONE** (reshaped) |
| t005 | Cash-flow report: income vs expense bars + net-profit line      | 50m | t001, t002             | **DONE** (reshaped) |
| t006 | Net-worth report: net-worth line + assets vs liabilities        | 40m | t002, w1/m2/t001       | **DONE** (obsolete) |
| t007 | Category drill-down: breakdown row → account entries            | 45m | t003, w1/m2/t005       | **DONE** (partial)  |
| t008 | UX pass — light/dark, i18n, loading bg, safe area, analytics    | 40m | t004, t005, t006, t007 | **DONE**            |
| t009 | Simplify pass over reports-tab code                             | 30m | t008                   | **DONE**            |
| t010 | Unit tests for report selectors + behavior                      | 40m | t008                   | **DONE**            |

## Definition of done

The Reports tab lets a user switch between Spending, Income, Cash Flow, and Net Worth; each report renders a chart plus a breakdown for the selected time range; tapping a spending/income category opens the transactions behind the number. Numbers reconcile with the ledger (spot-checked against the web app). Rendered correctly in light **and** dark, strings localized via `useTranslations()` from the English base, loading states with background colors, `SafeAreaView` spacing, analytics on mount. `yarn test:unit` green.

## How it landed

The four-segment switcher was built and then deliberately removed. `0bf3e11` (2026-07-23, _"replace tabbed reports with combined dashboard"_) deleted `spending-report.tsx`, `income-report.tsx`, and `cash-flow-report.tsx` in favour of one scrolling dashboard: time-range pills → a combined income/expense/net chart (`src/common/d3/income-expense-bar-chart.tsx`) → an expense breakdown card → an income breakdown card → recent transactions. One range and one axis replaced four segments, so the milestone's user-facing promise — see where money went, what came in, whether you are net-positive, over a range you pick — holds, while the specced navigation does not exist and should not be rebuilt.

Two deltas against the original scope, recorded rather than silently closed:

- **Net worth (t006) is out of Reports for good.** It lives on the Home dashboard, and the Accounts tab dropped its own net-worth chart for an account table (`eb70ba5`).
- **Category → filtered entries (t007) is unbuilt.** Breakdown rows expand sub-accounts in place; a separate card lists recent entries and taps through to transaction detail. Tapping a category to open its account journal scoped to the report range still needs an optional `time` param on `account-detail-screen.tsx`. Queue it as a fresh inbox note if it is still wanted.

Downstream: `w1/m7` (open) has `t001` depending on `w1/m3/t002`'s segment switcher and deep-linking an `initial segment` — both gone. That milestone needs a rewrite against the combined dashboard before it is picked up.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-07-06 ("add a reports tab like monarch app").
- **Goal linkage:** Pillar 3 **Analytics & insights** — the pillar's core promise ("income/expense breakdowns … without spreadsheets"); Pillar 4 **Plain-text fidelity** preserved (pure read-only derivation of the ledger).
- **Expected outcome:** users see where money went, what came in, and whether they are net-positive each month, and can tap from any category total down to the underlying transactions — currently impossible in the app.
- **Why now:** depends on w1/m2's GraphQL plumbing (balance sheet) and account-detail screen (drill-down target), so it slots immediately after; `getLedgerIncomeStatement` is sitting unused server-side; the charting stack is already installed — no new dependencies.
