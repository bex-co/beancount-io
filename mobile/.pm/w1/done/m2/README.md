# w1 · m2 — Monarch-style Accounts tab

**Worker:** worker1 **Goal:** A dedicated Accounts tab: net-worth chart with time ranges up top, accounts grouped with subtotals below, tap-through to a per-account detail screen (balance history + recent entries). **Status:** done

## Tasks (in order)

| id   | title                                                               | est | depends_on | status     |
| ---- | ------------------------------------------------------------------- | --- | ---------- | ---------- |
| t001 | GraphQL ops + hooks: balance sheet, account journal, account report | 45m | —          | — **DONE** |
| t002 | Accounts tab route + registration + i18n key                        | 30m | —          | — **DONE** |
| t003 | Net-worth header: current total + line chart with time-range pills  | 50m | t001, t002 | — **DONE** |
| t004 | Grouped account list with subtotals (shared from home account list) | 45m | t002       | — **DONE** |
| t005 | Account detail screen: balance-history chart + paginated entries    | 60m | t001, t004 | — **DONE** |
| t006 | UX pass — light/dark, i18n, loading bg, safe area, analytics        | 40m | t003, t005 | — **DONE** |
| t007 | Simplify pass over accounts-tab code                                | 30m | t006       | — **DONE** |
| t008 | Unit tests for accounts selectors + behavior                        | 40m | t006       | — **DONE** |

## Definition of done

Opening the Accounts tab shows (1) current net worth with a line chart switchable across time ranges, (2) accounts grouped as Assets/Liabilities with group subtotals and per-account balances, (3) tapping an account opens a detail screen with its balance-history chart and its latest entries with running balances. All read-only; numbers match the ledger. Rendered correctly in light **and** dark, strings localized via `useTranslations()` from the English base, loading states with background colors, `SafeAreaView` spacing, analytics on mount. `yarn test:unit` green.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-07-06 ("add accounts tab like monarch"), continuing the Monarch-reference direction from w1/m1.
- **Goal linkage:** Pillar 3 **Analytics & insights** (account balances and net worth at a glance); Pillar 4 **Plain-text fidelity** (read-only views over the real ledger, no derived proprietary state).
- **Expected outcome:** beancount.io users answer "what do I have, where, and how has it changed" in two taps — today that requires the web app or reading the ledger text.
- **Why now:** w1/m1 just shipped the chart/card foundation (`DashboardCard`, `PagedCarousel`, `TimeRangePills`, `src/common/d3/` charts) and the account-hierarchy selectors; the server-side `getLedgerBalanceSheet` / `getLedgerAccountJournal` / `getLedgerAccountReport` queries already exist and are unused. Zero new dependencies; w1/m3 (Reports) reuses this milestone's plumbing, so it sequences first.
