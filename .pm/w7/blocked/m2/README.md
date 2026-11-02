# w7 · m2 — Store products, notifications, and release-gate decisions are in place

**Worker:** worker1 **Goal:** both store consoles hold the six products and send notifications, Stripe has the restricted portal configuration, and the owner's release-gate decisions are recorded in ADR 001 **Status:** blocked

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Record the release-gate decisions in ADR 001 | 30m | — |
| t002 | App Store Connect: subscription group and six products | 1h | — |
| t003 | Play Console: three subscriptions with monthly and yearly base plans | 1h | — |
| t004 | Stripe: the restricted Customer Portal configuration — **DONE** | 30m | — |
| t005 | Store catalog matches the consoles | 30m | t002, t003, w7/m1/t001 |
| t006 | Simplify | 30m | t001, t004, t005 |
| t007 | Test coverage | 30m | t001, t004, t005 |
| t008 | Closeout | 15m | t006, t007 |

## Blocked

**Blocked 2026-11-01** — t001, t002, and t003 need the owner, and everything left here depends on them (t005 on t002 and t003; t006, t007, and t008 on t005 and t001). t004 closed by triage.

- **t001, release gates.** Only the owner can decide these. **Unblock:** each of ADR 001's Open Questions is decided in the text or deferred by the owner with a date: store price points, a grace period for accounts that used the mobile waivers, whether a store-to-Stripe switch defers the first charge, purchase-transfer rules, grace-period length, payload retention, support ownership, and the US web-purchase link. The ADR gives a recommendation for most of them. `/unblock w7` walks the owner through them.
- **t002, App Store Connect.** The Paid Apps agreement, tax, and banking are console-only and owner-only. **Unblock:** the owner completes them; the group, products, notification URLs, and In-App Purchase key can then follow.
- **t003, Play Console.** The payments profile is owner-only, and the Pub/Sub topic and service account need the owner's Google Cloud project. **Unblock:** the owner completes the profile and grants access to create the subscriptions, topic, and service account.

Who can clear it: the owner. m3/t002 and later tasks that need real sandbox purchases wait on this.

## Definition of done

- ADR 001's release gates are decided or explicitly deferred by the owner.
- Both consoles hold the six products as D1 and D6 define them, with notifications pointed at the backend.
- The restricted portal configuration exists in Stripe, and the backend reads its ID from configuration.
- The backend catalog matches both consoles.

## Source + Goal linkage

- **Source:** [ADR 001](../../../docs/adrs/ADR001-mobile-billing.md) (revised 2026-10-25), sequenced by `/pm for implementing ADR001 across all places` on 2026-11-01. Covers Rollout step 2 and the Open Questions and Release Gates section.
- **Goal linkage:** A3 (community & distribution). App Review rejected iOS 1.20261002.50 under guideline 3.1.1: Web plans unlock features in the app, which sells nothing. Until both apps sell the beancount.io plans through their stores, no iOS release can ship, which freezes the app as a distribution channel and keeps Android behind the same release train.
- **Expected outcome:** sandbox purchases become possible, so m3 and m4 can record real fixtures and m9 can run end to end.
- **Why now:** console setup, banking, and the owner's decisions take calendar time outside the repository, so they start alongside m1 rather than after it.
- **Adoption surface:** omitted. This milestone changes console configuration and records decisions; nothing user-facing ships until m7 and m8.
