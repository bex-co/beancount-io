# w7 · m8 — The apps sell and restore the plans through the App Store and Google Play

**Worker:** worker1 **Goal:** a signed-in user can buy, change, restore, and manage any self-serve plan in either app, and the plan applies everywhere at once **Status:** todo

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Add expo-iap | 45m | — |
| t002 | Per-provider purchase switch | 45m | — |
| t003 | Plan sheet | 2h | t001, t002, w7/m7/t001 |
| t004 | iOS purchase flow | 1h30m | t003, w7/m3/t003 |
| t005 | Android purchase flow | 1h30m | t003, w7/m4/t002 |
| t006 | Restore and another account's purchase | 45m | t004, t005 |
| t007 | Limit refusals open the plan sheet | 45m | t003, w7/m7/t002 |
| t008 | Store messages: billing problems and price increases | 45m | t004, t005 |
| t009 | Translations and visual checks | 1h | t006, t007, t008 |
| t010 | Adoption surface | 30m | t009 |
| t011 | Simplify | 30m | t010 |
| t012 | Test coverage | 1h | t010 |
| t013 | Closeout | 15m | t011, t012 |

## Definition of done

- In sandbox and with license testers, each of the six plans can be bought, changed, restored, and managed in its app, and the plan applies on the Web at once.
- Purchase is offered only where D14 allows, and the per-provider switch stops it.
- No transaction is finished before the backend accepts it.
- `yarn format:check` and `yarn test` (lint, typecheck, unit tests) from `mobile/` pass, with simulator screenshots in both themes.

## Source + Goal linkage

- **Source:** [ADR 001](../../../docs/adrs/ADR001-mobile-billing.md) (revised 2026-10-25), sequenced by `/pm for implementing ADR001 across all places` on 2026-11-01. Covers D6, D7 (clients), D9, D14 (purchase surface), and D15.
- **Goal linkage:** A3 (community & distribution). App Review rejected iOS 1.20261002.50 under guideline 3.1.1: Web plans unlock features in the app, which sells nothing. Until both apps sell the beancount.io plans through their stores, no iOS release can ship, which freezes the app as a distribution channel and keeps Android behind the same release train.
- **Expected outcome:** the apps sell every self-serve plan on the pricing page, which guideline 3.1.3(b) requires before Web plans may unlock the app.
- **Why now:** it needs m3, m4, and m7; it is the change App Review asked for.
- **Adoption surface:** included, because purchase is the most user-facing change in the ADR.
