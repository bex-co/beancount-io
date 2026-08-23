# Ledger Data Feature

## Purpose

Data views for ledger metadata — accounts, budget, commodities, documents, events, holdings, settings, statistics, and errors.

## Sub-Domain Structure

Each sub-domain is a self-contained directory with `index.tsx`:

| Sub-domain     | Description                                                                               |
| -------------- | ----------------------------------------------------------------------------------------- |
| `accounts/`    | Account list with open/close/delete dialogs, loading state, types                         |
| `budget/`      | Budget display with add/delete dialogs, chart card, history table                         |
| `commodities/` | Simple commodity list                                                                     |
| `documents/`   | Document list                                                                             |
| `events/`      | Event list with loading state                                                             |
| `holdings/`    | Holdings table, statement generation, utility functions                                   |
| `settings/`    | Ledger, collaborator, visibility, and Beancount/Fava/bcio option sections                 |
| `statistics/`  | Three chart components: postings-per-account, entries-count-by-type, account-last-entries |
| `errors/`      | Beancount error display                                                                   |

## Dialog Pattern

Account and budget sub-domains use dialog components for mutations (open/close/delete/add). Each dialog is a separate component file with its own test.

## Holdings Calculations

- **`holdings-statement.ts`** — Computes portfolio value from raw holding data
- **`utils.ts`** — Helper functions for currency formatting and grouping

## Locales

Each localized sub-domain has 15 locale files. Keep its English keys and all supported locale modules in sync.
