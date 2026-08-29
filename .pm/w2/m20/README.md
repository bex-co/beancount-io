# w2 · m20 — Retire distributed authorization gates after domain cutovers

**Worker:** worker2 **Goal:** complete backend-v2 convergence on one final PDP after every business-domain milestone is done, while retaining explicit authentication/public/webhook/infrastructure boundaries **Status:** todo

## Tasks (in order)

| id   | title                                               | est | depends_on |
| ---- | --------------------------------------------------- | --- | ---------- |
| t001 | Audit canonical-action and explicit-exclusion coverage | 45m | —          |
| t002 | Retire duplicate transport and service policy gates | 60m | t001       |
| t003 | Consolidate audit, failure, and request-cache behavior | 45m | t002       |
| t004 | Run whole-backend authorization parity validation   | 60m | t003       |
| t005 | Adoption surface                                    | 25m | t004       |
| t006 | Simplify                                            | 25m | t005       |
| t007 | Test coverage                                       | 60m | t005       |
| t008 | Closeout                                            | 10m | t006, t007 |

## Definition of done

- Every protected backend-v2 business verb and every GraphQL/REST/MCP alias maps exhaustively to one canonical action; authentication ceremonies, public endpoints, signed webhooks, metrics/admin ingress, and infrastructure routes carry explicit non-PDP reasons.
- `AuthorizationService` is the only final authority for migrated business actions and composes credential plus current-source relationship ceilings once.
- Coarse read/write/admin op-class decisions, GraphQL `@Authorized` policy, ledger-pin middleware exceptions, route guards, and service-local authorization assertions no longer form competing final authorities.
- Authentication, credential verification, webhook signatures, input validation, quotas, safe paths, and transactional invariants remain in their correct layers.
- Decision audit uses canonical action/resource/reason metadata without arguments, secrets, tokens, or PII; authorization caches are request-local only.
- No OpenFGA runtime/service/database/SDK, tuple store, contextual tuple, or second policy DSL exists.
- Full backend tests/typecheck/build, surface coverage/parity, FGA model suite, secret scan, and guidance validation pass.

## Source + Goal linkage

- **Source:** user-directed domain-by-domain centralized-authz migration; final convergence after w2/m13–m19.
- **Goal linkage:** **A1 — Agent-native accounting** — every agent/API surface consumes the same authorization vocabulary and cannot bypass a decision through another transport.
- **Expected outcome:** contributors can trace any business authorization decision to one PDP action and one source-backed relationship evaluation, with existing clients preserved.
- **Why now:** duplicate gates are removed only after all domains have proven parity, preventing a big-bang migration or accidental behavior break.
- **Adoption surface:** included because this milestone validates the complete API/MCP contributor and client-facing authorization story.
