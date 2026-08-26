# Reports Feature

## Purpose

Financial report visualizations — overview, balance sheet, income statement, trial balance, account detail.

## Sub-Report Structure

Each sub-report is a self-contained directory:

| Sub-report          | Key Components                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `overview/`         | Dashboard cards and Sankey cash flow chart (`overview/components/cash-flow-sankey.tsx`), data pipeline              |
| `balance-sheet/`    | Tree maps (`hierarchy-tree-map.tsx`), lists (`hierarchy-list.tsx`), line charts (`line-chart.tsx`)                  |
| `income-statement/` | Date-balance charts with single/stacked variants, SSR-safe loader                                                   |
| `cash-flow/`        | Operating/investing/financing statement from interval totals + closing CCE balances, SSR-safe loader                |
| `trial-balance/`    | Simple tabular report                                                                                               |
| `account/`          | Individual account detail view                                                                                      |
| `export/`           | Shared Balance Sheet, Income Statement, and Cash Flow export model with CSV, Markdown, and semantic print renderers |

## Financial Statement Exports

Statement-specific export code belongs in `features/reports/export/`; it shares
the report pages' already-filtered hierarchies and must not refetch or bypass
their access path. Keep renderer-neutral statement modeling separate from CSV,
Markdown, and print renderers. Generic escaping and download lifecycle code
belongs in `common/lib/export/`, where BQL and legacy table exports reuse it.
The browser print flow is labeled **Print / Save as PDF** because the browser—not
the app—creates the PDF. Balance Sheet, Income Statement, and Cash Flow are the
supported statement exports (scope expanded from the original two by
`docs/adrs/ADR002-dashboard-cash-flow-report.md`).
Label the statement action **Export**, not **Download**, because it generates a
new representation of the filtered report. Reserve **Download** for existing
files and assets.

Treat these exports as unaudited management statements, never as attested or
certified reports. Use Beancount's ledger title as the reporting entity, resolve
concrete Fava time selections into inclusive reporting dates, and disclose when
the ledger name is used as an entity fallback, the period is implicit, or
filters make the statement partial. Printed statement signs follow
financial-statement presentation (income, liabilities, equity, and net profit
are inverted from their credit ledger signs); CSV keeps both the raw ledger
amount and display amount. Non-currency commodities remain ledger units and
must not be labeled or validated as currencies.

Income Statement Markdown and print exports use a single-step primary statement:
total revenue and other income, total expenses, then net income or net loss. The
full Beancount hierarchy belongs in a separately labeled supporting-account
appendix with root totals removed. A report is single-currency only when every
exported amount uses the selected or primary presentation currency. Otherwise,
label it as a multi-unit management schedule, warn against adding across units,
and direct the user to select a presentation currency before external use.

Balance Sheet Markdown and print exports put an accounting-equation control
summary first: total assets, total liabilities, total equity, total liabilities
and equity, and the exact per-unit reconciliation difference. Keep a statement
with any nonzero difference labeled as an internal draft; never create a silent
balancing adjustment. Put the complete hierarchy in a new-page supporting
appendix and move each root total below its detail rows. Apply the multi-unit
management-schedule rules to Balance Sheets as well as Income Statements. The
current hierarchy payload has no maturity or liquidity metadata, so disclose
that current/non-current classifications are unavailable and never infer them
from account names.

Cash Flow Markdown and print exports open with the summary: net cash from
operating, investing, and financing activities, then the bottom line (opening
cash and equivalents, net change, closing cash and equivalents). Account detail
per activity follows as supporting sections. The operating/investing/financing
split and the cash & equivalents set are resolved per account by
`cash-flow/lib/role-resolver.ts`: a `cash-flow-role` declaration on the
account's `open` directive wins (see `docs/adrs/ADR003-dashboard-cash-flow-ledger-roles.md`);
otherwise the heuristics in `cash-flow/config.ts` (account types and names)
apply. The classification and CCE-set disclosure notices must appear for every
row still resolved by heuristics; declared rows carry no disclosure. Cash-flow
rows are already statement-signed by the cash-flow model; never re-invert them.
Apply the same multi-unit management-schedule rules as the other statements.

## Hierarchy List Tables

`balance-sheet/hierarchy-list.tsx` (wrapped by `hierarchy-list-card.tsx`) is
the shared tree table for every statement page. Every tree row is a real
ledger account whose label links to the account page — never put synthetic
title or total nodes into the tree. Aggregates go through the `summaryRows`
prop: plain unlinked rows below the detail rows (root total below detail rows,
as in the exports). The cash-flow page builds its real-account forests in
`cash-flow/lib/statement-tree.ts` and labels its summary rows with the shared
`cashFlowSummaryLabelKey` keys from `export/presentation.ts`.

## Chart Library

All charts use **ECharts 6+**. Chart options are constructed in component files, not in separate config files.

## Data Transformation Pipeline (Overview Example)

```
GraphQL hierarchy data
  → account-categorizer.ts (classify accounts)
  → sankey-data-transformer.ts (build nodes/links)
  → sankey-colors.ts (assign colors)
  → ECharts Sankey component
```

The Sankey categorizer resolves accounts through the shared
`cash-flow/lib/role-resolver.ts` (a declared `cash-flow-role` wins for
non-`Income`/`Equity` roots; `Income` stays the source side and `Equity`
stays excluded). Account `open`-directive metadata is the `meta` field of
`getLedgerAccountDirectives`: the cash-flow page reads it from its own query,
while the overview fetches a `{ account meta }` projection separately
(`GetLedgerAccountMeta`, `Promise.allSettled` in the loader) so a failure
degrades the Sankey to heuristics instead of failing the page.

## Route Loaders

Report directories with `loader.ts` use TanStack Router loaders for SSR-safe data fetching. Keep query/filter resolution in those loaders and rendering in report content/components.

## Locales

15 language files in `locales/` — shared across all sub-reports. Export strings
live in `export/locales/` and are composed into these report locale bundles.
