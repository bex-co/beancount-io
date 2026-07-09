# w1 · m4 — Account detail polish

**Worker:** worker1 **Goal:** The account detail screen feels finished: the header back arrow renders again, and the transactions list looks and reads exactly like the Journal tab (avatar rows, date grouping, amount colors) while keeping running balances. **Status:** done

## Tasks (in order)

| id   | title                                                        | est | depends_on | status     |
| ---- | ------------------------------------------------------------ | --- | ---------- | ---------- |
| t001 | Restore the stack-header back arrow icon                     | 30m | —          | — **DONE** |
| t002 | Restyle account-detail transactions list to match Journal    | 60m | —          | — **DONE** |
| t003 | UX pass — light/dark, i18n, loading bg, safe area, analytics | 30m | t001, t002 | — **DONE** |
| t004 | Simplify pass over account-detail changes                    | 30m | t003       | — **DONE** |
| t005 | Unit tests for account-detail row mapping + behavior         | 40m | t003       | — **DONE** |

## Definition of done

Pushing into an account from the Accounts tab shows a visible back arrow in the header (light **and** dark) that navigates back; the transactions list under the balance chart renders with the Journal tab's visual language — avatar initials, name/amount typography, amount coloring, and date section grouping — with each entry's running balance still visible, and pagination/refresh/empty/error states intact. No hard-coded colors; strings via `useTranslations()`. `yarn test:unit` green.

## Source + Goal linkage

- **Source:** `/pm` request 2026-07-08 — user report: back button's arrow icon is missing on account detail; transactions list should share the same styles as Journal.
- **Goal linkage:** Pillar 3 **Analytics & insights** — the account detail screen is the drill-down target of the Accounts tab (w1/m2); broken navigation and inconsistent list styling undermine the "understand your money at a glance" promise. Advances the cross-cutting quality bar (delightful in light **and** dark).
- **Expected outcome:** beancount.io users drilling into an account get a working back affordance and one consistent transaction-row design across Journal, Home (recent transactions), and account detail — no visual context switch.
- **Why now:** the missing back arrow is a visible regression, likely from the Expo 57 / react-navigation bump (`694f79a`), on a screen that just shipped (w1/m2); w1/m3 (Reports) reuses this exact screen as its category drill-down target (m3/t007), so polishing it now prevents propagating the inconsistency into Reports.
