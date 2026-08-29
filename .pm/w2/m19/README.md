# w2 · m19 — Centralized authz for bank connections and transaction sync

**Worker:** worker2 **Goal:** centralize Plaid Link, item/account mapping, status, reconciliation, sync, submit, and delete authority using current item/user/ledger bindings **Status:** todo

## Tasks (in order)

| id   | title                                             | est | depends_on |
| ---- | ------------------------------------------------- | --- | ---------- |
| t001 | Define bank-connection actions and bindings       | 45m | —          |
| t002 | Migrate Link, item, status, and account mappings | 60m | t001       |
| t003 | Migrate transaction sync and ledger submission   | 60m | t002       |
| t004 | Replace request-like system identities safely    | 45m | t003       |
| t005 | Adoption surface                                  | 20m | t004       |
| t006 | Simplify                                          | 20m | t005       |
| t007 | Test coverage                                     | 50m | t005       |
| t008 | Closeout                                          | 10m | t006, t007 |

## Definition of done

- Plaid Link/item/account/status/reconcile and transaction sync/submit/delete verbs have canonical actions with explicit bank-connection and ledger-content requirements.
- Item ownership and ledger binding are resolved from current backend data; ledger relationships are resolved from the current ledger source.
- Interactive Link ceremonies, signed webhooks, and scheduled work remain correctly authenticated without fabricating a caller session or storing workload/request tuples.
- Denied customer requests perform no Plaid, database, ledger, or transaction mutation.
- Webhook/job-triggered work can act only on the item/user/ledger binding established by trusted source data.
- No OpenFGA runtime/store/database/new dependency is added; required checks pass.

## Source + Goal linkage

- **Source:** user-directed domain-by-domain centralized-authz migration, sequenced after ledger data/control-plane cutovers.
- **Goal linkage:** **A1 — Agent-native accounting** — bank ingestion and ledger automation receive explicit, auditable authority instead of inheriting broad ledger-admin behavior.
- **Expected outcome:** customer, webhook, and scheduled Plaid workflows share one domain authorization boundary while Plaid/backend data remain authoritative.
- **Why now:** bank connections have multi-resource bindings and background entry points, so they follow the simpler and ledger-foundational domains.
- **Adoption surface:** included because Link, sync, and transaction-review flows are directly user-facing and automation-relevant.
