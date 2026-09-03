# w2 · m16 — Centralized authz for AI-assisted ingestion and assets

**Worker:** worker2 **Goal:** centralize authorization for temporary assets, parsing/category helpers, and AI execution at their application-service/workflow boundaries using current user/ledger/S3 facts and explicit multi-capability actions **Status:** done

## Tasks (in order)

| id   | title                                              | est | depends_on |
| ---- | -------------------------------------------------- | --- | ---------- |
| t001 | Define assisted-ingestion action composition — **DONE**       | 40m | —          |
| t002 | Add source-backed ledger and asset evaluators — **DONE**      | 55m | t001       |
| t003 | Migrate parsing, suggestion, and temporary assets — **DONE** | 55m | t002       |
| t004 | Migrate AI streaming and agent entry points — **DONE**       | 55m | t003       |
| t005 | Adoption surface — **DONE**                                   | 20m | t004       |
| t006 | Simplify — **DONE**                                           | 20m | t005       |
| t007 | Test coverage — **DONE**                                      | 55m | t005       |
| t008 | Closeout — **DONE**                                           | 15m | t006, t007 |

## Definition of done

- File/receipt parsing, category/account suggestions, temporary upload/download, AI usage, and streaming/agent entry points have explicit canonical actions.
- Composite actions are declared once in the TypeScript catalog and require every relevant permission family, such as ledger contents plus assets or AI, rather than endpoint-specific relations.
- Ledger facts are read from the current Gitea-backed ledger source; temporary-asset ownership is resolved from its trusted user-bound key invariant.
- The PDP denies before S3, LLM, ledger, or streaming side effects; every call re-evaluates without an authorization decision memo, tuple copy, or cross-request cache.
- Source failures surface as audited service-unavailable errors, operation IDs stay in AsyncLocalStorage, and existing rate budgets and client error contracts remain stable.
- The shared w2 migration contract is satisfied, including checks, applied migrations, deployed development smoke tests for upload/AI entry points, and persisted-audit verification.

## Source + Goal linkage

- **Source:** user-directed domain-by-domain centralized-authz migration, sequenced after the smaller user/billing/social domains.
- **Goal linkage:** **A1 — Agent-native accounting** — coding agents and OAuth/API-key clients receive the same ledger/asset authority at AI, MCP, GraphQL, and streaming entry points.
- **Expected outcome:** an agent can use assisted ingestion only within its existing credential and ledger relationships, with revocation effective on the next request.
- **Why now:** this bounded cross-resource domain establishes the reusable ledger-source evaluator and multi-permission composition before the much larger ledger migration.
- **Adoption surface:** included because AI/MCP and upload flows are directly user- and agent-facing.
- **Migration contract:** inherits `.pm/w2/README.md`; production deployment and AI/storage product changes remain separate.
