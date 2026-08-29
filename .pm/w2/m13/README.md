# w2 · m13 — Centralized authz foundation for user identity and API credentials

**Worker:** worker2 **Goal:** establish the reusable TypeScript PDP and route the user/profile/lifecycle/API-key domain through one final authorization decision backed by existing authoritative data **Status:** todo

## Tasks (in order)

| id   | title                                                    | est | depends_on |
| ---- | -------------------------------------------------------- | --- | ---------- |
| t001 | Ratify the source-backed centralized-authz boundary      | 35m | —          |
| t002 | Generalize the canonical action and PDP contract         | 45m | t001       |
| t003 | Add user-self and API-key relationship evaluators        | 40m | t002       |
| t004 | Migrate user identity and API-credential operations      | 55m | t003       |
| t005 | Adoption surface                                         | 20m | t004       |
| t006 | Simplify                                                 | 20m | t005       |
| t007 | Test coverage                                            | 40m | t005       |
| t008 | Closeout                                                 | 10m | t006, t007 |

## Definition of done

- The centralized `AuthorizationService` supports a closed canonical-action contract beyond `user.delete` without adding a second policy file or DSL.
- User profile, lifecycle, and API-key management operations make one final PDP decision before side effects, with the target derived from trusted identity or database data.
- Relationship evaluation queries current backend-v2 data or exact-self identity facts; it stores no tuples and uses no cross-request authorization cache.
- Authentication ceremonies remain explicitly outside relationship authorization, and existing mobile/dashboard/API contracts keep working.
- No OpenFGA runtime, service, database, SDK, contextual tuples, or new dependency is introduced.
- Focused/full backend checks, the FGA model suite, and guidance validation pass.

## Source + Goal linkage

- **Source:** user decision 2026-08-28 following w2/m12: centralize backend-v2 authorization by business domain, querying existing sources of truth instead of deploying an OpenFGA runtime or tuple store.
- **Goal linkage:** **A1 — Agent-native accounting** — API-key and OAuth automation receive the same user-domain decision regardless of GraphQL, REST, or MCP entry surface.
- **Expected outcome:** maintainers add user-domain authority once in the PDP, and interactive or agent credentials cannot gain authority from a transport-specific fallback.
- **Why now:** m12 proved the lightweight seam with `user.delete`; the smallest next domain establishes reusable contracts before ledger-sized migrations.
- **Adoption surface:** included because API credentials and contributor-facing authz documentation are directly affected.
