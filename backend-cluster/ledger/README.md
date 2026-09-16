# beancount-ledger-v2

Standalone TypeScript service that parses, validates, and queries Beancount
ledgers, built on the [`@rustledger/wasm`](https://www.npmjs.com/package/@rustledger/wasm)
engine (a Rust reimplementation of Beancount, 10-30x faster than the Python
parser).

## Why a separate service

`@rustledger/wasm` is GPL-3.0-only. Running it in-process inside another
service would make that service's Docker image a conveyance of GPL-licensed
code. Instead, the engine is contained in this standalone sidecar, which
other services talk to over plain HTTP/JSON. See `NOTICE` and
`src/foundation/rustledger/README.md` for the containment rationale and
`CLAUDE.md` for the hard rules.

## Architecture

- `src/foundation/rustledger/` - the Beancount engine (WASM loader, parsers,
  report builders, plugins)
- `src/foundation/clients/` - Gitea file-map loading + caching
- `src/features/gitea/` - generated Gitea API client + auth
- `src/features/ledger/` - request-to-engine orchestration (reports, journal,
  entries, shell/BQL queries)
- `src/api/` - Koa route handlers, one file per endpoint family
- `src/server/` - auth, error handling, server bootstrap
- `src/shared/` - errors, logging, caching, locking, path-safety helpers

There is no database and no user table: auth is Basic/token credentials
forwarded verbatim to Gitea, which is the sole source of truth for identity
and repository access.

## Report coverage

Income-statement and overview flow series, account-report interval totals,
and `/interval-totals` cover the full selected period. They no longer keep only
the latest 100 intervals: a full non-leap year with `interval=daily` returns
365 rows. Consumers should aggregate or window charts explicitly if needed;
the report service does not apply a chart display limit to financial data.

## Getting started

Requires Node.js 20+ and a running Gitea instance. See `.env.example` for the
expected environment variables.

```bash
yarn install
cp .env.example .env   # fill in GITEA_* / BACKEND_V2_* as needed
yarn dev                # runs on :8000
```

### Scripts

- `yarn dev` / `yarn start` - run with ts-node
- `yarn build` / `yarn dist:start` - compile then run the compiled output
- `yarn test` - unit tests (WASM-free)
- `yarn verify:rustledger` - live engine checks against the real WASM module
- `yarn lint` / `yarn typecheck`

### Environment variables

See `.env.example`. All are optional with sensible defaults for the Docker
Compose network; the only ones typically set explicitly are `WEBHOOK_TOKEN`
and `BACKEND_V2_ADMIN_TOKEN`.

### Managed price includes

A ledger file may include a managed price feed:

```beancount
include "https://beancount.io/prices/BTC-USD"
```

The service fetches the feed, accepts only `price` directives with the
allowlisted metadata, overlays them as a read-only virtual file after the
committed files are loaded, and refreshes them on a five-minute schedule
without creating a Git commit. A failed refresh keeps the last validated
revision serving. Ledger-authored prices for the same date and pair win.
`MANAGED_PRICE_ORIGINS` lists the origins the service may fetch from and
allows only `https://beancount.io` unless set; set it to an empty string to
disable the feature. The design is recorded in
[ADR 015](../../docs/adrs/ADR015-ledger-managed-price-includes.md).

## Testing

`yarn test` runs the unit suite. A separate parity harness under `parity/`
proved endpoint-by-endpoint equivalence with the Python service during
migration; it's retired now that the Python service is gone, but
`parity/COVERAGE.md` is kept as the historical record.
