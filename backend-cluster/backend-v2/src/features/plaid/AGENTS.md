# Plaid Feature

Plaid bank linking, account reconciliation, cursor-based transaction sync, webhook processing, and submission of reviewed transactions to a ledger.

## Layout

- `api/resolvers/` — GraphQL queries and mutations.
- `api/rest/plaid-webhook-handler.ts` and `plaid-webhook-schemas.ts` — webhook transport and Zod schema.
- `data/` — item, account, transaction, sync-log, and webhook-event PostgreSQL models.
- `service/plaid-client.ts` — Plaid SDK wrapper.
- `service/plaid-item-service.ts` — link/account/item lifecycle and reconciliation.
- `service/plaid-sync-service.ts` — cursor sync, categorization, locking, and ledger submission.
- `service/plaid-webhook-service.ts` — webhook event behavior.
- `utils/` — encryption, mapping, webhook parsing/verification, and reconciliation helpers.

## Data and security

| Model               | Prefix  |
| ------------------- | ------- |
| plaid-item          | `pitm_` |
| plaid-account       | `pacc_` |
| plaid-transaction   | `ptxn_` |
| plaid-sync-log      | `pslg_` |
| plaid-webhook-event | `pwe_`  |

- Access tokens are encrypted at rest with `encryptToken`/`decryptToken` from `utils/encryption.ts`. Never persist or log a raw Plaid token.
- Verify webhook signatures before parsing/dispatching business behavior. A request that fails verification is refused with `401` and never stored: the pending queue holds only signed Plaid events (w0/052).
- Keep cursor advancement, transaction persistence, and sync-log updates consistent under the existing distributed lock.
- `PlaidSyncService` maps unsynced rows to `TransactionToCategorize` from `src/features/llm/types.ts`; keep LLM categorization policy outside the Plaid persistence/sync layer.

## Authorization boundaries

- Every protected public method in `PlaidItemService` and `PlaidSyncService` is a policy-enforcement point. It receives the resolved `Identity`, selects one canonical `bank.*` action, and calls the shared `AuthorizationService` before Plaid, database, ledger, or transaction mutation. Resolvers, REST handlers, and MCP dispatchers delegate; they do not add a second ledger gate.
- A bank resource is the runtime-only locator `bank_connection:<ledger>[?items=…]`. Item IDs are internal `pitm_` row IDs. The source-backed evaluator re-reads each item and requires its current `userId` and immutable `ledgerRepoId` to match the caller and current Gitea repository. It is not an OpenFGA object or stored tuple.
- Ledger-wide item/account reads must include both `ledgerRepoId` and `userId` in their model query. Item/account/transaction mutations use the bound model methods (`*ForBinding`, `*ForItem`, and `*ForAccount`) so the trusted association remains a SQL predicate at write time.
- Bank-control actions require the current ledger bank-connection relationship. Transaction reads and suggestions additionally require ledger-content read; sync, submit, and delete additionally require ledger-content write. The evaluator reads current Gitea permissions on every relationship check and has no decision memo.
- Link create/update/exchange is interactive: sessions and OAuth may perform it, but API keys may not. Operating an established connection keeps the existing admin/read/write capability ceilings and ledger pins.
- Signed webhooks and scheduled syncs use runtime-issued `PlaidBackgroundPrincipal` values with explicit `plaid_webhook` or `plaid_scheduler` provenance. They are not request `Identity` values, never masquerade as sessions, and can act only on the item/user/ledger binding re-derived from current backend data. Scheduler provenance cannot apply item webhooks.
- A relationship-source outage is an audited authorization error and surfaces as service unavailable. A denial happens before side effects. Audit events contain operation/action, subject/provenance, ledger, outcome, and time only—never tokens, bank data, arguments, or item IDs.

## Ledger target files

`submitPlaidTransactionsToLedger` may receive a `filename`. `PlaidSyncService` verifies that the file already exists through the ledger API and rejects an invalid target; it never creates a new source file. If omitted, ledger-v2 defaults the bulk write to `main.bean`.

The dashboard obtains valid choices through `LedgerDataService.getLedgerSourceFiles`, which returns the main file and transitively included sources. This path intentionally differs from `LedgerEntryService`'s bcio-option routing used by the general importer.

Every hosted bank import writes `import-id: "plaid:<transactionId>"` on its entry (the shared bank-feed convention in `skills/beancount-import/references/dedup.md`), so the ledger itself records what was imported and a CLI import of the same account can exact-match it. `submitTransactionsToLedger` asks the ledger which of the batch's ids it already holds and refuses the batch, preview included, when it finds one; the `syncedToLedger` flag stays the primary guard and a failed lookup does not block the import.

Service tests mock Plaid and external clients. Preserve coverage for cursor pagination, lock contention, webhook signature/event behavior, encrypted-token handling, and target-file validation.
