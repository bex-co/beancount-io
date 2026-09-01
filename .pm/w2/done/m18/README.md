# w2 · m18 — Centralized authz for ledger administration and collaboration

**Worker:** worker2 **Goal:** centralize ledger creation/update/delete, collaborator management, leave, and public-key control at protected application boundaries without relying on coarse `ledger.admin` or downstream Gitea rejection **Status:** done

## Tasks (in order)

| id   | title                                                | est | depends_on |
| ---- | ---------------------------------------------------- | --- | ---------- |
| t001 | Catalog ledger control-plane actions and operational risk — **DONE** | 50m | —          |
| t002 | Migrate ledger create, update, and delete boundaries — **DONE**      | 65m | t001       |
| t003 | Migrate collaborators, leave, and public keys — **DONE**             | 60m | t002       |
| t004 | Verify revocation, failures, budgets, audit, and ordering — **DONE** | 50m | t003       |
| t005 | Adoption surface — **DONE**                                           | 20m | t004       |
| t006 | Simplify — **DONE**                                                   | 20m | t005       |
| t007 | Test coverage — **DONE**                                              | 60m | t005       |
| t008 | Closeout — **DONE**                                                   | 15m | t006, t007 |

## Definition of done

- Ledger create/update/delete, collaborator reads/writes/leave, and public-key reads/writes have explicit canonical actions and capability-family requirements.
- Creating a nonexistent ledger authorizes against the current user plus existing entitlement/quota rules; successful creation establishes ownership in the source system without authz tuple writes.
- Existing ledger changes check current owner/admin relationships before any Gitea/Fava/database/Plaid side effect.
- Collaborator downgrade/removal, leave, visibility changes, rename, and deletion affect the next request without cross-request authorization caching.
- Coarse transport `ledger.admin` and downstream Gitea rejection are no longer independent final authorities for this domain.
- Destructive mutations retain atomic owner/rank predicates and cleanup ordering as defense-in-depth; no step-up ceremony is added unless an existing product contract already requires it.
- Source failures surface as audited service-unavailable errors, while denial concealment, rate budgets, actionable errors, operation IDs, and per-call audit are cataloged and regression-tested.
- The shared w2 migration contract is satisfied, including checks, applied migrations, deployed development lifecycle/collaboration smoke tests, and persisted-audit plus no-side-effect verification.

## Source + Goal linkage

- **Source:** user-directed domain-by-domain centralized-authz migration, sequenced after the ledger data plane in w2/m17.
- **Goal linkage:** **A1 — Agent-native accounting** — delegated clients cannot turn content authority into repository/collaborator control, while owners retain predictable administration.
- **Expected outcome:** destructive and access-control operations share one explicit decision across surfaces, with immediate relationship-change visibility.
- **Why now:** this higher-risk control plane follows the lower-risk user/read/write migrations so the PDP and ledger evaluator are already proven.
- **Adoption surface:** included because ledger ownership, sharing, and keys directly affect users and automation clients.
- **Migration contract:** inherits `.pm/w2/README.md`; production deployment and new control-plane UX remain separate.
