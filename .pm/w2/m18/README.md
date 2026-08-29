# w2 · m18 — Centralized authz for ledger administration and collaboration

**Worker:** worker2 **Goal:** centralize ledger creation/update/delete, collaborator management, leave, and public-key control without relying on coarse `ledger.admin` or downstream Gitea rejection **Status:** todo

## Tasks (in order)

| id   | title                                                | est | depends_on |
| ---- | ---------------------------------------------------- | --- | ---------- |
| t001 | Define ledger control-plane actions                  | 45m | —          |
| t002 | Migrate ledger create, update, and delete            | 60m | t001       |
| t003 | Migrate collaborators, leave, and public keys        | 60m | t002       |
| t004 | Verify revocation and destructive-operation ordering | 40m | t003       |
| t005 | Adoption surface                                     | 20m | t004       |
| t006 | Simplify                                             | 20m | t005       |
| t007 | Test coverage                                        | 50m | t005       |
| t008 | Closeout                                             | 10m | t006, t007 |

## Definition of done

- Ledger create/update/delete, collaborator reads/writes/leave, and public-key reads/writes have explicit canonical actions and capability-family requirements.
- Creating a nonexistent ledger authorizes against the current user plus existing entitlement/quota rules; successful creation establishes ownership in the source system without authz tuple writes.
- Existing ledger changes check current owner/admin relationships before any Gitea/Fava/database/Plaid side effect.
- Collaborator downgrade/removal, leave, visibility changes, rename, and deletion affect the next request without cross-request authorization caching.
- Coarse transport `ledger.admin` and downstream Gitea rejection are no longer independent final authorities for this domain.
- No OpenFGA runtime/store/database/new dependency is added; required checks pass.

## Source + Goal linkage

- **Source:** user-directed domain-by-domain centralized-authz migration, sequenced after the ledger data plane in w2/m17.
- **Goal linkage:** **A1 — Agent-native accounting** — delegated clients cannot turn content authority into repository/collaborator control, while owners retain predictable administration.
- **Expected outcome:** destructive and access-control operations share one explicit decision across surfaces, with immediate relationship-change visibility.
- **Why now:** this higher-risk control plane follows the lower-risk user/read/write migrations so the PDP and ledger evaluator are already proven.
- **Adoption surface:** included because ledger ownership, sharing, and keys directly affect users and automation clients.
