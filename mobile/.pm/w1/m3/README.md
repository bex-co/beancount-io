# w1 · m3 — Monarch-style Reports tab

**Worker:** worker1 **Goal:** A Reports tab with a segmented switcher — Spending / Income / Cash Flow / Net Worth — each a chart + breakdown over a selectable time range, with category drill-down to the underlying entries. **Status:** todo

## Tasks (in order)

| id   | title                                                           | est | depends_on             |
| ---- | --------------------------------------------------------------- | --- | ---------------------- |
| t001 | Income-statement GraphQL op + use-income-statement hook         | 30m | w1/m2/t001             |
| t002 | Reports tab route + shell: segment switcher + shared time range | 40m | —                      |
| t003 | Spending report: monthly bar chart + category breakdown list    | 60m | t001, t002             |
| t004 | Income report over incomeData/incomeHierarchyData               | 30m | t003                   |
| t005 | Cash-flow report: income vs expense bars + net-profit line      | 50m | t001, t002             |
| t006 | Net-worth report: net-worth line + assets vs liabilities        | 40m | t002, w1/m2/t001       |
| t007 | Category drill-down: breakdown row → account entries            | 45m | t003, w1/m2/t005       |
| t008 | UX pass — light/dark, i18n, loading bg, safe area, analytics    | 40m | t004, t005, t006, t007 |
| t009 | Simplify pass over reports-tab code                             | 30m | t008                   |
| t010 | Unit tests for report selectors + behavior                      | 40m | t008                   |

## Definition of done

The Reports tab lets a user switch between Spending, Income, Cash Flow, and Net Worth; each report renders a chart plus a breakdown for the selected time range; tapping a spending/income category opens the transactions behind the number. Numbers reconcile with the ledger (spot-checked against the web app). Rendered correctly in light **and** dark, strings localized via `useTranslations()` from the English base, loading states with background colors, `SafeAreaView` spacing, analytics on mount. `yarn test:unit` green.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-07-06 ("add a reports tab like monarch app").
- **Goal linkage:** Pillar 3 **Analytics & insights** — the pillar's core promise ("income/expense breakdowns … without spreadsheets"); Pillar 4 **Plain-text fidelity** preserved (pure read-only derivation of the ledger).
- **Expected outcome:** users see where money went, what came in, and whether they are net-positive each month, and can tap from any category total down to the underlying transactions — currently impossible in the app.
- **Why now:** depends on w1/m2's GraphQL plumbing (balance sheet) and account-detail screen (drill-down target), so it slots immediately after; `getLedgerIncomeStatement` is sitting unused server-side; the charting stack is already installed — no new dependencies.
