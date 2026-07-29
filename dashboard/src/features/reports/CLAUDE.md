# Reports Feature

## Purpose

Financial report visualizations — overview, balance sheet, income statement, trial balance, account detail.

## Sub-Report Structure

Each sub-report is a self-contained directory:

| Sub-report          | Key Components                                                                                     |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `overview/`         | Sankey cash flow chart (`cash-flow-sankey.tsx`), data transformation pipeline                      |
| `balance-sheet/`    | Tree maps (`hierarchy-tree-map.tsx`), lists (`hierarchy-list.tsx`), line charts (`line-chart.tsx`) |
| `income-statement/` | Date-balance charts with single/stacked variants, SSR-safe loader                                  |
| `trial-balance/`    | Simple tabular report                                                                              |
| `account/`          | Individual account detail view                                                                     |

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

## Route Loaders

`overview/loader.ts` and `income-statement/loader.ts` use TanStack Router loaders for SSR-safe data fetching.

## Locales

13 language files in `locales/` — shared across all sub-reports.
