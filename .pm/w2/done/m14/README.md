# w2 · m14 — Centralized authz for billing and subscriptions

**Worker:** worker2 **Goal:** route billing reads and subscription mutations through protected application-service methods and the shared PDP while preserving credential, Stripe-ownership, rate-budget, audit, and client-error contracts **Status:** done

## Tasks (in order)

| id   | title                                                                         | est | depends_on |
| ---- | ----------------------------------------------------------------------------- | --- | ---------- |
| t001 | Catalog billing actions, credential ceilings, and operational risk — **DONE** | 40m | —          |
| t002 | Migrate subscription application-service boundaries — **DONE**                | 60m | t001       |
| t006 | Verify domain isolation, failures, budgets, and audit — **DONE**              | 35m | t002       |
| t003 | Adoption surface — **DONE**                                                   | 20m | t006       |
| t004 | Simplify — **DONE**                                                           | 15m | t003       |
| t005 | Test coverage — **DONE**                                                      | 45m | t003       |
| t007 | Closeout — **DONE**                                                           | 15m | t004, t005 |

## Definition of done

- Subscription status, checkout/portal, cancel/resume/upgrade operations have explicit canonical actions in the one executable TypeScript catalog and one final service-boundary PDP call. The static tier-quota catalog is an explicit public exception with no identity or PDP ceremony.
- Protected user billing eligibility comes from `user#can_read/write_billing`; accepted credential methods and legacy scope ceilings live in the PDP catalog, while `op-class.ts` preserves operational budgets and transport aliases. An explicit override also preserves the public tier-quota catalog's legacy budget.
- Stripe customer binding and subscription-state checks remain domain invariants, not FGA relationships.
- No protected billing operation becomes reachable by an API key or OAuth credential that was previously denied; public tier quotas preserve their pre-cutover anonymous contract.
- Denials preserve actionable client errors, relationship-source failures surface as audited service-unavailable errors, and each call emits the expected audit behavior without a decision memo.
- The shared w2 migration contract is satisfied, including focused/full checks, applied migrations, a deployed development billing smoke test, and persisted-audit verification.

## Source + Goal linkage

- **Source:** user-directed domain-by-domain centralized-authz migration, sequenced after w2/m13.
- **Goal linkage:** **A2 — Frictionless onboarding** — account holders can manage subscriptions consistently without transport-specific authorization surprises.
- **Expected outcome:** billing authority is decided once for the authenticated user while Stripe continues to own payment state.
- **Why now:** billing is a small, self-user domain that exercises credential-method restrictions before shared-ledger relationships.
- **Adoption surface:** included because subscription behavior is directly user-facing.
- **Migration contract:** inherits `.pm/w2/README.md`; production deployment and pricing/product changes remain separate.
