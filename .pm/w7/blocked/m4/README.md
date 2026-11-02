# w7 · m4 — Google Play purchases verify, acknowledge, and stay current on the backend

**Worker:** worker1 **Goal:** the backend accepts a Play Billing purchase from the Android app, acknowledges it, keeps it current from real-time developer notifications, and grants or removes the plan accordingly **Status:** blocked

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | confirmStorePurchase for Google Play | 2h | w7/m3/t002, w7/m2/t003 |
| t002 | Real-time developer notifications endpoint | 1h30m | t001 |
| t003 | Account deletion cancels Google Play renewal | 45m | t001 |
| t004 | Simplify | 30m | t002, t003 |
| t005 | Test coverage | 1h | t002, t003 |
| t006 | Closeout | 15m | t004, t005 |

## Blocked

**Blocked 2026-11-01** — t001 needs m3/t002's `confirmStorePurchase` and the m2/t003 subscriptions. t002 to t006 follow it. The owner approved Google's client (`@googleapis/androidpublisher`) on 2026-11-01.

**Unblock:** m3/t002 and m2/t003 clear. Who can clear it: the owner.

## Definition of done

- Contract tests on recorded, redacted license-tester fixtures cover every Play state and the replacement chain.
- Purchases are acknowledged only after they are stored, and notifications refuse unauthenticated pushes.
- Deletion cancels Play renewals before the account goes.
- `yarn typecheck`, `yarn test`, and `yarn generate-v1-openapi` from `backend-cluster/backend-v2/` pass.

## Source + Goal linkage

- **Source:** [ADR 001](../../../docs/adrs/ADR001-mobile-billing.md) (revised 2026-10-25), sequenced by `/pm for implementing ADR001 across all places` on 2026-11-01. Covers D6 (Google), D7 (Android), D8, D10 (Google Play), and D11.
- **Goal linkage:** A3 (community & distribution). App Review rejected iOS 1.20261002.50 under guideline 3.1.1: Web plans unlock features in the app, which sells nothing. Until both apps sell the beancount.io plans through their stores, no iOS release can ship, which freezes the app as a distribution channel and keeps Android behind the same release train.
- **Expected outcome:** an Android purchase can be verified, acknowledged, and kept current, which m8's Android flow needs.
- **Why now:** Google refunds an unacknowledged purchase after three days, so acknowledgement must exist before any real purchase; it reuses m3's claim handling.
- **Adoption surface:** omitted. The only client is the Android app in m8.
