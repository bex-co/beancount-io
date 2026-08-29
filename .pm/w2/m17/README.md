# w2 · m17 — Centralized authz for ledger contents and reporting

**Worker:** worker2 **Goal:** route the large ledger read/write/report/file/entry/repository/pull-request domain through the shared PDP and source-backed ledger evaluator **Status:** todo

## Tasks (in order)

| id   | title                                            | est | depends_on |
| ---- | ------------------------------------------------ | --- | ---------- |
| t001 | Complete the ledger-content action matrix        | 50m | —          |
| t002 | Migrate reporting, journal, and account reads    | 60m | t001       |
| t003 | Migrate files, repository, shell, and archives   | 60m | t001       |
| t004 | Migrate entries, receipts, and pull requests     | 60m | t002, t003 |
| t005 | Remove superseded ledger-content policy checks  | 40m | t004       |
| t006 | Adoption surface                                 | 25m | t005       |
| t007 | Simplify                                         | 25m | t006       |
| t008 | Test coverage                                    | 60m | t006       |
| t009 | Closeout                                         | 10m | t007, t008 |

## Definition of done

- Every ledger content/report/journal/account/file/repository/shell/archive/entry/receipt/pull-request verb has a canonical action and complete credential-plus-relationship requirement.
- GraphQL, REST, MCP tools, and MCP resources reach the same PDP decision before data access or mutation.
- Owner/collaborator/public behavior, credential scopes, ledger pins, safe paths, parsing, and commit semantics remain unchanged.
- Superseded `authorizeLedger`, `assertLedgerAuthorization`, and transport-only checks no longer act as independent final authorities for this domain.
- Denied writes perform no ledger, Gitea, Fava, S3, or workflow side effect.
- No OpenFGA runtime/store/database/new dependency is added; required checks pass.

## Source + Goal linkage

- **Source:** user-directed domain-by-domain centralized-authz migration, deliberately sequenced after smaller domains and the ledger evaluator introduced in w2/m16.
- **Goal linkage:** **A1 — Agent-native accounting** — coding agents can read and maintain ledgers through REST/MCP with one reviewable permission model and immediate revocation behavior.
- **Expected outcome:** all ledger-content surfaces agree on what an owner, collaborator, public caller, OAuth token, or API key may do.
- **Why now:** this is the largest ordinary data-plane domain; earlier milestones reduce framework risk before touching its many operations.
- **Adoption surface:** included because ledger APIs, MCP resources/tools, and user workflows are core adoption surfaces.
