# w7 · m3 — App Store purchases verify and stay current on the backend

**Worker:** worker1 **Goal:** the backend accepts a StoreKit 2 purchase from the iOS app, keeps it current from Apple's notifications, and grants or removes the plan accordingly **Status:** in progress (t001 done)

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | storeBillingIdentity and the account tokens — **DONE** | 1h | w7/m1/t010 |
| t002 | confirmStorePurchase for the App Store | 2h | t001, w7/m2/t002 |
| t003 | App Store Server Notifications V2 endpoint | 1h30m | t002 |
| t004 | Account deletion with an App Store subscription | 45m | t002 |
| t005 | Simplify | 30m | t003, t004 |
| t006 | Test coverage | 1h | t003, t004 |
| t007 | Closeout | 15m | t005, t006 |

## Definition of done

- Contract tests on recorded, redacted sandbox fixtures cover purchase, claim, conflict, and every notification type.
- The notification endpoint is a registered provider callback that refuses unsigned payloads.
- No log line contains a token, signed transaction, or key.
- `yarn typecheck`, `yarn test`, and `yarn generate-v1-openapi` from `backend-cluster/backend-v2/` pass, with the authorization model tests.

## Source + Goal linkage

- **Source:** [ADR 001](../../../docs/adrs/ADR001-mobile-billing.md) (revised 2026-10-25), sequenced by `/pm for implementing ADR001 across all places` on 2026-11-01. Covers D7 (iOS), D8, D9, D10 (App Store), D11, and D13.
- **Goal linkage:** A3 (community & distribution). App Review rejected iOS 1.20261002.50 under guideline 3.1.1: Web plans unlock features in the app, which sells nothing. Until both apps sell the beancount.io plans through their stores, no iOS release can ship, which freezes the app as a distribution channel and keeps Android behind the same release train.
- **Expected outcome:** an iOS purchase can be verified and kept current, which m8's purchase flow needs.
- **Why now:** it depends only on m1's tables and m2's products, and m8 cannot start its iOS flow without it.
- **Adoption surface:** omitted. The only client is the iOS app in m8; the parity contract is updated in t001.
