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
- Verify webhook signatures before parsing/dispatching business behavior.
- Keep cursor advancement, transaction persistence, and sync-log updates consistent under the existing distributed lock.
- `PlaidSyncService` maps unsynced rows to `TransactionToCategorize` from `src/features/llm/types.ts`; keep LLM categorization policy outside the Plaid persistence/sync layer.

## Ledger target files

`submitPlaidTransactionsToLedger` may receive a `filename`. `PlaidSyncService` verifies that the file already exists through the ledger API and rejects an invalid target; it never creates a new source file. If omitted, ledger-v2 defaults the bulk write to `main.bean`.

The dashboard obtains valid choices through `LedgerDataService.getLedgerSourceFiles`, which returns the main file and transitively included sources. This path intentionally differs from `LedgerEntryService`'s bcio-option routing used by the general importer.

Service tests mock Plaid and external clients. Preserve coverage for cursor pagination, lock contention, webhook signature/event behavior, encrypted-token handling, and target-file validation.
