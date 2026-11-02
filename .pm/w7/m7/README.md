# w7 · m7 — The apps show the plan, its billing source, and limit refusals that say whose plan it is

**Worker:** worker1 **Goal:** both apps show the same plan card as the Web, refuse limits with the right owner's plan, warn App Store subscribers before deletion, and open beancount.io pages only with the app marker **Status:** in progress (t001, t002 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Plan card in Settings — **DONE** | 1h30m | w7/m1/t010 |
| t002 | Limit refusals say whose plan it is — **DONE** | 1h | t001 |
| t003 | Account deletion warns App Store subscribers | 45m | t001, w7/m3/t004 |
| t004 | Beancount pages opened from the app carry the app marker | 45m | w7/m6/t006 |
| t005 | Translations and visual checks | 1h | t002, t003, t004 |
| t006 | Adoption surface | 30m | t005 |
| t007 | Simplify | 30m | t006 |
| t008 | Test coverage | 1h | t006 |
| t009 | Closeout | 15m | t007, t008 |

## Definition of done

- Both apps show the D14 plan card for every billing source, with no link or call to buy outside the store.
- Refusals name the right owner's plan, and collaborators are never offered a purchase.
- Every beancount.io page the app opens carries the marker and shows no billing.
- `yarn format:check` and `yarn test` (lint, typecheck, unit tests) from `mobile/` pass, with simulator screenshots in both themes.

## Source + Goal linkage

- **Source:** [ADR 001](../../../docs/adrs/ADR001-mobile-billing.md) (revised 2026-10-25), sequenced by `/pm for implementing ADR001 across all places` on 2026-11-01. Covers D10 (app warning), D13 (mobile documents), and D14 (apps).
- **Goal linkage:** A3 (community & distribution). App Review rejected iOS 1.20261002.50 under guideline 3.1.1: Web plans unlock features in the app, which sells nothing. Until both apps sell the beancount.io plans through their stores, no iOS release can ship, which freezes the app as a distribution channel and keeps Android behind the same release train.
- **Expected outcome:** app users see where their plan is managed and why a limit applies, and App Review no longer finds billing behind the app's own links.
- **Why now:** it needs only m1 and m6's marker, and m8's purchase flow builds on the plan screen. It lands on `main` without a store release; the next release is m9's.
- **Adoption surface:** included, because the plan screen and refusals are user-facing in all 13 locales.
