# Beancount Dashboard

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

## Tech stack

React 19 · TypeScript · TanStack Start / Router (SSR) · Apollo Client · Tailwind
CSS v4 · Vitest · i18next (13+ languages).

## License

[MIT](../LICENSE) © Beancount.io — the repository root `LICENSE` governs all packages.
