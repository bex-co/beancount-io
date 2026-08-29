# w2 · m14 — Centralized authz for billing and subscriptions

**Worker:** worker2 **Goal:** route billing reads and subscription mutations through the shared PDP while preserving browser-session and Stripe ownership constraints **Status:** todo

## Tasks (in order)

| id   | title                                        | est | depends_on |
| ---- | -------------------------------------------- | --- | ---------- |
| t001 | Model billing actions and credential rules   | 35m | —          |
| t002 | Migrate subscription reads and mutations     | 55m | t001       |
| t003 | Adoption surface                             | 20m | t002       |
| t004 | Simplify                                     | 15m | t003       |
| t005 | Test coverage                                | 35m | t003       |
| t006 | Verify domain isolation and no regressions   | 25m | t004, t005 |
| t007 | Closeout                                     | 10m | t006       |

## Definition of done

- Subscription status, checkout/portal, cancel/resume/upgrade, and tier-quota operations have explicit canonical actions and one final decision.
- User billing eligibility comes from `user#can_read/write_billing`; interactive-session requirements remain credential policy in the PDP.
- Stripe customer binding and subscription-state checks remain domain invariants, not FGA relationships.
- No billing operation becomes reachable by an API key or OAuth credential that was previously denied.
- No OpenFGA runtime, tuple store, database, or new dependency is introduced; required backend/model checks pass.

## Source + Goal linkage

- **Source:** user-directed domain-by-domain centralized-authz migration, sequenced after w2/m13.
- **Goal linkage:** **A2 — Frictionless onboarding** — account holders can manage subscriptions consistently without transport-specific authorization surprises.
- **Expected outcome:** billing authority is decided once for the authenticated user while Stripe continues to own payment state.
- **Why now:** billing is a small, self-user domain that exercises credential-method restrictions before shared-ledger relationships.
- **Adoption surface:** included because subscription behavior is directly user-facing.
