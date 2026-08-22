# Ledger Feature

## Purpose

Core ledger operations — CRUD for entries, journal, reports, shell access, collaborators, public keys.

## Resolver Domains

Each domain has its own query + mutation + types + tests:

| Resolver                        | Scope                                                              |
| ------------------------------- | ------------------------------------------------------------------ |
| `ledger-resolver`               | Ledger CRUD, list, metadata                                        |
| `ledger-entry-resolver`         | Individual entry operations                                        |
| `ledger-journal-resolver`       | Journal/transaction operations                                     |
| `ledger-report-resolver`        | Financial reports (balance sheet, income statement, trial balance) |
| `ledger-collaborators-resolver` | Collaborator invite/remove                                         |
| `ledger-public-key-resolver`    | SSH public key management                                          |
| `ledger-shell-resolver`         | Shell/BQL query execution                                          |
| `ledger-legacy-resolver`        | V1 compatibility — **do not add new features here**                |

## Authorization

`utils/ledger-access-check.ts` — Two-level access check:

1. Owner match by username
2. Collaborator check via Fava API

Returns `LedgerAccessCheckResult` with reason enum.

## REST API

`api/rest/ledger-api-handler.ts` with Zod schemas in `ledger-api-schema.ts`.

## Key Utils

- **`mappers.ts`** — Fava → GraphQL type mapping
- **`account-entries.ts`** — Account entry helpers
- **`ledger-template.ts`** — New ledger scaffolding

## Types

`fava-api.types.ts` — Fava REST API response types. Keep in sync with `beancount-ledger-v2` service.

## Legacy

`ledger-legacy-resolver.*` wraps the old V1 API shape for backward compatibility. All new features should use the standard resolvers above.
