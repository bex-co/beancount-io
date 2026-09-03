# w2 · m17 — Centralized authz for ledger contents and reporting

**Worker:** worker2 **Goal:** route the large ledger data plane through protected application-service/workflow boundaries, the one shared PDP catalog, and the source-backed ledger evaluator without changing surface contracts **Status:** done

## Tasks (in order)

| id   | title                                            | est | depends_on |
| ---- | ------------------------------------------------ | --- | ---------- |
| t001 | Complete the ledger-content action catalog and alias matrix — **DONE** | 60m | —          |
| t002 | Migrate reporting, journal, and account reads — **DONE** | 60m | t001       |
| t003 | Migrate files, repository, shell, and archives — **DONE** | 60m | t001       |
| t004 | Migrate entries, receipts, and pull requests — **DONE** | 60m | t002, t003 |
| t005 | Remove competing gates and verify budgets/audit/failures — **DONE** | 50m | t004       |
| t006 | Adoption surface — **DONE**                      | 25m | t005       |
| t007 | Simplify — **DONE**                              | 25m | t006       |
| t008 | Test coverage — **DONE**                         | 75m | t006       |
| t009 | Closeout — **DONE**                              | 15m | t007, t008 |

## Definition of done

- Every ledger content/report/journal/account/file/repository/shell/archive/entry/receipt/pull-request verb has a canonical action and complete credential-plus-relationship requirement.
- GraphQL, REST, MCP tools, and MCP resources reach the same PDP decision before data access or mutation.
- Owner/collaborator/public behavior, credential scopes, ledger pins, safe paths, parsing, and commit semantics remain unchanged.
- Superseded `authorizeLedger`, `assertLedgerAuthorization`, and transport-only checks no longer act as independent final authorities for this domain.
- Denied writes perform no ledger, Gitea, Fava, S3, or workflow side effect.
- Data-source failures remain audited service errors rather than policy denials; rate budgets, actionable errors, operation-ID attribution, and per-call audit remain stable without decision memoization.
- Atomic owner/path predicates and repeated source reads remain where they are intentional defense-in-depth rather than competing policy.
- The shared w2 migration contract is satisfied, including checks, applied migrations, representative deployed GraphQL/REST/MCP smoke tests, and persisted-audit verification.

## Source + Goal linkage

- **Source:** user-directed domain-by-domain centralized-authz migration, deliberately sequenced after smaller domains and the ledger evaluator introduced in w2/m16.
- **Goal linkage:** **A1 — Agent-native accounting** — coding agents can read and maintain ledgers through REST/MCP with one reviewable permission model and immediate revocation behavior.
- **Expected outcome:** all ledger-content surfaces agree on what an owner, collaborator, public caller, OAuth token, or API key may do.
- **Why now:** this is the largest ordinary data-plane domain; earlier milestones reduce framework risk before touching its many operations.
- **Adoption surface:** included because ledger APIs, MCP resources/tools, and user workflows are core adoption surfaces.
- **Migration contract:** inherits `.pm/w2/README.md`; production deployment and accounting behavior changes remain separate.
