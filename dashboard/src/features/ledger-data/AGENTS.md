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

## Table Names

Every `<table>` here needs an accessible name, because these pages stack
several tables with identical column headers — seven budget histories, one per
commodity pair, three Statistics tables, two Settings option tables — and an
unnamed table is indistinguishable to anyone navigating by table.

Name it from the visible heading that already identifies it, the same way
`features/reports` labels its hierarchy tables: the owning card or section
mints an id with `useId`, puts it on its title or `h3`, and passes it down as
`ariaLabelledBy` (`<Table aria-labelledby={...}>`). Where the identifying text
lives inside the table's own component and nowhere else, a plain `aria-label`
is fine — commodity histories use their `base/quote` pair that way.

Two things to get right: include whatever distinguishes two otherwise identical
groups (budget histories carry the currency, because a group is keyed by
account _and_ currency), and remember that a component's loading and empty
branches render their own copies of the heading — the id belongs on the heading
that is rendered beside the table, not on the first one in the file.

## Locales

Each localized sub-domain has 15 locale files. Keep its English keys and all supported locale modules in sync.
