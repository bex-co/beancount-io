# w1 · m5 — Settings in the ledger drawer, drop the Settings tab

**Worker:** worker1 **Goal:** Monarch-style navigation: Settings lives in the left reveal drawer (menu section under the ledger list) and opens as a pushed screen with back navigation; the Settings tab disappears, freeing the 5th tab slot for w1/m3's Reports tab. **Status:** done

## Tasks (in order)

| id   | title                                                           | est | depends_on |
| ---- | --------------------------------------------------------------- | --- | ---------- |
| t001 | Settings as a pushed stack route (`/settings`)                  | 40m | —          | — **DONE** |
| t002 | Drawer menu section: Settings row (+ profile row) → `/settings` | 30m | t001       | — **DONE** |
| t003 | Remove the Settings tab + reference sweep                       | 25m | t002       | — **DONE** |
| t004 | UX pass — light/dark, i18n, safe area, analytics                | 30m | t003       | — **DONE** |
| t005 | Simplify pass over drawer/settings navigation code              | 20m | t004       | — **DONE** |
| t006 | Unit tests for behavior this milestone shipped                  | 30m | t004       | — **DONE** |

## Definition of done

The tab bar has four tabs (Home, Accounts, Journal, Ledger). Opening the drawer shows, below the ledger list, a menu section with a Settings entry (Monarch-style: icon + label); tapping it closes the drawer and pushes the Settings screen with a working back button. Every existing settings capability (language, theme, ledger selection, invite friends, review, help center, logout, delete account) remains reachable from the pushed screen. No dangling references to the old tab route. Correct in light **and** dark, strings via `useTranslations()` from the English base, `SafeAreaView` spacing on the pushed screen, analytics on mount preserved. `yarn test:unit` green.

## Source + Goal linkage

- **Source:** `/pm` request 2026-07-08 ("learn from monarch, move settings into the left sidebar and then remove the settings tab") + Monarch menu references on Mobbin (menu with Preferences/profile entries); complements open inbox note `w1/001.md` (tab-bar crowding; Ledger-tab fold-in stays a separate product decision).
- **Goal linkage:** Pillar 3 **Analytics & insights** — by sequence: w1/m3's Reports tab needs a tab slot, and Monarch-style tab bars cap at 5; demoting Settings (a low-frequency destination) keeps the bar at five when Reports lands. Also the cross-cutting quality bar (delightful, uncluttered navigation).
- **Expected outcome:** users reach high-frequency destinations (Home, Accounts, Journal, Ledger, and soon Reports) in one tap while Settings sits one swipe + one tap away in the drawer, matching the Monarch pattern they know; the tab bar stops growing.
- **Why now:** the reveal drawer just shipped (commit `4d3d3e4`), so the drawer is finally a natural home for Settings; doing this **before** w1/m3 ships avoids a 6-tab interim state and a second navigation reshuffle.
