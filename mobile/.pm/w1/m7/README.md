# w1 · m7 — Dashboard cards tap through to Reports and Accounts

**Worker:** worker1 **Goal:** Every number on Home is a door: dashboard cards open the matching deep view (Monarch behavior) with segment and time range pre-selected, closing the glance → drill loop that m3's Reports tab makes possible. **Status:** todo

## Tasks (in order)

| id   | title                                                           | est | depends_on |
| ---- | --------------------------------------------------------------- | --- | ---------- |
| t001 | Reports deep-link params: initial segment + optional time range | 30m | w1/m3/t002 |
| t002 | Wire the account-charts carousel pages to their deep views      | 40m | t001       |
| t003 | Spending card → Reports/Spending + tap affordances + analytics  | 30m | t002       |
| t004 | UX pass — light/dark, i18n, safe area, analytics                | 30m | t003       |
| t005 | Simplify pass over card tap-through code                        | 20m | t004       |
| t006 | Unit tests for behavior this milestone shipped                  | 30m | t004       |

## Definition of done

Tapping each Home card lands on the corresponding deep view with state pre-selected: the net-worth carousel page opens Reports/Net Worth, the spending-by-category page opens Reports/Spending, the liabilities page opens the Accounts tab, and the spending card opens Reports/Spending scoped to the compared month. Every tappable card shows a visible affordance (chevron), and analytics record which card was tapped. Correct in light **and** dark, any new strings via `useTranslations()` from the English base. `yarn test:unit` green.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-07-08 ("for w1"), extending m1's dashboard and m3's Reports tab.
- **Goal linkage:** Pillar 3 **Analytics & insights** — the glance (m1) finally connects to the breakdowns (m3); "understand their money at a glance" becomes "…and drill in one tap".
- **Expected outcome:** users go from "spending looks high" on Home to the category breakdown behind it in one tap, instead of dead-end numbers they must re-find in Reports manually.
- **Why now:** only possible once w1/m3 ships its destinations; doing it immediately after prevents the dashboard shipping as a cul-de-sac. No new dependencies — expo-router route params plus existing cards.
