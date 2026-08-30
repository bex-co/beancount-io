# w2 · m19 — Centralized authz for bank connections and transaction sync

**Worker:** worker2 **Goal:** centralize Plaid Link, item/account mapping, status, reconciliation, sync, submit, and delete authority at customer/background application boundaries using current item/user/ledger bindings **Status:** todo

## Tasks (in order)

| id   | title                                             | est | depends_on |
| ---- | ------------------------------------------------- | --- | ---------- |
| t001 | Catalog bank actions, bindings, and operational risk | 55m | —          |
| t002 | Migrate Link, item, status, and account boundaries   | 65m | t001       |
| t003 | Migrate transaction sync and ledger submission       | 65m | t002       |
| t004 | Ratify background invocation without session masquerade | 55m | t003       |
| t005 | Adoption surface                                  | 20m | t004       |
| t006 | Simplify                                          | 20m | t005       |
| t007 | Test coverage                                     | 65m | t005       |
| t008 | Closeout                                          | 15m | t006, t007 |

## Definition of done

- Plaid Link/item/account/status/reconcile and transaction sync/submit/delete verbs have canonical actions with explicit bank-connection and ledger-content requirements.
- Item ownership and ledger binding are resolved from current backend data; ledger relationships are resolved from the current ledger source.
- Interactive Link ceremonies, signed webhooks, and scheduled work remain correctly authenticated without fabricating a caller session or storing workload/request tuples.
- Denied customer requests perform no Plaid, database, ledger, or transaction mutation.
- Webhook/job-triggered work can act only on the item/user/ledger binding established by trusted source data.
- Customer and internal invocation provenance is explicit authorization input; transport/job operation IDs remain observability metadata rather than domain-service parameters or FGA facts.
- Source failures surface as audited service-unavailable errors, and atomic item/user/ledger predicates, rate budgets, actionable errors, and per-call audit are preserved without decision memoization.
- The shared w2 migration contract is satisfied, including checks, applied migrations, deployed development customer/background smoke tests, and persisted-audit plus no-side-effect verification.

## Source + Goal linkage

- **Source:** user-directed domain-by-domain centralized-authz migration, sequenced after ledger data/control-plane cutovers.
- **Goal linkage:** **A1 — Agent-native accounting** — bank ingestion and ledger automation receive explicit, auditable authority instead of inheriting broad ledger-admin behavior.
- **Expected outcome:** customer, webhook, and scheduled Plaid workflows share one domain authorization boundary while Plaid/backend data remain authoritative.
- **Why now:** bank connections have multi-resource bindings and background entry points, so they follow the simpler and ledger-foundational domains.
- **Adoption surface:** included because Link, sync, and transaction-review flows are directly user-facing and automation-relevant.
- **Migration contract:** inherits `.pm/w2/README.md`; production deployment and Plaid product changes remain separate.
