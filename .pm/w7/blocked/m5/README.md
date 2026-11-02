# w7 · m5 — Store subscriptions reconcile on a schedule and support can see them

**Worker:** worker1 **Goal:** a missed store notification leaves a plan wrong for at most 24 hours, billing problems show up in metrics, and support can see an account's billing sources **Status:** blocked

## Tasks (in order)

| id | title | est | depends_on |
| --- | --- | --- | --- |
| t001 | Hourly reconciliation job | 1h | w7/m3/t003, w7/m4/t002 |
| t002 | Daily sweep and mismatch alerts | 45m | t001 |
| t003 | Store billing metrics | 1h | t001 |
| t004 | Support view of an account's billing sources | 1h | t001 |
| t005 | Notification payload retention | 30m | t002, w7/m2/t001 |
| t006 | Simplify | 30m | t003, t004, t005 |
| t007 | Test coverage | 1h | t003, t004, t005 |
| t008 | Closeout | 15m | t006, t007 |

## Blocked

**Blocked 2026-11-01** — t001 reconciles what m3/t003 and m4/t002 write, so nothing here has data yet. t005 also needs the retention decision in m2/t001.

**Unblock:** m3 and m4 clear. Who can clear it: the owner, through m2 and the dependency approvals.

## Definition of done

- A dropped notification is corrected by reconciliation in tests, within the 24-hour objective.
- Every metric ADR 001 names is emitted, and sandbox events stay out of revenue.
- Support can see sources and trigger reconciliation, and cannot grant.
- `yarn typecheck`, `yarn test`, and `yarn generate-v1-openapi` from `backend-cluster/backend-v2/` pass.

## Source + Goal linkage

- **Source:** [ADR 001](../../../docs/adrs/ADR001-mobile-billing.md) (revised 2026-10-25), sequenced by `/pm for implementing ADR001 across all places` on 2026-11-01. Covers D12 and Reliability and Operations.
- **Goal linkage:** A3 (community & distribution). App Review rejected iOS 1.20261002.50 under guideline 3.1.1: Web plans unlock features in the app, which sells nothing. Until both apps sell the beancount.io plans through their stores, no iOS release can ship, which freezes the app as a distribution channel and keeps Android behind the same release train.
- **Expected outcome:** store plans stay correct when notifications are lost, and the owner can measure purchases by surface without app analytics.
- **Why now:** the release gates require the reconciliation path to pass end-to-end tests before production (m9).
- **Adoption surface:** omitted. Operators and support are the only audience.
