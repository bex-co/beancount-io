# w1 · m6 — Monarch-style center "+" capture tab; Ledger moves to the drawer

**Worker:** worker1 **Goal:** Recording a transaction is one tap from any tab via a prominent center "+" button; the Ledger web view relocates to the drawer menu (same pattern as m5's Settings), keeping the tab bar at five slots: Home, Accounts, +, Reports, Journal. **Status:** todo

## Tasks (in order)

| id   | title                                                               | est | depends_on |
| ---- | ------------------------------------------------------------------- | --- | ---------- |
| t001 | Ledger as a pushed stack route + drawer menu row                    | 35m | w1/m5/t002 |
| t002 | Remove the Ledger tab + reference sweep                             | 25m | t001       |
| t003 | Center "+" tab button opening the add-transaction flow              | 45m | t002       |
| t004 | Consolidate add-transaction entry points + capture-source analytics | 30m | t003       |
| t005 | UX pass — light/dark, i18n, safe area, analytics                    | 30m | t004       |
| t006 | Simplify pass over navigation/capture changes                       | 20m | t005       |
| t007 | Unit tests for behavior this milestone shipped                      | 30m | t005       |

## Definition of done

From any tab, tapping the center "+" opens the add-transaction flow (the tab bar does not switch tabs); the Ledger editor is reachable from the drawer menu as a pushed screen with a working back button; the tab bar shows Home, Accounts, +, Reports, Journal (Reports once w1/m3 ships; four tabs + "+" until then); no dangling references to the old `/ledger` tab route. Correct in light **and** dark, strings via `useTranslations()` from the English base, `SafeAreaView` spacing on the pushed screen, analytics preserved on the Ledger screen mount and a capture-source property added to the add-transaction event. `yarn test:unit` green.

## Source + Goal linkage

- **Source:** `/pm-brainstorm` 2026-07-08 ("for w1") + inbox note `w1/001.md` (tab-crowding / Ledger-tab product decision — resolved by this milestone; note closed on materialization).
- **Goal linkage:** Pillar 1 **Effortless capture** — first w1 work on this pillar ("minimal taps … fast flows for the on-the-go moments"); cross-cutting quality bar (uncluttered Monarch-style navigation).
- **Expected outcome:** capture drops to one always-visible tap from anywhere in the app instead of a per-screen button hunt; power users keep the Ledger editor one swipe away in the drawer.
- **Why now:** w1/m5 establishes the exact drawer-menu + pushed-route pattern this reuses, and w1/m3 fills the fifth tab slot — doing this as part of the same reshuffle avoids a third round of navigation churn. It is also the natural landing pad for a future pillar-2 AI capture sheet without another layout change. No new dependencies (custom `tabBarButton` is stock react-navigation bottom tabs via expo-router).
