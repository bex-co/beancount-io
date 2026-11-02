# w7 · m9 — Launch: end-to-end store tests, the end of the mobile waivers, and the store release

**Worker:** worker1 **Goal:** both stores approve and publish an app version that sells the plans, with one set of limits on every client **Status:** blocked

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Sandbox and license-tester end-to-end runs | 2h | w7/m8/t013, w7/m5/t008, w7/m6/t010, w7/m2/t008 |
| t002 | End the mobile plan exemptions | 1h | t001, w7/m2/t001 |
| t003 | Website and Help Center pages honor the app marker | 30m | w7/m6/t006 |
| t004 | Store listings and review notes | 1h | t001 |
| t005 | Release both apps with the in-app purchases | 2h | t002, t003, t004 |
| t006 | Mark ADR 001 done | 20m | t005 |
| t007 | Adoption surface | 30m | t006 |
| t008 | Simplify | 30m | t007 |
| t009 | Test coverage | 1h | t007 |
| t010 | Closeout | 15m | t008, t009 |

## Blocked

**Blocked 2026-11-01** — nothing here can start yet.

- **t003 needs the website's maintainer.** The website and Help Center are not in this repository. **Unblock:** the maintainer hides pricing and purchase links when a page carries `beancount_app=1`, the contract in `dashboard/src/common/lib/app-session.ts`, then each page is checked on the simulator.
- **t001 needs m2, m5, m6, and m8 closed,** and t002, t004 to t010 follow it.

Who can clear it: the owner.

## Definition of done

- The end-to-end list passes on both platforms against a non-production backend.
- Every client gets the same plan limits, apart from the owner's decided grace period.
- Both stores have published a version that sells the six plans, and ADR 001 says Done.
- `yarn format:check` and `yarn test` (lint, typecheck, unit tests) from `mobile/` pass, with the backend gates.

## Source + Goal linkage

- **Source:** [ADR 001](../../../docs/adrs/ADR001-mobile-billing.md) (revised 2026-10-25), sequenced by `/pm for implementing ADR001 across all places` on 2026-11-01. Covers D2, Rollout steps 4 and 5, Testing Strategy, and the release gates.
- **Goal linkage:** A3 (community & distribution). App Review rejected iOS 1.20261002.50 under guideline 3.1.1: Web plans unlock features in the app, which sells nothing. Until both apps sell the beancount.io plans through their stores, no iOS release can ship, which freezes the app as a distribution channel and keeps Android behind the same release train.
- **Expected outcome:** iOS releases ship again, and both stores sell the same plans as the Web.
- **Why now:** it is the last step, and the release gates require these end-to-end runs before production.
- **Adoption surface:** included, because store listings and the app's free claim change for every reader.
