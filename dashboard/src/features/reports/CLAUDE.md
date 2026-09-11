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

Interval totals are **direct postings per exact account**, not parent rollups.
`cash-flow/lib/model.ts` must count every returned account key once — a parent
with its own activity (for example `Expenses:Taxes:…:Federal` in USD beside
`:PreTax401k` in IRAUSD) is legitimate and must not be dropped because a child
key exists. `statement-tree.ts` keeps that parent's own amount on `balance` and
sets `balanceChildren` to own + descendants exactly once so the hierarchy table
and exports stay aligned with the period net change.

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
getLedgerIntervalTotals (5 roots, conversion = primary currency)
  → cash-flow/lib/model.ts (buildCashFlowStatement: period rows + netChange)
  → sankey-data-transformer.ts (build nodes/links)
  → sankey-colors.ts (assign colors)
  → ECharts Sankey component
```

The overview Sankey is a **projection of the cash-flow statement**, not of the
balance-sheet hierarchies — cumulative balances are not period flows
(`docs/adrs/ADR004-dashboard-sankey-cash-flow-projection.md`). Two rules follow
from that and must not be relaxed:

- **One unit.** A link value is one currency's amount, never a sum across
  units. Units with movement but no price to the presentation currency are
  listed in a caption under the chart — never converted, never dropped
  silently.
- **The cash node balances it.** The only balancing node is the net change in
  cash & equivalents (`statement.netChange`), drawn on the side its sign
  requires, so total inflow equals total outflow exactly. Negative flows are
  drawn on the opposite side, never discarded.

The Sankey categorizer resolves accounts through the shared
`cash-flow/lib/role-resolver.ts` (a declared `cash-flow-role` wins for every
root but `Income`, which stays the source side; `Equity` is financing, the same
as in the statement). Account `open`-directive metadata is the `meta` field of
`getLedgerAccountDirectives`: the cash-flow page reads it from its own query,
while the overview fetches a `{ account meta }` projection separately
(`GetLedgerAccountMeta` through `overview/hooks/use-account-meta.ts`) so a
failure degrades the Sankey to heuristics instead of failing the page. While
that query is pending the hook reports it and the Sankey shows a pending state
rather than the heuristic layout — declared roles are authoritative and must
never be pre-empted by provisional output.

The flows themselves come from a second client-side query
(`GetLedgerCashFlowSankey` through `overview/hooks/use-sankey-statement.ts`),
kept out of the route loader because the loader has no `primaryCurrency` to
pass as the conversion target. Both hooks degrade the Sankey card alone; the
page's other cards keep reading `GetLedgerOverview`.

## Route Loaders

Report directories with `loader.ts` use TanStack Router loaders for SSR-safe data fetching. Keep query/filter resolution in those loaders and rendering in report content/components.

Shared ledger filters (`account`, `filter`, `time`) are validated on the ledger parent route and retained across same-ledger navigation (sidebar, Related Pages) via `retainSearchParams`. Report loaders read them from `loaderDeps` so SSR and client requests match the destination URL. Filter edits use replace navigation; Clear all removes only those three keys. Ledger switches clear them unless the destination URL supplies new values. Journal action/directive, BQL `q`, and file-edit params are not propagated to unrelated pages.

Await only the data the page cannot render without. Optional panels (README
card, account metadata, sidebar counts) own their queries and render honest
pending states; a loader may start them in the browser with
`prefetchOptionalQuery` from `common/apollo/prefetch.ts` but must not wait for
them, and it must not start them during SSR. Measurement method and evidence:
`docs/performance-route-loading.md`.

## Presentation Currency

The `conversion` search param is router-owned, like `account`/`filter`/`time`
(retained and reset alongside them, see Route Loaders above) — report pages
never hold it in local state. `resolvePresentationConversion` (in
`common/lib/ledger-search-params/conversion.ts`) is the single owner of its
default and fallback: an empty value or a currency outside the ledger's
declared operating currencies resolves to `"at_cost"` (own currencies).
`isCurrencyConversion` tells apart the three keywords (`at_cost`, `at_value`,
`units`) from an actual currency selection.

**Presentation currency** is the selected currency when the user picked one
(`isCurrencyConversion(conversion)` is true); **`primaryCurrency`** is always
the ledger's first operating currency, regardless of selection — the two are
the same value only when nothing else was chosen. A card or export that
converts to one number must use the presentation currency, never
`primaryCurrency` unconditionally, or its single figure silently reverts to
the ledger's own currency under a different selection.

`export/units.ts`'s `collectUnits`/`collectHierarchyRecords` and
`components/unconverted-units-notice.tsx` are the shared disclosure for units
with no price to the presentation currency — every report page and the
overview cards use them rather than inventing a page-local notice.

## Locales

15 language files in `locales/` — shared across all sub-reports. Export strings
live in `export/locales/` and are composed into these report locale bundles.
