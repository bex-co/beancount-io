# Plaid Feature

## Purpose

Plaid bank account integration — sync transactions from financial institutions.

## Data Flow

```
Plaid API → PlaidClient → PlaidSyncService → 5 Postgres tables → Beancount entries
```

## Data Models

| Model               | Prefix  | Description                  |
| ------------------- | ------- | ---------------------------- |
| plaid-item          | `pitm_` | Linked financial institution |
| plaid-account       | `pacc_` | Bank account under an item   |
| plaid-transaction   | `ptxn_` | Individual transaction       |
| plaid-sync-log      | `pslg_` | Sync cursor tracking         |
| plaid-webhook-event | `pwe_`  | Incoming webhook events      |

## Target File Selection

`submitPlaidTransactionsToLedger` takes an optional `filename`. It must name a file the
ledger already has — `PlaidSyncService.submitTransactionsToLedger` checks it via
`favaApiClient.ledgers.getLedgerFile` and throws `BadUserInputError` otherwise, **never**
creating one (a file nothing `include`s would swallow the entries silently). Omitted, the
ledger's bulk endpoint falls back to `main.bean`.

The dashboard populates its picker from `getLedgerSourceFiles`
(`features/ledger/service/ledger-data-service.ts` → ledger `GET /reports/…/source-files`),
which returns `main.bean` plus everything it transitively includes.

Note this path deliberately does **not** use bcio (`beancountio-option`) routing — unlike
`LedgerEntryService.addBulkEntries`, which the CSV importer goes through.

## Key Services

- **`plaid-client.ts`** — Wraps Plaid SDK, handles all API calls
- **`plaid-sync-service.ts`** (~535 LOC) — Cursor-based transaction sync with distributed lock (`lock()` from `@/shared/lock`), categorization via `ICategorizationService`
- **`plaid-webhook-service.ts`** — Processes incoming webhooks

## Webhook Flow

```
REST endpoint (api/rest/plaid-webhook-handler.ts)
  → verification (utils/plaid-webhook-verification.ts)
  → parsing (utils/plaid-webhook-parser.ts)
  → PlaidWebhookService
```

## Security

Access tokens are encrypted at rest via `utils/encryption.ts` (AES-256-GCM).
**Always use `encryptToken`/`decryptToken` — never store raw tokens.**

## Cross-Feature Dependency

Uses `ICategorizationService` from `features/importer/` for AI-powered transaction categorization.

## Testing

- Service tests mock the Plaid SDK client
- Webhook tests verify signature validation and event processing
- Sync tests cover cursor pagination and lock contention
