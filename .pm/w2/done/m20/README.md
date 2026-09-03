# w2 · m20 — Retire distributed authorization gates after domain cutovers

**Worker:** worker2 **Goal:** complete backend-v2 convergence on one final PDP after every business-domain milestone is done, while retaining explicit authentication/public/webhook/infrastructure boundaries **Status:** done

## Tasks (in order)

| id   | title                                               | est | depends_on |
| ---- | --------------------------------------------------- | --- | ---------- |
| t001 | Audit action-catalog, alias, and explicit-exclusion coverage — **DONE** | 60m | —          |
| t002 | Retire duplicate transport and service policy gates — **DONE**          | 75m | t001       |
| t003 | Consolidate per-call audit and failure behavior — **DONE**        | 50m | t002       |
| t004 | Run whole-backend authorization parity validation — **DONE**   | 75m | t003       |
| t005 | Adoption surface — **DONE**                                    | 25m | t004       |
| t006 | Simplify — **DONE**                                            | 25m | t005       |
| t007 | Test coverage — **DONE**                                       | 75m | t005       |
| t008 | Closeout — **DONE**                                            | 15m | t006, t007 |

## Definition of done

- Every protected backend-v2 business verb and every GraphQL/REST/MCP alias maps exhaustively to one canonical action; authentication ceremonies, public endpoints, signed webhooks, metrics/admin ingress, and infrastructure routes carry explicit non-PDP reasons.
- `AuthorizationService` is the only final authority for migrated business actions and composes credential plus current-source relationship ceilings in one final service-boundary call.
- Coarse read/write/admin op-class decisions, GraphQL `@Authorized` policy, ledger-pin middleware exceptions, route guards, and service-local authorization assertions no longer form competing final authorities.
- Authentication, credential verification, webhook signatures, input validation, quotas, safe paths, and transactional invariants remain in their correct layers.
- Decision audit uses the isolated transport operation ID (or canonical-action direct-call fallback) without arguments, secrets, tokens, or PII; every authorization call evaluates and audits independently, with no authorization decision memo or cross-request permission cache.
- No OpenFGA runtime/service/database/SDK, tuple store, contextual tuple, or second policy DSL exists.
- Source failures are logged/audited as errors and surface as service unavailable; denial concealment and actionable messages come only from the action catalog, and operational rate budgets do not drift.
- Full backend tests/typecheck/build, surface coverage/parity, FGA model suite, secret scan, guidance validation, applied migrations, deployed development smoke tests, and persisted-audit checks pass.

## Source + Goal linkage

- **Source:** user-directed domain-by-domain centralized-authz migration; final convergence after w2/m13–m19.
- **Goal linkage:** **A1 — Agent-native accounting** — every agent/API surface consumes the same authorization vocabulary and cannot bypass a decision through another transport.
- **Expected outcome:** contributors can trace any business authorization decision to one PDP action and one source-backed relationship evaluation, with existing clients preserved.
- **Why now:** duplicate gates are removed only after all domains have proven parity, preventing a big-bang migration or accidental behavior break.
- **Adoption surface:** included because this milestone validates the complete API/MCP contributor and client-facing authorization story.
- **Migration contract:** inherits `.pm/w2/README.md`; production rollout remains an explicit post-closeout action.
