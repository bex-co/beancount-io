# Beancount Dashboard

## Search Console growth report

The dashboard package includes a read-only Search Console report for URLs owned by the dashboard.
It deliberately excludes CMS, forum, and API paths from its opportunity ranking.

Set GOOGLE_SERVICE_ACCOUNT_JSON_B64 in the local .env or CI secret, then run:

    yarn search-console-report --markdown --days 28 --inspect-limit 5

The report covers dashboard paths such as /ledger, /login, /sign-up, /auth, /settings, /lgasset,
and /oauth. It does not treat /forum, /api, or CMS content paths as dashboard opportunities.

Roadmap ideas should go through the repository-level $pm-brainstorm workflow and public .pm board
in the parent repository. Search Console rows are evidence only after route ownership is verified;
do not turn CMS/forum/API rows into dashboard milestones.

The web dashboard for [Beancount.io](https://beancount.io/) — a browser UI for
double-entry bookkeeping: ledgers, reports, journals, an in-app editor, bank
account linking, and an AI assistant.

Part of the [`beancount-io`](https://github.com/bex-co/beancount-io) monorepo.

## Prerequisites

- Node.js ≥ 22
- Yarn 4 via Corepack (`corepack enable`)
- A running Beancount.io backend (GraphQL API gateway) for `VITE_API_URL` to point at

## Getting started

```zsh
corepack enable
yarn install
cp .env.example .env   # then edit values
yarn dev               # http://localhost:5173
```

## Environment variables

Copy `.env.example` to `.env` and fill in values. All client-side variables must
be prefixed with `VITE_`.

| Variable                 | Required | Purpose                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_API_URL`           | Yes      | Public API Gateway URL used by the browser.                                                                                                                                                                                                                                                                                                                                                                  |
| `VITE_SSR_API_URL`       | No       | Internal API URL for the SSR server. Defaults to `VITE_API_URL`.                                                                                                                                                                                                                                                                                                                                             |
| `VITE_GA_MEASUREMENT_ID` | No       | GA4 Measurement ID for this environment's analytics data stream. Use a **separate stream per environment** (set the dev/staging stream's ID locally and the production stream's ID in prod). When unset, analytics is disabled and no GA script loads. Non-production builds send events with GA4 `debug_mode` so you can validate instrumentation in GA4 DebugView before it reaches the production stream. |

## Scripts

| Script              | Description                                    |
| ------------------- | ---------------------------------------------- |
| `yarn dev`          | Start the dev server (port 5173) with HMR      |
| `yarn build`        | Production build                               |
| `yarn start`        | Serve the built SSR server                     |
| `yarn lint`         | Generate routes, type-check (`tsc -b`), ESLint |
| `yarn test`         | Run the test suite (Vitest)                    |
| `yarn format:check` | Check formatting (Prettier)                    |
| `yarn codegen`      | Regenerate GraphQL types from the schema       |

## Exporting financial statements

Open a ledger's Balance Sheet or Income Statement, apply the time, account,
advanced, interval, and conversion controls you need, then choose **Download**
in the report header. **Spreadsheet CSV** downloads the visible filtered
hierarchy in a formula-safe, Excel-compatible file, including both source-ledger
and statement-facing signs. **Markdown report** downloads a reviewable,
pagination-independent management statement with consistent amount formatting.
Income Statement exports put the conventional single-step summary first—total
revenue, total expenses, and net income or loss—and move the complete account
hierarchy into a supporting-detail appendix. Multi-unit results are explicitly
labeled as a management schedule and must not be added across units; select a
presentation currency for a single-currency statement.
Balance Sheet exports similarly put an accounting-equation summary first—total
assets, total liabilities, total equity, total liabilities and equity, and the
reconciliation difference—then move the complete ledger hierarchy to a new-page
supporting appendix with section totals at the bottom. A nonzero reconciliation
difference keeps the statement labeled as an internal draft. Because the source
hierarchy does not carry maturity classifications, the export discloses that
current and non-current groupings are unavailable instead of guessing from
account names.
**Print / Save as PDF** opens the browser's print dialog with an unaudited
management statement, reporting dates, scope notices, and ledger-unit
disclosures; choose your browser's PDF destination to create a PDF. The
reporting entity is taken from Beancount's `option "title"`; if it is missing,
the export uses the source ledger name and displays a readiness notice. Other
report pages do not expose this statement export menu.

## Tech stack

React 19 · TypeScript · TanStack Start / Router (SSR) · Apollo Client · Tailwind
CSS v4 · Vitest · i18next (13+ languages).

## License

[MIT](../LICENSE) © Beancount.io — the repository root `LICENSE` governs all packages.
